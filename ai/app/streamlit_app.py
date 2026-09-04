from __future__ import annotations

import json
from pathlib import Path
import sys

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from syntra.config import load_config  # noqa: E402
from syntra.taxonomy import FAMILY_TO_MITRE  # noqa: E402

st.set_page_config(page_title="SYNTRA — Attack Forecasting", layout="wide")


def _load():
    cfg = load_config()
    artifacts = cfg.ui.artifacts_dir
    metrics_path = artifacts / "metrics.json"
    timeline_path = artifacts / "timeline.parquet"
    if not metrics_path.exists() or not timeline_path.exists():
        return cfg, None, None, None, None
    metrics = json.loads(metrics_path.read_text(encoding="utf-8"))
    timeline = pd.read_parquet(timeline_path)
    timeline["timestamp"] = pd.to_datetime(timeline["timestamp"])
    leads = json.loads((artifacts / "leads.json").read_text(encoding="utf-8"))
    shap_xgb = json.loads((artifacts / "shap_xgb.json").read_text(encoding="utf-8"))
    shap_wm = json.loads((artifacts / "shap_world.json").read_text(encoding="utf-8"))
    return cfg, metrics, timeline, leads, (shap_xgb, shap_wm)


def _horizon_table(rows: list[dict], model: str) -> pd.DataFrame:
    frame = pd.DataFrame(rows)
    frame = frame[frame["model"] == model][
        ["k", "precision", "recall", "f1", "fpr", "ece"]
    ]
    return frame.round(3).reset_index(drop=True)


def main() -> None:
    cfg, metrics, timeline, leads, shap_pair = _load()
    st.title("SYNTRA")
    st.caption(
        "SIH26153 — network-state world model. Forecasts t+1…t+K. Current-window scores are detection only."
    )

    if metrics is None:
        st.error(
            "No artifacts yet. From the repo root run:\n\n"
            "`python -m syntra.prepare && python -m syntra.train && python -m syntra.evaluate`"
        )
        return

    proto = metrics["protocol"]
    lead = metrics["test"]["lead_world_model"]
    source = proto.get("data_source", "unknown")
    real = bool(proto.get("real_cic_traces"))
    st.title("SYNTRA")
    st.caption(
        "SIH26153 — network-state world model. Forecasts t+1…t+K. Current-window scores are detection only."
    )
    if real:
        st.info(
            "Metrics use a **purged family-blocked** split on CIC-IDS2017. "
            "Train includes the earliest episode of each family except infiltration; "
            "later blocks (including later Friday campaigns) are held out."
        )
    else:
        st.warning(
            f"Data source is `{source}` — not real CIC traces. Place official CSVs in "
            "`data/raw/cicids2017` and re-run prepare → train → evaluate."
        )

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Window", f"{proto['window_seconds']}s")
    c2.metric("Horizon K", str(proto["horizon_k"]))
    c3.metric("Mean lead time", f"{lead['mean_lead_seconds']:.0f}s")
    c4.metric("Campaign catch rate", f"{lead['catch_rate']:.0%}")

    with st.expander("Evaluation protocol (locked)", expanded=False):
        st.markdown(
            f"""
- Labels: **Y[t, k] = attack at window t+k** with **k ≥ 1**. `y_t` is never a forecast target.
- Data: **{proto.get("data_source", "unknown")}**
- Split: **{proto["split"]}**
- Unseen family: `{proto["unseen_attack_family"]}` held out of train targets
- Score: **max(attack-head P, benign-cloud novelty of predicted states)**
- Lead time: earliest alert **before** the campaign starts, using future-horizon probabilities only
- Campaigns: same-family runs with gaps ≤ `{proto.get("episode_merge_gap", 2)}` windows, min length `{proto.get("episode_min_length", 2)}` (raw 1-window flickers kept in JSON)
- Threshold: `{proto["alert_threshold"]:.3f}` (val-tuned benign FPR cap `{proto.get("fpr_cap", 0.03)}`, novelty gate `{proto.get("novelty_gate", 0.45)}`, temperature `{proto.get("temperature", 1.0):.2f}`)
            """
        )

    st.subheader("Friday test replay")
    k_show = st.slider("Forecast step k", 1, int(proto["horizon_k"]), 1)
    p_col = f"p_k{k_show}"
    y_col = f"y_k{k_show}"
    fig = go.Figure()
    fig.add_bar(
        x=timeline["timestamp"],
        y=timeline[y_col],
        name=f"Actual attack at t+{k_show}",
        opacity=0.35,
    )
    fig.add_scatter(
        x=timeline["timestamp"],
        y=timeline[p_col],
        name=f"Combined score at t+{k_show}",
        mode="lines",
    )
    if f"p_atk_k{k_show}" in timeline.columns:
        fig.add_scatter(
            x=timeline["timestamp"],
            y=timeline[f"p_atk_k{k_show}"],
            name=f"Attack-head P at t+{k_show}",
            mode="lines",
            line=dict(dash="dash"),
        )
    if f"p_nov_k{k_show}" in timeline.columns:
        fig.add_scatter(
            x=timeline["timestamp"],
            y=timeline[f"p_nov_k{k_show}"],
            name=f"Novelty at t+{k_show}",
            mode="lines",
            line=dict(dash="dot"),
        )
    fig.add_scatter(
        x=timeline["timestamp"],
        y=timeline["p_xgb_now"],
        name="XGBoost current-window (detection)",
        mode="lines",
        line=dict(dash="dot"),
    )
    fig.add_hline(
        y=proto["alert_threshold"],
        line_dash="dash",
        annotation_text="val-tuned threshold",
    )
    for ep in leads["episodes"]:
        if not ep["caught"] or ep["alert_index"] is None:
            continue
        # Map sequence row index onto timestamps when possible.
        if ep["alert_index"] < len(timeline) and ep["start_index"] < len(timeline):
            t_alert = timeline.iloc[ep["alert_index"]]["timestamp"]
            t_start = timeline.iloc[ep["start_index"]]["timestamp"]
            fig.add_vline(x=t_alert, line_color="#e6a817", opacity=0.6)
            fig.add_vline(x=t_start, line_color="#c23b22", opacity=0.6)
    fig.update_layout(
        height=420,
        yaxis_title="probability / attack flag",
        legend=dict(orientation="h"),
        margin=dict(l=20, r=20, t=30, b=20),
    )
    st.plotly_chart(fig, width="stretch")
    st.caption(
        "Gold line = forecast alert. Red line = confirmed attack start. Combined = max(attack head, novelty). XGBoost dotted line is detection, not forecasting."
    )

    left, right = st.columns(2)
    with left:
        st.markdown("**Combined score F1 @ horizon k (test)**")
        st.dataframe(
            _horizon_table(metrics["test"]["horizon"], "world_model_combined"),
            hide_index=True,
        )
        st.markdown("**Attack-head only F1 @ horizon k (test)**")
        st.dataframe(
            _horizon_table(metrics["test"]["horizon"], "world_model"), hide_index=True
        )
    with right:
        st.markdown("**Current-window detection (not forecasting)**")
        det = pd.DataFrame(metrics["test"]["detection"])[
            ["model", "precision", "recall", "f1", "fpr", "ece"]
        ].round(3)
        st.dataframe(det, hide_index=True)
        st.markdown("**Lead time**")
        st.json(
            {
                "combined_merged": metrics["test"]["lead_world_model"],
                "combined_raw": metrics["test"].get("lead_world_model_raw"),
                "attack_head": metrics["test"].get("lead_attack_head"),
                "xgb_naive": metrics["test"]["lead_xgb_naive"],
                "threshold": metrics.get("threshold"),
                "unseen": metrics["unseen"],
            }
        )

    st.subheader("Inspect a window")
    idx = st.slider(
        "Timeline row", 0, max(len(timeline) - 1, 0), int(len(timeline) * 0.2)
    )
    row = timeline.iloc[idx]
    pred_fam = str(row["pred_family"])
    mitre = FAMILY_TO_MITRE.get(pred_fam, FAMILY_TO_MITRE["benign"])
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("True now", row["true_family"])
    m2.metric("Forecast family", pred_fam)
    m3.metric("Forecast stage", row["pred_stage"])
    m4.metric("MITRE tactic", mitre["tactic"])
    st.write(mitre["technique"])
    horizon_view = pd.DataFrame(
        {
            "k": list(range(1, int(proto["horizon_k"]) + 1)),
            "combined": [row[f"p_k{k}"] for k in range(1, int(proto["horizon_k"]) + 1)],
            "attack_head": [
                row.get(f"p_atk_k{k}", row[f"p_k{k}"])
                for k in range(1, int(proto["horizon_k"]) + 1)
            ],
            "novelty": [
                row.get(f"p_nov_k{k}", 0.0)
                for k in range(1, int(proto["horizon_k"]) + 1)
            ],
            "actual": [row[f"y_k{k}"] for k in range(1, int(proto["horizon_k"]) + 1)],
        }
    )
    st.bar_chart(horizon_view, x="k", y=["combined", "attack_head", "novelty"])

    st.subheader("Why this forecast")
    shap_xgb, shap_wm = shap_pair
    s1, s2 = st.columns(2)
    with s1:
        st.markdown("World model — gradient on current state → future attack logit")
        wm_df = pd.DataFrame(
            shap_wm["top_features"], columns=["feature", "attribution"]
        )
        st.bar_chart(wm_df, x="feature", y="attribution")
    with s2:
        st.markdown("XGBoost SHAP — current-window detection (baseline)")
        xgb_df = pd.DataFrame(
            shap_xgb["top_features"], columns=["feature", "attribution"]
        )
        st.bar_chart(xgb_df, x="feature", y="attribution")

    st.subheader("Caught campaigns (merged)")
    st.dataframe(pd.DataFrame(leads["episodes"]), hide_index=True)
    if leads.get("episodes_raw"):
        with st.expander("Raw 1-window episodes (not the headline score)", expanded=False):
            st.dataframe(pd.DataFrame(leads["episodes_raw"]), hide_index=True)


main()
