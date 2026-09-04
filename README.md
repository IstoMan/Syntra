# SYNTRA — AI-Based Network Attack Forecasting
## Smart India Hackathon 2026 • Problem Statement SIH26153
**Theme:** Blockchain & Cybersecurity | **Category:** Software

---

## 1. Product Identity & USP

> **SYNTRA learns how network behaviour changes over time and forecasts possible cyberattack progression before compromise, with risk scoring, explainable predictions, and early warnings.**

### Core Innovation: Detect → Forecast → Explain → Alert

- **Traditional IDS answers:** *“Is malicious activity happening now?”*
- **SYNTRA answers:** *“What is likely to happen next?”*

```
              SYNTRA
                │
                ▼
        NETWORK TRAFFIC
                │
                ▼
       FEATURE EXTRACTION
                │
                ▼
        NETWORK STATE
                │
                ▼
       TEMPORAL AI MODEL
                │
                ▼
        FUTURE FORECAST (t+1 .. t+5)
                │
        ┌───────┴────────┐
        ▼                ▼
    RISK SCORE       EXPLANATION (SHAP)
        │                │
        └───────┬────────┘
                ▼
          EARLY WARNING
                │
                ▼
       SECURITY ANALYST
```

---

## 2. Key Capabilities & 10 SOC Console Pages

1. **Dashboard:** Real-time KPIs, dynamic Risk Over Time chart (IST time-series), 5-Window Forecast Horizon, Recent Alerts feed, SHAP summary, and Innovation USP card.
2. **Traffic Monitor:** Live streaming flow telemetry, asset resolution (DC-01, WEB-01, DB-01, USER-042), protocol/risk filters, search, and slide-out anomaly detail drawer with direct forecast linking.
3. **Attack Forecast:** 5-window lookahead timeline ($t+1$ to $t+5$) with transition probabilities, confidence ratings, and AI security reasoning.
4. **Risk Analysis:** Composite radial risk gauge (0–10), 4-factor breakdown (Traffic Anomaly, Temporal Escalation, Attack Probability, Asset Severity), and SOC interpretation.
5. **Explainability (XAI):** Mathematical SHAP feature attribution bars (+/- relative to normal baseline), sequential prediction timeline, and statistical Z-score drift metrics.
6. **MITRE ATT&CK Matrix:** 7-stage enterprise kill chain progression (Recon $\rightarrow$ Initial Access $\rightarrow$ Execution $\rightarrow$ PrivEsc $\rightarrow$ C2 $\rightarrow$ Lateral Movement $\rightarrow$ Exfiltration) with observed vs predicted highlights.
7. **Alerts & Early Warning:** Actionable early warning triage queue with interactive status lifecycle (`NEW` $\rightarrow$ `UNDER_INVESTIGATION` $\rightarrow$ `REVIEWED`).
8. **Model Performance:** Transparent benchmark metrics (Precision 91.3%, Recall 93.1%, F1 92.2%, FPR 4.8%, 5-window Lead Time, Confusion Matrix, and ROC-AUC curve).
9. **Data Source & Ingestion:** Benchmark datasets (CIC-IDS2017, UNSW-NB15, CTU-13) and live CSV/PCAP flow uploader with statistical feature validation.
10. **Settings:** Configurable forecast lookahead (1, 3, 5, 10 windows), alert sensitivity sliders, simulation tick rates (1x, 2x, 5x), and deployment metadata.

---

## 3. Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Launch FastAPI Backend
```bash
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at `http://127.0.0.1:8000/docs`.

### 2. Launch React Frontend
```bash
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 4. 2-Minute SIH Judging Demo Script

1. **00:00 — Dashboard:** Present SYNTRA, show the IST clock, system status, and baseline network telemetry.
2. **00:15 — Start Demo:** Click **"START ATTACK FORECAST DEMO"** or the **"Demo Tour"** button.
3. **00:25 — Traffic Monitor:** Observe incoming flows; click a suspicious flow to show the anomaly detail drawer.
4. **00:45 — Anomaly Escalation:** Watch the risk score rise from Low (1.4) to Medium (4.2).
5. **01:00 — Attack Forecast:** Navigate to Attack Forecast and showcase the $t+1$ to $t+5$ horizon timeline.
6. **01:20 — Explainability (SHAP):** Open Explainability to show the positive feature impacts (+0.38 Packet Rate, +0.31 Beaconing).
7. **01:35 — Alerts:** Open Alerts, review the Early Warning card, and click **"Investigate"** to transition status to `UNDER INVESTIGATION`.
8. **01:50 — MITRE ATT&CK:** Review the highlighted predicted stage in the enterprise progression map.
9. **02:00 — Wrap-Up:** Conclude on how SYNTRA shifts cybersecurity from reactive detection to predictive defence.
