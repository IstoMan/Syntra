"""
Feature Extraction and Statistical Anomaly Scoring Engine
"""
import math
from typing import Dict, Any, List

# Normal baseline statistics for Indian Digital Infrastructure simulation
BASELINE_STATS = {
    "packet_rate_mean": 85.0,
    "packet_rate_std": 25.0,
    "byte_rate_mean": 45000.0,
    "byte_rate_std": 15000.0,
    "flow_duration_mean": 2.4,
    "flow_duration_std": 1.1,
    "port_entropy_mean": 0.32,
    "port_entropy_std": 0.08,
    "syn_ratio_mean": 0.05,
    "syn_ratio_std": 0.02,
    "failed_ratio_mean": 0.01,
    "failed_ratio_std": 0.005,
}

def extract_flow_features(flow_dict: Dict[str, Any]) -> Dict[str, float]:
    """
    Extracts numerical features from a network flow record.
    """
    packets = float(flow_dict.get("packets", 1))
    bytes_count = float(flow_dict.get("bytes_transferred", 64))
    duration = max(float(flow_dict.get("flow_duration_sec", 0.01)), 0.001)

    packet_rate = packets / duration
    byte_rate = bytes_count / duration
    avg_packet_size = bytes_count / max(packets, 1.0)
    syn_flags = float(flow_dict.get("syn_flag_count", 0))
    syn_ratio = syn_flags / max(packets, 1.0)

    return {
        "packet_rate": round(packet_rate, 2),
        "byte_rate": round(byte_rate, 2),
        "avg_packet_size": round(avg_packet_size, 2),
        "flow_duration": round(duration, 2),
        "syn_ratio": round(syn_ratio, 4),
        "packets": packets,
        "bytes": bytes_count
    }

def calculate_anomaly_score(features: Dict[str, float]) -> Dict[str, Any]:
    """
    Calculates z-score deviations across key network features.
    """
    deviations = {}
    anomalies = []

    # Z-scores
    pkt_z = (features["packet_rate"] - BASELINE_STATS["packet_rate_mean"]) / BASELINE_STATS["packet_rate_std"]
    byte_z = (features["byte_rate"] - BASELINE_STATS["byte_rate_mean"]) / BASELINE_STATS["byte_rate_std"]
    dur_z = (features["flow_duration"] - BASELINE_STATS["flow_duration_mean"]) / BASELINE_STATS["flow_duration_std"]
    syn_z = (features["syn_ratio"] - BASELINE_STATS["syn_ratio_mean"]) / BASELINE_STATS["syn_ratio_std"]

    deviations["packet_rate_z"] = round(pkt_z, 2)
    deviations["byte_rate_z"] = round(byte_z, 2)
    deviations["flow_duration_z"] = round(dur_z, 2)
    deviations["syn_ratio_z"] = round(syn_z, 2)

    if pkt_z > 2.5:
        anomalies.append("Abnormal packet rate deviation (> +2.5σ)")
    if byte_z > 3.0:
        anomalies.append("Excessive outbound volume (> +3.0σ)")
    if dur_z > 3.0:
        anomalies.append("Unusually long flow duration")
    if syn_z > 3.0:
        anomalies.append("Elevated SYN-to-data flag ratio (Recon pattern)")

    # Composite score
    raw_anomaly = max(0.0, (max(0, pkt_z) * 0.35 + max(0, byte_z) * 0.25 + max(0, dur_z) * 0.20 + max(0, syn_z) * 0.20))
    normalized_score = min(10.0, raw_anomaly)

    return {
        "deviations": deviations,
        "anomalies": anomalies,
        "anomaly_score": round(normalized_score, 2)
    }
