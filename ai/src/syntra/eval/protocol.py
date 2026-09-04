"""Time-split and lead-time protocol. Current-window labels are detection-only."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

ALLOWED_SPLITS = frozenset({"train", "val", "test"})


def assert_time_split_strategy(strategy: str) -> None:
    if strategy != "time":
        raise ValueError(
            f"Split strategy must be 'time' (got {strategy!r}). "
            "Random row shuffles turn forecasting into detection."
        )


def assign_split(
    day: str, train_days: list[str], val_days: list[str], test_days: list[str]
) -> str:
    key = day.strip().lower()
    if key in train_days:
        return "train"
    if key in val_days:
        return "val"
    if key in test_days:
        return "test"
    raise ValueError(f"Day {day!r} is not in train/val/test day lists.")


def future_attack_matrix(current_attack: np.ndarray, horizon_k: int) -> np.ndarray:
    """Y[t, k] = current_attack[t + k + 1] for k in 0..K-1. Does not include y_t."""
    if horizon_k < 1:
        raise ValueError(
            "horizon_k must be >= 1 so forecasts cannot collapse to detection."
        )
    n = len(current_attack)
    out = np.zeros((n, horizon_k), dtype=np.int64)
    for k in range(horizon_k):
        shift = k + 1
        if shift < n:
            out[: n - shift, k] = current_attack[shift:]
    return out


def future_class_matrix(current_ids: np.ndarray, horizon_k: int) -> np.ndarray:
    n = len(current_ids)
    out = np.zeros((n, horizon_k), dtype=np.int64)
    for k in range(horizon_k):
        shift = k + 1
        if shift < n:
            out[: n - shift, k] = current_ids[shift:]
    return out


def any_future_attack(future: np.ndarray) -> np.ndarray:
    return (future.max(axis=1) > 0).astype(np.int64)


@dataclass
class EpisodeLead:
    episode_id: int
    start_index: int
    end_index: int
    family: str
    alert_index: int | None
    lead_windows: int
    lead_seconds: float
    caught: bool


def attack_episodes(
    current_attack: np.ndarray, families: np.ndarray
) -> list[tuple[int, int, str]]:
    """Inclusive [start, end] index ranges of contiguous attack windows."""
    episodes: list[tuple[int, int, str]] = []
    n = len(current_attack)
    i = 0
    while i < n:
        if current_attack[i] <= 0:
            i += 1
            continue
        start = i
        family = str(families[i])
        while i < n and current_attack[i] > 0:
            i += 1
        episodes.append((start, i - 1, family))
    return episodes


def merge_attack_episodes(
    episodes: list[tuple[int, int, str]],
    gap: int = 2,
    min_length: int = 2,
) -> list[tuple[int, int, str]]:
    """Join same-family runs separated by short benign gaps; drop 1-window flickers.

    Used only for lead-time catch. Per-window F1 is unchanged.
    """
    if not episodes:
        return []
    merged: list[tuple[int, int, str]] = []
    cur_s, cur_e, cur_f = episodes[0]
    for start, end, family in episodes[1:]:
        benign_gap = start - cur_e - 1
        if family == cur_f and benign_gap <= gap:
            cur_e = end
        else:
            merged.append((cur_s, cur_e, cur_f))
            cur_s, cur_e, cur_f = start, end, family
    merged.append((cur_s, cur_e, cur_f))
    return [(s, e, f) for s, e, f in merged if (e - s + 1) >= min_length]


def lead_time_from_future_probs(
    current_attack: np.ndarray,
    families: np.ndarray,
    future_probs: np.ndarray,
    threshold: float,
    window_seconds: int,
    merge_gap: int = 0,
    min_length: int = 1,
) -> list[EpisodeLead]:
    """Lead time counts only alerts fired on k>=1 *before* the episode starts.

    future_probs[t, k] = P(attack at t+k+1). An alert at t is valid for an
    episode starting at s if some k satisfies t+k+1 in [s, e] and t < s.
    """
    if future_probs.ndim != 2:
        raise ValueError("future_probs must be [T, K] with K>=1")
    if future_probs.shape[1] < 1:
        raise ValueError("Lead time cannot be computed from current-window scores.")
    raw = attack_episodes(current_attack, families)
    if merge_gap > 0 or min_length > 1:
        episodes = merge_attack_episodes(raw, gap=merge_gap, min_length=min_length)
    else:
        episodes = raw
    results: list[EpisodeLead] = []
    for epid, (start, end, family) in enumerate(episodes):
        alert_index = None
        for t in range(start):
            for k in range(future_probs.shape[1]):
                target = t + k + 1
                if start <= target <= end and future_probs[t, k] >= threshold:
                    alert_index = t
                    break
            if alert_index is not None:
                break
        if alert_index is None:
            results.append(EpisodeLead(epid, start, end, family, None, 0, 0.0, False))
        else:
            lead_w = start - alert_index
            results.append(
                EpisodeLead(
                    epid,
                    start,
                    end,
                    family,
                    alert_index,
                    lead_w,
                    float(lead_w * window_seconds),
                    True,
                )
            )
    return results


def classification_at_horizon(
    y_true_k: np.ndarray,
    y_prob_k: np.ndarray,
    threshold: float,
) -> dict[str, float]:
    y_hat = (y_prob_k >= threshold).astype(np.int64)
    tp = float(((y_hat == 1) & (y_true_k == 1)).sum())
    fp = float(((y_hat == 1) & (y_true_k == 0)).sum())
    tn = float(((y_hat == 0) & (y_true_k == 0)).sum())
    fn = float(((y_hat == 0) & (y_true_k == 1)).sum())
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    fpr = fp / (fp + tn) if (fp + tn) else 0.0
    return {
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "fpr": fpr,
        "support_pos": tp + fn,
        "support_neg": tn + fp,
    }


def expected_calibration_error(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10,
) -> float:
    probs = np.clip(y_prob.astype(np.float64), 0.0, 1.0)
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    ece = 0.0
    n = len(probs)
    if n == 0:
        return 0.0
    for i in range(n_bins):
        mask = (probs >= bins[i]) & (
            probs < bins[i + 1] if i < n_bins - 1 else probs <= bins[i + 1]
        )
        if not mask.any():
            continue
        acc = y_true[mask].mean()
        conf = probs[mask].mean()
        ece += (mask.sum() / n) * abs(acc - conf)
    return float(ece)


def summarize_leads(leads: list[EpisodeLead]) -> dict[str, float]:
    if not leads:
        return {
            "episodes": 0,
            "catch_rate": 0.0,
            "mean_lead_seconds": 0.0,
            "median_lead_seconds": 0.0,
            "mean_lead_windows": 0.0,
        }
    caught = [item for item in leads if item.caught]
    leads_s = np.array([item.lead_seconds for item in leads], dtype=np.float64)
    leads_w = np.array([item.lead_windows for item in leads], dtype=np.float64)
    return {
        "episodes": float(len(leads)),
        "catch_rate": float(len(caught) / len(leads)),
        "mean_lead_seconds": float(leads_s.mean()),
        "median_lead_seconds": float(np.median(leads_s)),
        "mean_lead_windows": float(leads_w.mean()),
    }


def assert_no_current_window_leak(future: np.ndarray, current: np.ndarray) -> None:
    """Forecast labels at k=0 must equal current[t+1], not current[t]."""
    if future.shape[0] != current.shape[0]:
        raise ValueError("future and current length mismatch")
    if not np.array_equal(future[:-1, 0], current[1:]):
        raise AssertionError("Forecast label leak: Y[t,0] must be y[t+1], never y[t].")
    # Last row cannot look into the future; it must be zero-padded, not y_T.
    if future[-1, 0] != 0:
        raise AssertionError(
            "Final window must not receive a fabricated current-window forecast label."
        )


def windows_frame_with_future(
    windows: pd.DataFrame,
    horizon_k: int,
    day_col: str = "day",
) -> pd.DataFrame:
    """Attach future labels per day so sequences do not cross day boundaries."""
    frames = []
    for _, group in windows.groupby(day_col, sort=False):
        group = group.sort_values("window_idx").reset_index(drop=True)
        y = group["y_attack"].to_numpy()
        fam = group["family_id"].to_numpy()
        stg = group["stage_id"].to_numpy()
        fut_y = future_attack_matrix(y, horizon_k)
        fut_f = future_class_matrix(fam, horizon_k)
        fut_s = future_class_matrix(stg, horizon_k)
        assert_no_current_window_leak(fut_y, y)
        piece = group.copy()
        for k in range(horizon_k):
            piece[f"y_future_{k + 1}"] = fut_y[:, k]
            piece[f"family_future_{k + 1}"] = fut_f[:, k]
            piece[f"stage_future_{k + 1}"] = fut_s[:, k]
        piece["y_any_future"] = any_future_attack(fut_y)
        frames.append(piece)
    return pd.concat(frames, ignore_index=True)
