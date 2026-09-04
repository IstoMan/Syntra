"""Pick an alert threshold on validation: max catch rate with FPR cap."""

from __future__ import annotations

import numpy as np

from syntra.eval.protocol import (
    classification_at_horizon,
    lead_time_from_future_probs,
    summarize_leads,
)


def tune_threshold(
    y_future_k1: np.ndarray,
    scores_k1: np.ndarray,
    y_current: np.ndarray,
    families: np.ndarray,
    scores_all_k: np.ndarray,
    window_seconds: int,
    fpr_cap: float = 0.01,
    merge_gap: int = 2,
    min_length: int = 2,
) -> dict:
    y_future_k1 = np.asarray(y_future_k1)
    scores_k1 = np.asarray(scores_k1)
    y_current = np.asarray(y_current)
    true_neg = (y_current == 0) & (y_future_k1 == 0)
    candidates = []
    for thr in np.linspace(0.05, 0.90, 35):
        metrics = classification_at_horizon(y_future_k1, scores_k1, float(thr))
        if true_neg.any():
            benign_fpr = float((scores_k1[true_neg] >= float(thr)).mean())
        else:
            benign_fpr = metrics["fpr"]
        leads = lead_time_from_future_probs(
            y_current,
            families,
            scores_all_k,
            float(thr),
            window_seconds,
            merge_gap=merge_gap,
            min_length=min_length,
        )
        summary = summarize_leads(leads)
        candidates.append(
            {
                "threshold": float(thr),
                "fpr": metrics["fpr"],
                "benign_fpr": benign_fpr,
                "f1": metrics["f1"],
                "precision": metrics["precision"],
                "recall": metrics["recall"],
                "catch_rate": summary["catch_rate"],
                "mean_lead_seconds": summary["mean_lead_seconds"],
                "under_fpr_cap": benign_fpr <= fpr_cap + 1e-12,
            }
        )
    eligible = [c for c in candidates if c["under_fpr_cap"]]
    if eligible:
        eligible.sort(
            key=lambda c: (c["catch_rate"], c["mean_lead_seconds"], c["f1"], -c["benign_fpr"]),
            reverse=True,
        )
        winner = eligible[0]
        winner["used_fpr_cap"] = True
    else:
        candidates.sort(
            key=lambda c: (
                c["benign_fpr"],
                -c["catch_rate"],
                -c["mean_lead_seconds"],
                -c["f1"],
            )
        )
        winner = candidates[0]
        winner["used_fpr_cap"] = False
    winner["fpr_cap"] = fpr_cap
    return winner
