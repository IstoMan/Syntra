from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from syntra.eval.protocol import (
    assert_no_current_window_leak,
    assert_time_split_strategy,
    classification_at_horizon,
    expected_calibration_error,
    future_attack_matrix,
    lead_time_from_future_probs,
)


def test_time_split_rejects_shuffle():
    with pytest.raises(ValueError, match="shuffle|time"):
        assert_time_split_strategy("random")


def test_purged_family_blocked_is_allowed():
    assert_time_split_strategy("purged_family_blocked")
    assert_time_split_strategy("time")


def test_future_labels_are_shifted_not_current():
    current = np.array([0, 0, 1, 1, 0], dtype=np.int64)
    future = future_attack_matrix(current, horizon_k=2)
    assert_no_current_window_leak(future, current)
    # Y[t,0] == y[t+1], never y[t]
    assert list(future[:, 0]) == [0, 1, 1, 0, 0]
    assert list(future[:, 1]) == [1, 1, 0, 0, 0]
    assert future[2, 0] == 1  # next window, still attack
    assert future[0, 0] == 0  # current is benign and next is benign
    # Detection leak would have put a 1 at index 2 for k=0 matching y[2] wait:
    # y[2]=1; a leaked detector label would set future[2,0]=1 which happens to
    # equal y[3]=1 here. Check a case where they differ:
    current2 = np.array([0, 1, 0], dtype=np.int64)
    future2 = future_attack_matrix(current2, 1)
    assert future2[1, 0] == 0  # y[t+1], not the current attack at t=1
    assert future2[0, 0] == 1


def test_horizon_must_be_at_least_one():
    with pytest.raises(ValueError):
        future_attack_matrix(np.array([0, 1]), 0)


def test_lead_time_ignores_current_window_and_counts_precursor():
    # Attack episode starts at index 10. Model alerts at t=7 on k=2 (target=10).
    current = np.zeros(16, dtype=np.int64)
    current[10:13] = 1
    families = np.array(["benign"] * 16, dtype=object)
    families[10:13] = "dos"
    probs = np.zeros((16, 3), dtype=np.float64)
    probs[7, 2] = 0.9
    leads = lead_time_from_future_probs(
        current, families, probs, 0.5, window_seconds=30
    )
    assert len(leads) == 1
    assert leads[0].caught
    assert leads[0].lead_windows == 3
    assert leads[0].lead_seconds == 90


def test_alert_at_episode_start_is_not_forecast_lead():
    current = np.zeros(8, dtype=np.int64)
    current[4:6] = 1
    families = np.array(["benign"] * 8, dtype=object)
    families[4:6] = "dos"
    probs = np.zeros((8, 2), dtype=np.float64)
    probs[4, 0] = 0.99  # "detection" at current attack window, k points to 5
    leads = lead_time_from_future_probs(current, families, probs, 0.5, 30)
    # t=4 is not < start, so this must not count as early warning.
    assert leads[0].caught is False
    assert leads[0].lead_seconds == 0


def test_ece_zero_when_perfectly_calibrated():
    y = np.array([0, 0, 1, 1])
    p = np.array([0.0, 0.0, 1.0, 1.0])
    assert expected_calibration_error(y, p, n_bins=2) == 0.0


def test_horizon_metrics_fpr():
    y = np.array([0, 0, 0, 1])
    p = np.array([0.1, 0.9, 0.2, 0.8])
    m = classification_at_horizon(y, p, 0.5)
    assert m["fpr"] == pytest.approx(1 / 3)
    assert m["recall"] == pytest.approx(1.0)


def test_lead_time_uses_wall_clock_timestamps():
    current = np.zeros(16, dtype=np.int64)
    current[10:13] = 1
    families = np.array(["benign"] * 16, dtype=object)
    families[10:13] = "dos"
    probs = np.zeros((16, 3), dtype=np.float64)
    probs[7, 2] = 0.9
    ts = pd.date_range("2017-07-07 09:00", periods=16, freq="60s")
    leads = lead_time_from_future_probs(
        current, families, probs, 0.5, window_seconds=30, timestamps=ts
    )
    assert leads[0].caught
    assert leads[0].lead_windows == 3
    assert leads[0].lead_seconds == pytest.approx(180.0)


def test_merge_episodes_joins_gaps_and_drops_flickers():
    from syntra.eval.protocol import merge_attack_episodes

    raw = [(10, 10, "botnet"), (13, 20, "botnet"), (22, 22, "portscan")]
    merged = merge_attack_episodes(raw, gap=2, min_length=2)
    assert merged == [(10, 20, "botnet")]


def test_merged_lead_counts_campaign_not_flickers():
    current = np.zeros(30, dtype=np.int64)
    current[10] = 1
    current[13:16] = 1
    families = np.array(["benign"] * 30, dtype=object)
    families[10] = "botnet"
    families[13:16] = "botnet"
    probs = np.zeros((30, 3), dtype=np.float64)
    probs[8, 1] = 0.9
    raw = lead_time_from_future_probs(current, families, probs, 0.5, 30)
    merged = lead_time_from_future_probs(
        current, families, probs, 0.5, 30, merge_gap=2, min_length=2
    )
    assert len(raw) == 2
    assert len(merged) == 1
    assert merged[0].caught
    assert merged[0].start_index == 10
    assert merged[0].end_index == 15
