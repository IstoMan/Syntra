"""
Held-out evaluation replay.

Every value served here is read from files written by the pipeline. From
`python -m syntra.evaluate`: timeline.parquet (per-window scores and ground truth),
threshold.json, metrics.json and shap_world.json. From `python -m syntra.prepare`:
sequences.parquet (the 40-dim window state) and scaler.json, which together let us
recover the raw network counts the model saw. Nothing on this route is synthesised.
"""
from functools import lru_cache
from pathlib import Path
from statistics import median
from typing import Any, Dict, List, NamedTuple, Optional

import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..models.world_model_service import artifacts_dir, processed_dir

router = APIRouter(prefix="/api/replay", tags=["Replay"])

EVALUATE_HINT = "Run `python -m syntra.evaluate` in ai/ first."
PREPARE_HINT = "Run `python -m syntra.prepare` in ai/ first."


class PanelFeature(NamedTuple):
    name: str
    label: str
    unit: str  # count | bytes | rate | ratio
    note: str
    panel: bool = True  # False means a value for the drivers list, but no tile


# Eight of the 40 state features, covering volume, fan-out and connection behaviour.
# Seven sit in the model's SHAP top ten; packets_per_second is included because it is
# what an analyst watches, and its low rank is itself worth showing.
PANEL_FEATURES: tuple[PanelFeature, ...] = (
    PanelFeature("flow_count", "Flows", "count", "Flows observed in this window."),
    PanelFeature(
        "packets_per_second",
        "Packets / sec",
        "rate",
        "Packet totals divided by the 30s window_seconds in config, while windows are "
        "actually 60s apart, so this reads about 2x high.",
    ),
    PanelFeature(
        "total_fwd_bytes", "Forward bytes", "bytes", "Bytes sent in the forward direction."
    ),
    PanelFeature(
        "unique_dst_ips",
        "Distinct destinations",
        "count",
        "Distinct destination IPs contacted. The model's strongest driver.",
    ),
    PanelFeature(
        "new_dst_ip_rate",
        "Destination shift",
        "ratio",
        "Absolute change in distinct destinations against the previous window, clipped "
        "at 1.5. It rises on sharp drops as well as on spikes.",
    ),
    PanelFeature(
        "unique_dst_ports",
        "Distinct dst ports",
        "count",
        "Distinct destination ports touched. The portscan signature.",
    ),
    PanelFeature(
        "failed_conn_ratio",
        "Failed connections",
        "ratio",
        "Share of flows that were reset or carried no payload.",
    ),
    PanelFeature(
        "short_flow_ratio",
        "Sub-second flows",
        "ratio",
        "Share of flows shorter than one second, the shape of probe traffic.",
    ),
    # No tile of their own, but the drivers list names them, so it needs their values.
    PanelFeature("unique_src_ips", "Distinct sources", "count", "", panel=False),
    PanelFeature("unique_src_ports", "Distinct src ports", "count", "", panel=False),
    PanelFeature("mean_active", "Mean active (us)", "us", "", panel=False),
    PanelFeature(
        "std_iat",
        "IAT std",
        "us",
        "Std of flow inter-arrival times, CIC microseconds.",
        panel=False,
    ),
    PanelFeature("mean_iat", "Mean IAT", "us", "Mean flow inter-arrival time.", panel=False),
    PanelFeature("std_duration", "Duration std", "us", "Std of flow duration.", panel=False),
    PanelFeature("top_talker_share", "Top talker share", "ratio", "", panel=False),
)


class ReplayWindow(BaseModel):
    index: int
    timestamp: str
    combined: float
    attack_head: float
    novelty: float
    horizon: List[float]
    attack_now: int
    attack_ahead: int
    predicted_family: str
    predicted_stage: str
    mitre_tactic: str
    mitre_technique: str
    true_family: str
    #: Raw (un-scaled) values for the panel features, keyed by feature name.
    features: Dict[str, float]


class ReplayFeatureMeta(BaseModel):
    name: str
    label: str
    unit: str
    note: str
    panel: bool
    shap_weight: float
    shap_rank: int
    benign_median: float
    day_min: float
    day_max: float


class ReplayEpisode(BaseModel):
    index: int
    start: int
    end: int
    family: str


class ReplayDriver(BaseModel):
    feature: str
    weight: float


class ReplayProvenance(BaseModel):
    dataset: str
    real_traces: bool
    split: str
    day: str
    window_seconds: int
    horizon_k: int
    tuned_threshold: float
    threshold_source: str
    fpr_cap: float
    met_fpr_cap: bool
    unseen_family: str
    headline_precision: Optional[float] = None
    headline_recall: Optional[float] = None
    headline_ece: Optional[float] = None


class ReplayTimeline(BaseModel):
    provenance: ReplayProvenance
    windows: List[ReplayWindow]
    episodes: List[ReplayEpisode]
    drivers: List[ReplayDriver]
    feature_meta: List[ReplayFeatureMeta]


def _read_json(path: Path, hint: str = EVALUATE_HINT) -> dict[str, Any]:
    if not path.is_file():
        raise HTTPException(
            status_code=503, detail=f"Missing artifact {path.name}. {hint}"
        )
    return json.loads(path.read_text(encoding="utf-8"))


def _horizon_row(metrics: dict, model: str, k: int) -> dict:
    for row in metrics.get("test", {}).get("horizon") or []:
        if row.get("model") == model and int(row.get("k", -1)) == k:
            return row
    return {}


def _episodes(labels: List[int], families: List[str]) -> List[ReplayEpisode]:
    """Contiguous runs of attack windows, matching the raw episodes in leads.json."""
    out: List[ReplayEpisode] = []
    start: Optional[int] = None
    for i, y in enumerate(labels):
        if y == 1 and start is None:
            start = i
        elif y == 0 and start is not None:
            out.append(ReplayEpisode(index=len(out), start=start, end=i - 1, family=families[start]))
            start = None
    if start is not None:
        out.append(
            ReplayEpisode(index=len(out), start=start, end=len(labels) - 1, family=families[start])
        )
    return out


def _unscale(scaled: float, bounds: dict[str, Any]) -> float:
    """Invert the train-fitted min-max scaling applied in prepare.py.

    Test-day values can fall outside [0, 1] because the scaler used train-only
    extremes; the inversion stays exact. Constant columns were written as 0.0, so
    the only recoverable value there is the bound itself.
    """
    low = float(bounds["min"])
    span = float(bounds["max"]) - low
    if span <= 1e-8:
        return low
    return scaled * span + low


def _panel_features(frame) -> tuple[List[Dict[str, float]], List[ReplayFeatureMeta]]:
    """Recover raw network counts for the panel features, one dict per timeline row."""
    import pandas as pd

    proc = processed_dir()
    sequences = proc / "sequences.parquet"
    if not sequences.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"Missing {sequences.name}. {PREPARE_HINT}",
        )
    data_meta = _read_json(proc / "meta.json", PREPARE_HINT)
    scaler = _read_json(proc / "scaler.json", PREPARE_HINT)

    order = {name: i for i, name in enumerate(data_meta.get("state_features") or [])}
    missing = [f.name for f in PANEL_FEATURES if f.name not in order or f.name not in scaler]
    if missing:
        raise HTTPException(
            status_code=503,
            detail=f"Prepared data has no state feature(s) {', '.join(missing)}. {PREPARE_HINT}",
        )

    seq = pd.read_parquet(sequences, columns=["day", "split", "window_idx", "state"])
    seq = seq[seq["split"] == "test"]
    by_key: dict[tuple[str, int], Dict[str, float]] = {}
    for row in seq.itertuples(index=False):
        state = row.state
        by_key[(str(row.day), int(row.window_idx))] = {
            f.name: _unscale(float(state[order[f.name]]), scaler[f.name])
            for f in PANEL_FEATURES
        }

    per_row: List[Dict[str, float]] = []
    for row in frame.itertuples(index=False):
        values = by_key.get((str(row.day), int(row.window_idx)))
        if values is None:
            raise HTTPException(
                status_code=503,
                detail=(
                    "timeline.parquet and sequences.parquet disagree on the test split. "
                    "Re-run `python -m syntra.prepare` then `python -m syntra.evaluate` in ai/."
                ),
            )
        per_row.append(values)

    grads: dict[str, float] = _read_json(artifacts_dir() / "shap_world.json").get(
        "mean_abs_grad", {}
    )
    ranked = {
        name: i + 1
        for i, (name, _) in enumerate(
            sorted(grads.items(), key=lambda kv: kv[1], reverse=True)
        )
    }
    benign = [i for i, row in enumerate(frame.itertuples(index=False)) if row.y_current == 0]

    meta: List[ReplayFeatureMeta] = []
    for feature in PANEL_FEATURES:
        series = [values[feature.name] for values in per_row]
        benign_series = [series[i] for i in benign] or series
        meta.append(
            ReplayFeatureMeta(
                name=feature.name,
                label=feature.label,
                unit=feature.unit,
                note=feature.note,
                panel=feature.panel,
                shap_weight=float(grads.get(feature.name, 0.0)),
                shap_rank=ranked.get(feature.name, 0),
                benign_median=median(benign_series),
                day_min=min(series),
                day_max=max(series),
            )
        )
    return per_row, meta


def _day_label(frame) -> str:
    if "day" not in frame.columns or len(frame) == 0:
        return ""
    days = list(dict.fromkeys(str(d) for d in frame["day"].tolist()))
    if len(days) == 1:
        return days[0]
    return "held-out later blocks (" + ", ".join(days) + ")"


@lru_cache(maxsize=1)
def _timeline() -> ReplayTimeline:
    import pandas as pd

    root = artifacts_dir()
    parquet = root / "timeline.parquet"
    if not parquet.is_file():
        raise HTTPException(
            status_code=503,
            detail="Missing timeline.parquet. Run `python -m syntra.evaluate` in ai/ first.",
        )

    frame = pd.read_parquet(parquet)
    if "timestamp" in frame.columns:
        frame = frame.sort_values("timestamp")
    frame = frame.reset_index(drop=True)
    metrics = _read_json(root / "metrics.json")
    tuned = _read_json(root / "threshold.json")
    shap = _read_json(root / "shap_world.json")

    protocol = metrics.get("protocol", {})
    horizon_k = int(protocol.get("horizon_k", 5))
    headline = _horizon_row(metrics, "world_model_combined", 1)
    panel_values, feature_meta = _panel_features(frame)

    windows = [
        ReplayWindow(
            index=i,
            timestamp=str(row.timestamp),
            combined=round(float(row.p_combined_k1), 4),
            attack_head=round(float(row.p_attack_k1), 4),
            novelty=round(float(row.p_novelty_k1), 4),
            horizon=[round(float(getattr(row, f"p_k{s + 1}")), 4) for s in range(horizon_k)],
            attack_now=int(row.y_current),
            attack_ahead=int(row.y_any_future),
            predicted_family=str(row.pred_family),
            predicted_stage=str(row.pred_stage),
            mitre_tactic=str(row.mitre_tactic),
            mitre_technique=str(row.mitre_technique),
            true_family=str(row.true_family),
            features={k: round(v, 4) for k, v in panel_values[i].items()},
        )
        for i, row in enumerate(frame.itertuples(index=False))
    ]

    return ReplayTimeline(
        provenance=ReplayProvenance(
            dataset=str(protocol.get("data_source", "unknown")),
            real_traces=bool(protocol.get("real_cic_traces", False)),
            split=str(protocol.get("split", "")),
            day=_day_label(frame),
            window_seconds=int(protocol.get("window_seconds", 30)),
            horizon_k=horizon_k,
            tuned_threshold=float(tuned.get("threshold", 0.5)),
            threshold_source=str(protocol.get("threshold_source", "")),
            fpr_cap=float(tuned.get("fpr_cap", 0.01)),
            met_fpr_cap=bool(tuned.get("under_fpr_cap", False)),
            unseen_family=str(protocol.get("unseen_attack_family", "")),
            headline_precision=headline.get("precision"),
            headline_recall=headline.get("recall"),
            headline_ece=headline.get("ece"),
        ),
        windows=windows,
        episodes=_episodes(
            [w.attack_now for w in windows], [w.true_family for w in windows]
        ),
        drivers=[
            ReplayDriver(feature=name, weight=float(weight))
            for name, weight in (shap.get("top_features") or [])
        ],
        feature_meta=feature_meta,
    )


@router.get("/timeline", response_model=ReplayTimeline)
async def get_replay_timeline() -> ReplayTimeline:
    """Per-window scores and ground truth for the held-out test day."""
    return _timeline()
