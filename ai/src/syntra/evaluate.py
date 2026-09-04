from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
import torch

from syntra.config import load_config
from syntra.eval.calibrate import apply_temperature, fit_temperature
from syntra.eval.protocol import (
    classification_at_horizon,
    expected_calibration_error,
    lead_time_from_future_probs,
    summarize_leads,
    summarize_leads_by_family,
)
from syntra.eval.threshold import tune_threshold
from syntra.explain import shap_xgboost, world_model_gradients
from syntra.models.baselines import load_baselines, predict_proba
from syntra.models.dataset import (
    as_array,
    current_window_xy,
    dump_json,
    load_split_frame,
)
from syntra.models.novelty import combined_score, fit_benign_cloud
from syntra.taxonomy import ATTACK_FAMILIES, ATTACK_STAGES, FAMILY_TO_MITRE
from syntra.train import load_world_model

LEAD_MERGE_GAP = 2
LEAD_MIN_LENGTH = 2


def _lead_kwargs(merged: bool) -> dict[str, int]:
    if merged:
        return {"merge_gap": LEAD_MERGE_GAP, "min_length": LEAD_MIN_LENGTH}
    return {"merge_gap": 0, "min_length": 1}


def _episode_rows(leads) -> list[dict]:
    return [
        {
            "episode_id": item.episode_id,
            "family": item.family,
            "start_index": item.start_index,
            "end_index": item.end_index,
            "alert_index": item.alert_index,
            "lead_windows": item.lead_windows,
            "lead_seconds": item.lead_seconds,
            "caught": item.caught,
        }
        for item in leads
    ]


def _wm_predict(
    model, frame, device, temperature: float = 1.0, batch_size: int = 64
) -> dict[str, np.ndarray]:
    if len(frame) == 0:
        empty_atk = np.zeros((0, 5), dtype=np.float64)
        return {
            "attack": empty_atk,
            "attack_logits": empty_atk,
            "family": np.zeros((0, 5, 8), dtype=np.float32),
            "stage": np.zeros((0, 5, 6), dtype=np.float32),
            "recon": np.zeros((0, 5, 40), dtype=np.float32),
            "attn": np.zeros((0, 1), dtype=np.float32),
        }
    histories = np.stack([as_array(h, np.float32) for h in frame["history"]])
    attack_logits, family, stage, recon, attn = [], [], [], [], []
    with torch.no_grad():
        for i in range(0, len(histories), batch_size):
            x = torch.tensor(
                histories[i : i + batch_size], dtype=torch.float32, device=device
            )
            out = model(x, future=None, teacher_forcing=0.0)
            attack_logits.append(out["attack_logits"].cpu().numpy())
            family.append(torch.softmax(out["family_logits"], dim=-1).cpu().numpy())
            stage.append(torch.softmax(out["stage_logits"], dim=-1).cpu().numpy())
            recon.append(out["future_states"].cpu().numpy())
            attn.append(out["history_attn"].cpu().numpy())
    logits = np.concatenate(attack_logits, axis=0)
    return {
        "attack": apply_temperature(logits, temperature),
        "attack_logits": logits,
        "family": np.concatenate(family, axis=0),
        "stage": np.concatenate(stage, axis=0),
        "recon": np.concatenate(recon, axis=0),
        "attn": np.concatenate(attn, axis=0),
    }


def _families(seq: pd.DataFrame) -> np.ndarray:
    return np.array(
        [ATTACK_FAMILIES[i] for i in seq["family_current"].to_numpy()], dtype=object
    )


def evaluate(cfg, artifacts: Path) -> dict:
    device = torch.device("cpu")
    model = load_world_model(artifacts / "world_model.pt", device)
    baselines = load_baselines(artifacts)
    windows = pd.read_parquet(cfg.windows_path)
    train_seq = load_split_frame(cfg, "train")
    test_seq = load_split_frame(cfg, "test")
    val_seq = load_split_frame(cfg, "val")
    k = cfg.windows.horizon_k

    benign_train = train_seq[train_seq["y_current"] == 0].head(1024)
    train_wm_benign = _wm_predict(model, benign_train, device)
    pred_benign = train_wm_benign["recon"].reshape(-1, train_wm_benign["recon"].shape[-1])
    val_benign = val_seq[val_seq["y_current"] == 0].head(1024)
    if len(val_benign) == 0:
        calib = pred_benign
    else:
        val_wm_benign = _wm_predict(model, val_benign, device)
        calib = val_wm_benign["recon"].reshape(-1, val_wm_benign["recon"].shape[-1])
    cloud = fit_benign_cloud(pred_benign, calib_states=calib, loc_percentile=90.0)
    cloud.save(artifacts / "benign_cloud.joblib")
    novelty_gate = float(cfg.eval.novelty_gate)

    val_raw = _wm_predict(model, val_seq, device, temperature=1.0)
    y_val_future = np.stack(
        [as_array(v, np.int64).reshape(-1) for v in val_seq["y_future"]]
    )
    temperature = fit_temperature(val_raw["attack_logits"], y_val_future)
    dump_json(artifacts / "temperature.json", {"temperature": temperature})

    def _timestamps(seq: pd.DataFrame) -> np.ndarray:
        return pd.to_datetime(seq["timestamp"]).to_numpy()

    def _score_leads(y_cur, families, scores, threshold, merged: bool, seq):
        return lead_time_from_future_probs(
            y_cur,
            families,
            scores,
            threshold,
            cfg.windows.size_seconds,
            timestamps=_timestamps(seq),
            **_lead_kwargs(merged),
        )

    def pack(seq: pd.DataFrame, threshold: float) -> dict:
        wm = _wm_predict(model, seq, device, temperature=temperature)
        novelty = cloud.probability(wm["recon"])
        combined = combined_score(wm["attack"], novelty, novelty_gate=novelty_gate)
        x, y_cur = current_window_xy(seq)
        p_lr = predict_proba(baselines["logreg"], x)
        p_xgb = predict_proba(baselines["xgb"], x)
        y_future = np.stack(
            [as_array(v, np.int64).reshape(-1) for v in seq["y_future"]]
        )
        naive_lr = np.repeat(p_lr[:, None], k, axis=1)
        naive_xgb = np.repeat(p_xgb[:, None], k, axis=1)
        horizon_rows = []
        for name, probs in (
            ("world_model", wm["attack"]),
            ("world_model_combined", combined),
            ("logreg_as_forecast", naive_lr),
            ("xgb_as_forecast", naive_xgb),
        ):
            for step in range(k):
                metrics = classification_at_horizon(
                    y_future[:, step], probs[:, step], threshold
                )
                metrics.update(
                    {
                        "model": name,
                        "k": step + 1,
                        "ece": expected_calibration_error(
                            y_future[:, step], probs[:, step]
                        ),
                    }
                )
                horizon_rows.append(metrics)
        det_lr = classification_at_horizon(y_cur, p_lr, threshold)
        det_xgb = classification_at_horizon(y_cur, p_xgb, threshold)
        det_lr.update(
            {
                "model": "logreg_detection",
                "k": 0,
                "ece": expected_calibration_error(y_cur, p_lr),
            }
        )
        det_xgb.update(
            {
                "model": "xgb_detection",
                "k": 0,
                "ece": expected_calibration_error(y_cur, p_xgb),
            }
        )
        families = _families(seq)
        y_cur = seq["y_current"].to_numpy()
        leads = _score_leads(y_cur, families, combined, threshold, True, seq)
        leads_raw = _score_leads(y_cur, families, combined, threshold, False, seq)
        attack_leads = _score_leads(y_cur, families, wm["attack"], threshold, True, seq)
        attack_leads_raw = _score_leads(
            y_cur, families, wm["attack"], threshold, False, seq
        )
        xgb_leads = _score_leads(y_cur, families, naive_xgb, threshold, True, seq)
        xgb_leads_raw = _score_leads(y_cur, families, naive_xgb, threshold, False, seq)
        fam_pred = wm["family"].argmax(axis=-1)
        stg_pred = wm["stage"].argmax(axis=-1)
        fam_true = np.stack(
            [as_array(v, np.int64).reshape(-1) for v in seq["family_future"]]
        )
        stg_true = np.stack(
            [as_array(v, np.int64).reshape(-1) for v in seq["stage_future"]]
        )
        return {
            "horizon": horizon_rows,
            "detection": [det_lr, det_xgb],
            "lead_world_model": summarize_leads(leads),
            "lead_world_model_raw": summarize_leads(leads_raw),
            "lead_attack_head": summarize_leads(attack_leads),
            "lead_attack_head_raw": summarize_leads(attack_leads_raw),
            "lead_xgb_naive": summarize_leads(xgb_leads),
            "lead_xgb_naive_raw": summarize_leads(xgb_leads_raw),
            "lead_by_family": summarize_leads_by_family(leads),
            "family_acc_future": float((fam_pred == fam_true).mean()),
            "stage_acc_future": float((stg_pred == stg_true).mean()),
            "wm": wm,
            "novelty": novelty,
            "combined": combined,
            "p_lr": p_lr,
            "p_xgb": p_xgb,
            "leads": leads,
            "leads_raw": leads_raw,
            "seq": seq,
            "y_future": y_future,
        }

    val_probe = pack(val_seq, cfg.eval.alert_threshold)
    tuned = tune_threshold(
        val_probe["y_future"][:, 0],
        val_probe["combined"][:, 0],
        val_probe["seq"]["y_current"].to_numpy(),
        _families(val_probe["seq"]),
        val_probe["combined"],
        cfg.windows.size_seconds,
        fpr_cap=cfg.eval.fpr_cap,
        timestamps=_timestamps(val_probe["seq"]),
    )
    dump_json(artifacts / "threshold.json", tuned)
    threshold = float(tuned["threshold"])

    test_pack = pack(test_seq, threshold)
    val_pack = pack(val_seq, threshold)

    unseen = windows[(windows["split"] == "val") & windows["is_unseen_family"]]
    unseen_note = {
        "family": cfg.dataset.unseen_attack_family,
        "windows": int(len(unseen)),
        "note": "Infiltration appears only on Thursday (val). It is excluded from train targets.",
        "val_combined_catch": val_pack["lead_world_model"],
        "val_attack_head_catch": val_pack["lead_attack_head"],
    }

    timeline_rows = []
    seq = test_pack["seq"]
    wm = test_pack["wm"]
    for i, row in seq.reset_index(drop=True).iterrows():
        fam_ids = wm["family"][i].argmax(axis=-1)
        stg_ids = wm["stage"][i].argmax(axis=-1)
        pred_fam = ATTACK_FAMILIES[int(fam_ids[0])]
        timeline_rows.append(
            {
                "timestamp": row["timestamp"],
                "day": row["day"],
                "window_idx": row["window_idx"],
                "y_current": int(row["y_current"]),
                "y_any_future": int(row["y_any_future"]),
                "p_attack_k1": float(wm["attack"][i, 0]),
                "p_attack_max": float(wm["attack"][i].max()),
                "p_novelty_k1": float(test_pack["novelty"][i, 0]),
                "p_novelty_max": float(test_pack["novelty"][i].max()),
                "p_combined_k1": float(test_pack["combined"][i, 0]),
                "p_combined_max": float(test_pack["combined"][i].max()),
                "p_logreg_now": float(test_pack["p_lr"][i]),
                "p_xgb_now": float(test_pack["p_xgb"][i]),
                "pred_family": pred_fam,
                "pred_stage": ATTACK_STAGES[int(stg_ids[0])],
                "mitre_tactic": FAMILY_TO_MITRE[pred_fam]["tactic"],
                "mitre_technique": FAMILY_TO_MITRE[pred_fam]["technique"],
                "true_family": ATTACK_FAMILIES[int(row["family_current"])],
                **{
                    f"p_k{step + 1}": float(test_pack["combined"][i, step])
                    for step in range(k)
                },
                **{
                    f"p_atk_k{step + 1}": float(wm["attack"][i, step])
                    for step in range(k)
                },
                **{
                    f"p_nov_k{step + 1}": float(test_pack["novelty"][i, step])
                    for step in range(k)
                },
                **{f"y_k{step + 1}": int(row["y_future"][step]) for step in range(k)},
            }
        )
    pd.DataFrame(timeline_rows).to_parquet(artifacts / "timeline.parquet", index=False)

    dump_json(
        artifacts / "leads.json",
        {
            "episodes": _episode_rows(test_pack["leads"]),
            "episodes_raw": _episode_rows(test_pack["leads_raw"]),
            "summary": test_pack["lead_world_model"],
            "summary_raw": test_pack["lead_world_model_raw"],
            "by_family": test_pack["lead_by_family"],
        },
    )

    shap_xgb = shap_xgboost(cfg, artifacts)
    shap_wm = world_model_gradients(cfg, artifacts)

    meta_path = cfg.dataset.processed_dir / "meta.json"
    data_meta = {}
    if meta_path.exists():
        data_meta = json.loads(meta_path.read_text(encoding="utf-8"))
    data_source = str(data_meta.get("source", "unknown"))
    real_traces = data_source == "cicids2017"

    metrics = {
        "protocol": {
            "label": "Y[t,k] = attack at t+k, k>=1. Current-window labels are detection-only.",
            "split": (
                "purged family-blocked time: per-day train/val/test with horizon purge; "
                "earliest episode of each family (except infiltration) is in train; "
                "later blocks held out"
                + (
                    " (real CIC traces; Friday later blocks are headline test)"
                    if real_traces
                    else " (synthetic week with forecastable precursor ramps)"
                )
            ),
            "split_strategy": cfg.splits.strategy,
            "data_source": data_source,
            "real_cic_traces": real_traces,
            "unseen_attack_family": cfg.dataset.unseen_attack_family,
            "window_seconds": cfg.windows.size_seconds,
            "horizon_k": cfg.windows.horizon_k,
            "history_len": cfg.windows.history_len,
            "alert_threshold": threshold,
            "threshold_source": "val_tuned_combined_benign_fpr",
            "temperature": temperature,
            "fpr_cap": cfg.eval.fpr_cap,
            "novelty_gate": novelty_gate,
            "episode_merge_gap": LEAD_MERGE_GAP,
            "episode_min_length": LEAD_MIN_LENGTH,
            "headline_episodes": "merged_campaigns",
        },
        "threshold": tuned,
        "test": {
            "horizon": test_pack["horizon"],
            "detection": test_pack["detection"],
            "lead_world_model": test_pack["lead_world_model"],
            "lead_world_model_raw": test_pack["lead_world_model_raw"],
            "lead_attack_head": test_pack["lead_attack_head"],
            "lead_attack_head_raw": test_pack["lead_attack_head_raw"],
            "lead_xgb_naive": test_pack["lead_xgb_naive"],
            "lead_xgb_naive_raw": test_pack["lead_xgb_naive_raw"],
            "lead_by_family": test_pack["lead_by_family"],
            "family_acc_future": test_pack["family_acc_future"],
            "stage_acc_future": test_pack["stage_acc_future"],
        },
        "val": {
            "horizon": val_pack["horizon"],
            "lead_world_model": val_pack["lead_world_model"],
            "lead_world_model_raw": val_pack["lead_world_model_raw"],
            "lead_attack_head": val_pack["lead_attack_head"],
            "lead_by_family": val_pack["lead_by_family"],
            "family_acc_future": val_pack["family_acc_future"],
            "stage_acc_future": val_pack["stage_acc_future"],
        },
        "unseen": unseen_note,
        "explain": {
            "xgb": shap_xgb["top_features"],
            "world_model": shap_wm["top_features"],
        },
    }
    dump_json(artifacts / "metrics.json", metrics)
    return metrics


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default=None)
    args = parser.parse_args()
    cfg = load_config(args.config)
    metrics = evaluate(cfg, cfg.ui.artifacts_dir)
    print(
        json.dumps(
            {
                "data_source": metrics["protocol"].get("data_source"),
                "real_cic_traces": metrics["protocol"].get("real_cic_traces"),
                "threshold": metrics["threshold"],
                "test_lead_combined": metrics["test"]["lead_world_model"],
                "test_lead_combined_raw": metrics["test"].get("lead_world_model_raw"),
                "test_lead_attack_head": metrics["test"]["lead_attack_head"],
                "unseen": metrics["unseen"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
