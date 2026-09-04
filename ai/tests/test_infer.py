from __future__ import annotations

import numpy as np
import torch

from syntra.data.schema import STATE_FEATURES
from syntra.infer import (
    apply_scaler,
    demo_history_for_stage,
    explain,
    forecast,
    parse_mitre,
    soc_stage_label,
    synthesize_scaler,
    InferRuntime,
)
from syntra.models.world_model import NetworkWorldModel


def test_soc_and_mitre_mapping():
    assert soc_stage_label("command_and_control") == "Command & Control"
    assert soc_stage_label("reconnaissance") == "Reconnaissance"
    tech_id, name = parse_mitre("portscan")
    assert tech_id == "T1046"
    assert "Discovery" in name or "Network" in name


def test_scaler_clips_to_unit_interval():
    scaler = synthesize_scaler()
    assert set(scaler) == set(STATE_FEATURES)
    raw = np.array([scaler[n]["max"] + 10.0 for n in STATE_FEATURES], dtype=np.float32)
    scaled = apply_scaler(raw, scaler)
    assert scaled.shape == (40,)
    assert float(scaled.min()) >= 0.0
    assert float(scaled.max()) <= 1.0


def test_demo_history_shape_and_range():
    scaler = synthesize_scaler()
    hist = demo_history_for_stage(4, history_len=16, scaler=scaler, seed=0)
    assert hist.shape == (16, 40)
    assert float(hist.min()) >= 0.0
    assert float(hist.max()) <= 1.0
    benign = demo_history_for_stage(1, history_len=16, scaler=scaler, seed=0)
    assert not np.allclose(hist[-1], benign[-1])


def test_forecast_and_explain_on_in_memory_model():
    scaler = synthesize_scaler()
    model = NetworkWorldModel(state_dim=40, embed_dim=32, hidden_dim=32)
    model.eval()
    runtime = InferRuntime(
        model=model,
        scaler=scaler,
        threshold=0.5,
        novelty_gate=0.55,
        cloud=None,
        history_len=8,
        horizon_k=5,
        device=torch.device("cpu"),
        artifacts_dir=__import__("pathlib").Path("."),
        has_novelty=False,
    )
    history = demo_history_for_stage(2, history_len=8, scaler=scaler, seed=1)
    result = forecast(runtime, history)
    assert len(result.steps) == 5
    assert 0.0 <= result.attack_probability <= 1.0
    assert result.steps[0].soc_stage
    attrs = explain(runtime, history, top_k=5)
    assert len(attrs) == 5
    assert attrs[0].feature_name in STATE_FEATURES
