import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  FlowDetail, 
  ForecastResponse, 
  RiskAnalysisResponse, 
  ExplainabilityResponse, 
  AlertItem, 
  PageId,
  HealthStatus
} from '../types';
import { api } from '../services/api';

const STAGE_TITLES = [
  'Stage 1: Normal Baseline Operations',
  'Stage 2: Reconnaissance & Port Scanning Anomaly',
  'Stage 3: Increasing Risk & Exploit Probing',
  'Stage 4: Temporal Forecast (C2 Stage Predicted)',
  'Stage 5: Early Warning Alert Dispatched',
  'Stage 6: Lateral Movement & Threat Escalation',
  'Stage 7: Incident Mitigation & Analyst Response'
];

interface SimulationContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentStage: number;
  stageName: string;
  isPlaying: boolean;
  speed: number;
  timeIST: string;
  currentPage: PageId;
  selectedFlow: FlowDetail | null;
  activeDataset: string;
  activeScenario: string;
  setActiveScenario: (scenario: string) => void;
  flows: FlowDetail[];
  alerts: AlertItem[];
  forecastData: ForecastResponse | null;
  riskData: RiskAnalysisResponse | null;
  explanationData: ExplainabilityResponse | null;
  healthStatus: HealthStatus | null;
  isAutoTourActive: boolean;
  setCurrentPage: (page: PageId) => void;
  setSelectedFlow: (flow: FlowDetail | null) => void;
  setActiveDataset: (name: string) => void;
  setStage: (stage: number) => void;
  togglePlay: () => void;
  stepForward: () => void;
  resetSimulation: () => void;
  setSpeed: (spd: number) => void;
  startJudgeDemo: () => void;
  stopJudgeDemo: () => void;
  updateAlertStatus: (alertId: string, status: 'NEW' | 'UNDER_INVESTIGATION' | 'REVIEWED') => void;
  refreshData: () => Promise<void>;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentStage, setCurrentStageState] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<PageId>('simulation');
  const [selectedFlow, setSelectedFlow] = useState<FlowDetail | null>(null);
  const [activeDataset, setActiveDataset] = useState<string>('Indian Digital Infrastructure (CII Simulation)');
  const [activeScenario, setActiveScenario] = useState<string>('APT29');
  const [isAutoTourActive, setIsAutoTourActive] = useState<boolean>(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);
  
  const [timeSeconds, setTimeSeconds] = useState<number>(21);
  const [flows, setFlows] = useState<FlowDetail[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskAnalysisResponse | null>(null);
  const [explanationData, setExplanationData] = useState<ExplainabilityResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);

  const getFormattedTime = useCallback(() => {
    let s = timeSeconds % 60;
    let m = 30 + Math.floor(timeSeconds / 60);
    let h = 10;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} IST`;
  }, [timeSeconds]);

  // Generate realistic scenario-specific flows for each stage
  const getScenarioFlows = useCallback((stage: number, scenario: string, currentTime: string): FlowDetail[] => {
    if (stage === 1) {
      return [
        {
          id: 'FLOW-1001',
          timestamp: currentTime,
          source_ip: '10.10.10.20',
          source_port: 443,
          source_asset: 'WEB-01',
          destination_ip: '10.10.20.15',
          destination_port: 5432,
          destination_asset: 'DB-01',
          protocol: 'TLS/HTTPS',
          packets: 840,
          bytes_transferred: 420000,
          flow_duration_sec: 4.2,
          packet_rate: 200.0,
          byte_rate: 100000.0,
          syn_flag_count: 1,
          ack_flag_count: 839,
          rst_flag_count: 0,
          risk_level: 'LOW',
          status: 'Normal',
          anomalies: []
        },
        {
          id: 'FLOW-1002',
          timestamp: currentTime,
          source_ip: '10.10.30.42',
          source_port: 51200,
          source_asset: 'USER-042',
          destination_ip: '10.10.10.20',
          destination_port: 443,
          destination_asset: 'WEB-01',
          protocol: 'HTTPS',
          packets: 142,
          bytes_transferred: 68000,
          flow_duration_sec: 1.5,
          packet_rate: 94.6,
          byte_rate: 45333.3,
          syn_flag_count: 1,
          ack_flag_count: 140,
          rst_flag_count: 0,
          risk_level: 'LOW',
          status: 'Normal',
          anomalies: []
        },
        {
          id: 'FLOW-1003',
          timestamp: currentTime,
          source_ip: '10.10.10.30',
          source_port: 39100,
          source_asset: 'APP-01',
          destination_ip: '10.10.20.15',
          destination_port: 5432,
          destination_asset: 'DB-01',
          protocol: 'TCP',
          packets: 520,
          bytes_transferred: 280000,
          flow_duration_sec: 2.1,
          packet_rate: 247.6,
          byte_rate: 133333.3,
          syn_flag_count: 1,
          ack_flag_count: 518,
          rst_flag_count: 0,
          risk_level: 'LOW',
          status: 'Normal',
          anomalies: []
        }
      ];
    }

    if (scenario === 'RANSOMWARE') {
      return [
        {
          id: 'FLOW-2001',
          timestamp: currentTime,
          source_ip: '10.10.10.20',
          source_port: 445,
          source_asset: 'WEB-01',
          destination_ip: '10.10.20.15',
          destination_port: 445,
          destination_asset: 'DB-01',
          protocol: 'SMB/TCP',
          packets: 6840,
          bytes_transferred: 14200000,
          flow_duration_sec: 8.4,
          packet_rate: 814.2,
          byte_rate: 1690476.1,
          syn_flag_count: 24,
          ack_flag_count: 6800,
          rst_flag_count: 2,
          risk_level: stage >= 4 ? 'CRITICAL' : 'HIGH',
          status: 'Malicious',
          anomalies: ['Mass file rename spike', 'SMB bulk payload encryption indicator', 'Shadow copy wipe attempt']
        },
        {
          id: 'FLOW-2002',
          timestamp: currentTime,
          source_ip: '198.51.100.24',
          source_port: 443,
          source_asset: 'EXT-WAN',
          destination_ip: '10.10.10.20',
          destination_port: 443,
          destination_asset: 'WEB-01',
          protocol: 'HTTPS',
          packets: 3410,
          bytes_transferred: 2150000,
          flow_duration_sec: 14.2,
          packet_rate: 240.1,
          byte_rate: 151408.4,
          syn_flag_count: 16,
          ack_flag_count: 3380,
          rst_flag_count: 0,
          risk_level: 'HIGH',
          status: 'Suspicious',
          anomalies: ['Web shell upload pattern', 'POST payload burst']
        }
      ];
    }

    if (scenario === 'DDOS') {
      return [
        {
          id: 'FLOW-3001',
          timestamp: currentTime,
          source_ip: '198.51.100.24',
          source_port: 1024 + Math.floor(Math.random() * 60000),
          source_asset: 'EXT-WAN',
          destination_ip: '10.10.0.1',
          destination_port: 80,
          destination_asset: 'FW-01',
          protocol: 'SYN-FLOOD/TCP',
          packets: 48920,
          bytes_transferred: 31000000,
          flow_duration_sec: 1.2,
          packet_rate: 40766.6,
          byte_rate: 25833333.3,
          syn_flag_count: 48800,
          ack_flag_count: 120,
          rst_flag_count: 450,
          risk_level: 'CRITICAL',
          status: 'Malicious',
          anomalies: ['SYN packet volumetric threshold breach (10Gbps)', 'Spoofed source distribution']
        },
        {
          id: 'FLOW-3002',
          timestamp: currentTime,
          source_ip: '198.51.100.24',
          source_port: 48912,
          source_asset: 'EXT-WAN',
          destination_ip: '10.10.10.20',
          destination_port: 443,
          destination_asset: 'WEB-01',
          protocol: 'HTTP/GET-FLOOD',
          packets: 12840,
          bytes_transferred: 8400000,
          flow_duration_sec: 3.4,
          packet_rate: 3776.4,
          byte_rate: 2470588.2,
          syn_flag_count: 40,
          ack_flag_count: 12790,
          rst_flag_count: 10,
          risk_level: 'CRITICAL',
          status: 'Malicious',
          anomalies: ['HTTP Keep-Alive starvation', 'Application layer worker exhaustion']
        }
      ];
    }

    // Default APT29 Campaign
    return [
      {
        id: 'FLOW-1001',
        timestamp: currentTime,
        source_ip: '10.10.30.42',
        source_port: 54210,
        source_asset: 'USER-042',
        destination_ip: '198.51.100.24',
        destination_port: 8443,
        destination_asset: 'EXT-WAN',
        protocol: 'TLS/HTTPS',
        packets: 4281,
        bytes_transferred: 2800000,
        flow_duration_sec: 12.4,
        packet_rate: 345.2,
        byte_rate: 225806.4,
        syn_flag_count: 8,
        ack_flag_count: 4270,
        rst_flag_count: 0,
        risk_level: stage >= 4 ? 'CRITICAL' : 'HIGH',
        status: stage >= 4 ? 'Malicious' : 'Suspicious',
        anomalies: ['High egress beaconing', 'Unusual destination port 8443', 'Periodic jitter 10.2s']
      },
      {
        id: 'FLOW-1002',
        timestamp: currentTime,
        source_ip: '10.10.30.42',
        source_port: 54211,
        source_asset: 'USER-042',
        destination_ip: '10.10.10.10',
        destination_port: 88,
        destination_asset: 'DC-01',
        protocol: 'KERBEROS/TCP',
        packets: 342,
        bytes_transferred: 45200,
        flow_duration_sec: 1.8,
        packet_rate: 190.0,
        byte_rate: 25111.1,
        syn_flag_count: 14,
        ack_flag_count: 320,
        rst_flag_count: 1,
        risk_level: stage >= 3 ? 'HIGH' : 'MEDIUM',
        status: 'Suspicious',
        anomalies: ['Kerberoasting ticket request anomaly', 'RC4-HMAC weak encryption requested']
      },
      {
        id: 'FLOW-1003',
        timestamp: currentTime,
        source_ip: '10.10.10.10',
        source_port: 445,
        source_asset: 'DC-01',
        destination_ip: '10.10.20.15',
        destination_port: 5432,
        destination_asset: 'DB-01',
        protocol: 'DCE-RPC/TCP',
        packets: 1820,
        bytes_transferred: 940000,
        flow_duration_sec: 4.2,
        packet_rate: 433.3,
        byte_rate: 223809.5,
        syn_flag_count: 2,
        ack_flag_count: 1815,
        rst_flag_count: 0,
        risk_level: stage >= 6 ? 'CRITICAL' : 'LOW',
        status: stage >= 6 ? 'Malicious' : 'Normal',
        anomalies: stage >= 6 ? ['Lateral movement ticket pass', 'Privileged SQL dump query'] : []
      }
    ];
  }, []);

  // Initial Data Load
  const refreshData = useCallback(async () => {
    const [fc, rk, exp, al, health] = await Promise.all([
      api.getForecast(currentStage),
      api.getRiskAnalysis(currentStage),
      api.getExplanation(currentStage),
      api.getAlerts(),
      api.getHealth()
    ]);

    setForecastData(fc);
    setRiskData(rk);
    setExplanationData(exp);
    setHealthStatus(health);
    if (alerts.length === 0) {
      setAlerts(al);
    }
  }, [currentStage, alerts.length]);

  // Update flows when stage or scenario changes
  useEffect(() => {
    const newFlows = getScenarioFlows(currentStage, activeScenario, getFormattedTime());
    setFlows(newFlows);
    refreshData();
  }, [currentStage, activeScenario, getFormattedTime, getScenarioFlows, refreshData]);

  // Stage change trigger
  const setStage = useCallback((stg: number) => {
    const bounded = Math.max(1, Math.min(7, stg));
    setCurrentStageState(bounded);
    api.setStage(bounded);

    // Refresh telemetry for that stage
    api.getForecast(bounded).then(setForecastData);
    api.getRiskAnalysis(bounded).then(setRiskData);
    api.getExplanation(bounded).then(setExplanationData);
  }, []);

  // Tick generation
  const stepForward = useCallback(() => {
    setTimeSeconds(prev => prev + 2);
    setStage(currentStage < 6 ? currentStage + 1 : 6);
  }, [currentStage, setStage]);

  // Reset
  const resetSimulation = useCallback(() => {
    setIsPlaying(false);
    setIsAutoTourActive(false);
    setStage(1);
    setTimeSeconds(21);
    api.resetSimulation();
  }, [setStage]);

  // Alert updates
  const updateAlertStatus = useCallback(async (alertId: string, status: 'NEW' | 'UNDER_INVESTIGATION' | 'REVIEWED') => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status } : a));
    await api.updateAlertStatus(alertId, status);
  }, []);

  // Auto-play interval - halts at final stage (does NOT loop again)
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.max(800, 3200 / speed);
    const timer = setInterval(() => {
      setCurrentStageState(prev => {
        if (prev >= 6) {
          // Reached final Early Warning / Critical stage -> pause and do NOT loop
          setIsPlaying(false);
          return prev;
        }
        const next = prev + 1;
        setTimeSeconds(t => t + 2);
        api.setStage(next);
        api.getForecast(next).then(setForecastData);
        api.getRiskAnalysis(next).then(setRiskData);
        api.getExplanation(next).then(setExplanationData);

        if (next >= 6) {
          setIsPlaying(false);
        }
        return next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed]);

  // Automated Judge Demo Script Tour
  const startJudgeDemo = useCallback(() => {
    setIsAutoTourActive(true);
    resetSimulation();
    setCurrentPage('simulation');
    setStage(1);

    const timeouts: NodeJS.Timeout[] = [];

    // T+3s: Move to Stage 2 (Recon)
    timeouts.push(setTimeout(() => {
      setStage(2);
    }, 3000));

    // T+7s: Move to Stage 3 (Exploit)
    timeouts.push(setTimeout(() => {
      setStage(3);
    }, 7000));

    // T+12s: Move to Stage 4 (C2 Forecast)
    timeouts.push(setTimeout(() => {
      setStage(4);
    }, 12000));

    // T+17s: Move to Stage 5 (Early Warning)
    timeouts.push(setTimeout(() => {
      setStage(5);
    }, 17000));

    // T+22s: Move to Stage 6 (Lateral Move)
    timeouts.push(setTimeout(() => {
      setStage(6);
    }, 22000));

    // T+28s: Move to Stage 7 (Autonomous Mitigation)
    timeouts.push(setTimeout(() => {
      setStage(7);
      setIsAutoTourActive(false);
    }, 28000));

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [resetSimulation, setStage]);

  const stopJudgeDemo = useCallback(() => {
    setIsAutoTourActive(false);
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => {
      if (!prev && currentStage >= 6) {
        // If at the end, restart from Stage 1 cleanly
        setStage(1);
        setTimeSeconds(21);
      }
      return !prev;
    });
  }, [currentStage, setStage]);

  return (
    <SimulationContext.Provider
      value={{
        theme,
        toggleTheme,
        currentStage,
        stageName: STAGE_TITLES[currentStage - 1] || 'Stage 1: Normal Baseline',
        isPlaying,
        speed,
        timeIST: getFormattedTime(),
        currentPage,
        selectedFlow,
        activeDataset,
        activeScenario,
        setActiveScenario,
        flows,
        alerts,
        forecastData,
        riskData,
        explanationData,
        healthStatus,
        isAutoTourActive,
        setCurrentPage,
        setSelectedFlow,
        setActiveDataset,
        setStage,
        togglePlay,
        stepForward,
        resetSimulation,
        setSpeed,
        startJudgeDemo,
        stopJudgeDemo,
        updateAlertStatus,
        refreshData
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = (): SimulationContextType => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
