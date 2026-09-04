"""Novelty of predicted future states vs a train-benign Mahalanobis cloud."""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
from sklearn.covariance import LedoitWolf


class BenignCloud:
    def __init__(self, covariance: LedoitWolf, loc: float, scale: float) -> None:
        self.covariance = covariance
        self.loc = float(loc)
        self.scale = float(max(scale, 1e-6))

    def mahalanobis(self, states: np.ndarray) -> np.ndarray:
        flat = np.asarray(states, dtype=np.float64)
        if flat.ndim == 3:
            shape = flat.shape[:2]
            dist = self.covariance.mahalanobis(flat.reshape(-1, flat.shape[-1]))
            return dist.reshape(shape)
        return self.covariance.mahalanobis(flat)

    def probability(self, states: np.ndarray) -> np.ndarray:
        dist = self.mahalanobis(states)
        return 1.0 / (1.0 + np.exp(-(dist - self.loc) / self.scale))

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(
            {"covariance": self.covariance, "loc": self.loc, "scale": self.scale}, path
        )

    @classmethod
    def load(cls, path: Path) -> "BenignCloud":
        blob = joblib.load(path)
        return cls(blob["covariance"], blob["loc"], blob["scale"])


def fit_benign_cloud(
    benign_states: np.ndarray,
    calib_states: np.ndarray | None = None,
    loc_percentile: float = 90.0,
) -> BenignCloud:
    x = np.asarray(benign_states, dtype=np.float64)
    if x.ndim != 2:
        raise ValueError("benign_states must be [N, D]")
    cov = LedoitWolf().fit(x)
    calib = np.asarray(
        calib_states if calib_states is not None else x, dtype=np.float64
    )
    dist = cov.mahalanobis(calib.reshape(-1, x.shape[-1]))
    loc = float(np.percentile(dist, loc_percentile))
    scale = float(np.std(dist) + 1e-6)
    return BenignCloud(cov, loc, scale)


def combined_score(
    attack_probs: np.ndarray, novelty_probs: np.ndarray, novelty_gate: float = 0.55
) -> np.ndarray:
    attack = np.asarray(attack_probs, dtype=np.float64)
    novelty = np.asarray(novelty_probs, dtype=np.float64)
    gated = np.where(novelty >= novelty_gate, novelty, 0.0)
    return np.maximum(attack, gated)
