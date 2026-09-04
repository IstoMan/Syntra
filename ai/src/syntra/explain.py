from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import shap
import torch

from syntra.config import SyntraConfig
from syntra.data.schema import STATE_FEATURES
from syntra.models.baselines import load_baselines, predict_proba
from syntra.models.dataset import as_array, current_window_xy, load_split_frame
from syntra.train import load_world_model


def shap_xgboost(cfg: SyntraConfig, artifacts: Path) -> dict:
    baselines = load_baselines(artifacts)
    xgb = baselines["xgb"]
    train = load_split_frame(cfg, "train")
    test = load_split_frame(cfg, "test")
    x_train, _ = current_window_xy(train)
    x_test, _ = current_window_xy(test)
    bg_n = min(cfg.explain.shap_background, len(x_train))
    rng = np.random.default_rng(cfg.train.seed)
    bg = x_train[rng.choice(len(x_train), size=bg_n, replace=False)]
    sample_n = min(256, len(x_test))
    sample = x_test[:sample_n]
    try:
        explainer = shap.TreeExplainer(
            xgb, data=bg, feature_perturbation="interventional"
        )
        values = explainer.shap_values(sample, check_additivity=False)
        if isinstance(values, list):
            values = values[1]
        mean_abs = np.abs(np.asarray(values)).mean(axis=0)
    except Exception:
        mean_abs = np.asarray(xgb.feature_importances_, dtype=np.float64)
    ranking = sorted(
        zip(STATE_FEATURES, mean_abs.tolist()),
        key=lambda item: item[1],
        reverse=True,
    )
    payload = {
        "model": "xgboost_current_window",
        "top_features": ranking[: cfg.explain.top_k_features],
        "mean_abs_shap": {name: float(v) for name, v in zip(STATE_FEATURES, mean_abs)},
    }
    (artifacts / "shap_xgb.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    return payload


def world_model_gradients(cfg: SyntraConfig, artifacts: Path) -> dict:
    """Input-gradient attribution of mean future-attack logit w.r.t. current state."""
    device = torch.device("cpu")
    model = load_world_model(artifacts / "world_model.pt", device)
    test = load_split_frame(cfg, "test")
    sample = test.head(128)
    histories = torch.tensor(
        np.stack([as_array(h, np.float32) for h in sample["history"]]),
        dtype=torch.float32,
        requires_grad=True,
    )
    out = model(histories, future=None, teacher_forcing=0.0)
    score = out["attack_logits"].mean()
    score.backward()
    grads = histories.grad.detach().numpy()
    current = grads[:, -1, :]
    impact = np.abs(current).mean(axis=0)
    ranking = sorted(
        zip(STATE_FEATURES, impact.tolist()),
        key=lambda item: item[1],
        reverse=True,
    )
    payload = {
        "model": "world_model_future_attack_grad",
        "top_features": ranking[: cfg.explain.top_k_features],
        "mean_abs_grad": {name: float(v) for name, v in zip(STATE_FEATURES, impact)},
    }
    (artifacts / "shap_world.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    return payload


def feature_delta_explanation(
    current_state: np.ndarray,
    predicted_future: np.ndarray,
    top_k: int = 8,
) -> list[dict[str, float | str]]:
    delta = predicted_future.mean(axis=0) - current_state
    order = np.argsort(-np.abs(delta))[:top_k]
    return [
        {
            "feature": STATE_FEATURES[i],
            "delta": float(delta[i]),
            "current": float(current_state[i]),
            "predicted_mean": float(predicted_future[:, i].mean()),
        }
        for i in order
    ]
