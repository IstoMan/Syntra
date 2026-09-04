"""CIC-IDS2017-schedule synthetic timeline with precursor ramps (forecastable, not just detectable)."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from syntra.data.schema import STATE_FEATURES
from syntra.taxonomy import (
    ATTACK_FAMILIES,
    family_id,
    stage_from_family,
    stage_id,
)

# Matches the 2017 CIC week used by the official CSV dumps.
DAY_DATES = {
    "monday": "2017-07-03",
    "tuesday": "2017-07-04",
    "wednesday": "2017-07-05",
    "thursday": "2017-07-06",
    "friday": "2017-07-07",
}

# Windows per day covering ~8 lab hours at 30s.
WINDOWS_PER_DAY = 960


@dataclass
class AttackEvent:
    day: str
    start_window: int
    duration: int
    family: str
    precursor: int


# Precursors exist so a dynamics model can roll the state forward.
# Train (Mon-Wed) includes portscan, botnet, and DoS. Friday is a later-day replay.
# Infiltration is Thursday-only and is the unseen-family holdout from train targets.
EVENTS: tuple[AttackEvent, ...] = (
    AttackEvent("tuesday", 240, 24, "brute_force", 8),
    AttackEvent("tuesday", 520, 20, "portscan", 6),
    AttackEvent("wednesday", 200, 30, "dos", 10),
    AttackEvent("wednesday", 520, 24, "botnet", 8),
    AttackEvent("thursday", 180, 16, "web", 6),
    AttackEvent("thursday", 420, 14, "infiltration", 10),
    AttackEvent("thursday", 700, 12, "web", 5),
    AttackEvent("friday", 160, 20, "portscan", 6),
    AttackEvent("friday", 360, 28, "dos", 8),
    AttackEvent("friday", 640, 24, "botnet", 8),
)


def _entropy(counts: np.ndarray) -> float:
    p = counts.astype(np.float64)
    p = p / max(p.sum(), 1.0)
    p = p[p > 0]
    return float(-(p * np.log(p + 1e-12)).sum())


def _benign_state(rng: np.random.Generator) -> dict[str, float]:
    flows = rng.integers(40, 90)
    src_ips = rng.integers(18, 36)
    dst_ips = rng.integers(22, 40)
    src_ports = rng.integers(30, 70)
    dst_ports = rng.integers(12, 28)
    fwd_pkts = float(rng.integers(800, 1600))
    bwd_pkts = float(rng.integers(700, 1500))
    fwd_bytes = float(rng.integers(80_000, 220_000))
    bwd_bytes = float(rng.integers(90_000, 260_000))
    syn = rng.uniform(0.04, 0.12)
    ack = rng.uniform(0.45, 0.70)
    rst = rng.uniform(0.01, 0.04)
    return {
        "flow_count": float(flows),
        "unique_src_ips": float(src_ips),
        "unique_dst_ips": float(dst_ips),
        "unique_src_ports": float(src_ports),
        "unique_dst_ports": float(dst_ports),
        "total_fwd_packets": fwd_pkts,
        "total_bwd_packets": bwd_pkts,
        "total_fwd_bytes": fwd_bytes,
        "total_bwd_bytes": bwd_bytes,
        "bytes_per_second": (fwd_bytes + bwd_bytes) / 30.0,
        "packets_per_second": (fwd_pkts + bwd_pkts) / 30.0,
        "mean_duration": float(rng.uniform(0.4, 2.2)),
        "std_duration": float(rng.uniform(0.2, 1.1)),
        "mean_iat": float(rng.uniform(0.01, 0.08)),
        "std_iat": float(rng.uniform(0.005, 0.04)),
        "syn_ratio": syn,
        "ack_ratio": ack,
        "rst_ratio": rst,
        "fin_ratio": float(rng.uniform(0.02, 0.08)),
        "psh_ratio": float(rng.uniform(0.08, 0.18)),
        "urg_ratio": float(rng.uniform(0.0, 0.01)),
        "failed_conn_ratio": float(rng.uniform(0.02, 0.08)),
        "short_flow_ratio": float(rng.uniform(0.25, 0.45)),
        "down_up_ratio": float((bwd_bytes + 1) / (fwd_bytes + 1)),
        "mean_fwd_pkt_len": fwd_bytes / max(fwd_pkts, 1.0),
        "mean_bwd_pkt_len": bwd_bytes / max(bwd_pkts, 1.0),
        "avg_packet_size": (fwd_bytes + bwd_bytes) / max(fwd_pkts + bwd_pkts, 1.0),
        "dst_port_entropy": _entropy(rng.integers(1, 12, size=8)),
        "src_port_entropy": _entropy(rng.integers(1, 20, size=10)),
        "port_scan_score": float(dst_ports) / max(float(dst_ips), 1.0),
        "tcp_ratio": float(rng.uniform(0.82, 0.94)),
        "udp_ratio": float(rng.uniform(0.05, 0.15)),
        "mean_active": float(rng.uniform(0.2, 1.5)),
        "mean_idle": float(rng.uniform(0.4, 3.0)),
        "init_win_fwd_mean": float(rng.uniform(4000, 12000)),
        "bytes_imbalance": (fwd_bytes - bwd_bytes) / (fwd_bytes + bwd_bytes + 1.0),
        "max_dst_port_share": float(rng.uniform(0.12, 0.28)),
        "top_talker_share": float(rng.uniform(0.08, 0.18)),
        "new_dst_ip_rate": float(rng.uniform(0.04, 0.12)),
        "syn_ack_gap": float(max(syn - ack * 0.15, 0.0)),
    }


def _mix(
    base: dict[str, float], overlay: dict[str, float], weight: float
) -> dict[str, float]:
    w = float(np.clip(weight, 0.0, 1.0))
    return {k: (1 - w) * base[k] + w * overlay.get(k, base[k]) for k in STATE_FEATURES}


def _family_overlay(
    family: str, rng: np.random.Generator, intensity: float
) -> dict[str, float]:
    state = _benign_state(rng)
    i = intensity
    if family == "portscan":
        state["unique_dst_ports"] = 80 + 220 * i
        state["port_scan_score"] = 6.0 + 18.0 * i
        state["syn_ratio"] = 0.35 + 0.45 * i
        state["ack_ratio"] = 0.12
        state["short_flow_ratio"] = 0.85
        state["failed_conn_ratio"] = 0.40 + 0.30 * i
        state["mean_duration"] = 0.05
        state["new_dst_ip_rate"] = 0.35 + 0.40 * i
        state["syn_ack_gap"] = 0.40 + 0.40 * i
        state["dst_port_entropy"] = 2.8 + 0.6 * i
    elif family == "brute_force":
        state["failed_conn_ratio"] = 0.45 + 0.40 * i
        state["rst_ratio"] = 0.18 + 0.25 * i
        state["unique_dst_ports"] = 8
        state["max_dst_port_share"] = 0.55 + 0.30 * i
        state["flow_count"] = 120 + 80 * i
        state["syn_ratio"] = 0.22 + 0.15 * i
        state["psh_ratio"] = 0.25
        state["mean_duration"] = 0.8
    elif family == "dos":
        state["flow_count"] = 220 + 260 * i
        state["packets_per_second"] = 180 + 420 * i
        state["bytes_per_second"] = 80_000 + 180_000 * i
        state["unique_src_ips"] = 8 + 12 * (1 - i)
        state["syn_ratio"] = 0.55 + 0.30 * i
        state["ack_ratio"] = 0.08
        state["short_flow_ratio"] = 0.9
        state["top_talker_share"] = 0.45 + 0.35 * i
        state["syn_ack_gap"] = 0.5 + 0.4 * i
    elif family == "web":
        state["failed_conn_ratio"] = 0.22 + 0.25 * i
        state["psh_ratio"] = 0.28 + 0.20 * i
        state["avg_packet_size"] = 420 + 200 * i
        state["max_dst_port_share"] = 0.62
        state["unique_dst_ports"] = 6
        state["mean_duration"] = 1.6 + 0.8 * i
    elif family == "infiltration":
        state["mean_duration"] = 8.0 + 12.0 * i
        state["mean_idle"] = 6.0 + 10.0 * i
        state["bytes_per_second"] = 4_000 + 12_000 * i
        state["unique_src_ips"] = 4
        state["top_talker_share"] = 0.55 + 0.25 * i
        state["psh_ratio"] = 0.32
        state["flow_count"] = 18 + 10 * i
    elif family == "botnet":
        state["unique_dst_ips"] = 40 + 70 * i
        state["new_dst_ip_rate"] = 0.28 + 0.35 * i
        state["udp_ratio"] = 0.22 + 0.18 * i
        state["tcp_ratio"] = 0.70
        state["mean_iat"] = 0.25 + 0.2 * i
        state["avg_packet_size"] = 90 + 40 * i
        state["flow_count"] = 90 + 40 * i
    elif family == "heartbleed":
        state["mean_duration"] = 20.0 + 40.0 * i
        state["total_fwd_bytes"] = 400_000 + 800_000 * i
        state["bytes_imbalance"] = 0.65
        state["max_dst_port_share"] = 0.8
        state["flow_count"] = 12
        state["psh_ratio"] = 0.4
    state["syn_ack_gap"] = float(
        max(state["syn_ratio"] - state["ack_ratio"] * 0.2, 0.0)
    )
    return {k: float(state[k]) for k in STATE_FEATURES}


def window_state(
    family: str, intensity: float, rng: np.random.Generator
) -> np.ndarray:
    """CIC-style 40-dim raw window for a family at [0, 1] intensity."""
    base = _benign_state(rng)
    if family == "benign" or intensity <= 0.0:
        return np.array([base[k] for k in STATE_FEATURES], dtype=np.float32)
    overlay = _family_overlay(family, rng, float(np.clip(intensity, 0.0, 1.0)))
    mixed = _mix(base, overlay, 0.25 + 0.75 * float(np.clip(intensity, 0.0, 1.0)))
    return np.array([mixed[k] for k in STATE_FEATURES], dtype=np.float32)


def generate_windows(seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    events_by_day: dict[str, list[AttackEvent]] = {}
    for event in EVENTS:
        events_by_day.setdefault(event.day, []).append(event)

    rows: list[dict[str, float | str | int]] = []
    for day, date in DAY_DATES.items():
        prev_dst = 30.0
        for w in range(WINDOWS_PER_DAY):
            ts = pd.Timestamp(f"{date} 09:00:00") + pd.Timedelta(seconds=w * 30)
            family = "benign"
            intensity = 0.0
            for event in events_by_day.get(day, []):
                pre_start = event.start_window - event.precursor
                if pre_start <= w < event.start_window:
                    intensity = (w - pre_start + 1) / event.precursor
                    overlay = _family_overlay(event.family, rng, 0.35 * intensity)
                    base = _benign_state(rng)
                    state = _mix(base, overlay, 0.25 + 0.55 * intensity)
                    family = "benign"
                    break
                if event.start_window <= w < event.start_window + event.duration:
                    peak = 0.75 + 0.25 * np.sin(
                        np.pi * (w - event.start_window) / max(event.duration, 1)
                    )
                    overlay = _family_overlay(event.family, rng, float(peak))
                    base = _benign_state(rng)
                    state = _mix(base, overlay, 0.7 + 0.3 * float(peak))
                    family = event.family
                    intensity = float(peak)
                    break
            else:
                state = _benign_state(rng)

            state["new_dst_ip_rate"] = float(
                np.clip(
                    abs(state["unique_dst_ips"] - prev_dst) / max(prev_dst, 1.0),
                    0.0,
                    1.5,
                )
            )
            prev_dst = state["unique_dst_ips"]
            y = 0 if family == "benign" else 1
            row: dict[str, float | str | int] = {
                "day": day,
                "timestamp": ts,
                "window_idx": w,
                "family": family,
                "family_id": family_id(family),
                "stage": stage_from_family(family),
                "stage_id": stage_id(stage_from_family(family)),
                "y_attack": y,
                "source": "synthetic_cicids2017",
            }
            for name in STATE_FEATURES:
                row[name] = float(state[name])
            rows.append(row)
    frame = pd.DataFrame(rows)
    assert set(STATE_FEATURES).issubset(frame.columns)
    assert frame["family"].isin(ATTACK_FAMILIES).all()
    return frame
