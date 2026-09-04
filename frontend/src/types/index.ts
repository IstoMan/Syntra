export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FlowStatus = 'Normal' | 'Suspicious' | 'Malicious';
export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'NEW' | 'UNDER_INVESTIGATION' | 'REVIEWED';

export interface FlowDetail {
  id: string;
  timestamp: string;
  source_ip: string;
  source_port: number;
  source_asset?: string;
  destination_ip: string;
  destination_port: number;
  destination_asset?: string;
  protocol: string;
  packets: number;
  bytes_transferred: number;
  flow_duration_sec: number;
  packet_rate: number;
  byte_rate: number;
  syn_flag_count: number;
  ack_flag_count: number;
  rst_flag_count: number;
  risk_level: RiskLevel;
  status: FlowStatus;
  anomalies: string[];
}

export interface NetworkState {
  state_id: string;
  timestamp: string;
  risk_score: number;
  risk_level: RiskLevel;
  attack_probability: number;
  network_status: string;
  forecast_horizon: number;
  active_threats: number;
  monitored_nodes: number;
  total_flows_window: number;
  current_stage: string;
}

export interface ForecastPrediction {
  window: number;
  window_label: string;
  predicted_stage: string;
  probability: number;
  confidence: number;
  risk_score: number;
  risk_badge: RiskLevel;
  mitre_technique_id?: string;
  mitre_technique_name?: string;
  expected_time_ist: string;
  predicted_family?: string;
}

export interface ForecastResponse {
  current_state: NetworkState;
  lead_time_windows: number;
  forecast_horizon: number;
  predictions: ForecastPrediction[];
  forecast_reasoning: string[];
  forecast_summary: string;
  model_architecture: string;
  inference_source?: string;
  predicted_family?: string;
  combined_score?: number;
  alert_threshold?: number;
  model_loaded?: boolean;
}

export interface RiskComponent {
  name: string;
  score_percentage: number;
  description: string;
  weight: number;
}

export interface RiskHistoryPoint {
  timestamp_ist: string;
  risk_score: number;
  level: string;
  stage: string;
}

export interface RiskAnalysisResponse {
  current_risk_score: number;
  risk_level: RiskLevel;
  attack_probability: number;
  components: RiskComponent[];
  history: RiskHistoryPoint[];
  soc_interpretation: string;
  inference_source?: string;
  model_loaded?: boolean;
  combined_score?: number;
}

export interface FeatureImpact {
  feature_name: string;
  display_name: string;
  shap_value: number;
  baseline_value: number;
  current_value: number;
  unit: string;
  impact_type: 'positive_risk' | 'negative_risk' | 'neutral';
}

export interface ExplainabilityResponse {
  state_id: string;
  timestamp: string;
  overall_risk_score: number;
  shap_base_value: number;
  feature_impacts: FeatureImpact[];
  plain_english_explanation: string;
  temporal_drift_summary: string;
  prediction_timeline: {
    time: string;
    level: string;
    score: number;
    note: string;
  }[];
  inference_source?: string;
  model_loaded?: boolean;
}

export interface AlertItem {
  id: string;
  title: string;
  severity: AlertSeverity;
  source_ip: string;
  source_asset?: string;
  destination_ip: string;
  destination_asset?: string;
  timestamp_ist: string;
  risk_score: number;
  attack_probability: number;
  predicted_stage: string;
  forecast_horizon: number;
  status: AlertStatus;
  main_contributors: string[];
  reason: string;
}

export interface ModelPerformanceMetrics {
  is_demo_sample: boolean;
  notice: string;
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  forecast_lead_time_windows: number;
  auc_roc: number;
  accuracy: number;
  confusion_matrix: {
    true_positive: number;
    false_positive: number;
    true_negative: number;
    false_negative: number;
  };
  roc_curve: { fpr: number; tpr: number }[];
  model_comparison: {
    model: string;
    type: string;
    lead_time: string;
    f1: number;
    fpr: number;
    explainability: string;
    usp: string;
  }[];
  inference_source?: string;
  model_loaded?: boolean;
  mean_lead_seconds?: number;
}

export interface DatasetFileItem {
  name: string;
  format: string;
  size: string;
  records: number;
  type: string;
  status: string;
}

export interface DatasetAttackCategory {
  name: string;
  count: number;
  percentage: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DatasetValidationStatus {
  is_valid: boolean;
  files_readable: boolean;
  schema_detected: boolean;
  labels_detected: boolean;
  timestamps_detected: boolean;
  features_detected: number;
  missing_values_percentage: number;
  duplicate_rows: number;
  invalid_rows: number;
  warnings: string[];
  errors: string[];
}

export interface DatasetPreprocessingStatus {
  is_processed: boolean;
  time_window_size: string;
  time_windows_generated: number;
  normalized: boolean;
  encoded_labels: boolean;
  last_processed: string;
}

export interface DatasetModelMetrics {
  evaluated: boolean;
  precision: number;
  recall: number;
  f1_score: number;
  false_positive_rate: number;
  forecast_lead_time: string;
  status_notice: string;
}

export interface DatasetItem {
  id: string;
  number?: string;
  name: string;
  display_name?: string;
  version?: string;
  description: string;
  official_source?: string;
  official_portal_url?: string;
  download_url?: string;
  license?: string;
  citation?: string;
  dataset_type: string;
  category?: 'network' | 'iot' | 'authentication' | 'botnet';
  status: 'READY' | 'NOT_INSTALLED' | 'DOWNLOADING' | 'EXTRACTING' | 'INDEXING' | 'VALIDATING' | 'ERROR';
  installation_path?: string;
  processed_path?: string;
  file_count?: number;
  size_bytes?: number;
  size_display?: string;
  record_count?: number;
  training_records?: number;
  testing_records?: number;
  feature_count?: number;
  label_count?: number;
  normal_count?: number;
  attack_count?: number;
  normal_percentage?: number;
  attack_percentage?: number;
  pcap_available?: boolean;
  csv_available?: boolean;
  active_for_model?: boolean;
  users_count?: number;
  computers_count?: number;
  auth_events_count?: number;
  time_range?: string;
  expected_files?: string[];
  files?: DatasetFileItem[];
  attack_categories?: DatasetAttackCategory[];
  validation_status?: DatasetValidationStatus;
  preprocessing_status?: DatasetPreprocessingStatus;
  model_metrics?: DatasetModelMetrics;
  sub_version?: {
    id: string;
    name: string;
    description: string;
    official_portal_url: string;
    status: string;
    records: number;
    files: number;
    size_display: string;
  };
}

export interface HealthStatus {
  status: string;
  product?: string;
  version?: string;
  problem_statement?: string;
  environment?: string;
  region?: string;
  timezone?: string;
  system_time?: string;
  active_scenario?: string;
  model_loaded?: boolean;
  model_architecture?: string;
  inference_source?: string;
  artifacts_dir?: string;
  load_error?: string | null;
  has_novelty?: boolean;
  alert_threshold?: number | null;
}

export type PageId =
  | 'simulation'
  | 'history'
  | 'dashboard'
  | 'traffic'
  | 'forecast'
  | 'risk'
  | 'explainability'
  | 'mitre'
  | 'alerts'
  | 'performance'
  | 'datasource'
  | 'settings';
