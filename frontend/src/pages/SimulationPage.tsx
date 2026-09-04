import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  Sparkles, 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  Activity, 
  Search, 
  X, 
  ArrowRight, 
  AlertTriangle,
  Compass,
  Server,
  Radio,
  Lock,
  Unlock,
  Flame,
  Filter,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Layers,
  FileText,
  Cpu,
  Video,
  ExternalLink,
  Shield,
  SlidersHorizontal,
  ArrowDown,
  Info,
  ChevronDown
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { RiskBadge } from '../components/common/RiskBadge';
import { RiskRadialGauge } from '../components/charts/RiskRadialGauge';
import { RiskTimeChart } from '../components/charts/RiskTimeChart';
import { NetworkTopologyMap, NodeData } from '../components/charts/NetworkTopologyMap';
import { RealTimeForecastEvaluationGraph, ForecastEventPoint } from '../components/charts/RealTimeForecastEvaluationGraph';

// shadcn/ui components
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';
import { Progress } from '../components/ui/progress';

interface TerminalLogEntry {
  id: string;
  time: string;
  source: 'ZEEK' | 'SURICATA' | 'SYSMON' | 'AI-GRU' | 'FIREWALL';
  level: 'INFO' | 'WARN' | 'CRIT' | 'MITIGATED';
  message: string;
}

interface TimelineTrafficEvent {
  id: string;
  time: string;
  title: string;
  srcIp: string;
  dstIp: string;
  srcAsset: string;
  dstAsset: string;
  protocol: string;
  packetRate: string;
  byteRate: string;
  stageTrigger: number;
  anomalyType: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
}

export const SimulationPage: React.FC = () => {
  const {
    currentStage,
    stageName,
    isPlaying,
    speed,
    timeIST,
    togglePlay,
    stepForward,
    resetSimulation,
    setStage,
    setSpeed,
    activeScenario,
    setActiveScenario,
    forecastData,
    riskData,
    explanationData,
    healthStatus,
    flows,
    selectedFlow,
    setSelectedFlow,
    setCurrentPage,
    isAutoTourActive,
    startJudgeDemo,
    stopJudgeDemo
  } = useSimulation();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [isolatedNodes, setIsolatedNodes] = useState<string[]>([]);
  const [isInjectingAnomaly, setIsInjectingAnomaly] = useState(false);
  const [activeTimelineTab, setActiveTimelineTab] = useState<'timeline' | 'topology' | 'flows'>('timeline');

  // References for scrolling and forecast highlighting
  const forecastGraphRef = useRef<HTMLDivElement>(null);
  const forecastTimelineRef = useRef<HTMLDivElement>(null);
  const networkStateRef = useRef<HTMLDivElement>(null);
  const explanationRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const [forecastTimeWindow, setForecastTimeWindow] = useState<'1min' | '5min' | '15min'>('5min');
  const [selectedForecastEvent, setSelectedForecastEvent] = useState<ForecastEventPoint | null>(null);
  const [selectedDataSource, setSelectedDataSource] = useState<string>('demo');

  const DATA_SOURCES = [
    { id: 'demo', label: 'Demo Simulation', type: 'Simulation' },
    { id: 'cic_ids2017', label: 'CIC-IDS2017', type: 'Benchmark' },
    { id: 'cic_ids2018', label: 'CSE-CIC-IDS2018', type: 'Benchmark' },
    { id: 'unsw_nb15', label: 'UNSW-NB15', type: 'Benchmark' },
    { id: 'ctu13', label: 'CTU-13', type: 'Botnet' },
    { id: 'ciciot2023', label: 'CICIoT2023', type: 'IoT' },
    { id: 'lanl_auth', label: 'LANL Authentication', type: 'Auth Telemetry' }
  ];

  const scrollToForecast = () => {
    forecastGraphRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToNetworkState = () => {
    networkStateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const scrollToExplanation = () => {
    explanationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Stage-based Dynamic Telemetry Calculations
  const isMitigated = currentStage === 7;
  
  // Risk Score Progression: 1.2 -> 2.8 -> 4.1 -> 5.7 -> 7.2 -> 8.7 (or 0.8 if mitigated)
  const stageRiskScores: Record<number, number> = {
    1: 1.2,
    2: 2.8,
    3: 4.1,
    4: 5.7,
    5: 7.2,
    6: 8.7,
    7: 0.8
  };
  const riskScore = forecastData?.current_state.risk_score ?? stageRiskScores[currentStage] ?? 1.2;

  // Attack Likelihood Progression: 4% -> 22% -> 48% -> 67% -> 82% -> 89% (or 2% if mitigated)
  const stageProbabilities: Record<number, number> = {
    1: 0.04,
    2: 0.22,
    3: 0.48,
    4: 0.67,
    5: 0.82,
    6: 0.89,
    7: 0.02
  };
  const attackProb = forecastData?.current_state.attack_probability ?? stageProbabilities[currentStage] ?? 0.04;
  const modelLive = Boolean(forecastData?.model_loaded || healthStatus?.model_loaded);
  const inferenceSource = forecastData?.inference_source || healthStatus?.inference_source || 'offline_mock';

  // Active Flows: 142 -> 380 -> 1,240 -> 2,890 -> 4,120
  const stageActiveFlows: Record<number, number> = {
    1: 142,
    2: 380,
    3: 1240,
    4: 2890,
    5: 4120,
    6: 4680,
    7: 156
  };
  const activeFlowsCount = stageActiveFlows[currentStage] ?? 142;

  // Packets/sec: 1,200 pps -> 4,800 pps -> 18,500 pps -> 42,000 pps
  const stagePacketsSec: Record<number, string> = {
    1: '1,200 pps',
    2: '4,800 pps',
    3: '18,500 pps',
    4: '34,200 pps',
    5: '42,000 pps',
    6: '48,900 pps',
    7: '1,150 pps'
  };
  const packetsSec = stagePacketsSec[currentStage] ?? '1,200 pps';

  // Bytes/sec: 850 KB/s -> 3.2 MB/s -> 14.8 MB/s -> 38.4 MB/s
  const stageBytesSec: Record<number, string> = {
    1: '850 KB/s',
    2: '3.2 MB/s',
    3: '14.8 MB/s',
    4: '28.6 MB/s',
    5: '38.4 MB/s',
    6: '46.2 MB/s',
    7: '810 KB/s'
  };
  const bytesSec = stageBytesSec[currentStage] ?? '850 KB/s';

  // Anomaly score: 0.08 -> 0.32 -> 0.65 -> 0.89
  const stageAnomalyScore: Record<number, number> = {
    1: 0.08,
    2: 0.32,
    3: 0.54,
    4: 0.65,
    5: 0.82,
    6: 0.89,
    7: 0.04
  };
  const anomalyScore = stageAnomalyScore[currentStage] ?? 0.08;

  // Current Network State progression: NORMAL -> ANOMALY -> SUSPICIOUS -> HIGH RISK -> FORECAST
  const getNetworkStateName = () => {
    if (isMitigated) return 'NORMAL (SECURED)';
    if (currentStage >= 5) return 'FORECAST';
    if (currentStage === 4) return 'HIGH RISK';
    if (currentStage === 3) return 'SUSPICIOUS';
    if (currentStage === 2) return 'ANOMALY';
    return 'NORMAL';
  };

  const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 
    isMitigated ? 'LOW' : riskScore >= 8.0 ? 'CRITICAL' : riskScore >= 6.0 ? 'HIGH' : riskScore >= 3.5 ? 'MEDIUM' : 'LOW';

  // Core 7-Step Process Pipeline
  const pipelineSteps = [
    { id: 1, label: 'Network Traffic', desc: 'Ingestion' },
    { id: 2, label: 'Feature Extraction', desc: 'NetFlow Parser' },
    { id: 3, label: 'Network State', desc: 'Graph State' },
    { id: 4, label: 'AI Forecast', desc: 'GRU World Model' },
    { id: 5, label: 'Risk Assessment', desc: 'Multi-Window' },
    { id: 6, label: 'Explainability', desc: 'SHAP & Weights' },
    { id: 7, label: 'Early Warning', desc: 'SOC Dispatch' }
  ];

  // Dynamic Process Step mapping
  const activePipelineStep = Math.min(7, currentStage);

  // Network State Levels
  const networkStateLevels = ['NORMAL', 'ANOMALY', 'SUSPICIOUS', 'HIGH RISK', 'FORECAST'];
  const currentStateLevelIndex = isMitigated ? 0 : Math.min(4, currentStage - 1);

  // 5-Step Future Timeline Predictions (API-backed when the world model or stub forecast is live)
  const fallbackTimeline = [
    {
      step: 'Current State',
      timeWindow: 't+0 (10:30:01)',
      stageName: 'Normal Baseline Operations',
      probability: isMitigated ? 0.02 : 0.98,
      risk: 'LOW',
      mitre: 'M1040',
      mitreName: 'Behavioral Baseline'
    },
    {
      step: 't+1 Initial Access',
      timeWindow: 't+1 (10:30:08)',
      stageName: 'Initial Exploit & Ingress Probe',
      probability: isMitigated ? 0.04 : 0.88,
      risk: 'MEDIUM',
      mitre: 'T1190',
      mitreName: 'Exploit Public-Facing App'
    },
    {
      step: 't+2 Execution',
      timeWindow: 't+2 (10:30:15)',
      stageName: 'Command & Scripting Interpreter',
      probability: isMitigated ? 0.03 : 0.82,
      risk: 'HIGH',
      mitre: 'T1059',
      mitreName: 'PowerShell / WMI Spawn'
    },
    {
      step: 't+3 Privilege Escalation',
      timeWindow: 't+3 (10:30:22)',
      stageName: 'Credential Dumping & Kerberoasting',
      probability: isMitigated ? 0.02 : 0.76,
      risk: 'HIGH',
      mitre: 'T1068',
      mitreName: 'Exploitation for Priv Escalation'
    },
    {
      step: 't+4 Command & Control',
      timeWindow: 't+4 (10:30:30)',
      stageName: 'C2 Beaconing & Encrypted Channel',
      probability: isMitigated ? 0.01 : 0.69,
      risk: 'CRITICAL',
      mitre: 'T1071',
      mitreName: 'Application Layer Protocol'
    },
    {
      step: 't+5 Lateral Movement',
      timeWindow: 't+5 (10:30:45)',
      stageName: 'Domain Controller Pivot & DB Staging',
      probability: isMitigated ? 0.01 : 0.54,
      risk: 'CRITICAL',
      mitre: 'T1021',
      mitreName: 'Remote Services (SMB/RPC)'
    }
  ];

  const fiveStepTimeline =
    forecastData?.predictions && forecastData.predictions.length > 0
      ? [
          {
            step: 'Current State',
            timeWindow: `t+0 (${forecastData.current_state.timestamp})`,
            stageName: forecastData.current_state.current_stage,
            probability: forecastData.current_state.attack_probability,
            risk: forecastData.current_state.risk_level,
            mitre: forecastData.predictions[0]?.mitre_technique_id ?? '—',
            mitreName: forecastData.predicted_family ?? 'baseline'
          },
          ...forecastData.predictions.map((pred) => ({
            step: `${pred.window_label} ${pred.predicted_stage}`,
            timeWindow: `${pred.window_label} (${pred.expected_time_ist})`,
            stageName: pred.predicted_stage,
            probability: pred.probability,
            risk: pred.risk_badge,
            mitre: pred.mitre_technique_id ?? '',
            mitreName: pred.predicted_family || pred.mitre_technique_name || ''
          }))
        ]
      : fallbackTimeline;

  // AI Feature Impact Values (Explainability)
  const fallbackFeatureImpacts = [
    { name: 'High Packet Rate', value: currentStage >= 2 ? 38 : 6, display: '+38%', baseline: '1,200 pps', current: packetsSec },
    { name: 'Unusual Port Activity', value: currentStage >= 3 ? 29 : 4, display: '+29%', baseline: 'Port 443 only', current: 'Port 8443, 88 SPN' },
    { name: 'Flow Duration', value: currentStage >= 4 ? 18 : 3, display: '+18%', baseline: '1.2s avg', current: '18.4s persistent' },
    { name: 'TCP Flag Pattern', value: currentStage >= 2 ? 12 : 2, display: '+12%', baseline: 'ACK: 98%', current: 'SYN Surge 24x' },
    { name: 'Timing Pattern', value: currentStage >= 4 ? 8 : 1, display: '+8%', baseline: 'Random Poisson', current: '10.2s Jitter Heartbeat' }
  ];
  const featureImpacts =
    explanationData?.feature_impacts && explanationData.feature_impacts.length > 0
      ? explanationData.feature_impacts.slice(0, 5).map((feat) => ({
          name: feat.display_name,
          value: Math.min(100, Math.abs(feat.shap_value) * 100),
          display: `${feat.shap_value >= 0 ? '+' : ''}${feat.shap_value.toFixed(2)}`,
          baseline: String(feat.baseline_value),
          current: `${feat.current_value} ${feat.unit}`
        }))
      : fallbackFeatureImpacts;

  // Central Network Activity Timeline Events (Strictly Fictional Private IPs)
  const trafficTimelineEvents: TimelineTrafficEvent[] = [
    {
      id: 'EVT-101',
      time: '10:30:01',
      title: 'Normal Traffic Detected',
      srcIp: '10.10.10.20',
      dstIp: '10.10.20.15',
      srcAsset: 'WEB-01 (DMZ Web)',
      dstAsset: 'DB-01 (Core SQL)',
      protocol: 'TLS/HTTPS (Port 5432)',
      packetRate: '180 pps',
      byteRate: '92 KB/s',
      stageTrigger: 1,
      anomalyType: 'Normal baseline query transaction',
      risk: 'LOW',
      status: 'Conforming Baseline'
    },
    {
      id: 'EVT-102',
      time: '10:30:08',
      title: 'Increased Packet Rate Surge',
      srcIp: '10.10.30.42',
      dstIp: '10.10.10.20',
      srcAsset: 'USER-042 (Finance Endpoint)',
      dstAsset: 'WEB-01 (DMZ Web)',
      protocol: 'TCP SYN (Port 443)',
      packetRate: '4,800 pps',
      byteRate: '3.2 MB/s',
      stageTrigger: 2,
      anomalyType: 'Volumetric packet rate deviation (+300%)',
      risk: 'LOW',
      status: 'Anomaly Detected'
    },
    {
      id: 'EVT-103',
      time: '10:30:15',
      title: 'Unusual Port Activity & Kerberos SPN Query',
      srcIp: '10.10.30.42',
      dstIp: '10.10.10.10',
      srcAsset: 'USER-042 (Finance Endpoint)',
      dstAsset: 'DC-01 (Domain Controller)',
      protocol: 'KERBEROS / TCP (Port 88)',
      packetRate: '820 pps',
      byteRate: '480 KB/s',
      stageTrigger: 3,
      anomalyType: 'Unusual destination port & SPN discovery sweep',
      risk: 'MEDIUM',
      status: 'Suspicious Probe'
    },
    {
      id: 'EVT-104',
      time: '10:30:22',
      title: 'Abnormal Flow Duration & Persistent Tunnel',
      srcIp: '10.10.30.42',
      dstIp: '198.51.100.24',
      srcAsset: 'USER-042 (Finance Endpoint)',
      dstAsset: 'EXT-WAN (Internet Gateway)',
      protocol: 'TLS (Port 8443)',
      packetRate: '2,400 pps',
      byteRate: '4.8 MB/s',
      stageTrigger: 4,
      anomalyType: 'Flow duration exceeded 18.4s (Historical baseline: 1.5s)',
      risk: 'HIGH',
      status: 'High Risk Flow'
    },
    {
      id: 'EVT-105',
      time: '10:30:30',
      title: 'Timing Anomaly (10.2s Jitter Heartbeat)',
      srcIp: '10.10.30.42',
      dstIp: '198.51.100.24',
      srcAsset: 'USER-042 (Finance Endpoint)',
      dstAsset: 'EXT-WAN (Internet Gateway)',
      protocol: 'HTTPS / C2 Beacon',
      packetRate: '1,890 pps',
      byteRate: '2.1 MB/s',
      stageTrigger: 5,
      anomalyType: 'Periodic beacon timing pattern with 10.2s pulse interval',
      risk: 'HIGH',
      status: 'Forecast Generated'
    },
    {
      id: 'EVT-106',
      time: '10:30:45',
      title: 'Suspicious Network State — Lateral Pivot Vector',
      srcIp: '10.10.30.42',
      dstIp: '10.10.20.15',
      srcAsset: 'USER-042 (Finance Endpoint)',
      dstAsset: 'DB-01 (Core SQL Database)',
      protocol: 'DCE-RPC / SMB (Port 445)',
      packetRate: '6,200 pps',
      byteRate: '18.4 MB/s',
      stageTrigger: 6,
      anomalyType: 'Unauthorized lateral access request on Crown Jewel DB',
      risk: 'CRITICAL',
      status: 'Early Warning Active'
    }
  ];

  // Filtered live events for timeline
  const visibleEvents = trafficTimelineEvents.filter(e => e.stageTrigger <= currentStage);

  // Simulation Event Feed items matching exact prompt requirements
  const simulationEventFeed = [
    { time: '10:30:01', msg: 'Normal traffic detected', stage: 1, type: 'ZEEK', level: 'INFO' },
    { time: '10:30:08', msg: 'Packet rate increased (4,800 pps)', stage: 2, type: 'SURICATA', level: 'WARN' },
    { time: '10:30:15', msg: 'Unusual port activity detected on Port 88 & 8443', stage: 3, type: 'ZEEK', level: 'WARN' },
    { time: '10:30:22', msg: 'Network state changed to Suspicious', stage: 4, type: 'AI-GRU', level: 'WARN' },
    { time: '10:30:30', msg: 'Attack probability increased to 67%', stage: 4, type: 'AI-GRU', level: 'CRIT' },
    { time: '10:30:38', msg: 'Future attack progression forecast generated', stage: 5, type: 'AI-GRU', level: 'CRIT' },
    { time: '10:30:45', msg: 'HIGH RISK — Early warning generated', stage: 6, type: 'FIREWALL', level: 'CRIT' },
    ...(currentStage === 7 ? [
      { time: '10:30:52', msg: 'AUTONOMOUS MITIGATION: Threat isolated & sinkholed', stage: 7, type: 'FIREWALL', level: 'MITIGATED' }
    ] : [])
  ].filter(item => item.stage <= currentStage);

  // Node data for inspection drawer
  const selectedNodeData = [
    { id: 'EXT-WAN', label: 'Internet Gateway', ip: '198.51.100.24', os: 'EdgeOS 3.2 (BGP Ingress)', role: 'Border BGP Gateway & External Ingress', openPorts: [80, 443, 8443], processes: ['bgpd', 'zebra', 'iptables'], cpu: currentStage >= 2 ? 78 : 22, memory: 45 },
    { id: 'FW-01', label: 'NextGen Firewall', ip: '10.10.0.1', os: 'PAN-OS 11.0 / FortiOS', role: 'Stateful Deep Packet Inspection & IPS Engine', openPorts: [443, 830, 514], processes: ['pan_authd', 'dpind', 'suricata'], cpu: currentStage >= 5 ? 88 : 34, memory: 58 },
    { id: 'WEB-01', label: 'DMZ Web Server', ip: '10.10.10.20', os: 'Ubuntu 22.04 LTS (Nginx)', role: 'Public Facing Banking Web Application Cluster', openPorts: [80, 443, 8080], processes: ['nginx', 'php-fpm', 'node'], cpu: currentStage >= 4 ? 92 : currentStage >= 2 ? 65 : 18, memory: currentStage >= 4 ? 84 : 42 },
    { id: 'APP-01', label: 'App Cluster', ip: '10.10.10.30', os: 'Red Hat Enterprise Linux 9', role: 'Internal Core Transaction Processing Microservices', openPorts: [8080, 9090, 1883], processes: ['java', 'python3', 'mosquitto'], cpu: currentStage >= 3 ? 55 : 24, memory: 61 },
    { id: 'USER-042', label: 'Finance Endpoint', ip: '10.10.30.42', os: 'Windows 11 Pro Enterprise', role: 'High-Privilege Financial Analyst Workstation', openPorts: [135, 445, 5357], processes: currentStage >= 3 ? ['powershell.exe', 'svchost.exe', 'lsass.exe'] : ['explorer.exe', 'chrome.exe', 'excel.exe'], cpu: currentStage >= 4 ? 95 : currentStage >= 3 ? 72 : 12, memory: currentStage >= 4 ? 91 : 38 },
    { id: 'DC-01', label: 'Domain Controller', ip: '10.10.10.10', os: 'Windows Server 2022 Datacenter', role: 'Active Directory Identity & Kerberos KDC Authority', openPorts: [53, 88, 389, 445, 636], processes: ['lsass.exe', 'ntoskrnl.exe', 'dns.exe'], cpu: currentStage >= 6 ? 89 : currentStage >= 4 ? 60 : 20, memory: 74 },
    { id: 'DB-01', label: 'Core SQL Database', ip: '10.10.20.15', os: 'Debian 12 (PostgreSQL 16 Enterprise)', role: 'Primary Ledger & Crown Jewel Customer Records Database', openPorts: [5432, 9187], processes: ['postgres', 'redis-server'], cpu: currentStage >= 7 ? 19 : currentStage >= 6 ? 78 : 31, memory: 82 },
  ].find(n => n.id === selectedNodeId);

  const handleIsolateNode = (nodeId: string) => {
    if (isolatedNodes.includes(nodeId)) {
      setIsolatedNodes(prev => prev.filter(n => n !== nodeId));
    } else {
      setIsolatedNodes(prev => [...prev, nodeId]);
    }
  };

  const handleAutonomousMitigation = () => {
    setIsolatedNodes(['USER-042', 'EXT-WAN', 'WEB-01']);
    setStage(7);
  };

  return (
    <div className="space-y-4 pb-12 animate-entrance">

      {/* 1. Core Process Pipeline Banner Ribbon */}
      <Card className="p-3 border-border/80 bg-card/60 backdrop-blur">
        <div className="flex items-center justify-between gap-2 overflow-x-auto py-1">
          <div className="flex items-center gap-2 shrink-0 pr-2 border-r border-border">
            <Badge variant="cyber" className="text-[9.5px] px-1.5 py-0 uppercase">
              PIPELINE
            </Badge>
            <span className="text-xs font-bold text-foreground font-mono hidden md:inline">
              Core Process Flow
            </span>
          </div>

          <div className="flex items-center gap-1.5 min-w-max">
            {pipelineSteps.map((step, idx) => {
              const isActive = activePipelineStep === step.id;
              const isCompleted = activePipelineStep > step.id;

              return (
                <React.Fragment key={step.id}>
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground font-bold shadow-sm scale-105 ring-1 ring-primary/50'
                        : isCompleted
                        ? 'bg-secondary text-foreground border border-border/80'
                        : 'bg-muted/30 text-muted-foreground opacity-60 border border-border/40'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9.5px] font-bold ${
                      isActive ? 'bg-zinc-950 text-zinc-50 dark:bg-zinc-950 dark:text-zinc-50' : isCompleted ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.id}
                    </span>
                    <span className="whitespace-nowrap font-medium">{step.label}</span>
                  </div>
                  {idx < pipelineSteps.length - 1 && (
                    <span className="text-muted-foreground text-xs opacity-50 select-none">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 2. Top Header & Control Command Bar */}
      <Card className="p-3.5 sm:p-4 border-border/80 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          {/* Title & Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 pr-3 border-r border-border">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  currentStage >= 5 ? 'bg-rose-400' : isPlaying || isAutoTourActive ? 'bg-sky-400' : 'bg-emerald-400'
                }`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  currentStage >= 5 ? 'bg-rose-500' : isPlaying || isAutoTourActive ? 'bg-sky-500' : 'bg-emerald-500'
                }`} />
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-foreground tracking-tight">
                  Live Attack Forecast Simulation
                </h2>
                <span className="text-[11px] font-mono text-muted-foreground block">
                  Status: <strong className={currentStage >= 5 ? 'text-rose-400' : 'text-emerald-400'}>
                    {isMitigated ? '● Incident Mitigated' : currentStage >= 5 ? '● Early Warning Active' : isPlaying ? `● Simulating (Stage ${currentStage}/7)` : '● Simulation Ready'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Defense Badge */}
            <Badge
              variant={modelLive ? 'cyber' : 'outline'}
              className={`text-[10px] font-mono hidden sm:inline-flex ${modelLive ? '' : 'text-muted-foreground'}`}
            >
              {modelLive ? 'World Model LIVE' : 'Demo fallback'}
              {inferenceSource === 'world_model' ? ' · GRU K=5' : ''}
            </Badge>
          </div>

          {/* Controls: Speed, Start Simulation, Pause, Reset */}
          <div className="flex items-center gap-2 self-end lg:self-auto shrink-0 flex-wrap">
            
            {/* Speed Selector */}
            <div className="flex items-center bg-muted/70 rounded-md border border-border p-0.5 text-xs font-mono">
              <span className="px-2 text-[10px] text-muted-foreground font-bold uppercase hidden sm:inline">Speed:</span>
              {[1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSpeed(spd)}
                  className={`px-2.5 py-1 rounded text-xs cursor-pointer transition-colors ${
                    speed === spd ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Primary START SIMULATION Button */}
            <Button
              variant={isPlaying ? 'warning' : 'cyber'}
              size="default"
              onClick={togglePlay}
              className="font-bold tracking-tight px-4 shadow-sm"
              title={isPlaying ? 'Pause active simulation' : 'Start interactive multi-stage forecast simulation'}
            >
              {isPlaying ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5 fill-current" />}
              <span>{isPlaying ? 'PAUSE SIMULATION' : 'START SIMULATION'}</span>
            </Button>

            {/* Step Forward button */}
            <Button
              variant="outline"
              size="icon"
              onClick={stepForward}
              disabled={isPlaying || isAutoTourActive}
              title="Advance single stage step"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            {/* Reset Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={resetSimulation}
              title="Reset simulation back to baseline (10:30:01)"
              className="font-mono text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Reset</span>
            </Button>

            {/* Autonomous Demo Runner */}
            <Button
              variant={isAutoTourActive ? 'destructive' : 'outline'}
              size="sm"
              onClick={isAutoTourActive ? stopJudgeDemo : startJudgeDemo}
              className={`font-mono text-xs ${isAutoTourActive ? 'animate-pulse' : 'text-sky-400 border-sky-500/30 hover:bg-sky-500/10'}`}
              title="Run 30-second automated multi-stage demonstration"
            >
              <Video className="w-3.5 h-3.5 mr-1" />
              <span>{isAutoTourActive ? 'Stop Tour' : 'Auto Tour'}</span>
            </Button>

          </div>

        </div>
      </Card>

      {/* 3. Final Early Warning State Alert Banner (Displayed when risk score >= 7.0 or Stage >= 5) */}
      {riskScore >= 7.0 && !isMitigated && (
        <Card className="p-4 sm:p-5 border-rose-500/50 bg-rose-950/20 shadow-lg relative overflow-hidden animate-entrance">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="px-2.5 py-0.5 font-bold tracking-wider uppercase animate-pulse">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                  EARLY WARNING
                </Badge>
                <span className="text-xs font-mono font-bold text-rose-300">
                  Potential attack progression detected
                </span>
              </div>
              
              {/* Key forecast indicators requested in prompt */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs font-mono">
                <div>
                  <span className="text-zinc-400 text-[10.5px]">Attack Probability:</span>
                  <p className="text-sm font-extrabold text-rose-400">82%</p>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10.5px]">Risk Level:</span>
                  <p className="text-sm font-extrabold text-rose-400">HIGH</p>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10.5px]">Predicted Stage:</span>
                  <p className="text-sm font-extrabold text-indigo-300">COMMAND & CONTROL</p>
                </div>
                <div>
                  <span className="text-zinc-400 text-[10.5px]">Forecast Horizon:</span>
                  <p className="text-sm font-extrabold text-sky-400">5 time windows</p>
                </div>
              </div>
            </div>

            {/* Action Buttons: INVESTIGATE and VIEW FORECAST */}
            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
              <Button
                variant="cyber"
                size="sm"
                onClick={() => {
                  setSelectedNodeId('USER-042');
                }}
                className="font-bold text-xs"
              >
                <Search className="w-3.5 h-3.5 mr-1.5" />
                <span>INVESTIGATE</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={scrollToForecast}
                className="font-bold text-xs text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/10"
              >
                <Compass className="w-3.5 h-3.5 mr-1.5" />
                <span>VIEW FORECAST</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 3.4. DATA SOURCE SELECTOR RIBBON FOR SIMULATION */}
      <Card className="p-3 border-border/80 bg-card/80 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground uppercase font-bold text-[10.5px] shrink-0">DATA SOURCE:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {DATA_SOURCES.map((ds) => {
                const isSelected = selectedDataSource === ds.id;
                return (
                  <button
                    key={ds.id}
                    onClick={() => setSelectedDataSource(ds.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-current animate-pulse' : 'bg-zinc-500'}`} />
                    <span>{ds.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 self-end md:self-auto font-mono text-[10.5px]">
            {selectedDataSource === 'demo' ? (
              <Badge variant="outline" className="text-zinc-400 border-border">
                ● Simulation Mode • Demonstration Data
              </Badge>
            ) : (
              <Badge variant="cyber" className="text-sky-300 border-sky-500/30">
                ● Dataset Mode • Real Dataset ({DATA_SOURCES.find(d => d.id === selectedDataSource)?.label})
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* 3.5. [REAL-TIME ATTACK FORECAST GRAPH AT TOP OF PAGE] — Time-Series Evaluation Plot */}
      <div ref={forecastGraphRef} className="w-full">
        <RealTimeForecastEvaluationGraph 
          currentSimProgress={currentStage}
          timeWindow={forecastTimeWindow}
          onTimeWindowChange={setForecastTimeWindow}
          onSelectEvent={setSelectedForecastEvent}
          selectedEventId={selectedForecastEvent?.id}
          onViewNetworkState={scrollToNetworkState}
          onViewExplanation={scrollToExplanation}
          dataSource={DATA_SOURCES.find(d => d.id === selectedDataSource)?.label || 'Demo Simulation'}
          isDatasetMode={selectedDataSource !== 'demo'}
        />
      </div>

      {/* 4. Risk Score Over Time Chart & Simulation Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Risk Score Over Time Chart (7 Cols) */}
        <div className="lg:col-span-7">
          <RiskTimeChart 
            currentScore={riskScore}
            stageIndex={currentStage}
          />
        </div>

        {/* Simulation Event Feed Stream (5 Cols) */}
        <Card className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between border-border/80 space-y-3">
          <div className="space-y-3">
            
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                <CardTitle className="text-xs uppercase tracking-wider text-foreground font-bold">
                  Simulation Event Feed
                </CardTitle>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Socket
              </span>
            </div>

            {/* Live event stream */}
            <div className="p-3 bg-zinc-950 font-mono text-xs max-h-64 overflow-y-auto space-y-2 select-text rounded-lg border border-border/60">
              {simulationEventFeed.map((evt, idx) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-zinc-500 text-[10.5px] shrink-0 pt-0.5">{evt.time}</span>
                  <Badge variant={
                    evt.level === 'CRIT' ? 'high' :
                    evt.level === 'WARN' ? 'medium' :
                    evt.level === 'MITIGATED' ? 'low' :
                    'secondary'
                  } className="text-[9px] px-1.5 py-0 font-mono">
                    [{evt.type}]
                  </Badge>
                  <span className={`text-[11px] ${
                    evt.level === 'CRIT' ? 'text-red-300 font-bold' :
                    evt.level === 'WARN' ? 'text-amber-300' :
                    evt.level === 'MITIGATED' ? 'text-emerald-300 font-bold' :
                    'text-zinc-300'
                  }`}>
                    {evt.msg}
                  </span>
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

          </div>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>Stream: SIEM / Zeek / Suricata</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage('history')}
              className="text-sky-400 hover:text-sky-300 h-6 px-2 text-xs font-semibold"
            >
              <span>View Audit History</span>
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </Card>

      </div>

      {/* 5. 3-Column Intelligence Grid: Left (Network State) | Center (Attack Forecast) | Right (AI Explanation) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Panel — Network State (3 Cols) */}
        <Card ref={networkStateRef} className="lg:col-span-3 p-4 sm:p-5 flex flex-col justify-between border-border/80 space-y-4">
          <div className="space-y-4">
            
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <CardTitle className="text-xs uppercase tracking-wider text-foreground font-bold">
                  Network State
                </CardTitle>
              </div>
              <Badge variant="cyber" className="text-[10px] px-1.5 py-0 font-mono">
                Real-Time
              </Badge>
            </div>

            {/* State Progression Indicator: NORMAL -> ANOMALY -> SUSPICIOUS -> HIGH RISK -> FORECAST */}
            <div className="space-y-1.5">
              <span className="text-[10.5px] font-mono text-muted-foreground uppercase font-bold">
                State Transition:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                {networkStateLevels.map((lvl, idx) => {
                  const isCurrent = idx === currentStateLevelIndex;
                  const isPast = idx < currentStateLevelIndex;

                  return (
                    <React.Fragment key={lvl}>
                      <span
                        className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded font-bold transition-all ${
                          isCurrent
                            ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                            : isPast
                            ? 'bg-secondary text-foreground'
                            : 'bg-muted/30 text-muted-foreground opacity-50'
                        }`}
                      >
                        {lvl}
                      </span>
                      {idx < networkStateLevels.length - 1 && (
                        <span className="text-[9px] text-muted-foreground opacity-40">→</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Metric counters */}
            <div className="space-y-3 font-mono text-xs">
              
              {/* Current State */}
              <div className="bg-muted/40 p-2.5 rounded-lg border border-border flex items-center justify-between">
                <span className="text-muted-foreground text-[11px]">Current State</span>
                <span className={`font-extrabold ${riskScore >= 7 ? 'text-rose-400' : riskScore >= 4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {getNetworkStateName()}
                </span>
              </div>

              {/* Active Flows */}
              <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Active Flows</span>
                <span className="font-bold text-foreground text-sm">{activeFlowsCount.toLocaleString()}</span>
              </div>

              {/* Packets/sec */}
              <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Packets / sec</span>
                <span className="font-bold text-foreground text-sm">{packetsSec}</span>
              </div>

              {/* Bytes/sec */}
              <div className="flex items-center justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Bytes / sec</span>
                <span className="font-bold text-foreground text-sm">{bytesSec}</span>
              </div>

              {/* Anomaly Score */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Anomaly Score</span>
                  <span className="font-bold text-foreground">{anomalyScore.toFixed(2)} / 1.00</span>
                </div>
                <Progress
                  value={anomalyScore * 100}
                  indicatorClassName={anomalyScore > 0.6 ? 'bg-rose-500' : anomalyScore > 0.3 ? 'bg-amber-500' : 'bg-emerald-500'}
                  className="h-1.5"
                />
              </div>

              {/* Attack Probability */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Attack Probability</span>
                  <span className={`font-bold ${attackProb > 0.6 ? 'text-rose-400' : attackProb > 0.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {(attackProb * 100).toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={attackProb * 100}
                  indicatorClassName={attackProb > 0.6 ? 'bg-rose-500' : attackProb > 0.3 ? 'bg-amber-500' : 'bg-emerald-500'}
                  className="h-1.5"
                />
              </div>

            </div>

          </div>

          <div className="pt-3 border-t border-border text-[10.5px] font-mono text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              6 Monitored Assets
            </span>
            <span className="text-indigo-300 font-semibold">VLAN 10</span>
          </div>
        </Card>

        {/* Center Panel — Attack Forecast 5-Step Future Timeline (5 Cols) */}
        <Card ref={forecastTimelineRef} className="lg:col-span-5 p-4 sm:p-5 flex flex-col justify-between border-border/80 space-y-4">
          <div className="space-y-3.5">
            
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" />
                <div>
                  <CardTitle className="text-xs uppercase tracking-wider text-foreground font-bold">
                    Attack Forecast Timeline
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    5-Step Predictive Lookahead Horizon (t+1 to t+5)
                  </p>
                </div>
              </div>
              <Badge variant="cyber" className="text-[10px] px-1.5 py-0">
                {modelLive ? 'GRU World Model' : 'Multi-Step GRU [fallback]'}
              </Badge>
            </div>

            {/* 5-Step Future Timeline sequence */}
            <div className="space-y-2">
              {fiveStepTimeline.map((item, idx) => {
                const isStepActive = currentStage === idx + 1;
                const isHighRisk = item.risk === 'HIGH' || item.risk === 'CRITICAL';

                return (
                  <div
                    key={item.step}
                    className={`p-2.5 rounded-lg border transition-all duration-200 ${
                      isMitigated
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : isStepActive
                        ? 'bg-secondary/90 border-primary/60 ring-1 ring-primary/40 shadow-sm'
                        : 'bg-muted/30 border-border/70 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="cyber" className="text-[9.5px] px-1.5 py-0 font-mono">
                          {item.step}
                        </Badge>
                        <span className="text-xs font-bold text-foreground">
                          {isMitigated ? 'Secured State' : item.stageName}
                        </span>
                      </div>
                      <RiskBadge level={isMitigated ? 'LOW' : (item.risk as any)} size="sm" />
                    </div>

                    <div className="flex items-center justify-between text-[10.5px] font-mono text-muted-foreground pt-0.5">
                      <span>Window: <strong className="text-foreground">{item.timeWindow}</strong></span>
                      <span>MITRE: <strong className="text-indigo-300">{item.mitre} ({item.mitreName})</strong></span>
                    </div>

                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">Probability:</span>
                        <span className={`font-bold ${isHighRisk ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {(item.probability * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress
                        value={item.probability * 100}
                        indicatorClassName={item.probability > 0.7 ? 'bg-rose-500' : item.probability > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'}
                        className="h-1.5"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          <div className="pt-3 border-t border-border text-[10.5px] font-mono text-muted-foreground flex items-center justify-between">
            <span>Forecast Window: 5 Cycles</span>
            <span className={modelLive ? 'text-sky-400 font-bold' : 'text-emerald-400 font-bold'}>
              {forecastData?.predicted_family
                ? `Family: ${forecastData.predicted_family} · Combined: ${(forecastData.combined_score ?? attackProb).toFixed(2)}`
                : modelLive
                  ? 'GRU K=5 live'
                  : 'Demo fallback'}
            </span>
          </div>
        </Card>

        {/* Right Panel — AI Explanation (4 Cols) */}
        <Card ref={explanationRef} className="lg:col-span-4 p-4 sm:p-5 flex flex-col justify-between border-border/80 space-y-4">
          <div className="space-y-3.5">
            
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <CardTitle className="text-xs uppercase tracking-wider text-foreground font-bold">
                  Why is the risk increasing?
                </CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                {modelLive ? 'XAI Gradients' : 'XAI SHAP'}
              </Badge>
            </div>

            {/* Feature Impact Bars */}
            <div className="space-y-3">
              <span className="text-[10.5px] font-mono text-muted-foreground uppercase font-bold block">
                Top Risk Feature Attributions:
              </span>

              {featureImpacts.map((feat) => (
                <div key={feat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-foreground font-medium">{feat.name}</span>
                    <span className="text-rose-400 font-bold">{feat.display}</span>
                  </div>
                  <Progress
                    value={feat.value}
                    indicatorClassName="bg-rose-500"
                    className="h-1.5"
                  />
                  <div className="flex items-center justify-between text-[9.5px] font-mono text-muted-foreground">
                    <span>Baseline: {feat.baseline}</span>
                    <span>Observed: {feat.current}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Natural-language explanation callout from user prompt */}
            <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Info className="w-3.5 h-3.5 text-sky-400" />
                <span>AI SOC Assessment Summary</span>
              </div>
              <p className="text-xs text-muted-foreground font-sans leading-relaxed italic">
                “{explanationData?.plain_english_explanation
                  || 'The model detected a changing traffic pattern across multiple time windows, increasing the probability of possible attack progression.'}”
              </p>
            </div>

          </div>

          <div className="pt-3 border-t border-border text-[10.5px] font-mono text-muted-foreground flex items-center justify-between">
            <span>Explainer: {modelLive ? 'Input gradients' : 'Kernel SHAP (fallback)'}</span>
            <span className="text-sky-400 font-semibold">
              {forecastData?.alert_threshold != null
                ? `θ=${forecastData.alert_threshold.toFixed(2)}`
                : 'Confidence: 91.2%'}
            </span>
          </div>
        </Card>

      </div>

      {/* 6. Central Network Activity Timeline & Visual Packet Stream */}
      <Card className="p-4 sm:p-5 border-border/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm uppercase tracking-wider text-foreground font-bold">
                Network Activity Timeline
              </CardTitle>
              <Badge variant="cyber" className="text-[10px] px-1.5 py-0 font-mono">
                {visibleEvents.length} Active Events
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Simulated live traffic events moving through time across private subnets (10.10.x.x)
            </p>
          </div>

          {/* View Tab selector */}
          <div className="flex items-center bg-muted/60 rounded-md border border-border p-0.5 text-xs font-mono">
            <button
              onClick={() => setActiveTimelineTab('timeline')}
              className={`px-3 py-1 rounded cursor-pointer transition-colors ${
                activeTimelineTab === 'timeline' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Timeline Stream
            </button>
            <button
              onClick={() => setActiveTimelineTab('topology')}
              className={`px-3 py-1 rounded cursor-pointer transition-colors ${
                activeTimelineTab === 'topology' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Topology Map
            </button>
            <button
              onClick={() => setActiveTimelineTab('flows')}
              className={`px-3 py-1 rounded cursor-pointer transition-colors ${
                activeTimelineTab === 'flows' ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Raw NetFlows
            </button>
          </div>
        </div>

        {/* Tab 1: Network Activity Timeline Stream */}
        {activeTimelineTab === 'timeline' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleEvents.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => {
                    if (evt.srcAsset.includes('USER-042')) setSelectedNodeId('USER-042');
                    else if (evt.dstAsset.includes('WEB-01')) setSelectedNodeId('WEB-01');
                    else if (evt.dstAsset.includes('DC-01')) setSelectedNodeId('DC-01');
                    else if (evt.dstAsset.includes('DB-01')) setSelectedNodeId('DB-01');
                  }}
                  className={`p-3.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                    evt.risk === 'CRITICAL'
                      ? 'bg-rose-950/20 border-rose-500/40 hover:bg-rose-950/30'
                      : evt.risk === 'HIGH'
                      ? 'bg-amber-950/20 border-amber-500/30 hover:bg-amber-950/30'
                      : 'bg-muted/40 border-border/80 hover:bg-muted/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                      <span className="font-mono text-[11px] font-bold text-sky-400">{evt.time}</span>
                    </div>
                    <RiskBadge level={evt.risk} size="sm" />
                  </div>

                  <h4 className="text-xs font-bold text-foreground mb-1.5">{evt.title}</h4>

                  {/* Source & Destination IP */}
                  <div className="bg-secondary/60 p-2 rounded border border-border/60 text-[11px] font-mono space-y-1 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Source:</span>
                      <span className="font-bold text-foreground">{evt.srcIp} ({evt.srcAsset.split(' ')[0]})</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Destination:</span>
                      <span className="font-bold text-indigo-300">{evt.dstIp} ({evt.dstAsset.split(' ')[0]})</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[10.5px] font-mono text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Protocol:</span>
                      <span className="text-foreground">{evt.protocol}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Packet Rate:</span>
                      <span className="text-foreground font-bold">{evt.packetRate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Anomaly Vector:</span>
                      <span className="text-rose-400 truncate max-w-[140px]" title={evt.anomalyType}>{evt.anomalyType}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Network Topology Visual Map */}
        {activeTimelineTab === 'topology' && (
          <NetworkTopologyMap 
            currentStage={currentStage}
            selectedScenario={activeScenario}
            isolatedNodes={isolatedNodes}
            selectedNode={selectedNodeId}
            onSelectNode={(nodeId) => setSelectedNodeId(prev => prev === nodeId ? null : nodeId)}
          />
        )}

        {/* Tab 3: Raw NetFlows */}
        {activeTimelineTab === 'flows' && (
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs text-foreground border-collapse font-mono">
              <thead className="bg-muted/60 text-muted-foreground text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-border">
                <tr>
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Source IP</th>
                  <th className="py-2 px-3">Destination IP</th>
                  <th className="py-2 px-3">Protocol</th>
                  <th className="py-2 px-3">Packets</th>
                  <th className="py-2 px-3">Bytes</th>
                  <th className="py-2 px-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {flows.map((flow) => (
                  <tr
                    key={flow.id}
                    onClick={() => setSelectedFlow(flow)}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-3 text-muted-foreground">{flow.timestamp}</td>
                    <td className="py-2 px-3 font-bold text-foreground">{flow.source_ip}</td>
                    <td className="py-2 px-3 font-bold text-indigo-300">{flow.destination_ip}</td>
                    <td className="py-2 px-3 text-muted-foreground">{flow.protocol}</td>
                    <td className="py-2 px-3 text-foreground">{flow.packets.toLocaleString()}</td>
                    <td className="py-2 px-3 text-foreground">{(flow.bytes_transferred / 1024).toFixed(1)} KB</td>
                    <td className="py-2 px-3">
                      <RiskBadge level={flow.risk_level} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 7. Slide-out Host Node Forensic Inspection Drawer */}
      {selectedNodeData && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto animate-slide-left">
          <div className="space-y-5">
            
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <Badge variant="cyber" className="text-[9.5px] px-1.5 py-0 uppercase">
                  NODE INVESTIGATION
                </Badge>
                <h3 className="text-base font-bold text-foreground mt-0.5">{selectedNodeData.id} • {selectedNodeData.label}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedNodeId(null)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Node Quick Stats */}
            <div className="bg-muted/50 p-3.5 rounded-lg border border-border space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">IP Address:</span>
                <span className="font-bold text-foreground">{selectedNodeData.ip}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Operating System:</span>
                <span className="font-semibold text-foreground">{selectedNodeData.os}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Role:</span>
                <span className="text-indigo-300 font-medium">{selectedNodeData.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Firewall Isolation:</span>
                <span className={`font-bold ${isolatedNodes.includes(selectedNodeData.id) ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isolatedNodes.includes(selectedNodeData.id) ? 'ISOLATED (VLAN 999)' : 'CONNECTED / ACTIVE'}
                </span>
              </div>
            </div>

            {/* Live CPU / RAM meters */}
            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-primary" />
                    CPU Utilization
                  </span>
                  <span className="font-bold text-foreground">{selectedNodeData.cpu}%</span>
                </div>
                <Progress
                  value={selectedNodeData.cpu}
                  indicatorClassName={selectedNodeData.cpu > 80 ? 'bg-rose-500' : selectedNodeData.cpu > 50 ? 'bg-amber-500' : 'bg-emerald-500'}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    Memory Allocation
                  </span>
                  <span className="font-bold text-foreground">{selectedNodeData.memory}%</span>
                </div>
                <Progress
                  value={selectedNodeData.memory}
                  indicatorClassName="bg-indigo-500"
                  className="h-2"
                />
              </div>
            </div>

            {/* Open Ports & Active Processes */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold block">Open Ports:</span>
              <div className="flex flex-wrap gap-1.5">
                {selectedNodeData.openPorts.map(p => (
                  <Badge key={p} variant="secondary" className="text-[11px] font-mono font-bold">
                    Port {p}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold block">Active Running Processes:</span>
              <div className="space-y-1">
                {selectedNodeData.processes.map(proc => (
                  <div key={proc} className="flex items-center justify-between p-2 rounded bg-muted/40 border border-border font-mono text-xs">
                    <span className="text-foreground font-semibold">{proc}</span>
                    <Badge variant="low" className="text-[9.5px] px-1 py-0">Running</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Isolate Action Button */}
            <Button
              variant={isolatedNodes.includes(selectedNodeData.id) ? 'success' : 'destructive'}
              onClick={() => handleIsolateNode(selectedNodeData.id)}
              className="w-full py-2.5 h-auto text-xs font-bold"
            >
              {isolatedNodes.includes(selectedNodeData.id) ? (
                <>
                  <Unlock className="w-4 h-4 mr-1.5" />
                  <span>Restore Network Connectivity</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-1.5" />
                  <span>Isolate {selectedNodeData.id} at Firewall</span>
                </>
              )}
            </Button>

          </div>

          <Button
            variant="outline"
            onClick={() => setSelectedNodeId(null)}
            className="w-full mt-4"
          >
            Close Investigation Drawer
          </Button>
        </div>
      )}

      {/* 8. Slide-out Flow Forensic Drawer */}
      {selectedFlow && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto animate-slide-left">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <Badge variant="cyber" className="text-[9.5px] px-1.5 py-0 uppercase">
                  {selectedFlow.id}
                </Badge>
                <h3 className="text-base font-bold text-foreground mt-0.5">Flow Forensic Telemetry</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedFlow(null)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Source & Dest */}
            <div className="grid grid-cols-2 gap-3 bg-muted/50 p-3.5 rounded-lg border border-border text-xs font-mono">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Source</span>
                <p className="font-bold text-foreground mt-0.5">{selectedFlow.source_ip}</p>
                <p className="text-[11px] text-sky-400 font-sans font-semibold">{selectedFlow.source_asset || 'Unknown Node'}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Port: {selectedFlow.source_port}</p>
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Destination</span>
                <p className="font-bold text-foreground mt-0.5">{selectedFlow.destination_ip}</p>
                <p className="text-[11px] text-indigo-300 font-sans font-semibold">{selectedFlow.destination_asset || 'External Host'}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Port: {selectedFlow.destination_port}</p>
              </div>
            </div>

            {/* Flow Details */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Protocol</span>
                <span className="font-bold text-foreground">{selectedFlow.protocol}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Packets</span>
                <span className="font-bold text-foreground">{selectedFlow.packets.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Transferred</span>
                <span className="font-bold text-foreground">{(selectedFlow.bytes_transferred / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-bold text-foreground">{selectedFlow.flow_duration_sec}s</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Risk Assessment</span>
                <RiskBadge level={selectedFlow.risk_level} size="md" />
              </div>
            </div>

            {/* Anomalies */}
            <div className="bg-muted/40 p-4 rounded-lg border border-border space-y-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Detected Anomalies
              </h4>
              {selectedFlow.anomalies.length > 0 ? (
                <ul className="space-y-1.5 text-xs text-foreground font-mono">
                  {selectedFlow.anomalies.map((anom, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span>{anom}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground font-mono">
                  No anomalies. Flow conforms to normal baseline.
                </p>
              )}
            </div>

            {/* Isolate Action */}
            {selectedFlow.source_asset && (
              <Button
                variant={isolatedNodes.includes(selectedFlow.source_asset) ? 'destructive' : 'default'}
                onClick={() => {
                  handleIsolateNode(selectedFlow.source_asset!);
                  setSelectedFlow(null);
                }}
                className="w-full py-2.5 h-auto font-bold text-xs"
              >
                <Lock className="w-4 h-4 mr-1.5" />
                <span>{isolatedNodes.includes(selectedFlow.source_asset) ? 'Remove Node Isolation' : `Isolate ${selectedFlow.source_asset} at Firewall`}</span>
              </Button>
            )}

          </div>

          <Button
            variant="outline"
            onClick={() => setSelectedFlow(null)}
            className="w-full mt-4"
          >
            Close Drawer
          </Button>
        </div>
      )}

    </div>
  );
};
