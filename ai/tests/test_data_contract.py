from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from syntra.config import load_config
from syntra.data.prepare import attach_splits, build_sequences
from syntra.data.schema import STATE_FEATURES
from syntra.data.synthetic import generate_windows
from syntra.eval.protocol import future_attack_matrix, windows_frame_with_future


def test_state_vector_is_locked_at_40_and_label_free():
    assert len(STATE_FEATURES) == 40
    forbidden = {"y_attack", "family", "family_id", "label", "stage"}
    assert forbidden.isdisjoint(STATE_FEATURES)


def test_synthetic_week_purged_split_covers_families_without_infiltration_train():
    cfg = load_config()
    windows = attach_splits(generate_windows(seed=0), cfg)
    assert set(windows["day"]) == {
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
    }
    assert (windows.loc[windows["day"] == "monday", "y_attack"] == 0).all()
    assert "brute_force" in set(windows.loc[windows["day"] == "tuesday", "family"])
    assert "portscan" in set(windows.loc[windows["day"] == "tuesday", "family"])
    assert "dos" in set(windows.loc[windows["day"] == "wednesday", "family"])
    assert "botnet" in set(windows.loc[windows["day"] == "wednesday", "family"])
    assert "infiltration" in set(windows.loc[windows["day"] == "thursday", "family"])
    assert {"portscan", "dos", "botnet"}.issubset(
        set(windows.loc[windows["day"] == "friday", "family"])
    )
    train_attack = windows[
        (windows["split"] == "train")
        & windows["train_eligible"]
        & (windows["y_attack"] == 1)
    ]
    assert (train_attack["family"] != "infiltration").all()
    train_fams = set(train_attack["family"])
    for family in ("portscan", "botnet", "dos"):
        assert family in train_fams
    assert (windows["split"] == "test").any()
    assert (windows["split"] == "val").any()


def test_sequences_forecast_labels_are_next_windows():
    cfg = load_config()
    windows = attach_splits(generate_windows(seed=1), cfg)
    windows = windows_frame_with_future(windows, cfg.windows.horizon_k)
    seq = build_sequences(windows, cfg)
    assert not seq.empty
    row = seq.iloc[min(100, len(seq) - 1)]
    day = windows[windows["day"] == row["day"]].sort_values("window_idx")
    t = int(row["window_idx"])
    for k in range(cfg.windows.horizon_k):
        assert int(row["y_future"][k]) == int(day.iloc[t + 1 + k]["y_attack"])
    assert int(row["y_current"]) == int(day.iloc[t]["y_attack"])
    mismatch = [
        int(np.asarray(fut)[0]) != int(cur)
        for fut, cur in zip(seq["y_future"], seq["y_current"])
    ]
    assert any(mismatch)
    assert "is_precursor" in seq.columns
