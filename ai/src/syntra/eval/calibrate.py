"""Temperature scaling of attack-head logits on the validation split."""

from __future__ import annotations

import numpy as np
import torch
import torch.nn.functional as F


def fit_temperature(logits: np.ndarray, labels: np.ndarray) -> float:
    """Minimize NLL of sigmoid(logits / T) on val. Returns T >= 0.05."""
    z = torch.tensor(np.asarray(logits, dtype=np.float32).reshape(-1))
    y = torch.tensor(np.asarray(labels, dtype=np.float32).reshape(-1))
    if z.numel() == 0 or y.max() <= 0 or y.min() >= 1:
        return 1.0
    log_t = torch.nn.Parameter(torch.zeros(1))
    opt = torch.optim.LBFGS([log_t], lr=0.25, max_iter=50, line_search_fn="strong_wolfe")

    def closure() -> torch.Tensor:
        opt.zero_grad()
        temp = log_t.exp().clamp(0.05, 20.0)
        loss = F.binary_cross_entropy_with_logits(z / temp, y)
        loss.backward()
        return loss

    opt.step(closure)
    return float(log_t.exp().clamp(0.05, 20.0).item())


def apply_temperature(logits: np.ndarray, temperature: float) -> np.ndarray:
    z = np.asarray(logits, dtype=np.float64)
    t = max(float(temperature), 1e-6)
    return 1.0 / (1.0 + np.exp(-np.clip(z / t, -60.0, 60.0)))
