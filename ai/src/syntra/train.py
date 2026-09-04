from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from torch import nn

from syntra.config import SyntraConfig, load_config
from syntra.data.schema import STATE_FEATURES
from syntra.models.baselines import train_baselines
from syntra.models.dataset import as_array, dump_json, load_split_frame, make_loader
from syntra.models.world_model import NetworkWorldModel

PRECURSOR_CHANNELS: tuple[str, ...] = (
    "packets_per_second",
    "unique_dst_ports",
    "syn_ratio",
    "port_scan_score",
    "syn_ack_gap",
)
PRECURSOR_WEIGHT = 3.0


def _channel_weights(device: torch.device) -> torch.Tensor:
    weights = torch.ones(len(STATE_FEATURES), dtype=torch.float32, device=device)
    for name in PRECURSOR_CHANNELS:
        weights[STATE_FEATURES.index(name)] = PRECURSOR_WEIGHT
    return weights


def weighted_mse(
    pred: torch.Tensor, target: torch.Tensor, weights: torch.Tensor
) -> torch.Tensor:
    err = (pred - target) ** 2
    return (err * weights.view(1, 1, -1)).mean()


def set_seed(seed: int) -> None:
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def pos_weight(labels: np.ndarray) -> torch.Tensor:
    pos = max(float(labels.sum()), 1.0)
    neg = max(float(len(labels) - labels.sum()), 1.0)
    return torch.tensor([neg / pos], dtype=torch.float32)


class FocalBCEWithLogits(nn.Module):
    def __init__(self, pos_weight: torch.Tensor, gamma: float = 1.5) -> None:
        super().__init__()
        self.register_buffer("pos_weight", pos_weight)
        self.gamma = gamma

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        bce = F.binary_cross_entropy_with_logits(
            logits, targets, pos_weight=self.pos_weight, reduction="none"
        )
        probs = torch.sigmoid(logits)
        pt = torch.where(targets > 0.5, probs, 1.0 - probs)
        return (((1.0 - pt) ** self.gamma) * bce).mean()


def run_epoch(
    model: NetworkWorldModel,
    loader,
    cfg: SyntraConfig,
    optimizer: torch.optim.Optimizer | None,
    device: torch.device,
    attack_bce: nn.Module,
) -> dict[str, float]:
    train = optimizer is not None
    model.train(train)
    total = {"loss": 0.0, "rec": 0.0, "rec_tf": 0.0, "atk": 0.0, "fam": 0.0, "stg": 0.0}
    n = 0
    ce = nn.CrossEntropyLoss()
    chan_w = _channel_weights(device)
    for batch in loader:
        history = batch["history"].to(device)
        future = batch["future"].to(device)
        y_future = batch["y_future"].to(device)
        fam = batch["family_future"].to(device)
        stg = batch["stage_future"].to(device)
        out = model(
            history,
            future=future if train else None,
            teacher_forcing=cfg.model.teacher_forcing if train else 0.0,
        )
        rec_pred = weighted_mse(out["future_states"], future, chan_w)
        rec_tf = weighted_mse(
            out.get("future_states_rec", out["future_states"]), future, chan_w
        )
        rec = rec_pred + cfg.train.rec_tf_loss_weight * rec_tf
        atk = attack_bce(out["attack_logits"], y_future)
        fam_loss = ce(
            out["family_logits"].reshape(-1, out["family_logits"].size(-1)),
            fam.reshape(-1),
        )
        stg_loss = ce(
            out["stage_logits"].reshape(-1, out["stage_logits"].size(-1)),
            stg.reshape(-1),
        )
        loss = (
            cfg.train.rec_loss_weight * rec
            + cfg.train.attack_loss_weight * atk
            + cfg.train.family_loss_weight * fam_loss
            + cfg.train.stage_loss_weight * stg_loss
        )
        if train:
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
        bs = history.size(0)
        total["loss"] += float(loss.item()) * bs
        total["rec"] += float(rec_pred.item()) * bs
        total["rec_tf"] += float(rec_tf.item()) * bs
        total["atk"] += float(atk.item()) * bs
        total["fam"] += float(fam_loss.item()) * bs
        total["stg"] += float(stg_loss.item()) * bs
        n += bs
    return {k: v / max(n, 1) for k, v in total.items()}


def train_world_model(
    cfg: SyntraConfig, artifacts: Path, epochs: int | None = None
) -> Path:
    set_seed(cfg.train.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    train_frame = load_split_frame(cfg, "train")
    val_frame = load_split_frame(cfg, "val")
    train_loader = make_loader(train_frame, cfg, shuffle=True)
    val_loader = make_loader(val_frame, cfg, shuffle=False)
    model = NetworkWorldModel(
        state_dim=cfg.model.state_dim,
        embed_dim=cfg.model.embed_dim,
        hidden_dim=cfg.model.hidden_dim,
        num_layers=cfg.model.num_layers,
        dropout=cfg.model.dropout,
    ).to(device)
    y_flat = np.concatenate(
        [as_array(v, np.float32).reshape(-1) for v in train_frame["y_future"]]
    )
    bce = FocalBCEWithLogits(pos_weight=pos_weight(y_flat).to(device), gamma=1.5)
    opt = torch.optim.AdamW(
        model.parameters(), lr=cfg.train.lr, weight_decay=cfg.train.weight_decay
    )
    n_epochs = epochs if epochs is not None else cfg.train.epochs
    patience = cfg.train.patience
    min_epochs = min(8, n_epochs)
    best = float("inf")
    bad = 0
    ckpt = artifacts / "world_model.pt"
    artifacts.mkdir(parents=True, exist_ok=True)
    history = []
    for epoch in range(1, n_epochs + 1):
        tr = run_epoch(model, train_loader, cfg, opt, device, bce)
        va = run_epoch(model, val_loader, cfg, None, device, bce)
        # Val attack loss is dominated by held-out families; stop on predicted-path reconstruction.
        monitor = va["rec"]
        history.append({"epoch": epoch, "train": tr, "val": va, "monitor": monitor})
        print(
            f"epoch {epoch:02d}  train {tr['loss']:.4f}  val {va['loss']:.4f}  "
            f"val_atk {va['atk']:.4f}  val_rec {va['rec']:.4f}  monitor {monitor:.4f}"
        )
        if monitor < best - 1e-4:
            best = monitor
            bad = 0
            torch.save(
                {
                    "state_dict": model.state_dict(),
                    "config": {
                        "state_dim": cfg.model.state_dim,
                        "embed_dim": cfg.model.embed_dim,
                        "hidden_dim": cfg.model.hidden_dim,
                        "num_layers": cfg.model.num_layers,
                        "dropout": cfg.model.dropout,
                    },
                },
                ckpt,
            )
        else:
            bad += 1
            if epoch >= min_epochs and bad >= patience:
                print(f"early stop at epoch {epoch} (patience={patience})")
                break
    dump_json(
        artifacts / "train_history.json", {"best_val_monitor": best, "epochs": history}
    )
    return ckpt


def load_world_model(
    path: Path, device: torch.device | None = None
) -> NetworkWorldModel:
    device = device or torch.device("cpu")
    try:
        blob = torch.load(path, map_location=device, weights_only=False)
    except TypeError:
        blob = torch.load(path, map_location=device)
    cfg = blob["config"]
    model = NetworkWorldModel(**cfg)
    model.load_state_dict(blob["state_dict"])
    model.to(device)
    model.eval()
    return model


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train world model and current-window baselines."
    )
    parser.add_argument("--config", default=None)
    parser.add_argument("--epochs", type=int, default=None)
    args = parser.parse_args()
    cfg = load_config(args.config)
    artifacts = cfg.ui.artifacts_dir
    print("Training current-window baselines (detection only)...")
    train_baselines(cfg, artifacts)
    print("Training GRU world model (forecast heads on rolled-out states)...")
    train_world_model(cfg, artifacts, epochs=args.epochs)


if __name__ == "__main__":
    main()
