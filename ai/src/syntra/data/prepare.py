"""Build time-ordered windows and history/horizon sequences. Never shuffles time."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from syntra.config import SyntraConfig
from syntra.data.cicids2017 import load_cicids2017_flows, windows_from_flows
from syntra.data.schema import STATE_FEATURES
from syntra.data.synthetic import generate_windows
from syntra.eval.protocol import (
    REQUIRED_TRAIN_FAMILIES,
    assert_time_split_strategy,
    assign_purged_family_blocked_splits,
    assign_split,
    attack_episodes,
    windows_frame_with_future,
)
from syntra.taxonomy import family_from_cic_label

BENIGN_KEEP_FRAC = 0.1


def downsample_benign_flows(
    flows: pd.DataFrame, frac: float = BENIGN_KEEP_FRAC, seed: int = 42
) -> pd.DataFrame:
    """Keep every attack flow; optionally subsample BENIGN only."""
    family = flows["label"].map(family_from_cic_label)
    attack = flows.loc[family != "benign"]
    benign = flows.loc[family == "benign"]
    if len(benign) == 0 or frac >= 1.0:
        return flows.reset_index(drop=True)
    kept = benign.sample(frac=frac, random_state=seed)
    return pd.concat([attack, kept], ignore_index=True)


def attach_splits(windows: pd.DataFrame, cfg: SyntraConfig) -> pd.DataFrame:
    assert_time_split_strategy(cfg.splits.strategy)
    windows = windows.copy()
    if cfg.splits.strategy == "purged_family_blocked":
        windows = assign_purged_family_blocked_splits(
            windows,
            horizon_k=cfg.windows.horizon_k,
            history_len=cfg.windows.history_len,
            unseen_family=cfg.dataset.unseen_attack_family,
            train_frac=cfg.splits.train_frac,
            val_frac=cfg.splits.val_frac,
        )
    else:
        windows["split"] = windows["day"].map(
            lambda d: assign_split(
                d, cfg.splits.train_days, cfg.splits.val_days, cfg.splits.test_days
            )
        )
    unseen = cfg.dataset.unseen_attack_family
    windows["is_unseen_family"] = windows["family"] == unseen
    # Unseen family must not appear as a training *target*. Keep precursor benign context.
    windows["train_eligible"] = ~(
        (windows["split"] == "train") & windows["is_unseen_family"]
    )
    return windows


def _neighborhood_mask(
    group: pd.DataFrame, families: set[str], pad: int
) -> np.ndarray:
    ordered = group.sort_values("window_idx").reset_index(drop=True)
    y = ordered["y_attack"].to_numpy()
    fam = ordered["family"].to_numpy()
    keep = np.zeros(len(ordered), dtype=bool)
    for start, end, family in attack_episodes(y, fam):
        if str(family) not in families:
            continue
        lo = max(0, start - pad)
        keep[lo : end + 1] = True
    return keep


def mix_synthetic_family_coverage(
    windows: pd.DataFrame, cfg: SyntraConfig, source: str
) -> pd.DataFrame:
    """Inject synthetic precursor campaigns for families missing from real-CIC train."""
    if source != "cicids2017":
        return windows
    train_fams = set(
        windows.loc[(windows["split"] == "train") & (windows["y_attack"] == 1), "family"]
        .astype(str)
        .tolist()
    )
    missing = set(REQUIRED_TRAIN_FAMILIES) - train_fams - {
        cfg.dataset.unseen_attack_family
    }
    if not missing:
        return windows
    synth = generate_windows(seed=cfg.train.seed)
    synth = attach_splits(synth, cfg)
    pad = cfg.windows.history_len + cfg.windows.horizon_k
    pieces = [windows]
    for day, group in synth.groupby("day", sort=False):
        mask = _neighborhood_mask(group, missing, pad)
        if not mask.any():
            continue
        extra = group.sort_values("window_idx").reset_index(drop=True).loc[mask].copy()
        extra = extra[extra["family"].isin(missing | {"benign"})]
        if extra.empty:
            continue
        extra["day"] = f"synth_{day}"
        extra["source"] = "synthetic_coverage"
        extra["window_idx"] = np.arange(len(extra), dtype=np.int64)
        extra["split"] = "train"
        extra["is_unseen_family"] = extra["family"] == cfg.dataset.unseen_attack_family
        extra["train_eligible"] = ~extra["is_unseen_family"]
        pieces.append(extra)
    return pd.concat(pieces, ignore_index=True)


def build_sequences(windows: pd.DataFrame, cfg: SyntraConfig) -> pd.DataFrame:
    h = cfg.windows.history_len
    k = cfg.windows.horizon_k
    feat_cols = list(STATE_FEATURES)
    records = []
    for day, group in windows.groupby("day", sort=False):
        group = group.sort_values("window_idx").reset_index(drop=True)
        feats = group[feat_cols].to_numpy(dtype=np.float32)
        n = len(group)
        for t in range(h - 1, n - k):
            row = group.iloc[t]
            if row["split"] not in ("train", "val", "test"):
                continue
            if row["split"] == "train" and not row["train_eligible"]:
                continue
            history = feats[t - h + 1 : t + 1]
            future = feats[t + 1 : t + 1 + k]
            y_future = group.loc[t + 1 : t + k, "y_attack"].to_numpy()
            fam_future = group.loc[t + 1 : t + k, "family_id"].to_numpy()
            stg_future = group.loc[t + 1 : t + k, "stage_id"].to_numpy()
            y_any = int(y_future.max() > 0)
            is_precursor = int(row["y_attack"] == 0 and y_any == 1)
            records.append(
                {
                    "day": day,
                    "split": row["split"],
                    "timestamp": row["timestamp"],
                    "window_idx": int(row["window_idx"]),
                    "history": history.tolist(),
                    "future": future.tolist(),
                    "y_current": int(row["y_attack"]),
                    "family_current": int(row["family_id"]),
                    "y_future": y_future.astype(int).tolist(),
                    "family_future": fam_future.astype(int).tolist(),
                    "stage_future": stg_future.astype(int).tolist(),
                    "y_any_future": y_any,
                    "is_precursor": is_precursor,
                    "is_unseen_family": bool(row["is_unseen_family"]),
                    "state": history[-1].tolist(),
                }
            )
    return pd.DataFrame.from_records(records)


def prepare_dataset(cfg: SyntraConfig) -> dict[str, str]:
    cfg.dataset.processed_dir.mkdir(parents=True, exist_ok=True)
    cfg.dataset.synthetic_dir.mkdir(parents=True, exist_ok=True)
    flows = load_cicids2017_flows(cfg.dataset.raw_dir)
    if flows is not None:
        n_flows_raw = int(len(flows))
        n_flows = n_flows_raw
        windows = windows_from_flows(flows, cfg.windows.size_seconds)
        source = "cicids2017"
        extra_meta = {
            "n_flows": n_flows,
            "n_flows_raw": n_flows_raw,
            "benign_downsampled": False,
            "benign_keep_frac": 1.0,
            "note": (
                "Real CIC-IDS2017 traces. Purged family-blocked split with synthetic "
                "coverage for families missing from train; infiltration held out of train targets."
            ),
        }
    else:
        windows = generate_windows(seed=cfg.train.seed)
        source = "synthetic_cicids2017"
        extra_meta = {}
        windows.to_parquet(cfg.dataset.synthetic_dir / "windows.parquet", index=False)

    windows = attach_splits(windows, cfg)
    windows = mix_synthetic_family_coverage(windows, cfg, source)
    windows = windows_frame_with_future(windows, cfg.windows.horizon_k)
    train_mask = windows["split"].eq("train") & windows["train_eligible"]
    scaler = {}
    for col in STATE_FEATURES:
        col_min = float(windows.loc[train_mask, col].min())
        col_max = float(windows.loc[train_mask, col].max())
        span = col_max - col_min
        scaler[col] = {"min": col_min, "max": col_max}
        windows[col] = (windows[col] - col_min) / span if span > 1e-8 else 0.0
    (cfg.dataset.processed_dir / "scaler.json").write_text(
        json.dumps(scaler, indent=2), encoding="utf-8"
    )
    windows.to_parquet(cfg.windows_path, index=False)
    sequences = build_sequences(windows, cfg)
    sequences.to_parquet(cfg.sequences_path, index=False)
    if sequences.empty:
        raise RuntimeError(
            "No forecast sequences were built. Need at least "
            f"{cfg.windows.history_len + cfg.windows.horizon_k} windows per day."
        )
    train_fams = sorted(
        set(
            windows.loc[
                (windows["split"] == "train")
                & windows["train_eligible"]
                & (windows["y_attack"] == 1),
                "family",
            ]
            .astype(str)
            .tolist()
        )
    )
    meta = {
        "source": source,
        "n_windows": int(len(windows)),
        "n_sequences": int(len(sequences)),
        "window_seconds": cfg.windows.size_seconds,
        "horizon_k": cfg.windows.horizon_k,
        "history_len": cfg.windows.history_len,
        "state_features": list(STATE_FEATURES),
        "splits": sequences["split"].value_counts().to_dict(),
        "split_strategy": cfg.splits.strategy,
        "train_families": train_fams,
        "unseen_attack_family": cfg.dataset.unseen_attack_family,
        "protocol": "future_labels_only",
        **extra_meta,
    }
    meta_path = cfg.dataset.processed_dir / "meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return {
        **meta,
        "windows_path": str(cfg.windows_path),
        "sequences_path": str(cfg.sequences_path),
    }
