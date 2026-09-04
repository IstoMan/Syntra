"""
Pydantic Schemas for SYNTRA - AI-Based Network Attack Forecasting (SIH26153)
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class FlowDetail(BaseModel):
    id: str
    timestamp: str
    source_ip: str
    source_port: int
    source_asset: Optional[str] = None
    destination_ip: str
    destination_port: int
    destination_asset: Optional[str] = None
    protocol: str
    packets: int
    bytes_transferred: int
    flow_duration_sec: float
    packet_rate: float
    byte_rate: float
    syn_flag_count: int
    ack_flag_count: int
    rst_flag_count: int
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    status: str      # Normal, Suspicious, Malicious
    anomalies: List[str] = []

class TrafficResponse(BaseModel):
    total_flows: int
    active_flows: int
    flows: List[FlowDetail]
    page: int
    page_size: int
    total_pages: int

class NetworkState(BaseModel):
    state_id: str
    timestamp: str
    risk_score: float = Field(..., ge=0.0, le=10.0)
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    attack_probability: float = Field(..., ge=0.0, le=1.0)
    network_status: str  # NORMAL, ANOMALY, SUSPICIOUS, HIGH RISK, CRITICAL
    forecast_horizon: int
    active_threats: int
    monitored_nodes: int
    total_flows_window: int
    current_stage: str

class ForecastPrediction(BaseModel):
    window: int
    window_label: str  # e.g., t+1, t+2
    predicted_stage: str
    probability: float
    confidence: float
    risk_score: float
    risk_badge: str  # LOW, MEDIUM, HIGH, CRITICAL
    mitre_technique_id: Optional[str] = None
    mitre_technique_name: Optional[str] = None
    expected_time_ist: str

class ForecastResponse(BaseModel):
    current_state: NetworkState
    lead_time_windows: int
    forecast_horizon: int
    predictions: List[ForecastPrediction]
    forecast_reasoning: List[str]
    forecast_summary: str
    model_architecture: str = "LSTM-Temporal-Transition-Network (5-Window Horizon)"

class RiskComponent(BaseModel):
    name: str
    score_percentage: float
    description: str
    weight: float

class RiskHistoryPoint(BaseModel):
    timestamp_ist: str
    risk_score: float
    level: str
    stage: str

class RiskAnalysisResponse(BaseModel):
    current_risk_score: float
    risk_level: str
    attack_probability: float
    components: List[RiskComponent]
    history: List[RiskHistoryPoint]
    soc_interpretation: str

class FeatureImpact(BaseModel):
    feature_name: str
    display_name: str
    shap_value: float  # e.g. +0.35 or -0.12
    baseline_value: float
    current_value: float
    unit: str
    impact_type: str  # positive_risk (increases risk), negative_risk (decreases risk)

class ExplainabilityResponse(BaseModel):
    state_id: str
    timestamp: str
    overall_risk_score: float
    shap_base_value: float
    feature_impacts: List[FeatureImpact]
    plain_english_explanation: str
    temporal_drift_summary: str
    prediction_timeline: List[Dict[str, Any]]

class AlertItem(BaseModel):
    id: str
    title: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    source_ip: str
    source_asset: Optional[str] = None
    destination_ip: str
    destination_asset: Optional[str] = None
    timestamp_ist: str
    risk_score: float
    attack_probability: float
    predicted_stage: str
    forecast_horizon: int
    status: str  # NEW, UNDER_INVESTIGATION, REVIEWED
    main_contributors: List[str]
    reason: str

class AlertUpdateRequest(BaseModel):
    status: str  # NEW, UNDER_INVESTIGATION, REVIEWED

class ModelPerformanceMetrics(BaseModel):
    is_demo_sample: bool = True
    notice: str = "DEMO / SAMPLE RESULTS - Simulated baseline & temporal validation metrics"
    precision: float = 91.3
    recall: float = 93.1
    f1_score: float = 92.2
    false_positive_rate: float = 4.8
    forecast_lead_time_windows: int = 5
    auc_roc: float = 0.964
    accuracy: float = 92.8
    confusion_matrix: Dict[str, int]
    roc_curve: List[Dict[str, float]]
    model_comparison: List[Dict[str, Any]]

class SimulationStatus(BaseModel):
    is_running: bool
    current_stage: int  # 1 to 7
    stage_name: str
    tick_count: int
    speed_multiplier: float
    active_scenario: str
    time_ist: str
