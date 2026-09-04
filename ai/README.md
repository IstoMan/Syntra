# SYNTRA — SIH26153

AI-based **network attack forecasting** from traffic. This is a **network-state world model**, not an IDS classifier.

The model learns how a compact windowed state evolves, rolls it forward `K` steps, then reads attack probability, family, and coarse MITRE stage off the **predicted** future. Current-window labels are used only for detection baselines.

## Locked contract

| Choice | Value |
| --- | --- |
| Dataset | CIC-IDS2017 (official CSVs in `data/raw/cicids2017` if present, otherwise a schedule-faithful synthetic week) |
| Grain | 30-second flow aggregates on a regular calendar (empty bins filled), 40-dim state |
| Horizon | `K = 5` (2.5 minutes) with 32-window history |
| Split | Purged family-blocked time (per-day train/val/test, never shuffled). Earliest episode of each family except infiltration is in train |
| Unseen family | `infiltration` excluded from train targets |
| Model | Residual encoder + Transformer history + stacked residual GRU dynamics; heads on rolled-out states |
| Baselines | Logistic Regression and XGBoost on the **current** window |
| UI | Streamlit replay + F1@k + lead time + SHAP/gradients |

- Score: combined = max(attack-head probability, novelty of predicted future state vs a train-benign cloud)
- Threshold: tuned on val to maximize episode catch rate with FPR ≤ 3%

## Run

Run from this folder (`ai/`).

```bash
python -m pip install -e .
python -m syntra.prepare
python -m syntra.train
python -m syntra.evaluate
python -m streamlit run app/streamlit_app.py
```

Optional: drop CIC-IDS2017 CSVs into `data/raw/cicids2017/` before `prepare`. GeneratedLabelledFlows (with timestamps) is preferred over timestamp-free dumps.

```bash
python -m pytest -q
python -m syntra.train --epochs 4
```

## Serve through FastAPI

The SOC backend loads this package on first `/api/forecast` (or `/api/health`) call.

```bash
cd ../backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Checkpoint path defaults to `ai/artifacts`. Override with `SYNTRA_ARTIFACTS_DIR`. Without `world_model.pt`, the API stays on demo stubs and reports `demo_fallback`.

## What the demo must show

1. Risk rises **before** the red attack-start marker.
2. World-model F1@k stays meaningful for `k ≥ 1`.
3. XGBoost current-window scores are labeled detection, not forecasting.
4. Mean lead time in seconds, not “99% accuracy” on shuffled flows.
