from __future__ import annotations

import torch

from syntra.models.world_model import NetworkWorldModel


def test_rollout_heads_are_on_future_steps_only():
    model = NetworkWorldModel(state_dim=40, embed_dim=32, hidden_dim=32)
    model.eval()
    history = torch.randn(4, 8, 40)
    future = torch.randn(4, 5, 40)
    out = model(history, future=None, teacher_forcing=0.0)
    assert out["future_states"].shape == (4, 5, 40)
    assert out["attack_logits"].shape == (4, 5)
    assert out["family_logits"].shape == (4, 5, 8)
    assert out["stage_logits"].shape == (4, 5, 6)
    assert out["history_attn"].shape == (4, 8)
    # Reconstruction is a prediction of the future, not a copy of the last history step.
    last = history[:, -1, :].unsqueeze(1).expand(-1, 5, -1)
    assert not torch.allclose(out["future_states"], last)


def test_two_layer_gru_accepts_longer_history():
    model = NetworkWorldModel(
        state_dim=40, embed_dim=32, hidden_dim=32, num_layers=2, dropout=0.1
    )
    model.eval()
    history = torch.randn(2, 16, 40)
    out = model(history, future=None, teacher_forcing=0.0)
    assert out["future_states"].shape == (2, 5, 40)
    assert out["history_attn"].shape == (2, 16)
