"""
Held-out evaluation replay.

Every value served here is read from artifacts written by `python -m syntra.evaluate`:
timeline.parquet (per-window scores and ground truth), threshold.json, metrics.json
and shap_world.json. Nothing on this route is synthesised.
"""
from functools import lru_cache
from pathlib import Path
from typing import Any, List, Optional

import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..models.world_model_service import artifacts_dir

router = APIRouter(prefix="/api/replay", tags=["Replay"])


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


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise HTTPException(
            status_code=503,
            detail=f"Missing artifact {path.name}. Run `python -m syntra.evaluate` in ai/ first.",
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

    frame = pd.read_parquet(parquet).reset_index(drop=True)
    metrics = _read_json(root / "metrics.json")
    tuned = _read_json(root / "threshold.json")
    shap = _read_json(root / "shap_world.json")

    protocol = metrics.get("protocol", {})
    horizon_k = int(protocol.get("horizon_k", 5))
    headline = _horizon_row(metrics, "world_model_combined", 1)

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
        )
        for i, row in enumerate(frame.itertuples(index=False))
    ]

    return ReplayTimeline(
        provenance=ReplayProvenance(
            dataset=str(protocol.get("data_source", "unknown")),
            real_traces=bool(protocol.get("real_cic_traces", False)),
            split=str(protocol.get("split", "")),
            day=str(frame["day"].iloc[0]) if len(frame) else "",
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
    )


@router.get("/timeline", response_model=ReplayTimeline)
async def get_replay_timeline() -> ReplayTimeline:
    """Per-window scores and ground truth for the held-out test day."""
    return _timeline()
