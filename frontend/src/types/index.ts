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

/* Held-out evaluation replay (/api/replay/timeline).
   These mirror the artifacts written by `python -m syntra.evaluate`. */

export interface ReplayWindow {
  index: number;
  timestamp: string;
  combined: number;
  attack_head: number;
  novelty: number;
  horizon: number[];
  attack_now: number;
  attack_ahead: number;
  predicted_family: string;
  predicted_stage: string;
  mitre_tactic: string;
  mitre_technique: string;
  true_family: string;
  /** Raw, un-scaled values for the panel features, keyed by feature name. */
  features: Record<string, number>;
}

export type FeatureUnit = 'count' | 'bytes' | 'rate' | 'ratio' | 'us';

export interface ReplayFeatureMeta {
  name: string;
  label: string;
  unit: FeatureUnit;
  note: string;
  /** False for features that only back a drivers-list value, with no tile of their own. */
  panel: boolean;
  shap_weight: number;
  shap_rank: number;
  benign_median: number;
  day_min: number;
  day_max: number;
}

export interface ReplayEpisode {
  index: number;
  start: number;
  end: number;
  family: string;
}

export interface ReplayDriver {
  feature: string;
  weight: number;
}

export interface ReplayProvenance {
  dataset: string;
  real_traces: boolean;
  split: string;
  day: string;
  window_seconds: number;
  horizon_k: number;
  tuned_threshold: number;
  threshold_source: string;
  fpr_cap: number;
  met_fpr_cap: boolean;
  unseen_family: string;
  headline_precision?: number | null;
  headline_recall?: number | null;
  headline_ece?: number | null;
}

export interface ReplayTimeline {
  provenance: ReplayProvenance;
  windows: ReplayWindow[];
  episodes: ReplayEpisode[];
  drivers: ReplayDriver[];
  feature_meta: ReplayFeatureMeta[];
}
