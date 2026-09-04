"""Serve-time GRU world-model inference: load, scale, rollout, explain, MITRE map."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import torch

from syntra.config import ROOT, load_config
from syntra.data.schema import STATE_FEATURES
from syntra.data.synthetic import window_state
from syntra.models.novelty import BenignCloud, combined_score
from syntra.taxonomy import ATTACK_FAMILIES, ATTACK_STAGES, FAMILY_TO_MITRE, FAMILY_TO_STAGE
from syntra.train import load_world_model

MODEL_ARCHITECTURE = "Transformer+GRU world model (K=5)"

STAGE_DISPLAY: dict[str, str] = {
    "none": "Normal",
    "reconnaissance": "Reconnaissance",
    "initial_access": "Initial Access",
    "credential_access": "Privilege Escalation",
    "command_and_control": "Command & Control",
    "impact": "Exfiltration",
}

FEATURE_DISPLAY: dict[str, str] = {
    "flow_count": "Flow Count",
    "unique_src_ips": "Unique Source IPs",
    "unique_dst_ips": "Unique Destination IPs",
    "unique_src_ports": "Source Port Diversity",
    "unique_dst_ports": "Destination Port Diversity",
    "total_fwd_packets": "Forward Packets",
    "total_bwd_packets": "Backward Packets",
    "total_fwd_bytes": "Forward Bytes",
    "total_bwd_bytes": "Backward Bytes",
    "bytes_per_second": "Byte Rate",
    "packets_per_second": "Packet Rate",
    "mean_duration": "Mean Flow Duration",
    "std_duration": "Duration Variance",
    "mean_iat": "Mean Inter-Arrival",
    "std_iat": "IAT Variance",
    "syn_ratio": "SYN Flag Ratio",
    "ack_ratio": "ACK Flag Ratio",
    "rst_ratio": "RST Flag Ratio",
    "fin_ratio": "FIN Flag Ratio",
    "psh_ratio": "PSH Flag Ratio",
    "urg_ratio": "URG Flag Ratio",
    "failed_conn_ratio": "Failed Connection Ratio",
    "short_flow_ratio": "Short Flow Ratio",
    "down_up_ratio": "Down/Up Ratio",
    "mean_fwd_pkt_len": "Mean Fwd Packet Length",
    "mean_bwd_pkt_len": "Mean Bwd Packet Length",
    "avg_packet_size": "Average Packet Size",
    "dst_port_entropy": "Destination Port Entropy",
    "src_port_entropy": "Source Port Entropy",
    "port_scan_score": "Port Scan Score",
    "tcp_ratio": "TCP Ratio",
    "udp_ratio": "UDP Ratio",
    "mean_active": "Mean Active Time",
    "mean_idle": "Mean Idle Time",
    "init_win_fwd_mean": "Init Window (Fwd)",
    "bytes_imbalance": "Bytes Imbalance",
    "max_dst_port_share": "Top Destination Port Share",
    "top_talker_share": "Top Talker Share",
    "new_dst_ip_rate": "New Destination IP Rate",
    "syn_ack_gap": "SYN-ACK Gap",
}

# Demo stage → CIC family ramp (keeps the 7-stage judging script as the input driver).
STAGE_PROFILE: dict[int, tuple[tuple[str, float], ...]] = {
    1: (("benign", 0.0),),
    2: (("benign", 0.0), ("portscan", 0.35), ("portscan", 0.55)),
    3: (("portscan", 0.4), ("web", 0.45), ("brute_force", 0.6)),
    4: (("web", 0.4), ("botnet", 0.55), ("botnet", 0.7)),
    5: (("botnet", 0.65), ("botnet", 0.8), ("botnet", 0.85)),
    6: (("botnet", 0.85), ("botnet", 0.95), ("infiltration", 0.55)),
    7: (("botnet", 0.15), ("benign", 0.0), ("benign", 0.0)),
}


@dataclass
class InferRuntime:
    model: torch.nn.Module
    scaler: dict[str, dict[str, float]]
    threshold: float
    novelty_gate: float
    cloud: BenignCloud | None
    history_len: int
    horizon_k: int
    device: torch.device
    artifacts_dir: Path
    has_novelty: bool = False
    temperature: float = 1.0


@dataclass
class StepForecast:
    window: int
    attack_prob: float
    family: str
    family_prob: float
    stage: str
    stage_prob: float
    combined_score: float
    novelty: float | None
    mitre_id: str
    mitre_name: str
    soc_stage: str


@dataclass
class ForecastResult:
    steps: list[StepForecast]
    current_family: str
    current_stage: str
    combined_score: float
    attack_probability: float
    alert_threshold: float
    history_attn: list[float] = field(default_factory=list)


@dataclass
class FeatureAttribution:
    feature_name: str
    display_name: str
    shap_value: float
    current_value: float
    baseline_value: float
    unit: str
    impact_type: str


def soc_stage_label(stage: str) -> str:
    return STAGE_DISPLAY.get(stage, stage.replace("_", " ").title())


def display_feature(name: str) -> str:
    return FEATURE_DISPLAY.get(name, name.replace("_", " ").title())


def parse_mitre(family: str) -> tuple[str, str]:
    info = FAMILY_TO_MITRE.get(family, {"tactic": "None", "technique": "—"})
    technique = str(info.get("technique", "—"))
    if technique.startswith("T"):
        token, _, rest = technique.partition(" ")
        tech_id = token.split("/")[0]
        name = rest.strip() if rest.strip() else str(info.get("tactic", ""))
        return tech_id, name
    return "", technique


def apply_scaler(raw: np.ndarray, scaler: dict[str, dict[str, float]]) -> np.ndarray:
    out = np.asarray(raw, dtype=np.float32).copy()
    flat = out.reshape(-1, len(STATE_FEATURES))
    for i, name in enumerate(STATE_FEATURES):
        spec = scaler.get(name, {})
        lo = float(spec.get("min", 0.0))
        hi = float(spec.get("max", 1.0))
        span = hi - lo
        if span > 1e-8:
            flat[:, i] = (flat[:, i] - lo) / span
        else:
            flat[:, i] = 0.0
    return np.clip(flat.reshape(out.shape), 0.0, 1.0).astype(np.float32)


def invert_scaler(scaled: np.ndarray, scaler: dict[str, dict[str, float]]) -> np.ndarray:
    out = np.asarray(scaled, dtype=np.float32).copy()
    flat = out.reshape(-1, len(STATE_FEATURES))
    for i, name in enumerate(STATE_FEATURES):
        spec = scaler.get(name, {})
        lo = float(spec.get("min", 0.0))
        hi = float(spec.get("max", 1.0))
        flat[:, i] = flat[:, i] * (hi - lo) + lo
    return flat.reshape(out.shape).astype(np.float32)


def load_scaler(artifacts: Path) -> dict[str, dict[str, float]]:
    candidates = [
        artifacts / "scaler.json",
        ROOT / "data" / "processed" / "scaler.json",
    ]
    try:
        cfg = load_config()
        candidates.insert(1, cfg.dataset.processed_dir / "scaler.json")
    except Exception:
        pass
    for path in candidates:
        if path.is_file():
            return json.loads(path.read_text(encoding="utf-8"))
    return synthesize_scaler()


def synthesize_scaler(seed: int = 42) -> dict[str, dict[str, float]]:
    rng = np.random.default_rng(seed)
    rows = [window_state("benign", 0.0, rng) for _ in range(24)]
    for family in ATTACK_FAMILIES:
        if family == "benign":
            continue
        for intensity in (0.35, 0.7, 1.0):
            rows.append(window_state(family, intensity, rng))
            rows.append(window_state(family, intensity, rng))
    arr = np.stack(rows)
    scaler: dict[str, dict[str, float]] = {}
    for i, name in enumerate(STATE_FEATURES):
        scaler[name] = {"min": float(arr[:, i].min()), "max": float(arr[:, i].max())}
    return scaler


def load_threshold(artifacts: Path, default: float = 0.5) -> float:
    path = artifacts / "threshold.json"
    if not path.is_file():
        return default
    payload = json.loads(path.read_text(encoding="utf-8"))
    return float(payload.get("threshold", default))


def load_temperature(artifacts: Path, default: float = 1.0) -> float:
    path = artifacts / "temperature.json"
    if not path.is_file():
        return default
    payload = json.loads(path.read_text(encoding="utf-8"))
    return float(payload.get("temperature", default))


def pad_history(history: np.ndarray, history_len: int) -> np.ndarray:
    hist = np.asarray(history, dtype=np.float32)
    if hist.ndim == 1:
        hist = hist.reshape(1, -1)
    if len(hist) >= history_len:
        return hist[-history_len:]
    if len(hist) == 0:
        return np.zeros((history_len, len(STATE_FEATURES)), dtype=np.float32)
    pad = np.repeat(hist[:1], history_len - len(hist), axis=0)
    return np.concatenate([pad, hist], axis=0)


def demo_history_for_stage(
    stage: int,
    history_len: int,
    scaler: dict[str, dict[str, float]],
    seed: int = 42,
) -> np.ndarray:
    """Build a length-T scaled history whose last windows match the demo stage."""
    rng = np.random.default_rng(seed + int(stage) * 17)
    profile = STAGE_PROFILE.get(int(stage), STAGE_PROFILE[1])
    n_each = max(1, history_len // len(profile))
    seq: list[np.ndarray] = []
    for family, intensity in profile:
        for _ in range(n_each):
            raw = window_state(family, intensity, rng)
            seq.append(apply_scaler(raw, scaler))
    while len(seq) < history_len:
        seq.insert(0, apply_scaler(window_state("benign", 0.0, rng), scaler))
    return np.stack(seq[-history_len:]).astype(np.float32)


def load_runtime(artifacts: str | Path | None = None) -> InferRuntime:
    cfg = load_config()
    artifacts_dir = Path(artifacts) if artifacts else cfg.ui.artifacts_dir
    ckpt = artifacts_dir / "world_model.pt"
    if not ckpt.is_file():
        raise FileNotFoundError(f"Missing world-model checkpoint: {ckpt}")

    device = torch.device("cpu")
    model = load_world_model(ckpt, device)
    scaler = load_scaler(artifacts_dir)
    threshold = load_threshold(artifacts_dir, default=float(cfg.eval.alert_threshold))
    temperature = load_temperature(artifacts_dir, default=1.0)

    cloud: BenignCloud | None = None
    cloud_path = artifacts_dir / "benign_cloud.joblib"
    if cloud_path.is_file():
        try:
            cloud = BenignCloud.load(cloud_path)
        except Exception:
            cloud = None

    return InferRuntime(
        model=model,
        scaler=scaler,
        threshold=threshold,
        novelty_gate=float(cfg.eval.novelty_gate),
        cloud=cloud,
        history_len=int(cfg.windows.history_len),
        horizon_k=int(cfg.windows.horizon_k),
        device=device,
        artifacts_dir=artifacts_dir,
        has_novelty=cloud is not None,
        temperature=temperature,
    )


def forecast(runtime: InferRuntime, history: np.ndarray) -> ForecastResult:
    hist = pad_history(history, runtime.history_len)
    x = torch.tensor(hist[None, ...], dtype=torch.float32, device=runtime.device)
    with torch.no_grad():
        out = runtime.model(x, future=None, teacher_forcing=0.0)
    logits = out["attack_logits"][0].cpu().numpy()
    temp = max(float(getattr(runtime, "temperature", 1.0)), 1e-6)
    attack = 1.0 / (1.0 + np.exp(-np.clip(logits / temp, -60.0, 60.0)))
    family_prob = torch.softmax(out["family_logits"][0], dim=-1).cpu().numpy()
    stage_prob = torch.softmax(out["stage_logits"][0], dim=-1).cpu().numpy()
    future_states = out["future_states"][0].cpu().numpy()
    attn = out["history_attn"][0].cpu().numpy().tolist()

    novelty: np.ndarray | None = None
    if runtime.cloud is not None:
        novelty = np.asarray(runtime.cloud.probability(future_states), dtype=np.float64)
        combined = combined_score(attack, novelty, novelty_gate=runtime.novelty_gate)
    else:
        combined = np.asarray(attack, dtype=np.float64)

    steps: list[StepForecast] = []
    for k in range(len(attack)):
        fam_idx = int(np.argmax(family_prob[k]))
        stg_idx = int(np.argmax(stage_prob[k]))
        family = ATTACK_FAMILIES[fam_idx]
        stage = ATTACK_STAGES[stg_idx]
        mitre_id, mitre_name = parse_mitre(family)
        nov = float(novelty[k]) if novelty is not None else None
        steps.append(
            StepForecast(
                window=k + 1,
                attack_prob=float(attack[k]),
                family=family,
                family_prob=float(family_prob[k, fam_idx]),
                stage=stage,
                stage_prob=float(stage_prob[k, stg_idx]),
                combined_score=float(combined[k]),
                novelty=nov,
                mitre_id=mitre_id,
                mitre_name=mitre_name,
                soc_stage=soc_stage_label(stage),
            )
        )

    lead = steps[0]
    current_family = lead.family
    current_stage = FAMILY_TO_STAGE.get(current_family, lead.stage)
    return ForecastResult(
        steps=steps,
        current_family=current_family,
        current_stage=current_stage,
        combined_score=float(np.max(combined)),
        attack_probability=float(combined[0]),
        alert_threshold=float(runtime.threshold),
        history_attn=[float(v) for v in attn],
    )


def explain(
    runtime: InferRuntime, history: np.ndarray, top_k: int = 8
) -> list[FeatureAttribution]:
    hist = pad_history(history, runtime.history_len)
    x = torch.tensor(
        hist[None, ...],
        dtype=torch.float32,
        device=runtime.device,
        requires_grad=True,
    )
    runtime.model.zero_grad(set_to_none=True)
    out = runtime.model(x, future=None, teacher_forcing=0.0)
    score = out["attack_logits"].mean()
    score.backward()
    grads = x.grad.detach().cpu().numpy()[0]
    current = hist[-1]
    signed = grads[-1] * current
    max_abs = float(np.max(np.abs(signed))) + 1e-8
    scaled = signed * (0.40 / max_abs)

    ranking = np.argsort(-np.abs(scaled))[:top_k]
    raw_current = invert_scaler(current, runtime.scaler)
    attributions: list[FeatureAttribution] = []
    for idx in ranking:
        name = STATE_FEATURES[int(idx)]
        value = float(scaled[int(idx)])
        if value > 0.02:
            impact = "positive_risk"
        elif value < -0.02:
            impact = "negative_risk"
        else:
            impact = "neutral"
        attributions.append(
            FeatureAttribution(
                feature_name=name,
                display_name=display_feature(name),
                shap_value=round(value, 4),
                current_value=round(float(raw_current[int(idx)]), 4),
                baseline_value=0.0,
                unit="raw",
                impact_type=impact,
            )
        )
    return attributions


def load_global_shap(artifacts: Path, top_k: int = 8) -> list[FeatureAttribution] | None:
    path = artifacts / "shap_world.json"
    if not path.is_file():
        return None
    payload = json.loads(path.read_text(encoding="utf-8"))
    top = payload.get("top_features") or []
    mean_abs = payload.get("mean_abs_grad") or {}
    rows = top[:top_k] if top else sorted(
        mean_abs.items(), key=lambda item: item[1], reverse=True
    )[:top_k]
    out: list[FeatureAttribution] = []
    max_abs = max((float(v) for _, v in rows), default=1.0) or 1.0
    for name, value in rows:
        scaled = float(value) * (0.40 / max_abs)
        out.append(
            FeatureAttribution(
                feature_name=str(name),
                display_name=display_feature(str(name)),
                shap_value=round(scaled, 4),
                current_value=round(float(value), 6),
                baseline_value=0.0,
                unit="mean |grad|",
                impact_type="positive_risk" if scaled > 0 else "neutral",
            )
        )
    return out or None
