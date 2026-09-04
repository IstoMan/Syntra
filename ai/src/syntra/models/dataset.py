from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch.utils.data import DataLoader, Dataset

from syntra.config import SyntraConfig


def as_array(value, dtype) -> np.ndarray:
    if isinstance(value, np.ndarray) and value.dtype == object:
        return np.stack([np.asarray(v, dtype=dtype) for v in value])
    return np.asarray(value, dtype=dtype)


class ForecastSequenceDataset(Dataset):
    def __init__(self, frame: pd.DataFrame) -> None:
        self.frame = frame.reset_index(drop=True)

    def __len__(self) -> int:
        return len(self.frame)

    def __getitem__(self, idx: int) -> dict[str, torch.Tensor]:
        row = self.frame.iloc[idx]
        history = as_array(row["history"], np.float32)
        future = as_array(row["future"], np.float32)
        y_future = as_array(row["y_future"], np.float32).reshape(-1)
        family_future = as_array(row["family_future"], np.int64).reshape(-1)
        stage_future = as_array(row["stage_future"], np.int64).reshape(-1)
        state = as_array(row["state"], np.float32).reshape(-1)
        return {
            "history": torch.from_numpy(np.array(history, copy=True)),
            "future": torch.from_numpy(np.array(future, copy=True)),
            "state": torch.from_numpy(np.array(state, copy=True)),
            "y_current": torch.tensor(int(row["y_current"]), dtype=torch.float32),
            "y_future": torch.from_numpy(np.array(y_future, copy=True)),
            "family_future": torch.from_numpy(np.array(family_future, copy=True)),
            "stage_future": torch.from_numpy(np.array(stage_future, copy=True)),
            "y_any_future": torch.tensor(int(row["y_any_future"]), dtype=torch.float32),
        }


def load_split_frame(cfg: SyntraConfig, split: str) -> pd.DataFrame:
    frame = pd.read_parquet(cfg.sequences_path)
    out = frame[frame["split"] == split].copy()
    if split == "train":
        out = out[~((out["y_current"] == 1) & (out["is_unseen_family"]))]
    return out.reset_index(drop=True)


def make_loader(frame: pd.DataFrame, cfg: SyntraConfig, shuffle: bool) -> DataLoader:
    ds = ForecastSequenceDataset(frame)
    return DataLoader(
        ds,
        batch_size=cfg.train.batch_size,
        shuffle=shuffle,
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
