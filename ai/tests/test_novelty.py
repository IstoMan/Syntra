from __future__ import annotations

import numpy as np
import torch

from syntra.eval.threshold import tune_threshold
from syntra.models.novelty import combined_score, fit_benign_cloud
from syntra.models.world_model import NetworkWorldModel


def test_combined_score_takes_max():
    attack = np.array([[0.1, 0.8]])
    novelty = np.array([[0.6, 0.2]])
    out = combined_score(attack, novelty, novelty_gate=0.55)
    assert np.allclose(out, [[0.6, 0.8]])
    gated = combined_score(attack, novelty, novelty_gate=0.8)
    assert np.allclose(gated, [[0.1, 0.8]])


def test_benign_cloud_flags_far_states():
    rng = np.random.default_rng(0)
    benign = rng.normal(size=(200, 8))
    cloud = fit_benign_cloud(benign, calib_states=benign)
    far = benign.mean(axis=0) + 8.0
    p_benign = float(cloud.probability(benign[:5]).mean())
    p_far = float(cloud.probability(far.reshape(1, -1))[0])
    assert p_far > p_benign


def test_tune_threshold_respects_fpr_cap():
    y_fut = np.array([0, 0, 0, 0, 1, 1])
    scores = np.array([0.05, 0.10, 0.20, 0.80, 0.90, 0.95])
    y_cur = np.array([0, 0, 0, 0, 1, 1])
    fam = np.array(["benign"] * 4 + ["dos", "dos"], dtype=object)
    all_k = scores[:, None]
    chosen = tune_threshold(
        y_fut, scores, y_cur, fam, all_k, window_seconds=30, fpr_cap=0.34
    )
    assert chosen["fpr"] <= 0.34 + 1e-9
    assert "threshold" in chosen


def test_heads_use_predicted_path_when_teacher_forcing():
    torch.manual_seed(0)
    model = NetworkWorldModel(state_dim=40, embed_dim=32, hidden_dim=32, dropout=0.0)
    history = torch.randn(2, 8, 40)
    future = torch.randn(2, 5, 40)
    model.train()
    with torch.no_grad():
        forced = model(history, future=future, teacher_forcing=1.0)
        plain = model(history, future=None, teacher_forcing=0.0)
    assert forced["attack_logits"].shape == plain["attack_logits"].shape
    assert "future_states_rec" in forced
    # Predicted states (used by heads) stay on the free-run path.
    assert torch.allclose(forced["future_states"], plain["future_states"], atol=1e-5)
