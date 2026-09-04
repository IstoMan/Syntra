from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from syntra.config import SyntraConfig
from syntra.models.dataset import current_window_xy, load_split_frame


def _balanced_xgb() -> XGBClassifier:
    return XGBClassifier(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.8,
        objective="binary:logistic",
        eval_metric="logloss",
        n_jobs=4,
        tree_method="hist",
        random_state=42,
    )


def train_baselines(cfg: SyntraConfig, artifacts: Path) -> dict[str, Path]:
    train = load_split_frame(cfg, "train")
    x_train, y_train = current_window_xy(train)
    pos = max(y_train.sum(), 1)
    neg = max(len(y_train) - pos, 1)
    spw = neg / pos

    lr = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "clf",
                LogisticRegression(
                    max_iter=400,
                    class_weight="balanced",
                    solver="liblinear",
                ),
            ),
        ]
    )
    lr.fit(x_train, y_train)

    xgb = _balanced_xgb()
    xgb.set_params(scale_pos_weight=spw)
    xgb.fit(x_train, y_train)

    artifacts.mkdir(parents=True, exist_ok=True)
    lr_path = artifacts / "baseline_logreg.joblib"
    xgb_path = artifacts / "baseline_xgb.joblib"
    joblib.dump(lr, lr_path)
    joblib.dump(xgb, xgb_path)
    return {"logreg": lr_path, "xgb": xgb_path}


def load_baselines(artifacts: Path) -> dict[str, object]:
    return {
        "logreg": joblib.load(artifacts / "baseline_logreg.joblib"),
        "xgb": joblib.load(artifacts / "baseline_xgb.joblib"),
    }


def predict_proba(model, x: np.ndarray) -> np.ndarray:
    proba = model.predict_proba(x)
    if proba.ndim == 2 and proba.shape[1] == 2:
        return proba[:, 1]
    return proba.reshape(-1)
