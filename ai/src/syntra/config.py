from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = ROOT / "configs" / "default.yaml"


def _as_path(value: str | Path) -> Path:
    path = Path(value)
    return path if path.is_absolute() else ROOT / path


@dataclass
class DatasetConfig:
    name: str = "cicids2017"
    raw_dir: Path = ROOT / "data" / "raw" / "cicids2017"
    processed_dir: Path = ROOT / "data" / "processed"
    synthetic_dir: Path = ROOT / "data" / "synthetic"
    unseen_attack_family: str = "infiltration"


@dataclass
class WindowConfig:
    size_seconds: int = 30
    horizon_k: int = 5
    history_len: int = 8


@dataclass
class SplitConfig:
    train_days: list[str] = field(
        default_factory=lambda: ["monday", "tuesday", "wednesday"]
    )
    val_days: list[str] = field(default_factory=lambda: ["thursday"])
    test_days: list[str] = field(default_factory=lambda: ["friday"])
    strategy: str = "time"


@dataclass
class ModelConfig:
    type: str = "gru_world_model"
    state_dim: int = 40
    embed_dim: int = 64
    hidden_dim: int = 64
    num_layers: int = 1
    dropout: float = 0.1
    teacher_forcing: float = 0.5
    heads: list[str] = field(default_factory=lambda: ["attack", "family", "stage"])


@dataclass
class TrainConfig:
    batch_size: int = 32
    epochs: int = 20
    patience: int = 4
    lr: float = 3e-4
    weight_decay: float = 1e-4
    seed: int = 42
    rec_loss_weight: float = 1.0
    rec_tf_loss_weight: float = 0.25
    attack_loss_weight: float = 1.0
    family_loss_weight: float = 0.5
    stage_loss_weight: float = 0.35
    num_workers: int = 0


@dataclass
class EvalConfig:
    alert_threshold: float = 0.5
    fpr_cap: float = 0.01
    novelty_gate: float = 0.55
    lead_time_on: str = "future"
    metrics: list[str] = field(
        default_factory=lambda: ["precision", "recall", "f1", "fpr", "lead_time", "ece"]
    )


@dataclass
class ExplainConfig:
    shap_background: int = 128
    top_k_features: int = 8


@dataclass
class UIConfig:
    artifacts_dir: Path = ROOT / "artifacts"


@dataclass
class SyntraConfig:
    dataset: DatasetConfig = field(default_factory=DatasetConfig)
    windows: WindowConfig = field(default_factory=WindowConfig)
    splits: SplitConfig = field(default_factory=SplitConfig)
    model: ModelConfig = field(default_factory=ModelConfig)
    train: TrainConfig = field(default_factory=TrainConfig)
    eval: EvalConfig = field(default_factory=EvalConfig)
    explain: ExplainConfig = field(default_factory=ExplainConfig)
    ui: UIConfig = field(default_factory=UIConfig)

    @property
    def sequences_path(self) -> Path:
        return self.dataset.processed_dir / "sequences.parquet"

    @property
    def windows_path(self) -> Path:
        return self.dataset.processed_dir / "windows.parquet"


def load_config(path: str | Path | None = None) -> SyntraConfig:
    cfg_path = Path(path) if path else DEFAULT_CONFIG
    raw: dict[str, Any] = yaml.safe_load(cfg_path.read_text(encoding="utf-8"))
    ds = raw["dataset"]
    win = raw["windows"]
    spl = raw["splits"]
    mdl = raw["model"]
    trn = raw["train"]
    evl = raw["eval"]
    exp = raw["explain"]
    ui = raw["ui"]
    return SyntraConfig(
        dataset=DatasetConfig(
            name=ds["name"],
            raw_dir=_as_path(ds["raw_dir"]),
            processed_dir=_as_path(ds["processed_dir"]),
            synthetic_dir=_as_path(ds["synthetic_dir"]),
            unseen_attack_family=ds["unseen_attack_family"],
        ),
        windows=WindowConfig(
            size_seconds=int(win["size_seconds"]),
            horizon_k=int(win["horizon_k"]),
            history_len=int(win["history_len"]),
        ),
        splits=SplitConfig(
            train_days=list(spl["train_days"]),
            val_days=list(spl["val_days"]),
            test_days=list(spl["test_days"]),
            strategy=str(spl["strategy"]),
        ),
        model=ModelConfig(
            type=mdl["type"],
            state_dim=int(mdl["state_dim"]),
            embed_dim=int(mdl["embed_dim"]),
            hidden_dim=int(mdl["hidden_dim"]),
            num_layers=int(mdl["num_layers"]),
            dropout=float(mdl["dropout"]),
            teacher_forcing=float(mdl["teacher_forcing"]),
            heads=list(mdl["heads"]),
        ),
        train=TrainConfig(
            batch_size=int(trn["batch_size"]),
            epochs=int(trn["epochs"]),
            patience=int(trn.get("patience", 4)),
            lr=float(trn["lr"]),
            weight_decay=float(trn["weight_decay"]),
            seed=int(trn["seed"]),
            rec_loss_weight=float(trn["rec_loss_weight"]),
            rec_tf_loss_weight=float(trn.get("rec_tf_loss_weight", 0.25)),
            attack_loss_weight=float(trn["attack_loss_weight"]),
            family_loss_weight=float(trn["family_loss_weight"]),
            stage_loss_weight=float(trn["stage_loss_weight"]),
            num_workers=int(trn["num_workers"]),
        ),
        eval=EvalConfig(
            alert_threshold=float(evl["alert_threshold"]),
            fpr_cap=float(evl.get("fpr_cap", 0.01)),
            novelty_gate=float(evl.get("novelty_gate", 0.55)),
            lead_time_on=str(evl["lead_time_on"]),
            metrics=list(evl["metrics"]),
        ),
        explain=ExplainConfig(
            shap_background=int(exp["shap_background"]),
            top_k_features=int(exp["top_k_features"]),
        ),
        ui=UIConfig(artifacts_dir=_as_path(ui["artifacts_dir"])),
    )
