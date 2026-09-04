from __future__ import annotations

import argparse
import inspect
import math
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from sklearn.metrics import average_precision_score
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


def pos_weight(labels: np.ndarray, mult: float = 1.5) -> torch.Tensor:
    pos = max(float(labels.sum()), 1.0)
    neg = max(float(len(labels) - labels.sum()), 1.0)
    value = min((neg / pos) * float(mult), 20.0)
    return torch.tensor([value], dtype=torch.float32)


def attack_step_weights(
    y_future: torch.Tensor,
    y_current: torch.Tensor,
    precursor_w: float,
    mid_w: float,
) -> torch.Tensor:
    w = torch.ones_like(y_future)
    pre = (y_current.unsqueeze(1) < 0.5) & (y_future > 0.5)
    mid = (y_current.unsqueeze(1) > 0.5) & (y_future > 0.5)
    w = torch.where(pre, torch.full_like(w, precursor_w), w)
    w = torch.where(mid, torch.full_like(w, mid_w), w)
    return w


def teacher_forcing_at(epoch: int, n_epochs: int, start: float, end: float) -> float:
    if n_epochs <= 1:
        return end
    frac = (epoch - 1) / max(n_epochs - 1, 1)
    return float(start + (end - start) * frac)


def cosine_warmup_lrs(
    epoch_idx: int, n_epochs: int, warmup_epochs: int
) -> float:
    if epoch_idx < warmup_epochs:
        return float(epoch_idx + 1) / max(warmup_epochs, 1)
    progress = (epoch_idx - warmup_epochs) / max(n_epochs - warmup_epochs, 1)
    return 0.5 * (1.0 + math.cos(math.pi * min(progress, 1.0)))


def run_epoch(
    model: NetworkWorldModel,
    loader,
    cfg: SyntraConfig,
    optimizer: torch.optim.Optimizer | None,
    device: torch.device,
    pos_w: torch.Tensor,
    teacher_forcing: float,
    scaler: object | None = None,
) -> dict[str, float]:
    train = optimizer is not None
    model.train(train)
    total = {"loss": 0.0, "rec": 0.0, "rec_tf": 0.0, "atk": 0.0, "fam": 0.0, "stg": 0.0}
    n = 0
    ce = nn.CrossEntropyLoss()
    chan_w = _channel_weights(device)
    logits_k1: list[np.ndarray] = []
    y_k1: list[np.ndarray] = []
    use_amp = scaler is not None and device.type == "cuda"
    for batch in loader:
        history = batch["history"].to(device)
        future = batch["future"].to(device)
        y_future = batch["y_future"].to(device)
        y_current = batch["y_current"].to(device)
        fam = batch["family_future"].to(device)
        stg = batch["stage_future"].to(device)
        with torch.autocast(device_type=device.type, enabled=use_amp):
            out = model(
                history,
                future=future if train else None,
                teacher_forcing=teacher_forcing if train else 0.0,
            )
            rec_pred = weighted_mse(out["future_states"], future, chan_w)
            rec_tf = weighted_mse(
                out.get("future_states_rec", out["future_states"]), future, chan_w
            )
            rec = rec_pred + cfg.train.rec_tf_loss_weight * rec_tf
            step_w = attack_step_weights(
                y_future,
                y_current,
                cfg.train.precursor_loss_weight,
                cfg.train.mid_attack_loss_weight,
            )
            bce = F.binary_cross_entropy_with_logits(
                out["attack_logits"],
                y_future,
                pos_weight=pos_w,
                reduction="none",
            )
            atk = (bce * step_w).mean()
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
            if use_amp:
                scaler.scale(loss).backward()
                scaler.unscale_(optimizer)
                nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                scaler.step(optimizer)
                scaler.update()
            else:
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
        logits_k1.append(out["attack_logits"][:, 0].detach().float().cpu().numpy())
        y_k1.append(y_future[:, 0].detach().float().cpu().numpy())
        bs = history.size(0)
        total["loss"] += float(loss.item()) * bs
        total["rec"] += float(rec_pred.item()) * bs
        total["rec_tf"] += float(rec_tf.item()) * bs
        total["atk"] += float(atk.item()) * bs
        total["fam"] += float(fam_loss.item()) * bs
        total["stg"] += float(stg_loss.item()) * bs
        n += bs
    metrics = {k: v / max(n, 1) for k, v in total.items()}
    if logits_k1:
        y = np.concatenate(y_k1)
        scores = 1.0 / (1.0 + np.exp(-np.concatenate(logits_k1)))
        if y.max() > 0 and y.min() < 1:
            metrics["auprc"] = float(average_precision_score(y, scores))
        else:
            metrics["auprc"] = float(y.mean())
    else:
        metrics["auprc"] = 0.0
    return metrics


def _model_kwargs(cfg: SyntraConfig) -> dict:
    return {
        "state_dim": cfg.model.state_dim,
        "embed_dim": cfg.model.embed_dim,
        "hidden_dim": cfg.model.hidden_dim,
        "num_layers": cfg.model.num_layers,
        "dropout": cfg.model.dropout,
        "encoder_layers": cfg.model.encoder_layers,
        "n_heads": cfg.model.n_heads,
    }


def train_world_model(
    cfg: SyntraConfig, artifacts: Path, epochs: int | None = None
) -> Path:
    set_seed(cfg.train.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    train_frame = load_split_frame(cfg, "train")
    val_frame = load_split_frame(cfg, "val")
    train_loader = make_loader(train_frame, cfg, shuffle=True)
    val_loader = make_loader(val_frame, cfg, shuffle=False)
    model = NetworkWorldModel(**_model_kwargs(cfg)).to(device)
    y_flat = np.concatenate(
        [as_array(v, np.float32).reshape(-1) for v in train_frame["y_future"]]
    )
    pos_w = pos_weight(y_flat, cfg.train.pos_weight_mult).to(device)
    opt = torch.optim.AdamW(
        model.parameters(), lr=cfg.train.lr, weight_decay=cfg.train.weight_decay
    )
    n_epochs = epochs if epochs is not None else cfg.train.epochs
    warmup = max(1, min(cfg.train.warmup_epochs, n_epochs))
    amp_scaler = torch.cuda.amp.GradScaler() if device.type == "cuda" else None
    patience = cfg.train.patience
    min_epochs = min(8, n_epochs)
    best = -1.0
    bad = 0
    ckpt = artifacts / "world_model.pt"
    artifacts.mkdir(parents=True, exist_ok=True)
    history = []
    for epoch in range(1, n_epochs + 1):
        factor = cosine_warmup_lrs(epoch - 1, n_epochs, warmup)
        for group in opt.param_groups:
            group["lr"] = cfg.train.lr * factor
        tf = teacher_forcing_at(
            epoch,
            n_epochs,
            cfg.model.teacher_forcing,
            cfg.train.teacher_forcing_end,
        )
        tr = run_epoch(
            model, train_loader, cfg, opt, device, pos_w, tf, amp_scaler
        )
        va = run_epoch(
            model, val_loader, cfg, None, device, pos_w, 0.0, None
        )
        monitor = va["auprc"]
        history.append(
            {
                "epoch": epoch,
                "train": tr,
                "val": va,
                "monitor": monitor,
                "teacher_forcing": tf,
            }
        )
        print(
            f"epoch {epoch:02d}  train {tr['loss']:.4f}  val {va['loss']:.4f}  "
            f"val_atk {va['atk']:.4f}  val_auprc {va['auprc']:.4f}  "
            f"tf {tf:.3f}  monitor {monitor:.4f}"
        )
        if monitor > best + 1e-4:
            best = monitor
            bad = 0
            torch.save(
                {
                    "state_dict": model.state_dict(),
                    "config": _model_kwargs(cfg),
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
    raw_cfg = dict(blob["config"])
    known = inspect.signature(NetworkWorldModel.__init__).parameters
    kwargs = {k: v for k, v in raw_cfg.items() if k in known and k != "self"}
    model = NetworkWorldModel(**kwargs)
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
    print("Training Transformer+GRU world model (forecast heads on rolled-out states)...")
    train_world_model(cfg, artifacts, epochs=args.epochs)


if __name__ == "__main__":
    main()
