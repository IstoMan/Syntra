from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler

from syntra.config import SyntraConfig


def as_array(value, dtype) -> np.ndarray:
    if isinstance(value, np.ndarray) and value.dtype == object:
        return np.stack([np.asarray(v, dtype=dtype) for v in value])
    return np.asarray(value, dtype=dtype)


class ForecastSequenceDataset(Dataset):
    def __init__(self, frame: pd.DataFrame) -> None:
        frame = frame.reset_index(drop=True)
        self.history = np.stack([as_array(h, np.float32) for h in frame["history"]])
        self.future = np.stack([as_array(f, np.float32) for f in frame["future"]])
        self.state = np.stack([as_array(s, np.float32).reshape(-1) for s in frame["state"]])
        self.y_future = np.stack(
            [as_array(v, np.float32).reshape(-1) for v in frame["y_future"]]
        )
        self.family_future = np.stack(
            [as_array(v, np.int64).reshape(-1) for v in frame["family_future"]]
        )
        self.stage_future = np.stack(
            [as_array(v, np.int64).reshape(-1) for v in frame["stage_future"]]
        )
        self.y_current = frame["y_current"].to_numpy(dtype=np.float32)
        self.y_any_future = frame["y_any_future"].to_numpy(dtype=np.float32)

    def __len__(self) -> int:
        return int(self.history.shape[0])

    def __getitem__(self, idx: int) -> dict[str, torch.Tensor]:
        return {
            "history": torch.from_numpy(self.history[idx].copy()),
            "future": torch.from_numpy(self.future[idx].copy()),
            "state": torch.from_numpy(self.state[idx].copy()),
            "y_current": torch.tensor(self.y_current[idx], dtype=torch.float32),
            "y_future": torch.from_numpy(self.y_future[idx].copy()),
            "family_future": torch.from_numpy(self.family_future[idx].copy()),
            "stage_future": torch.from_numpy(self.stage_future[idx].copy()),
            "y_any_future": torch.tensor(self.y_any_future[idx], dtype=torch.float32),
        }


def load_split_frame(cfg: SyntraConfig, split: str) -> pd.DataFrame:
    frame = pd.read_parquet(cfg.sequences_path)
    out = frame[frame["split"] == split].copy()
    if split == "train":
        out = out[~((out["y_current"] == 1) & (out["is_unseen_family"]))]
    return out.reset_index(drop=True)


def _sample_weights(frame: pd.DataFrame) -> np.ndarray:
    y = frame["y_any_future"].to_numpy().astype(np.int64)
    y_cur = frame["y_current"].to_numpy().astype(np.int64)
    if "is_precursor" in frame.columns:
        precursor = frame["is_precursor"].to_numpy().astype(np.int64) == 1
    else:
        precursor = (y_cur == 0) & (y == 1)
    n = max(len(frame), 1)
    n_pos = max(int((y == 1).sum()), 1)
    n_neg = max(int((y == 0).sum()), 1)
    weights = np.ones(n, dtype=np.float64)
    weights[y == 1] = 0.5 * n / n_pos
    weights[y == 0] = 0.5 * n / n_neg
    weights[precursor] *= 2.0
    return weights


def make_loader(frame: pd.DataFrame, cfg: SyntraConfig, shuffle: bool) -> DataLoader:
    ds = ForecastSequenceDataset(frame)
    if shuffle and len(frame) > 0:
        weights = torch.as_tensor(_sample_weights(frame), dtype=torch.double)
        sampler = WeightedRandomSampler(
            weights, num_samples=len(frame), replacement=True
        )
        return DataLoader(
            ds,
            batch_size=cfg.train.batch_size,
            sampler=sampler,
            num_workers=cfg.train.num_workers,
            drop_last=False,
        )
    return DataLoader(
        ds,
        batch_size=cfg.train.batch_size,
        shuffle=False,
        num_workers=cfg.train.num_workers,
        drop_last=False,
    )


def current_window_xy(frame: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    x = np.stack([as_array(s, np.float32).reshape(-1) for s in frame["state"]])
    y = frame["y_current"].to_numpy().astype(np.int64)
    return x.astype(np.float32), y


def future_any_xy(frame: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    x = np.stack([as_array(s, np.float32).reshape(-1) for s in frame["state"]])
    y = frame["y_any_future"].to_numpy().astype(np.int64)
    return x.astype(np.float32), y


def dump_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
