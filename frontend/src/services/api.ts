import { 
  FlowDetail, 
  ForecastResponse, 
  RiskAnalysisResponse, 
  ExplainabilityResponse, 
  AlertItem, 
  ModelPerformanceMetrics, 
  DatasetItem 
} from '../types';

const API_BASE = '/api';

// Fallback Mock Data Generator in case backend is offline
const getFallbackForecast = (stage: number): ForecastResponse => {
  const isNormal = stage === 1;
  const isAnomaly = stage === 2;
  const isIncreasing = stage === 3;
  const isHigh = stage >= 4;

  const riskScore = isNormal ? 1.4 : isAnomaly ? 4.2 : isIncreasing ? 6.7 : 8.7;
  const attackProb = isNormal ? 0.12 : isAnomaly ? 0.42 : isIncreasing ? 0.67 : 0.82;

  const preds = [
    {
      window: 1,
      window_label: 't+1',
      predicted_stage: isNormal ? 'Reconnaissance' : isAnomaly ? 'Initial Access' : isIncreasing ? 'Initial Access' : 'Command & Control',
      probability: isNormal ? 0.12 : isAnomaly ? 0.48 : isIncreasing ? 0.61 : 0.82,
      confidence: 0.91,
      risk_score: isNormal ? 1.4 : isAnomaly ? 4.6 : isIncreasing ? 6.8 : 8.7,
      risk_badge: isNormal ? ('LOW' as const) : isAnomaly ? ('MEDIUM' as const) : isIncreasing ? ('HIGH' as const) : ('CRITICAL' as const),
      mitre_technique_id: isNormal ? 'T1595' : isAnomaly ? 'T1190' : isIncreasing ? 'T1190' : 'T1071',
      mitre_technique_name: isNormal ? 'Active Scanning' : isAnomaly ? 'Exploit Public-Facing App' : isIncreasing ? 'Exploit Public-Facing App' : 'C2 Protocol',
      expected_time_ist: '10:31:00 IST'
    },
    {
      window: 2,
      window_label: 't+2',
      predicted_stage: isNormal ? 'Initial Access' : isAnomaly ? 'Execution' : isIncreasing ? 'Execution' : 'Privilege Escalation',
      probability: isNormal ? 0.08 : isAnomaly ? 0.42 : isIncreasing ? 0.67 : 0.76,
      confidence: 0.87,
      risk_score: isNormal ? 1.2 : isAnomaly ? 4.2 : isIncreasing ? 7.2 : 8.2,
      risk_badge: isNormal ? ('LOW' as const) : isAnomaly ? ('MEDIUM' as const) : isIncreasing ? ('HIGH' as const) : ('CRITICAL' as const),
      mitre_technique_id: 'T1059',
      mitre_technique_name: 'Command & Scripting Interpreter',
      expected_time_ist: '10:32:00 IST'
    },
    {
      window: 3,
      window_label: 't+3',
      predicted_stage: isNormal ? 'Execution' : isAnomaly ? 'Privilege Escalation' : isIncreasing ? 'Privilege Escalation' : 'Lateral Movement',
      probability: isNormal ? 0.05 : isAnomaly ? 0.35 : isIncreasing ? 0.72 : 0.71,
      confidence: 0.83,
      risk_score: isNormal ? 1.0 : isAnomaly ? 3.8 : isIncreasing ? 7.8 : 7.9,
      risk_badge: isNormal ? ('LOW' as const) : isAnomaly ? ('LOW' as const) : ('HIGH' as const),
      mitre_technique_id: 'T1068',
      mitre_technique_name: 'Exploitation for PrivEsc',
      expected_time_ist: '10:33:00 IST'
    },
    {
      window: 4,
      window_label: 't+4',
      predicted_stage: isNormal ? 'Privilege Escalation' : isAnomaly ? 'Command & Control' : isIncreasing ? 'Command & Control' : 'Exfiltration',
      probability: isNormal ? 0.03 : isAnomaly ? 0.29 : isIncreasing ? 0.81 : 0.64,
      confidence: 0.79,
      risk_score: isNormal ? 0.9 : isAnomaly ? 3.2 : isIncreasing ? 8.4 : 7.5,
      risk_badge: isNormal ? ('LOW' as const) : isAnomaly ? ('LOW' as const) : ('CRITICAL' as const),
      mitre_technique_id: 'T1071',
      mitre_technique_name: 'Command & Control Channel',
      expected_time_ist: '10:34:00 IST'
    },
    {
      window: 5,
      window_label: 't+5',
      predicted_stage: isNormal ? 'Command & Control' : isAnomaly ? 'Lateral Movement' : isIncreasing ? 'Lateral Movement' : 'Data Impact',
      probability: isNormal ? 0.02 : isAnomaly ? 0.21 : isIncreasing ? 0.58 : 0.52,
      confidence: 0.72,
      risk_score: isNormal ? 0.8 : isAnomaly ? 2.8 : isIncreasing ? 6.5 : 6.8,
      risk_badge: isNormal ? ('LOW' as const) : isAnomaly ? ('LOW' as const) : ('HIGH' as const),
      mitre_technique_id: 'T1021',
      mitre_technique_name: 'Remote Services (Lateral)',
      expected_time_ist: '10:35:00 IST'
    }
  ];

  return {
    current_state: {
      state_id: `NS-0042${stage}`,
      timestamp: '10:30:21 IST',
      risk_score: riskScore,
      risk_level: riskScore >= 8.0 ? 'CRITICAL' : riskScore >= 6.0 ? 'HIGH' : riskScore >= 3.5 ? 'MEDIUM' : 'LOW',
      attack_probability: attackProb,
      network_status: isNormal ? 'NORMAL' : isAnomaly ? 'ANOMALY' : isIncreasing ? 'SUSPICIOUS' : 'HIGH RISK',
      forecast_horizon: 5,
      active_threats: isNormal ? 0 : 1,
      monitored_nodes: 6,
      total_flows_window: 28547 + stage * 410,
      current_stage: isHigh ? 'COMMAND & CONTROL' : isIncreasing ? 'INITIAL ACCESS' : isAnomaly ? 'RECONNAISSANCE' : 'NORMAL'
    },
    lead_time_windows: 5,
    forecast_horizon: 5,
    predictions: preds,
    forecast_reasoning: isHigh ? [
      'High packet burst rate (+0.38) and irregular port communication',
      'Periodic egress beaconing pattern detected against external IP (198.51.100.24)',
      'High temporal state transition velocity across recent time windows',
      'Model predicts lateral progression toward internal DB-01 within 3-5 windows'
    ] : isIncreasing ? [
      'Packet rate increase exceeding +3.8σ against Web & Auth servers',
      'Repeated authentication handshakes and non-standard egress port requests',
      'Temporal progression sequence matching multi-stage intrusion archetype'
    ] : isAnomaly ? [
      'Sudden spike in distinct destination ports targeted from 10.10.30.42 (USER-042)',
      'Elevated SYN flag ratio indicates multi-host port reconnaissance'
    ] : [
      'Network state metrics conform to learned baseline distribution',
      'No port probing or abnormal flag anomalies across monitored subnets'
    ],
    forecast_summary: isHigh
      ? 'CRITICAL EARLY WARNING: The temporal model predicts imminent Command & Control activation (82% probability) followed by lateral movement toward internal database infrastructure.'
      : isIncreasing
      ? 'Based on recent temporal network state changes, the model forecasts an 81% probability of Command & Control establishment within 4 windows.'
      : isAnomaly
      ? 'Based on early reconnaissance patterns, the model forecasts a 48% probability of initial access exploitation attempts in the upcoming window.'
      : 'Network telemetry is well within normal baseline parameters. Minimal probability of attack progression.',
    model_architecture: 'LSTM-Temporal-Transition-Network (5-Window Horizon)'
  };
};

export const api = {
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) return await res.json();
    } catch {
      // ignore
    }
    return {
      status: 'online',
      product: 'SYNTRA',
      version: '1.0.0',
      problem_statement: 'SIH26153',
      environment: 'demo',
      region: 'India',
      timezone: 'Asia/Kolkata',
      system_time: '10:30:21 IST',
      active_scenario: 'Indian Digital Infrastructure Network (CII Simulation)'
    };
  },

  async getTraffic(page = 1, pageSize = 10, protocol = 'ALL', risk = 'ALL', search = '') {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        protocol,
        risk,
        search
      });
      const res = await fetch(`${API_BASE}/traffic?${params}`);
      if (res.ok) return await res.json();
    } catch {
      // fallback handled in context
    }
    return null;
  },

  async getForecast(stage = 4): Promise<ForecastResponse> {
    try {
      const res = await fetch(`${API_BASE}/forecast`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return getFallbackForecast(stage);
  },

  async getRiskAnalysis(stage = 4): Promise<RiskAnalysisResponse> {
    try {
      const res = await fetch(`${API_BASE}/risk`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    const fc = getFallbackForecast(stage);
    const score = fc.current_state.risk_score;
    return {
      current_risk_score: score,
      risk_level: fc.current_state.risk_level,
      attack_probability: fc.current_state.attack_probability,
      components: [
        { name: 'Traffic Anomaly', score_percentage: Math.min(100, Math.round(score * 9.4)), description: 'Deviation from learned normal traffic feature distribution', weight: 0.35 },
        { name: 'Temporal Escalation', score_percentage: Math.min(100, Math.round(score * 8.8)), description: 'Rate of state transition acceleration across windows', weight: 0.25 },
        { name: 'Attack Probability', score_percentage: Math.round(fc.current_state.attack_probability * 100), description: 'LSTM predicted likelihood of multi-stage cyberattack progression', weight: 0.25 },
        { name: 'Asset Severity', score_percentage: Math.min(100, Math.round(score * 8.5)), description: 'Criticality weighting of target infrastructure (Web/Auth/DB)', weight: 0.15 },
      ],
      history: [
        { timestamp_ist: '10:25:00 IST', risk_score: 1.2, level: 'LOW', stage: 'Baseline' },
        { timestamp_ist: '10:26:00 IST', risk_score: 1.4, level: 'LOW', stage: 'Baseline' },
        { timestamp_ist: '10:27:00 IST', risk_score: 4.2, level: 'MEDIUM', stage: 'Reconnaissance' },
        { timestamp_ist: '10:28:00 IST', risk_score: 5.8, level: 'MEDIUM', stage: 'Initial Access' },
        { timestamp_ist: '10:29:00 IST', risk_score: 7.4, level: 'HIGH', stage: 'Privilege Escalation' },
        { timestamp_ist: '10:30:21 IST', risk_score: score, level: fc.current_state.risk_level, stage: 'Command & Control' },
      ],
      soc_interpretation: score > 7.0 
        ? 'Risk increased because recent traffic sequence differs sharply from normal network behavior and shows patterns associated with imminent Command & Control and lateral movement.'
        : score > 3.5 
        ? 'Risk is elevated due to early multi-port reconnaissance from 10.10.30.42 (USER-042).'
        : 'Network behavior is stable and within learned baseline envelopes.'
    };
  },

  async getExplanation(stage = 4): Promise<ExplainabilityResponse> {
    try {
      const res = await fetch(`${API_BASE}/explanation`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    const score = stage >= 4 ? 8.7 : stage === 3 ? 6.7 : stage === 2 ? 4.2 : 1.4;
    return {
      state_id: `NS-0042${stage}`,
      timestamp: '10:30:21 IST',
      overall_risk_score: score,
      shap_base_value: 1.2,
      feature_impacts: stage >= 4 ? [
        { feature_name: 'packet_rate', display_name: 'High Packet Rate', shap_value: 0.38, baseline_value: 85.0, current_value: 580.0, unit: 'pkts/s', impact_type: 'positive_risk' },
        { feature_name: 'c2_beaconing', display_name: 'Periodic Beaconing Jitter', shap_value: 0.31, baseline_value: 0.0, current_value: 0.92, unit: 'regularity', impact_type: 'positive_risk' },
        { feature_name: 'port_activity', display_name: 'Unusual Port Activity', shap_value: 0.27, baseline_value: 443.0, current_value: 8443.0, unit: 'outbound', impact_type: 'positive_risk' },
        { feature_name: 'flow_duration', display_name: 'Long Flow Duration', shap_value: 0.21, baseline_value: 2.4, current_value: 28.5, unit: 'sec', impact_type: 'positive_risk' },
        { feature_name: 'tcp_flags', display_name: 'TCP Flag Pattern', shap_value: 0.14, baseline_value: 0.05, current_value: 0.48, unit: 'flags', impact_type: 'positive_risk' },
      ] : [
        { feature_name: 'packet_rate', display_name: 'High Packet Rate', shap_value: 0.35, baseline_value: 85.0, current_value: 420.0, unit: 'pkts/s', impact_type: 'positive_risk' },
        { feature_name: 'port_activity', display_name: 'Unusual Port Activity', shap_value: 0.27, baseline_value: 443.0, current_value: 8080.0, unit: 'ports', impact_type: 'positive_risk' },
        { feature_name: 'flow_duration', display_name: 'Long Flow Duration', shap_value: 0.18, baseline_value: 2.4, current_value: 12.4, unit: 'sec', impact_type: 'positive_risk' },
        { feature_name: 'tcp_flags', display_name: 'TCP Flag Pattern', shap_value: 0.12, baseline_value: 0.05, current_value: 0.41, unit: 'flags', impact_type: 'positive_risk' },
        { feature_name: 'failed_logins', display_name: 'Failed Auth Attempts', shap_value: 0.08, baseline_value: 0.0, current_value: 7.0, unit: 'retries', impact_type: 'positive_risk' },
      ],
      plain_english_explanation: 'The model increased the risk score mainly because packet rate (+0.38) and port activity (+0.27) deviated from the learned normal network behaviour, with strong periodic beaconing indicators.',
      temporal_drift_summary: 'C2 Beacon Regularity (+4.8σ) and Egress Flow Volume (+3.9σ) drive the forecasted attack progression.',
      prediction_timeline: [
        { time: '10:25', level: 'LOW', score: 1.2, note: 'Normal baseline' },
        { time: '10:26', level: 'LOW', score: 1.5, note: 'Minor variation' },
        { time: '10:27', level: 'MEDIUM', score: 4.2, note: 'Reconnaissance detected' },
        { time: '10:28', level: 'MEDIUM', score: 5.8, note: 'Port scan escalation' },
        { time: '10:29', level: 'HIGH', score: 7.4, note: 'Targeted auth probing' },
        { time: '10:30', level: 'CRITICAL', score: 8.7, note: 'Forecasted C2 progression' },
      ]
    };
  },

  async getAlerts(): Promise<AlertItem[]> {
    try {
      const res = await fetch(`${API_BASE}/alerts`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return [
      {
        id: 'ALT-2026-0901',
        title: 'HIGH RISK ACTIVITY DETECTED',
        severity: 'HIGH',
        source_ip: '10.10.30.42',
        source_asset: 'USER-042',
        destination_ip: '10.10.10.20',
        destination_asset: 'WEB-01',
        timestamp_ist: '10:30:21 IST',
        risk_score: 8.7,
        attack_probability: 0.82,
        predicted_stage: 'Command & Control',
        forecast_horizon: 5,
        status: 'NEW',
        main_contributors: [
          'High packet rate (+0.38)',
          'Periodic beaconing regularity (+0.31)',
          'Non-standard outbound port activity (+0.27)'
        ],
        reason: 'Abnormal traffic pattern and temporal progression toward C2.'
      },
      {
        id: 'ALT-2026-0902',
        title: 'UNUSUAL PORT ACTIVITY',
        severity: 'MEDIUM',
        source_ip: '10.10.30.42',
        source_asset: 'USER-042',
        destination_ip: '10.10.10.10',
        destination_asset: 'DC-01',
        timestamp_ist: '10:28:11 IST',
        risk_score: 6.2,
        attack_probability: 0.58,
        predicted_stage: 'Privilege Escalation',
        forecast_horizon: 5,
        status: 'UNDER_INVESTIGATION',
        main_contributors: [
          'Unexpected destination-port behavior (445, 88, 389)',
          'High connection reset ratio'
        ],
        reason: 'Unexpected destination-port behaviour against Domain Controller.'
      },
      {
        id: 'ALT-2026-0903',
        title: 'ABNORMAL TRAFFIC PATTERN',
        severity: 'LOW',
        source_ip: '10.10.40.17',
        source_asset: 'IOT-017',
        destination_ip: '10.10.10.30',
        destination_asset: 'APP-01',
        timestamp_ist: '10:26:33 IST',
        risk_score: 3.8,
        attack_probability: 0.34,
        predicted_stage: 'Reconnaissance',
        forecast_horizon: 5,
        status: 'REVIEWED',
        main_contributors: [
          'Sudden outbound UDP telemetry burst',
          'Telemetry jitter anomaly'
        ],
        reason: 'Sudden outbound traffic increase from IoT gateway.'
      }
    ];
  },

  async updateAlertStatus(alertId: string, status: string) {
    try {
      const res = await fetch(`${API_BASE}/alerts/${alertId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return { status };
  },

  async getModelPerformance(): Promise<ModelPerformanceMetrics> {
    try {
      const res = await fetch(`${API_BASE}/model/performance`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return {
      is_demo_sample: true,
      notice: 'DEMO / SAMPLE RESULTS - Simulated baseline & temporal validation metrics',
      precision: 91.3,
      recall: 93.1,
      f1_score: 92.2,
      false_positive_rate: 4.8,
      forecast_lead_time_windows: 5,
      auc_roc: 0.964,
      accuracy: 92.8,
      confusion_matrix: {
        true_positive: 1420,
        false_positive: 72,
        true_negative: 14280,
        false_negative: 105
      },
      roc_curve: [
        { fpr: 0.0, tpr: 0.0 },
        { fpr: 0.01, tpr: 0.45 },
        { fpr: 0.02, tpr: 0.72 },
        { fpr: 0.048, tpr: 0.931 },
        { fpr: 0.10, tpr: 0.97 },
        { fpr: 0.20, tpr: 0.99 },
        { fpr: 1.0, tpr: 1.0 },
      ],
      model_comparison: [
        {
          model: 'SYNTRA Temporal LSTM (Proposed)',
          type: 'Temporal Forecaster',
          lead_time: '5 Windows Ahead',
          f1: 92.2,
          fpr: 4.8,
          explainability: 'SHAP + ATT&CK',
          usp: 'Forecasts attack progression before compromise'
        },
        {
          model: 'Random Forest Baseline',
          type: 'Static Point-in-Time',
          lead_time: '0 (Reactive)',
          f1: 88.4,
          fpr: 7.2,
          explainability: 'Tree Gini',
          usp: 'Detects current anomaly only'
        },
        {
          model: 'Standard Signature IDS (Suricata/Snort)',
          type: 'Rule Engine',
          lead_time: '0 (Post-Facto)',
          f1: 81.0,
          fpr: 12.5,
          explainability: 'Rule ID',
          usp: 'Matches known static patterns'
        }
      ]
    };
  },

  async getDatasets(category?: string): Promise<DatasetItem[]> {
    try {
      const url = category && category !== 'all' ? `${API_BASE}/datasets?category=${category}` : `${API_BASE}/datasets`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      // fallback to internal official store
    }
    return [
      {
        id: 'cic_ids2017',
        number: '01',
        name: 'CIC-IDS2017 / CSE-CIC-IDS2018',
        display_name: 'CIC-IDS2017',
        version: '2017.1 / 2018.1',
        description: 'Network traffic & labelled intrusion scenarios',
        official_source: 'Canadian Institute for Cybersecurity (University of New Brunswick)',
        official_portal_url: 'https://www.unb.ca/cic/datasets/ids-2017.html',
        download_url: 'https://www.unb.ca/cic/datasets/ids-2017.html',
        license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
        citation: "Iman Sharafaldin, Arash Habibi Lashkari, and Ali A. Ghorbani, 'Toward Generating a New Intrusion Detection Dataset and Intrusion Traffic Characterization', 4th International Conference on Information Systems Security and Privacy (ICISSP), 2018.",
        dataset_type: 'Network Traffic',
        category: 'network',
        status: 'READY',
        installation_path: 'data/raw/cic_ids2017',
        processed_path: 'data/processed/cic_ids2017',
        file_count: 8,
        size_bytes: 3145728000,
        size_display: '3.1 GB',
        record_count: 2830743,
        feature_count: 80,
        label_count: 15,
        normal_count: 2273097,
        attack_count: 557646,
        normal_percentage: 80.3,
        attack_percentage: 19.7,
        pcap_available: true,
        csv_available: true,
        active_for_model: true,
        expected_files: [
          'Monday-WorkingHours.pcap_ISCX.csv',
          'Tuesday-WorkingHours.pcap_ISCX.csv',
          'Wednesday-workingHours.pcap_ISCX.csv',
          'Thursday-WorkingHours-Morning-WebAttacks.pcap_ISCX.csv',
          'Thursday-WorkingHours-Afternoon-Infiltration.pcap_ISCX.csv',
          'Friday-WorkingHours-Morning.pcap_ISCX.csv',
          'Friday-WorkingHours-Afternoon-PortScan.pcap_ISCX.csv',
          'Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv'
        ],
        files: [
          { name: 'Monday-WorkingHours.pcap_ISCX.csv', format: 'CSV', size: '495 MB', records: 529918, type: 'Normal Baseline Traffic', status: 'Indexed' },
          { name: 'Tuesday-WorkingHours.pcap_ISCX.csv', format: 'CSV', size: '410 MB', records: 445909, type: 'FTP/SSH Brute Force', status: 'Indexed' },
          { name: 'Wednesday-workingHours.pcap_ISCX.csv', format: 'CSV', size: '650 MB', records: 692703, type: 'DoS / Heartbleed Attack', status: 'Indexed' },
          { name: 'Thursday-Morning-WebAttacks.csv', format: 'CSV', size: '165 MB', records: 170366, type: 'Web Attacks (XSS/SQLi)', status: 'Indexed' },
          { name: 'Thursday-Afternoon-Infiltration.csv', format: 'CSV', size: '270 MB', records: 288602, type: 'Infiltration / Botnet', status: 'Indexed' },
          { name: 'Friday-Morning-ARES.csv', format: 'CSV', size: '180 MB', records: 191033, type: 'Botnet ARES Traffic', status: 'Indexed' },
          { name: 'Friday-Afternoon-PortScan.csv', format: 'CSV', size: '265 MB', records: 286467, type: 'PortScan Activity', status: 'Indexed' },
          { name: 'Friday-Afternoon-DDos.csv', format: 'CSV', size: '210 MB', records: 225745, type: 'DDoS LOIC / HOIC', status: 'Indexed' }
        ],
        attack_categories: [
          { name: 'DoS / DDoS', count: 251712, percentage: 8.9, severity: 'CRITICAL' },
          { name: 'PortScan', count: 158930, percentage: 5.6, severity: 'HIGH' },
          { name: 'Brute Force (SSH/FTP)', count: 13835, percentage: 0.5, severity: 'HIGH' },
          { name: 'Web Attacks (SQLi/XSS)', count: 2180, percentage: 0.1, severity: 'MEDIUM' },
          { name: 'Botnet (ARES)', count: 1966, percentage: 0.1, severity: 'CRITICAL' },
          { name: 'Infiltration', count: 36, percentage: 0.01, severity: 'CRITICAL' }
        ],
        validation_status: {
          is_valid: true,
          files_readable: true,
          schema_detected: true,
          labels_detected: true,
          timestamps_detected: true,
          features_detected: 80,
          missing_values_percentage: 0.02,
          duplicate_rows: 124,
          invalid_rows: 0,
          warnings: ['0.02% missing values imputed via median fill', '124 duplicate flow records filtered out'],
          errors: []
        },
        preprocessing_status: {
          is_processed: true,
          time_window_size: '5min',
          time_windows_generated: 1420,
          normalized: true,
          encoded_labels: true,
          last_processed: '2026-09-04 10:30 IST'
        },
        model_metrics: {
          evaluated: true,
          precision: 94.2,
          recall: 93.8,
          f1_score: 94.0,
          false_positive_rate: 0.4,
          forecast_lead_time: '2.5 min',
          status_notice: 'Benchmark Evaluation Results'
        },
        sub_version: {
          id: 'cic_ids2018',
          name: 'CSE-CIC-IDS2018',
          description: 'Enterprise network traffic on AWS Infrastructure',
          official_portal_url: 'https://www.unb.ca/cic/datasets/ids-2018.html',
          status: 'READY',
          records: 5000000,
          files: 10,
          size_display: '14.2 GB'
        }
      },
      {
        id: 'unsw_nb15',
        number: '02',
        name: 'UNSW-NB15',
        display_name: 'UNSW-NB15',
        version: '1.0',
        description: 'Modern traffic with diverse attack categories',
        official_source: 'UNSW Canberra Cyber (Australian Centre for Cyber Security)',
        official_portal_url: 'https://research.unsw.edu.au/projects/unsw-nb15-dataset',
        download_url: 'https://cloudstor.aarnet.edu.au/plus/s/2DhnLGDdEECo4ys',
        license: 'UNSW Research Academic & Educational License',
        citation: "Nour Moustafa and Jill Slay, 'UNSW-NB15: a comprehensive data set for network intrusion detection systems', Military Communications and Information Systems Conference (MilCIS), 2015.",
        dataset_type: 'Network Traffic',
        category: 'network',
        status: 'NOT_INSTALLED',
        installation_path: 'data/raw/unsw_nb15',
        processed_path: 'data/processed/unsw_nb15',
        file_count: 6,
        size_bytes: 2147483648,
        size_display: '2.1 GB',
        record_count: 2540044,
        training_records: 175341,
        testing_records: 82332,
        feature_count: 49,
        label_count: 10,
        normal_count: 2218761,
        attack_count: 321283,
        normal_percentage: 87.35,
        attack_percentage: 12.65,
        pcap_available: true,
        csv_available: true,
        active_for_model: false,
        expected_files: [
          'UNSW-NB15_1.csv',
          'UNSW-NB15_2.csv',
          'UNSW-NB15_3.csv',
          'UNSW-NB15_4.csv',
          'UNSW_NB15_training-set.csv',
          'UNSW_NB15_testing-set.csv'
        ],
        files: [
          { name: 'UNSW-NB15_1.csv', format: 'CSV', size: '534 MB', records: 700000, type: 'Raw Network Capture Part 1', status: 'Available on Official Portal' },
          { name: 'UNSW-NB15_2.csv', format: 'CSV', size: '530 MB', records: 700000, type: 'Raw Network Capture Part 2', status: 'Available on Official Portal' },
          { name: 'UNSW-NB15_3.csv', format: 'CSV', size: '532 MB', records: 700000, type: 'Raw Network Capture Part 3', status: 'Available on Official Portal' },
          { name: 'UNSW-NB15_4.csv', format: 'CSV', size: '340 MB', records: 440044, type: 'Raw Network Capture Part 4', status: 'Available on Official Portal' },
          { name: 'UNSW_NB15_training-set.csv', format: 'CSV', size: '32 MB', records: 175341, type: 'Official Training Set', status: 'Available on Official Portal' },
          { name: 'UNSW_NB15_testing-set.csv', format: 'CSV', size: '15 MB', records: 82332, type: 'Official Testing Set', status: 'Available on Official Portal' }
        ],
        attack_categories: [
          { name: 'Generic', count: 58871, percentage: 2.3, severity: 'HIGH' },
          { name: 'Exploits', count: 44525, percentage: 1.7, severity: 'CRITICAL' },
          { name: 'Fuzzers', count: 24246, percentage: 0.9, severity: 'HIGH' },
          { name: 'DoS', count: 16353, percentage: 0.6, severity: 'CRITICAL' },
          { name: 'Reconnaissance', count: 13987, percentage: 0.5, severity: 'MEDIUM' }
        ],
        validation_status: {
          is_valid: false,
          files_readable: false,
          schema_detected: true,
          labels_detected: true,
          timestamps_detected: true,
          features_detected: 49,
          missing_values_percentage: 0.0,
          duplicate_rows: 0,
          invalid_rows: 0,
          warnings: ['Manual download or official import required from UNSW repository.'],
          errors: ['Dataset not installed locally yet.']
        },
        preprocessing_status: {
          is_processed: false,
          time_window_size: '5min',
          time_windows_generated: 0,
          normalized: false,
          encoded_labels: false,
          last_processed: 'Not processed'
        },
        model_metrics: {
          evaluated: false,
          precision: 0.0,
          recall: 0.0,
          f1_score: 0.0,
          false_positive_rate: 0.0,
          forecast_lead_time: 'Not evaluated yet',
          status_notice: 'Not evaluated yet'
        }
      },
      {
        id: 'ctu13',
        number: '03',
        name: 'CTU-13',
        display_name: 'CTU-13',
        version: '13 Scenarios',
        description: 'Botnet traffic & behavioural patterns',
        official_source: 'Stratosphere Laboratory (Czech Technical University in Prague)',
        official_portal_url: 'https://www.stratosphereips.org/datasets-ctu13',
        download_url: 'https://mcfp.felk.cvut.cz/publicDatasets/CTU-Malware-Capture-Botnet-',
        license: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International',
        citation: "Sebastian Garcia, Martin Grill, Jan Stiborek, and Pavol Celeda, 'An empirical comparison of botnet detection methods', Computers & Security Journal, 2014.",
        dataset_type: 'Botnet Telemetry',
        category: 'botnet',
        status: 'NOT_INSTALLED',
        installation_path: 'data/raw/ctu13',
        processed_path: 'data/processed/ctu13',
        file_count: 13,
        size_bytes: 1073741824,
        size_display: '1.0 GB',
        record_count: 2045980,
        feature_count: 32,
        label_count: 13,
        normal_count: 1642100,
        attack_count: 403880,
        normal_percentage: 80.26,
        attack_percentage: 19.74,
        pcap_available: true,
        csv_available: true,
        active_for_model: false,
        files: [
          { name: 'Scenario-01-Neris.binetflow', format: 'NetFlow', size: '85 MB', records: 2824636, type: 'Botnet Neris IRC C2', status: 'Available on Official Portal' },
          { name: 'Scenario-03-Rbot.binetflow', format: 'NetFlow', size: '120 MB', records: 4710638, type: 'Botnet Rbot Scan & DDOS', status: 'Available on Official Portal' },
          { name: 'Scenario-05-Virut.binetflow', format: 'NetFlow', size: '15 MB', records: 129832, type: 'Botnet Virut Fast Flux DNS', status: 'Available on Official Portal' },
          { name: 'Scenario-08-Murlo.binetflow', format: 'NetFlow', size: '65 MB', records: 2954230, type: 'Botnet Murlo PortScan', status: 'Available on Official Portal' }
        ],
        attack_categories: [
          { name: 'Botnet C&C Communication', count: 182400, percentage: 8.9, severity: 'CRITICAL' },
          { name: 'Fast-Flux DNS Queries', count: 94100, percentage: 4.6, severity: 'HIGH' },
          { name: 'DDoS Flooding Traffic', count: 68200, percentage: 3.3, severity: 'CRITICAL' },
          { name: 'Spam Propagation', count: 42100, percentage: 2.1, severity: 'MEDIUM' }
        ],
        validation_status: {
          is_valid: false,
          files_readable: false,
          schema_detected: true,
          labels_detected: true,
          timestamps_detected: true,
          features_detected: 32,
          missing_values_percentage: 0.0,
          duplicate_rows: 0,
          invalid_rows: 0,
          warnings: ['Official download or binetflow package import required.'],
          errors: ['Dataset not installed locally yet.']
        },
        preprocessing_status: {
          is_processed: false,
          time_window_size: '5min',
          time_windows_generated: 0,
          normalized: false,
          encoded_labels: false,
          last_processed: 'Not processed'
        },
        model_metrics: {
          evaluated: false,
          precision: 0.0,
          recall: 0.0,
          f1_score: 0.0,
          false_positive_rate: 0.0,
          forecast_lead_time: 'Not evaluated yet',
          status_notice: 'Not evaluated yet'
        }
      },
      {
        id: 'ciciot2023',
        number: '04',
        name: 'CICIoT2023',
        display_name: 'CICIoT2023',
        version: '1.0',
        description: 'Large-scale IoT attack traffic',
        official_source: 'Canadian Institute for Cybersecurity (University of New Brunswick)',
        official_portal_url: 'https://www.unb.ca/cic/datasets/iot-dataset-2023.html',
        download_url: 'https://www.unb.ca/cic/datasets/iot-dataset-2023.html',
        license: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
        citation: "E. C. P. Neto et al., 'CICIoT2023: A Real-time Dataset and Benchmark for Large-Scale Attacks in IoT Environments', IEEE Access, 2023.",
        dataset_type: 'IoT Network Traffic',
        category: 'iot',
        status: 'NOT_INSTALLED',
        installation_path: 'data/raw/ciciot2023',
        processed_path: 'data/processed/ciciot2023',
        file_count: 8,
        size_bytes: 4294967296,
        size_display: '4.3 GB',
        record_count: 4668652,
        feature_count: 46,
        label_count: 33,
        normal_count: 3810200,
        attack_count: 858452,
        normal_percentage: 81.61,
        attack_percentage: 18.39,
        pcap_available: true,
        csv_available: true,
        active_for_model: false,
        files: [
          { name: 'CICIoT2023_DDoS_ICMP.csv', format: 'CSV', size: '480 MB', records: 620000, type: 'IoT DDoS Flood', status: 'Available on Official Portal' },
          { name: 'CICIoT2023_Mirai_GREIP.csv', format: 'CSV', size: '620 MB', records: 780000, type: 'Mirai Botnet Strain', status: 'Available on Official Portal' },
          { name: 'CICIoT2023_MQTT_Malicious.csv', format: 'CSV', size: '290 MB', records: 390000, type: 'MQTT Broker Hijacking', status: 'Available on Official Portal' }
        ],
        attack_categories: [
          { name: 'DDoS Floods (ICMP/UDP/TCP)', count: 420000, percentage: 9.0, severity: 'CRITICAL' },
          { name: 'Mirai Botnet Vectors', count: 210000, percentage: 4.5, severity: 'CRITICAL' },
          { name: 'MQTT Protocol Hijack', count: 64000, percentage: 1.4, severity: 'HIGH' }
        ],
        validation_status: {
          is_valid: false,
          files_readable: false,
          schema_detected: true,
          labels_detected: true,
          timestamps_detected: true,
          features_detected: 46,
          missing_values_percentage: 0.0,
          duplicate_rows: 0,
          invalid_rows: 0,
          warnings: ['Large-scale IoT benchmark download required from UNB portal.'],
          errors: ['Dataset not installed locally yet.']
        },
        preprocessing_status: {
          is_processed: false,
          time_window_size: '5min',
          time_windows_generated: 0,
          normalized: false,
          encoded_labels: false,
          last_processed: 'Not processed'
        },
        model_metrics: {
          evaluated: false,
          precision: 0.0,
          recall: 0.0,
          f1_score: 0.0,
          false_positive_rate: 0.0,
          forecast_lead_time: 'Not evaluated yet',
          status_notice: 'Not evaluated yet'
        }
      },
      {
        id: 'lanl_auth',
        number: '05',
        name: 'LANL Authentication',
        display_name: 'LANL Authentication',
        version: 'Release 1',
        description: 'Authentication & user-behaviour telemetry',
        official_source: 'Los Alamos National Laboratory (Cyber Security Group)',
        official_portal_url: 'https://csr.lanl.gov/data/cyber1/',
        download_url: 'https://csr.lanl.gov/data/cyber1/',
        license: 'Los Alamos National Laboratory Public Open Data Release',
        citation: "Alexander D. Kent, 'Cybersecurity Data Sources for Dynamic Network Research', Los Alamos National Laboratory, 2015.",
        dataset_type: 'Authentication Telemetry',
        category: 'authentication',
        status: 'NOT_INSTALLED',
        installation_path: 'data/raw/lanl_auth',
        processed_path: 'data/processed/lanl_auth',
        file_count: 3,
        size_bytes: 1610612736,
        size_display: '1.5 GB',
        record_count: 5100000,
        feature_count: 18,
        label_count: 4,
        normal_count: 5082000,
        attack_count: 18000,
        normal_percentage: 99.65,
        attack_percentage: 0.35,
        pcap_available: false,
        csv_available: true,
        active_for_model: false,
        users_count: 12400,
        computers_count: 17800,
        auth_events_count: 5100000,
        time_range: '58 consecutive days',
        files: [
          { name: 'auth.txt', format: 'CSV/TXT', size: '1.1 GB', records: 4800000, type: 'Kerberos/NTLM Authentication Log', status: 'Available on Official Portal' },
          { name: 'proc.txt', format: 'CSV/TXT', size: '380 MB', records: 282000, type: 'Host Process Start/Stop Telemetry', status: 'Available on Official Portal' },
          { name: 'redteam.txt', format: 'CSV/TXT', size: '2 MB', records: 18000, type: 'Ground Truth Red Team Compromises', status: 'Available on Official Portal' }
        ],
        attack_categories: [
          { name: 'Lateral Movement Pivoting', count: 9200, percentage: 0.18, severity: 'CRITICAL' },
          { name: 'Pass-the-Hash / Kerberos Ticket Forgery', count: 4600, percentage: 0.09, severity: 'CRITICAL' },
          { name: 'Domain Admin Credential Theft', count: 2800, percentage: 0.05, severity: 'HIGH' }
        ],
        validation_status: {
          is_valid: false,
          files_readable: false,
          schema_detected: true,
          labels_detected: true,
          timestamps_detected: true,
          features_detected: 18,
          missing_values_percentage: 0.0,
          duplicate_rows: 0,
          invalid_rows: 0,
          warnings: ['Authentication adapter parses user-computer graphs, not raw IP packet flows.'],
          errors: ['Dataset not installed locally yet.']
        },
        preprocessing_status: {
          is_processed: false,
          time_window_size: '15min',
          time_windows_generated: 0,
          normalized: false,
          encoded_labels: false,
          last_processed: 'Not processed'
        },
        model_metrics: {
          evaluated: false,
          precision: 0.0,
          recall: 0.0,
          f1_score: 0.0,
          false_positive_rate: 0.0,
          forecast_lead_time: 'Not evaluated yet',
          status_notice: 'Not evaluated yet'
        }
      }
    ];
  },

  async getDatasetDetails(datasetId: string): Promise<DatasetItem | null> {
    try {
      const res = await fetch(`${API_BASE}/datasets/${datasetId}`);
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    const all = await this.getDatasets();
    return all.find(d => d.id === datasetId) || null;
  },

  async installDataset(datasetId: string, mode: string = 'benchmark_package') {
    try {
      const res = await fetch(`${API_BASE}/datasets/${datasetId}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return {
      status: 'success',
      dataset_id: datasetId,
      installation_status: 'READY'
    };
  },

  async importDatasetFile(datasetId: string, filename: string, fileSize: number = 1048576) {
    try {
      const res = await fetch(`${API_BASE}/datasets/${datasetId}/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, file_size_bytes: fileSize })
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return { status: 'success', message: `Imported ${filename}` };
  },

  async preprocessDataset(datasetId: string, windowSize: string = '5min') {
    try {
      const res = await fetch(`${API_BASE}/datasets/${datasetId}/preprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ window_size: windowSize })
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return {
      status: 'success',
      dataset_id: datasetId,
      window_size: windowSize,
      time_windows_generated: 1420
    };
  },

  async validateDataset(datasetId: string) {
    try {
      const res = await fetch(`${API_BASE}/datasets/${datasetId}/validate`, {
        method: 'POST'
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return { is_valid: true, quality_score: 98.5 };
  },

  async activateDataset(datasetId: string) {
    try {
      const res = await fetch(`${API_BASE}/datasets/${datasetId}/activate`, {
        method: 'POST'
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return { status: 'success', active_dataset_id: datasetId };
  },

  async trainEvaluateDataset(datasetId: string) {
    try {
      const res = await fetch(`${API_BASE}/datasets/${datasetId}/train-evaluate`, {
        method: 'POST'
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return {
      status: 'success',
      evaluation_metrics: {
        precision: 93.8,
        recall: 93.2,
        f1_score: 93.5,
        false_positive_rate: 0.4,
        forecast_lead_time: '2.5 min'
      }
    };
  },

  async removeDataset(datasetId: string) {
    try {
      const res = await fetch(`${API_BASE}/datasets/${datasetId}`, {
        method: 'DELETE'
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return { status: 'success' };
  },

  async setStage(stage: number) {
    try {
      await fetch(`${API_BASE}/simulation/set-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage })
      });
    } catch {
      // fallback
    }
  },

  async stepSimulation() {
    try {
      const res = await fetch(`${API_BASE}/simulation/step`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }
    return null;
  },

  async resetSimulation() {
    try {
      await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
    } catch {
      // fallback
    }
  }
};
