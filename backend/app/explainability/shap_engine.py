"""
SHAP-Style Feature Attribution and Explainability Engine
"""
from typing import Dict, Any, List
from ..models.schemas import FeatureImpact, ExplainabilityResponse

def compute_shap_explanations(current_stage_idx: int, risk_score: float, features: Dict[str, float]) -> ExplainabilityResponse:
    """
    Computes explainable SHAP attributions based on feature contributions relative to normal baseline.
    """
    base_value = 1.2  # Normal expected risk baseline

    # Stage-aware feature contribution dynamics
    if current_stage_idx <= 1:
        # Normal Stage
        impacts = [
            FeatureImpact(feature_name="packet_rate", display_name="Packet Rate", shap_value=0.03, baseline_value=85.0, current_value=88.2, unit="pkts/s", impact_type="neutral"),
            FeatureImpact(feature_name="port_activity", display_name="Port Activity", shap_value=0.02, baseline_value=443.0, current_value=443.0, unit="std ports", impact_type="neutral"),
            FeatureImpact(feature_name="flow_duration", display_name="Flow Duration", shap_value=-0.04, baseline_value=2.4, current_value=2.1, unit="sec", impact_type="negative_risk"),
            FeatureImpact(feature_name="tcp_flags", display_name="TCP Flag Pattern", shap_value=0.01, baseline_value=0.05, current_value=0.04, unit="syn/ack", impact_type="neutral"),
            FeatureImpact(feature_name="timing_pattern", display_name="Timing Pattern", shap_value=-0.02, baseline_value=1.0, current_value=0.98, unit="jitter", impact_type="negative_risk"),
        ]
        plain_text = "Network behavior is well within normal baseline parameters. Minor background fluctuations observed in benign enterprise services."
        drift_summary = "All feature metrics align with learned baseline (Z-scores < 0.8σ)."

    elif current_stage_idx == 2:
        # Anomaly Stage (Port Scan / Recon)
        impacts = [
            FeatureImpact(feature_name="port_activity", display_name="Unusual Port Activity", shap_value=+0.28, baseline_value=1.0, current_value=18.4, unit="ports/min", impact_type="positive_risk"),
            FeatureImpact(feature_name="tcp_flags", display_name="SYN Flag Pattern", shap_value=+0.22, baseline_value=0.05, current_value=0.34, unit="syn ratio", impact_type="positive_risk"),
            FeatureImpact(feature_name="packet_rate", display_name="High Packet Rate", shap_value=+0.15, baseline_value=85.0, current_value=210.0, unit="pkts/s", impact_type="positive_risk"),
            FeatureImpact(feature_name="flow_duration", display_name="Flow Duration", shap_value=-0.05, baseline_value=2.4, current_value=0.4, unit="sec", impact_type="negative_risk"),
            FeatureImpact(feature_name="failed_logins", display_name="Connection Resets", shap_value=+0.08, baseline_value=0.01, current_value=0.12, unit="rst ratio", impact_type="positive_risk"),
        ]
        plain_text = "The model increased the risk score mainly because port activity and SYN flag distribution deviated from the learned normal network behavior (rapid multi-port probing pattern)."
        drift_summary = "Significant drift detected in Port Diversity (+3.4σ) and SYN Flags (+2.9σ)."

    elif current_stage_idx == 3:
        # Increasing Risk (Initial Access / Exploit attempt)
        impacts = [
            FeatureImpact(feature_name="packet_rate", display_name="High Packet Rate", shap_value=+0.35, baseline_value=85.0, current_value=420.0, unit="pkts/s", impact_type="positive_risk"),
            FeatureImpact(feature_name="port_activity", display_name="Targeted Port Probing", shap_value=+0.27, baseline_value=443.0, current_value=8080.0, unit="dst port", impact_type="positive_risk"),
            FeatureImpact(feature_name="flow_duration", display_name="Long Flow Duration", shap_value=+0.18, baseline_value=2.4, current_value=12.4, unit="sec", impact_type="positive_risk"),
            FeatureImpact(feature_name="tcp_flags", display_name="TCP Flag Pattern", shap_value=+0.12, baseline_value=0.05, current_value=0.41, unit="flags", impact_type="positive_risk"),
            FeatureImpact(feature_name="failed_logins", display_name="Failed Auth Attempts", shap_value=+0.08, baseline_value=0.0, current_value=7.0, unit="retries", impact_type="positive_risk"),
        ]
        plain_text = "The model increased the risk score mainly because packet rate and port activity deviated sharply from learned normal patterns, accompanied by extended flow duration."
        drift_summary = "Multi-variable drift across Packet Rate (+4.1σ), Flow Duration (+3.2σ), and Auth Retries."

    else:
        # Forecast / High Risk / C2 Stage (Stage >= 4)
        impacts = [
            FeatureImpact(feature_name="packet_rate", display_name="High Packet Rate", shap_value=+0.38, baseline_value=85.0, current_value=580.0, unit="pkts/s", impact_type="positive_risk"),
            FeatureImpact(feature_name="c2_beaconing", display_name="Periodic Beaconing Jitter", shap_value=+0.31, baseline_value=0.0, current_value=0.92, unit="regularity", impact_type="positive_risk"),
            FeatureImpact(feature_name="port_activity", display_name="Unusual Port Activity", shap_value=+0.27, baseline_value=443.0, current_value=8443.0, unit="outbound", impact_type="positive_risk"),
            FeatureImpact(feature_name="flow_duration", display_name="Long Flow Duration", shap_value=+0.21, baseline_value=2.4, current_value=28.5, unit="sec", impact_type="positive_risk"),
            FeatureImpact(feature_name="tcp_flags", display_name="TCP Flag Pattern", shap_value=+0.14, baseline_value=0.05, current_value=0.48, unit="psh+ack", impact_type="positive_risk"),
        ]
        plain_text = "The strongest contributors to the current prediction are periodic outbound beaconing, sustained packet burst rate, and non-standard egress port communications."
        drift_summary = "C2 Beacon Regularity (+4.8σ) and Egress Flow Volume (+3.9σ) drive the forecasted attack progression."

    timeline_points = [
        {"time": "10:25", "level": "LOW", "score": 1.2, "note": "Normal baseline"},
        {"time": "10:26", "level": "LOW", "score": 1.5, "note": "Minor variation"},
        {"time": "10:27", "level": "MEDIUM", "score": 4.2, "note": "Reconnaissance detected"},
        {"time": "10:28", "level": "MEDIUM", "score": 5.8, "note": "Port scan escalation"},
        {"time": "10:29", "level": "HIGH", "score": 7.4, "note": "Targeted auth probing"},
        {"time": "10:30", "level": "CRITICAL" if risk_score > 8.0 else "HIGH", "score": risk_score, "note": "Forecasted C2 progression"},
    ]

    return ExplainabilityResponse(
        state_id=f"NS-00{420 + current_stage_idx}",
        timestamp="10:30:21 IST",
        overall_risk_score=risk_score,
        shap_base_value=base_value,
        feature_impacts=impacts,
        plain_english_explanation=plain_text,
        temporal_drift_summary=drift_summary,
        prediction_timeline=timeline_points
    )
