"""
Temporal Multi-Step Attack Forecasting Model (LSTM/GRU Transition Simulator)
"""
from typing import List, Dict, Any
from .schemas import ForecastPrediction, ForecastResponse, NetworkState

MITRE_TECHNIQUES = {
    "Reconnaissance": {"id": "T1595", "name": "Active Scanning"},
    "Initial Access": {"id": "T1190", "name": "Exploit Public-Facing Application"},
    "Execution": {"id": "T1059", "name": "Command and Scripting Interpreter"},
    "Privilege Escalation": {"id": "T1068", "name": "Exploitation for Privilege Escalation"},
    "Command & Control": {"id": "T1071", "name": "Application Layer Protocol (C2)"},
    "Lateral Movement": {"id": "T1021", "name": "Remote Services / SMB"},
    "Exfiltration": {"id": "T1048", "name": "Exfiltration Over Alternative Protocol"}
}

def generate_attack_forecast(current_stage_idx: int, risk_score: float, attack_prob: float) -> ForecastResponse:
    """
    Computes k-step (t+1 .. t+5) attack stage forecast based on the current temporal network state.
    """
    time_labels = ["10:31:00 IST", "10:32:00 IST", "10:33:00 IST", "10:34:00 IST", "10:35:00 IST"]

    if current_stage_idx <= 1:
        # Stage 1: Normal
        predictions = [
            ForecastPrediction(
                window=1, window_label="t+1", predicted_stage="Reconnaissance",
                probability=0.12, confidence=0.88, risk_score=1.4, risk_badge="LOW",
                mitre_technique_id=MITRE_TECHNIQUES["Reconnaissance"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Reconnaissance"]["name"],
                expected_time_ist=time_labels[0]
            ),
            ForecastPrediction(
                window=2, window_label="t+2", predicted_stage="Initial Access",
                probability=0.08, confidence=0.84, risk_score=1.2, risk_badge="LOW",
                mitre_technique_id=MITRE_TECHNIQUES["Initial Access"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Initial Access"]["name"],
                expected_time_ist=time_labels[1]
            ),
            ForecastPrediction(
                window=3, window_label="t+3", predicted_stage="Execution",
                probability=0.05, confidence=0.81, risk_score=1.0, risk_badge="LOW",
                mitre_technique_id=MITRE_TECHNIQUES["Execution"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Execution"]["name"],
                expected_time_ist=time_labels[2]
            ),
            ForecastPrediction(
                window=4, window_label="t+4", predicted_stage="Privilege Escalation",
                probability=0.03, confidence=0.79, risk_score=0.9, risk_badge="LOW",
                mitre_technique_id=MITRE_TECHNIQUES["Privilege Escalation"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Privilege Escalation"]["name"],
                expected_time_ist=time_labels[3]
            ),
            ForecastPrediction(
                window=5, window_label="t+5", predicted_stage="Command & Control",
                probability=0.02, confidence=0.75, risk_score=0.8, risk_badge="LOW",
                mitre_technique_id=MITRE_TECHNIQUES["Command & Control"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Command & Control"]["name"],
                expected_time_ist=time_labels[4]
            ),
        ]
        reasoning = [
            "Network state metrics conform to baseline distribution.",
            "Zero high-entropy port probing observed across monitored subnets.",
            "Normal enterprise service flow duration and session count.",
            "No active temporal escalation indicators."
        ]
        summary = "Based on the sequence of recent network states, the temporal model forecasts stable baseline behavior with negligible risk of cyberattack progression."

    elif current_stage_idx == 2:
        # Stage 2: Anomaly / Reconnaissance
        predictions = [
            ForecastPrediction(
                window=1, window_label="t+1", predicted_stage="Initial Access",
                probability=0.48, confidence=0.85, risk_score=4.6, risk_badge="MEDIUM",
                mitre_technique_id=MITRE_TECHNIQUES["Initial Access"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Initial Access"]["name"],
                expected_time_ist=time_labels[0]
            ),
            ForecastPrediction(
                window=2, window_label="t+2", predicted_stage="Execution",
                probability=0.42, confidence=0.79, risk_score=4.2, risk_badge="MEDIUM",
                mitre_technique_id=MITRE_TECHNIQUES["Execution"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Execution"]["name"],
                expected_time_ist=time_labels[1]
            ),
            ForecastPrediction(
                window=3, window_label="t+3", predicted_stage="Privilege Escalation",
                probability=0.35, confidence=0.74, risk_score=3.8, risk_badge="LOW",
                mitre_technique_id=MITRE_TECHNIQUES["Privilege Escalation"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Privilege Escalation"]["name"],
                expected_time_ist=time_labels[2]
            ),
            ForecastPrediction(
                window=4, window_label="t+4", predicted_stage="Command & Control",
                probability=0.29, confidence=0.71, risk_score=3.2, risk_badge="LOW",
                mitre_technique_id=MITRE_TECHNIQUES["Command & Control"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Command & Control"]["name"],
                expected_time_ist=time_labels[3]
            ),
            ForecastPrediction(
                window=5, window_label="t+5", predicted_stage="Lateral Movement",
                probability=0.21, confidence=0.68, risk_score=2.8, risk_badge="LOW",
                mitre_technique_id=MITRE_TECHNIQUES["Lateral Movement"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Lateral Movement"]["name"],
                expected_time_ist=time_labels[4]
            ),
        ]
        reasoning = [
            "Sudden spike in distinct destination ports targeted from 10.10.30.42 (USER-042).",
            "Elevated SYN flag ratio indicates multi-host port reconnaissance.",
            "Temporal state transition from Baseline -> Reconnaissance confirmed."
        ]
        summary = "Based on early reconnaissance patterns, the model forecasts a 48% probability of initial access exploitation attempts in the upcoming window."

    elif current_stage_idx == 3:
        # Stage 3: Increasing Risk
        predictions = [
            ForecastPrediction(
                window=1, window_label="t+1", predicted_stage="Initial Access",
                probability=0.61, confidence=0.88, risk_score=6.8, risk_badge="HIGH",
                mitre_technique_id=MITRE_TECHNIQUES["Initial Access"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Initial Access"]["name"],
                expected_time_ist=time_labels[0]
            ),
            ForecastPrediction(
                window=2, window_label="t+2", predicted_stage="Execution",
                probability=0.67, confidence=0.84, risk_score=7.2, risk_badge="HIGH",
                mitre_technique_id=MITRE_TECHNIQUES["Execution"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Execution"]["name"],
                expected_time_ist=time_labels[1]
            ),
            ForecastPrediction(
                window=3, window_label="t+3", predicted_stage="Privilege Escalation",
                probability=0.72, confidence=0.81, risk_score=7.8, risk_badge="HIGH",
                mitre_technique_id=MITRE_TECHNIQUES["Privilege Escalation"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Privilege Escalation"]["name"],
                expected_time_ist=time_labels[2]
            ),
            ForecastPrediction(
                window=4, window_label="t+4", predicted_stage="Command & Control",
                probability=0.81, confidence=0.79, risk_score=8.4, risk_badge="CRITICAL",
                mitre_technique_id=MITRE_TECHNIQUES["Command & Control"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Command & Control"]["name"],
                expected_time_ist=time_labels[3]
            ),
            ForecastPrediction(
                window=5, window_label="t+5", predicted_stage="Lateral Movement",
                probability=0.58, confidence=0.73, risk_score=6.5, risk_badge="HIGH",
                mitre_technique_id=MITRE_TECHNIQUES["Lateral Movement"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Lateral Movement"]["name"],
                expected_time_ist=time_labels[4]
            ),
        ]
        reasoning = [
            "Packet rate increase exceeding +3.8σ against Web & Auth servers.",
            "Repeated authentication handshakes and non-standard egress port requests.",
            "Temporal progression sequence matching multi-stage intrusion archetype."
        ]
        summary = "Based on the rapid temporal escalation across recent windows, the model forecasts an 81% probability of Command & Control establishment within 4 windows."

    else:
        # Stage 4+: High Risk / Forecast / Early Warning Stage
        predictions = [
            ForecastPrediction(
                window=1, window_label="t+1", predicted_stage="Command & Control",
                probability=0.82, confidence=0.91, risk_score=8.7, risk_badge="CRITICAL",
                mitre_technique_id=MITRE_TECHNIQUES["Command & Control"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Command & Control"]["name"],
                expected_time_ist=time_labels[0]
            ),
            ForecastPrediction(
                window=2, window_label="t+2", predicted_stage="Privilege Escalation",
                probability=0.76, confidence=0.87, risk_score=8.2, risk_badge="CRITICAL",
                mitre_technique_id=MITRE_TECHNIQUES["Privilege Escalation"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Privilege Escalation"]["name"],
                expected_time_ist=time_labels[1]
            ),
            ForecastPrediction(
                window=3, window_label="t+3", predicted_stage="Lateral Movement",
                probability=0.71, confidence=0.83, risk_score=7.9, risk_badge="HIGH",
                mitre_technique_id=MITRE_TECHNIQUES["Lateral Movement"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Lateral Movement"]["name"],
                expected_time_ist=time_labels[2]
            ),
            ForecastPrediction(
                window=4, window_label="t+4", predicted_stage="Exfiltration",
                probability=0.64, confidence=0.78, risk_score=7.5, risk_badge="HIGH",
                mitre_technique_id=MITRE_TECHNIQUES["Exfiltration"]["id"],
                mitre_technique_name=MITRE_TECHNIQUES["Exfiltration"]["name"],
                expected_time_ist=time_labels[3]
            ),
            ForecastPrediction(
                window=5, window_label="t+5", predicted_stage="Impact / Persistence",
                probability=0.52, confidence=0.72, risk_score=6.8, risk_badge="HIGH",
                mitre_technique_id="T1486",
                mitre_technique_name="Data Encrypted for Impact",
                expected_time_ist=time_labels[4]
            ),
        ]
        reasoning = [
            "Persistent heartbeat beaconing detected between USER-042 (10.10.30.42) and external egress IP.",
            "High likelihood of Command & Control channel synchronization.",
            "Model forecasts subsequent internal lateral movement toward Database Server (DB-01 / 10.10.20.15)."
        ]
        summary = "CRITICAL EARLY WARNING: The temporal model predicts imminent Command & Control activation (82% probability) followed by lateral movement toward internal database infrastructure."

    current_state_obj = NetworkState(
        state_id=f"NS-00{420 + current_stage_idx}",
        timestamp="10:30:21 IST",
        risk_score=risk_score,
        risk_level="CRITICAL" if risk_score >= 8.0 else ("HIGH" if risk_score >= 6.0 else ("MEDIUM" if risk_score >= 3.5 else "LOW")),
        attack_probability=attack_prob,
        network_status="NORMAL" if current_stage_idx == 1 else ("ANOMALY" if current_stage_idx == 2 else ("SUSPICIOUS" if current_stage_idx == 3 else "HIGH RISK")),
        forecast_horizon=5,
        active_threats=1 if current_stage_idx > 1 else 0,
        monitored_nodes=6,
        total_flows_window=28547 + current_stage_idx * 410,
        current_stage="COMMAND & CONTROL" if current_stage_idx >= 4 else ("INITIAL ACCESS" if current_stage_idx == 3 else ("RECONNAISSANCE" if current_stage_idx == 2 else "NORMAL"))
    )

    return ForecastResponse(
        current_state=current_state_obj,
        lead_time_windows=5,
        forecast_horizon=5,
        predictions=predictions,
        forecast_reasoning=reasoning,
        forecast_summary=summary,
        model_architecture="LSTM-Temporal-Transition-Network (5-Window Horizon)"
    )
