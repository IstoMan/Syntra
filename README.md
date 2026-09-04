# SYNTRA — AI-Based Network Attack Forecasting
## Smart India Hackathon 2026 • Problem Statement SIH26153
**Theme:** Blockchain & Cybersecurity | **Category:** Software

---

## 1. Product Identity & USP

> **SYNTRA learns how network behaviour changes over time and forecasts possible cyberattack progression before compromise, with risk scoring, explainable predictions, and early warnings.**

### Core Innovation: Detect → Forecast → Explain → Alert

- **Traditional IDS answers:** *“Is malicious activity happening now?”*
- **SYNTRA answers:** *“What is likely to happen next?”*

The model is a **network-state world model**, not an IDS classifier. It encodes a 40-dimensional
30-second window, rolls the state forward `K = 5` steps with a GRU, and reads attack probability,
family and MITRE stage off the **predicted future**. Current-window labels are used only for the
detection baselines we compare against.

```
NETWORK TRAFFIC → FEATURE EXTRACTION → NETWORK STATE
                                            │
                                    TEMPORAL AI MODEL
                                            │
                              FUTURE FORECAST (t+1 .. t+5)
                                    ┌───────┴────────┐
                               RISK SCORE      EXPLANATION
                                    └───────┬────────┘
                                      EARLY WARNING
```

---

## 2. The Console

One page: **Attack Forecast — Held-Out Replay**. It replays the model's scores over the entire
held-out test day and lets you interrogate the tradeoff between warning early and crying wolf.

- **Forecast timeline** — every evaluation window plotted as the combined score at `t+1`, with the
  actual attack windows shaded and a **draggable alert threshold**.
- **Dynamic window label** — a plain-language read of whatever window you hover or scrub to. It names
  what the model is doing right then: forecasting early, merely detecting an attack already underway,
  raising a false alarm, or missing one outright.
- **Warned before the attack** — episodes alerted inside the horizon before they began, and mean lead
  time, both recomputed live as you move the threshold.
- **Cost of that threshold** — false alarms against benign windows, so the lead time above is never
  quoted without its price.
- **This window** — the combined score and its two components (attack head, novelty), predicted vs
  actual family, MITRE technique, and the `t+1 … t+5` rollout.
- **What drives the forecast** — top feature attributions from `shap_world.json`.

Every number rendered is read from the evaluation artifacts. There is no scripted demo data in the UI.

---

## 3. Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ (or Bun)

### 1. Launch FastAPI Backend
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API docs at `http://127.0.0.1:8000/docs`.

The console reads `GET /api/replay/timeline`, which serves `ai/artifacts/timeline.parquet` plus
`metrics.json`, `threshold.json` and `shap_world.json`. If those artifacts are missing the endpoint
returns 503 and the UI tells you to regenerate them — it does not fall back to invented data.

Train and evaluate a checkpoint (from `ai/`):

```bash
cd ai
python -m pip install -e .
python -m syntra.prepare
python -m syntra.train
python -m syntra.evaluate
```

Override the artifact directory with `SYNTRA_ARTIFACTS_DIR` if needed.

### 2. Launch Frontend
```bash
cd frontend
npm install && npm run dev     # or: bun install && bun run dev
```
Open `http://localhost:5173`.

---

## 4. Current Results — Read This Before Demoing

These come from `ai/artifacts/metrics.json` and `leads.json` on the CIC-IDS2017 **Friday** test split
(train Mon–Wed, validate Thu). They are not flattering, and they are the actual numbers.

**Forecasting, `world_model_combined` at k=1:**

| Metric | Value |
| --- | --- |
| Precision | 84.4% |
| Recall | 13.2% |
| F1 | 22.8% |
| FPR | 1.9% |
| ECE (calibration error) | 0.20 |

**Lead time, at the val-tuned threshold of 0.80:**

| Threshold | Episodes warned early | Mean lead | False alarms (of 259 benign) |
| --- | --- | --- | --- |
| **0.80** (tuned) | 0 / 25 | 0 s | 4 (1.5%) |
| 0.70 | 2 / 25 | 210 s | 7 (2.7%) |
| 0.40 | 4 / 25 | 240 s | 35 (13.5%) |
| 0.30 | 6 / 25 | 260 s | 51 (19.7%) |

Honest reading of this:

1. **At the tuned threshold the model forecasts nothing.** All 32 of its alerts land during or after an
   attack window, so on this split it behaves as a high-precision *detector*, not a forecaster.
2. **The threshold is what kills the lead time, not the model.** Lowering it to 0.70 buys 3.5 minutes of
   genuine advance warning for three extra false alarms across an 11-hour day. The tuner recorded
   `under_fpr_cap: false` — 0.80 never satisfied its own 1% FPR target either.
3. **It forecasts scans, not botnets.** Every early catch is `portscan`. Before botnet episodes the
   combined score sits flat at 0.11–0.32 and never approaches any usable threshold.
4. **Calibration is poor.** ECE around 0.20 means the probabilities should not be read as literal
   confidences.

### Known bug

`config.py` declares `windows.size_seconds = 30`, and `evaluate.py` multiplies lead windows by that
value. The actual windows in `timeline.parquet` are **60 seconds** apart (462 of 463 gaps). Every
`mean_lead_seconds` in `metrics.json` and `leads.json` is therefore understated by 2×. The console
derives spacing from the timestamps instead, so the figures it shows are wall-clock correct.

---

## 5. Demo Script

1. **Open the console.** State the split up front: CIC-IDS2017, trained Mon–Wed, tuned Thu, and this is
   Friday — data the model has never seen.
2. **Press Replay.** Walk the day. Watch the label change as the score moves through benign traffic,
   attack windows, and misses.
3. **Stop on an attack band.** The label reads `DETECTING` — the model fired, but only once the attack
   was already running. Make the point explicitly: this is the honest failure mode.
4. **Drag the threshold to 0.70.** A green marker appears before a portscan episode and the label flips
   to `EARLY WARNING`. The lead-time card jumps to 2 / 25 episodes at 3m 30s.
5. **Point at the cost card.** False alarms went 4 → 7. Lead time is never free.
6. **Keep dragging to 0.30.** Catch rate climbs to 6 / 25, false alarms explode to 51. Show that the
   operator, not the model, chooses where to sit on this curve.
7. **Close on the gap.** Portscan is forecastable from this feature set; botnet is not yet. That is the
   next piece of work, and we can say precisely why.
