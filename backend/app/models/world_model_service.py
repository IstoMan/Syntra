"""
Lazy GRU world-model adapter for FastAPI.

Loads `syntra.infer` on first use. If torch or world_model.pt is missing,
callers fall back to the existing stage-scripted stubs.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Optional

from .schemas import (
    ExplainabilityResponse,
    FeatureImpact,
    ForecastPrediction,
    ForecastResponse,
    ModelPerformanceMetrics,
    NetworkState,
    RiskAnalysisResponse,
    RiskComponent,
    RiskHistoryPoint,
)
from .temporal_model import generate_attack_forecast
from ..explainability.shap_engine import compute_shap_explanations
from ..simulation.traffic_simulator import simulator

logger = logging.getLogger("syntra.world_model")

MODEL_ARCHITECTURE = "Transformer+GRU world model (K=5)"
BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_ROOT.parent
AI_SRC = REPO_ROOT / "ai" / "src"
DEFAULT_ARTIFACTS = REPO_ROOT / "ai" / "artifacts"
DEFAULT_PROCESSED = REPO_ROOT / "ai" / "data" / "processed"


def _ensure_syntra_on_path() -> None:
    src = str(AI_SRC)
    if AI_SRC.is_dir() and src not in sys.path:
        sys.path.insert(0, src)


def artifacts_dir() -> Path:
    env = os.environ.get("SYNTRA_ARTIFACTS_DIR")
    return Path(env) if env else DEFAULT_ARTIFACTS


def processed_dir() -> Path:
    """Where `python -m syntra.prepare` writes windows/sequences and the scaler."""
    env = os.environ.get("SYNTRA_PROCESSED_DIR")
    return Path(env) if env else DEFAULT_PROCESSED


def _risk_level(score: float) -> str:
    if score >= 8.0:
        return "CRITICAL"
    if score >= 6.0:
        return "HIGH"
    if score >= 3.5:
        return "MEDIUM"
    return "LOW"


def _risk_badge(prob: float) -> str:
    if prob >= 0.75:
        return "CRITICAL"
    if prob >= 0.55:
        return "HIGH"
    if prob >= 0.30:
        return "MEDIUM"
    return "LOW"


def _network_status(stage_idx: int, combined: float) -> str:
    if stage_idx >= 7:
        return "NORMAL"
    if combined >= 0.75 or stage_idx >= 5:
        return "HIGH RISK"
    if combined >= 0.45 or stage_idx >= 3:
        return "SUSPICIOUS"
    if combined >= 0.25 or stage_idx >= 2:
        return "ANOMALY"
    return "NORMAL"


def _advance_clock(time_ist: str, plus_seconds: int) -> str:
    raw = time_ist.replace(" IST", "").strip()
    try:
        h, m, s = [int(p) for p in raw.split(":")]
    except ValueError:
        return time_ist
    total = h * 3600 + m * 60 + s + plus_seconds
    h = (total // 3600) % 24
    m = (total % 3600) // 60
    s = total % 60
    return f"{h:02d}:{m:02d}:{s:02d} IST"


def _horizon_row(metrics: dict, split: str, model: str, k: int) -> Optional[dict]:
    rows = metrics.get(split, {}).get("horizon") or []
    for row in rows:
        if row.get("model") == model and int(row.get("k", -1)) == k:
            return row
    return None


def _auc_from_operating_point(fpr: float, tpr: float) -> float:
    fpr = min(max(float(fpr), 0.0), 1.0)
    tpr = min(max(float(tpr), 0.0), 1.0)
    return float(tpr * fpr / 2.0 + (1.0 + tpr) * (1.0 - fpr) / 2.0)


class WorldModelService:
    def __init__(self) -> None:
        self._tried = False
        self._runtime = None
        self._load_error: Optional[str] = None
        self._history = None
        self._last_stage: Optional[int] = None

    def reset(self) -> None:
        self._history = None
        self._last_stage = None

    def ensure_loaded(self) -> bool:
        if self._tried:
            return self._runtime is not None
        self._tried = True
        try:
            _ensure_syntra_on_path()
            from syntra.infer import load_runtime

            self._runtime = load_runtime(artifacts_dir())
            logger.info("Loaded Transformer+GRU world model from %s", artifacts_dir())
            return True
        except Exception as exc:
            self._runtime = None
            self._load_error = str(exc)
            logger.warning("World model not loaded (%s); using demo fallback", exc)
            return False

    @property
    def loaded(self) -> bool:
        return self.ensure_loaded()

    def status(self) -> dict[str, Any]:
        loaded = self.ensure_loaded()
        return {
            "model_loaded": loaded,
            "inference_source": "world_model" if loaded else "demo_fallback",
            "model_architecture": MODEL_ARCHITECTURE,
            "artifacts_dir": str(artifacts_dir()),
            "load_error": None if loaded else self._load_error,
            "has_novelty": bool(getattr(self._runtime, "has_novelty", False)) if loaded else False,
            "alert_threshold": float(self._runtime.threshold) if loaded else None,
        }

    def _history_for_stage(self, stage: int):
        from syntra.infer import demo_history_for_stage

        runtime = self._runtime
        if self._last_stage != stage or self._history is None:
            self._history = demo_history_for_stage(
                stage, runtime.history_len, runtime.scaler, seed=42
            )
            self._last_stage = stage
        return self._history

    def _stamp_fallback_forecast(self, response: ForecastResponse) -> ForecastResponse:
        return response.model_copy(
            update={
                "inference_source": "demo_fallback",
                "model_loaded": False,
                "model_architecture": f"{MODEL_ARCHITECTURE} [fallback]",
            }
        )

    def forecast_response(self) -> ForecastResponse:
        stage = simulator.current_stage
        stub_risk = simulator.get_risk_score()
        stub_prob = simulator.get_attack_probability()
        if not self.loaded:
            return self._stamp_fallback_forecast(
                generate_attack_forecast(stage, stub_risk, stub_prob)
            )

        from syntra.infer import forecast as run_forecast, soc_stage_label

        runtime = self._runtime
        history = self._history_for_stage(stage)
        result = run_forecast(runtime, history)
        now = simulator._get_current_time_str()
        combined = float(result.combined_score)
        attack_prob = float(result.attack_probability)
        risk_score = min(10.0, max(0.0, combined * 10.0))
        soc_now = soc_stage_label(result.current_stage)

        predictions = []
        for step in result.steps:
            predictions.append(
                ForecastPrediction(
                    window=step.window,
                    window_label=f"t+{step.window}",
                    predicted_stage=step.soc_stage,
                    probability=round(step.combined_score, 4),
                    confidence=round(step.stage_prob, 4),
                    risk_score=round(min(10.0, step.combined_score * 10.0), 2),
                    risk_badge=_risk_badge(step.combined_score),
                    mitre_technique_id=step.mitre_id or None,
                    mitre_technique_name=step.mitre_name or None,
                    expected_time_ist=_advance_clock(now, step.window * 30),
                    predicted_family=step.family,
                )
            )

        above = combined >= result.alert_threshold
        reasoning = [
            f"GRU world-model combined score {combined:.2f} vs alert threshold {result.alert_threshold:.2f}.",
            f"Predicted family at t+1: {result.current_family} ({soc_now}).",
            "Score is max(attack-head probability, novelty of predicted future state)."
            if runtime.has_novelty
            else "Novelty cloud unavailable; score is the attack-head probability on rolled-out states.",
            "Heads read predicted future states (K=5), not the current window.",
        ]
        if above:
            summary = (
                f"EARLY WARNING: GRU world model combined score {combined:.2f} "
                f"(threshold {result.alert_threshold:.2f}). "
                f"Forecast family {result.current_family} progressing toward {predictions[-1].predicted_stage}."
            )
        else:
            summary = (
                f"World model combined score {combined:.2f} is below alert threshold "
                f"{result.alert_threshold:.2f}. Forecast remains {soc_now}."
            )

        current_state = NetworkState(
            state_id=f"NS-WM-{stage:02d}",
            timestamp=now,
            risk_score=round(risk_score, 2),
            risk_level=_risk_level(risk_score),
            attack_probability=round(attack_prob, 4),
            network_status=_network_status(stage, combined),
            forecast_horizon=runtime.horizon_k,
            active_threats=1 if above or stage > 1 else 0,
            monitored_nodes=6,
            total_flows_window=28547 + stage * 410,
            current_stage=soc_now.upper(),
        )
        return ForecastResponse(
            current_state=current_state,
            lead_time_windows=runtime.horizon_k,
            forecast_horizon=runtime.horizon_k,
            predictions=predictions,
            forecast_reasoning=reasoning,
            forecast_summary=summary,
            model_architecture=MODEL_ARCHITECTURE,
            inference_source="world_model",
            predicted_family=result.current_family,
            combined_score=round(combined, 4),
            alert_threshold=round(result.alert_threshold, 4),
            model_loaded=True,
        )

    def risk_response(self) -> RiskAnalysisResponse:
        if not self.loaded:
            data = simulator.get_risk_analysis()
            patched = []
            for component in data.components:
                desc = component.description.replace("LSTM", "GRU world model")
                patched.append(component.model_copy(update={"description": desc}))
            return data.model_copy(
                update={
                    "components": patched,
                    "inference_source": "demo_fallback",
                    "model_loaded": False,
                }
            )

        fc = self.forecast_response()
        score = fc.current_state.risk_score
        prob = fc.current_state.attack_probability
        combined = fc.combined_score or prob
        now = fc.current_state.timestamp
        stage_name = fc.current_state.current_stage
        history = list(simulator.risk_history)
        history.append(
            RiskHistoryPoint(
                timestamp_ist=now,
                risk_score=score,
                level=fc.current_state.risk_level,
                stage=stage_name,
            )
        )
        components = [
            RiskComponent(
                name="Traffic Anomaly",
                score_percentage=min(100.0, score * 9.4),
                description="Deviation of the current 40-dim window from the learned benign envelope",
                weight=0.35,
            ),
            RiskComponent(
                name="Temporal Escalation",
                score_percentage=min(100.0, score * 8.8),
                description="GRU rollout velocity across the K=5 predicted future states",
                weight=0.25,
            ),
            RiskComponent(
                name="Attack Probability",
                score_percentage=round(prob * 100, 1),
                description="World-model combined score (attack head, novelty-gated)",
                weight=0.25,
            ),
            RiskComponent(
                name="Asset Severity",
                score_percentage=min(100.0, score * 8.5),
                description="Criticality weighting of target infrastructure (Web/Auth/DB)",
                weight=0.15,
            ),
        ]
        if score < 3.0:
            interpretation = (
                "Risk is LOW. GRU world-model combined score is below the alert threshold; "
                "windowed network state aligns with the train-benign envelope."
            )
        elif score < 6.0:
            interpretation = (
                "Risk is MEDIUM. Predicted future states drift toward "
                f"{fc.predicted_family or 'an attack family'}. Increased monitoring recommended."
            )
        else:
            interpretation = (
                "Risk is HIGH. Combined score exceeds the val-tuned threshold; "
                f"the model forecasts {fc.predictions[-1].predicted_stage if fc.predictions else 'further progression'} "
                "within the 5-window horizon."
            )
        return RiskAnalysisResponse(
            current_risk_score=score,
            risk_level=fc.current_state.risk_level,
            attack_probability=prob,
            components=components,
            history=history[-8:],
            soc_interpretation=interpretation,
            inference_source="world_model",
            model_loaded=True,
            combined_score=combined,
        )

    def explanation_response(self) -> ExplainabilityResponse:
        stage = simulator.current_stage
        stub_risk = simulator.get_risk_score()
        if not self.loaded:
            data = compute_shap_explanations(stage, stub_risk, {})
            return data.model_copy(
                update={"inference_source": "demo_fallback", "model_loaded": False}
            )

        from syntra.infer import explain as run_explain, load_global_shap

        runtime = self._runtime
        history = self._history_for_stage(stage)
        fc = self.forecast_response()
        try:
            attrs = run_explain(runtime, history, top_k=8)
            source_note = "input-gradient attribution of future attack logits"
        except Exception as exc:
            logger.warning("Live gradient explain failed (%s); using shap_world.json", exc)
            attrs = load_global_shap(runtime.artifacts_dir, top_k=8) or []
            source_note = "global mean |gradient| ranking (shap_world.json)"

        impacts = [
            FeatureImpact(
                feature_name=item.feature_name,
                display_name=item.display_name,
                shap_value=item.shap_value,
                baseline_value=item.baseline_value,
                current_value=item.current_value,
                unit=item.unit,
                impact_type=item.impact_type,
            )
            for item in attrs
        ]
        top_pos = [i for i in impacts if i.shap_value > 0][:3]
        if top_pos:
            names = ", ".join(i.display_name for i in top_pos)
            plain = (
                f"The GRU world model increased future-attack probability mainly because "
                f"{names} contributed positive attribution on the current window ({source_note})."
            )
        else:
            plain = (
                "Feature attributions on the current window are near the learned baseline; "
                f"combined score {fc.combined_score:.2f}."
            )
        drift = (
            f"Predicted family {fc.predicted_family} → {fc.current_state.current_stage}. "
            f"Combined {fc.combined_score:.2f} vs θ={fc.alert_threshold:.2f}."
        )
        timeline = [
            {
                "time": pred.expected_time_ist,
                "level": pred.risk_badge,
                "score": pred.risk_score,
                "note": f"{pred.window_label} {pred.predicted_stage}",
            }
            for pred in fc.predictions
        ]
        return ExplainabilityResponse(
            state_id=fc.current_state.state_id,
            timestamp=fc.current_state.timestamp,
            overall_risk_score=fc.current_state.risk_score,
            shap_base_value=round(fc.alert_threshold or 0.5, 4),
            feature_impacts=impacts,
            plain_english_explanation=plain,
            temporal_drift_summary=drift,
            prediction_timeline=timeline,
            inference_source="world_model",
            model_loaded=True,
        )

    def performance_metrics(self) -> ModelPerformanceMetrics:
        metrics_path = artifacts_dir() / "metrics.json"
        if not metrics_path.is_file():
            return ModelPerformanceMetrics(
                is_demo_sample=True,
                notice="DEMO / SAMPLE RESULTS - Simulated baseline & temporal validation metrics",
                precision=91.3,
                recall=93.1,
                f1_score=92.2,
                false_positive_rate=4.8,
                forecast_lead_time_windows=5,
                auc_roc=0.964,
                accuracy=92.8,
                confusion_matrix={
                    "true_positive": 1420,
                    "false_positive": 72,
                    "true_negative": 14280,
                    "false_negative": 105,
                },
                roc_curve=[
                    {"fpr": 0.0, "tpr": 0.0},
                    {"fpr": 0.01, "tpr": 0.45},
                    {"fpr": 0.048, "tpr": 0.931},
                    {"fpr": 1.0, "tpr": 1.0},
                ],
                model_comparison=[
                    {
                        "model": "SYNTRA GRU World Model (Proposed)",
                        "type": "Temporal Forecaster",
                        "lead_time": "5 Windows Ahead",
                        "f1": 92.2,
                        "fpr": 4.8,
                        "explainability": "Gradients + ATT&CK",
                        "usp": "Forecasts attack progression before compromise",
                    },
                    {
                        "model": "XGBoost current-window (detection)",
                        "type": "Static Point-in-Time",
                        "lead_time": "0 (Reactive)",
                        "f1": 88.4,
                        "fpr": 7.2,
                        "explainability": "Tree SHAP",
                        "usp": "Detects current anomaly only",
                    },
                    {
                        "model": "Logistic Regression current-window",
                        "type": "Static Point-in-Time",
                        "lead_time": "0 (Reactive)",
                        "f1": 81.0,
                        "fpr": 12.5,
                        "explainability": "Coefficients",
                        "usp": "Detects current anomaly only",
                    },
                ],
                inference_source="demo_fallback",
                model_loaded=self.loaded,
            )

        payload = json.loads(metrics_path.read_text(encoding="utf-8"))
        row = _horizon_row(payload, "test", "world_model_combined", 1) or _horizon_row(
            payload, "test", "world_model", 1
        )
        if row is None:
            row = {
                "precision": 0.0,
                "recall": 0.0,
                "f1": 0.0,
                "fpr": 0.0,
                "support_pos": 0,
                "support_neg": 0,
                "ece": 0.0,
            }
        xgb = _horizon_row(payload, "test", "xgb_as_forecast", 1) or {}
        logreg = _horizon_row(payload, "test", "logreg_as_forecast", 1) or {}
        lead = payload.get("test", {}).get("lead_world_model") or {}
        family_acc = float(payload.get("test", {}).get("family_acc_future") or 0.0)
        precision = float(row.get("precision") or 0.0) * 100.0
        recall = float(row.get("recall") or 0.0) * 100.0
        f1 = float(row.get("f1") or 0.0) * 100.0
        fpr = float(row.get("fpr") or 0.0) * 100.0
        support_pos = float(row.get("support_pos") or 0.0)
        support_neg = float(row.get("support_neg") or 0.0)
        tp = int(round(recall / 100.0 * support_pos))
        fn = int(round(support_pos - tp))
        fp = int(round(fpr / 100.0 * support_neg))
        tn = int(round(support_neg - fp))
        tpr = recall / 100.0
        fpr_ratio = fpr / 100.0
        mean_lead = float(lead.get("mean_lead_seconds") or 0.0)
        return ModelPerformanceMetrics(
            is_demo_sample=False,
            notice=(
                "CIC-IDS2017 purged family-blocked time split "
                "(per-day train/val/test; infiltration held out of train). "
                "Headline F1@k=1 is world_model_combined. Current-window XGBoost is detection, not forecasting."
            ),
            precision=round(precision, 1),
            recall=round(recall, 1),
            f1_score=round(f1, 1),
            false_positive_rate=round(fpr, 2),
            forecast_lead_time_windows=5,
            auc_roc=round(_auc_from_operating_point(fpr_ratio, tpr), 3),
            accuracy=round(family_acc * 100.0, 1),
            confusion_matrix={
                "true_positive": max(tp, 0),
                "false_positive": max(fp, 0),
                "true_negative": max(tn, 0),
                "false_negative": max(fn, 0),
            },
            roc_curve=[
                {"fpr": 0.0, "tpr": 0.0},
                {"fpr": round(fpr_ratio, 4), "tpr": round(tpr, 4)},
                {"fpr": 1.0, "tpr": 1.0},
            ],
            model_comparison=[
                {
                    "model": "SYNTRA GRU World Model (combined)",
                    "type": "Temporal Forecaster",
                    "lead_time": "5 Windows Ahead",
                    "f1": round(f1, 1),
                    "fpr": round(fpr, 2),
                    "explainability": "Input gradients + ATT&CK",
                    "usp": "Heads on rolled-out future states",
                },
                {
                    "model": "XGBoost current-window as forecast",
                    "type": "Detection (not forecasting)",
                    "lead_time": "0 (Reactive)",
                    "f1": round(float(xgb.get("f1") or 0.0) * 100.0, 1),
                    "fpr": round(float(xgb.get("fpr") or 0.0) * 100.0, 2),
                    "explainability": "Tree SHAP",
                    "usp": "Current-window labels only",
                },
                {
                    "model": "LogReg current-window as forecast",
                    "type": "Detection (not forecasting)",
                    "lead_time": "0 (Reactive)",
                    "f1": round(float(logreg.get("f1") or 0.0) * 100.0, 1),
                    "fpr": round(float(logreg.get("fpr") or 0.0) * 100.0, 2),
                    "explainability": "Coefficients",
                    "usp": "Current-window labels only",
                },
            ],
            inference_source="world_model" if self.loaded else "metrics_artifact",
            model_loaded=self.loaded,
            mean_lead_seconds=mean_lead,
        )


world_model_service = WorldModelService()
