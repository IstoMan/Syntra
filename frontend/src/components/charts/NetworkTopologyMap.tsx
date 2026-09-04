import React, { useState } from 'react';
import { 
  Server, 
  Shield, 
  Globe, 
  Laptop, 
  Database, 
  Radio,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Activity,
  Network
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface NetworkTopologyMapProps {
  currentStage: number;
  selectedScenario?: string;
  isolatedNodes?: string[];
  onSelectNode?: (nodeId: string) => void;
  selectedNode?: string | null;
}

export interface NodeData {
  id: string;
  label: string;
  ip: string;
  os: string;
  type: 'gateway' | 'firewall' | 'dmz' | 'app' | 'dc' | 'db' | 'endpoint';
  x: number;
  y: number;
  openPorts: number[];
  cpuUsage: number;
  memoryUsage: number;
  activeSockets: number;
  roleDescription: string;
}

export const NetworkTopologyMap: React.FC<NetworkTopologyMapProps> = ({
  currentStage,
  selectedScenario = 'APT29',
  isolatedNodes = [],
  onSelectNode,
  selectedNode
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodes: NodeData[] = [
    { 
      id: 'EXT-WAN', 
      label: 'Internet Gateway', 
      ip: '198.51.100.24', 
      os: 'EdgeOS 3.2 (BGP Core)', 
      type: 'gateway', 
      x: 65, 
      y: 105,
      openPorts: [80, 443, 8443],
      cpuUsage: currentStage >= 2 ? 78 : 22,
      memoryUsage: 45,
      activeSockets: currentStage >= 2 ? 1420 : 120,
      roleDescription: 'Border BGP Gateway & External Ingress'
    },
    { 
      id: 'FW-01', 
      label: 'NextGen Firewall', 
      ip: '10.10.0.1', 
      os: 'PAN-OS 11.0 / FortiOS', 
      type: 'firewall', 
      x: 190, 
      y: 105,
      openPorts: [443, 830, 514],
      cpuUsage: currentStage >= 5 ? 88 : 34,
      memoryUsage: 58,
      activeSockets: 2100,
      roleDescription: 'Stateful Deep Packet Inspection & IPS Engine'
    },
    { 
      id: 'WEB-01', 
      label: 'DMZ Web Server', 
      ip: '10.10.10.20', 
      os: 'Ubuntu 22.04 LTS (Nginx)', 
      type: 'dmz', 
      x: 325, 
      y: 55,
      openPorts: [80, 443, 8080],
      cpuUsage: currentStage >= 4 ? 92 : currentStage >= 2 ? 65 : 18,
      memoryUsage: currentStage >= 4 ? 84 : 42,
      activeSockets: currentStage >= 4 ? 480 : 85,
      roleDescription: 'Public Facing Banking Web Application Cluster'
    },
    { 
      id: 'APP-01', 
      label: 'App Cluster', 
      ip: '10.10.10.30', 
      os: 'Red Hat Enterprise Linux 9', 
      type: 'app', 
      x: 325, 
      y: 155,
      openPorts: [8080, 9090, 1883],
      cpuUsage: currentStage >= 3 ? 55 : 24,
      memoryUsage: 61,
      activeSockets: 140,
      roleDescription: 'Internal Core Transaction Processing Microservices'
    },
    { 
      id: 'USER-042', 
      label: 'Finance Endpoint', 
      ip: '10.10.30.42', 
      os: 'Windows 11 Pro Enterprise', 
      type: 'endpoint', 
      x: 470, 
      y: 155,
      openPorts: [135, 445, 5357],
      cpuUsage: currentStage >= 4 ? 95 : currentStage >= 3 ? 72 : 12,
      memoryUsage: currentStage >= 4 ? 91 : 38,
      activeSockets: currentStage >= 4 ? 312 : 28,
      roleDescription: 'High-Privilege Financial Analyst Workstation'
    },
    { 
      id: 'DC-01', 
      label: 'Domain Controller', 
      ip: '10.10.10.10', 
      os: 'Windows Server 2022 Datacenter', 
      type: 'dc', 
      x: 470, 
      y: 55,
      openPorts: [53, 88, 389, 445, 636],
      cpuUsage: currentStage >= 6 ? 89 : currentStage >= 4 ? 60 : 20,
      memoryUsage: 74,
      activeSockets: currentStage >= 6 ? 650 : 95,
      roleDescription: 'Active Directory Identity & Kerberos KDC Authority'
    },
    { 
      id: 'DB-01', 
      label: 'Core SQL Database', 
      ip: '10.10.20.15', 
      os: 'Debian 12 (PostgreSQL 16 Enterprise)', 
      type: 'db', 
      x: 615, 
      y: 105,
      openPorts: [5432, 9187],
      cpuUsage: currentStage >= 7 ? 19 : currentStage >= 6 ? 78 : 31,
      memoryUsage: 82,
      activeSockets: 180,
      roleDescription: 'Primary Ledger & Crown Jewel Customer Records Database'
    },
  ];

  const getNodeStatus = (id: string) => {
    if (isolatedNodes.includes(id)) {
      return 'CONTAINED';
    }

    switch (id) {
      case 'EXT-WAN':
        return currentStage >= 2 ? 'ATTACKER' : 'NORMAL';
      case 'FW-01':
        return currentStage >= 5 ? 'ACTIVE_FILTERING' : 'NORMAL';
      case 'WEB-01':
        if (currentStage >= 7) return 'CONTAINED';
        if (currentStage >= 4) return 'COMPROMISED';
        if (currentStage >= 2) return 'PROBED';
        return 'NORMAL';
      case 'USER-042':
        if (currentStage >= 7) return 'CONTAINED';
        if (currentStage >= 4) return 'C2_BEACON';
        if (currentStage >= 3) return 'EXPLOITED';
        return 'NORMAL';
      case 'DC-01':
        if (currentStage >= 7) return 'CONTAINED';
        if (currentStage >= 6) return 'BREACHED';
        if (currentStage >= 4) return 'PREDICTED_TARGET';
        return 'NORMAL';
      case 'DB-01':
        if (currentStage >= 7) return 'CONTAINED';
        if (currentStage >= 5) return 'PREDICTED_TARGET';
        return 'NORMAL';
      case 'APP-01':
        return currentStage >= 3 ? 'PROBED' : 'NORMAL';
      default:
        return 'NORMAL';
    }
  };

  const getStatusVisuals = (status: string) => {
    switch (status) {
      case 'ATTACKER':
        return { color: '#f43f5e', fill: 'rgba(244, 63, 94, 0.3)', text: 'fill-rose-300 font-bold', label: 'Threat Origin' };
      case 'C2_BEACON':
      case 'COMPROMISED':
      case 'BREACHED':
        return { color: '#ef4444', fill: 'rgba(239, 68, 68, 0.35)', text: 'fill-red-300 font-bold', label: status.replace('_', ' ') };
      case 'PREDICTED_TARGET':
        return { color: '#c084fc', fill: 'rgba(192, 132, 252, 0.3)', text: 'fill-purple-300 font-bold', label: 'Predicted Target' };
      case 'PROBED':
      case 'EXPLOITED':
        return { color: '#fbbf24', fill: 'rgba(251, 191, 36, 0.3)', text: 'fill-amber-300 font-bold', label: 'Suspicious Probe' };
      case 'ACTIVE_FILTERING':
        return { color: '#38bdf8', fill: 'rgba(56, 189, 248, 0.3)', text: 'fill-sky-300 font-bold', label: 'Firewall Active' };
      case 'CONTAINED':
        return { color: '#10b981', fill: 'rgba(16, 185, 129, 0.35)', text: 'fill-emerald-300 font-bold', label: 'Mitigated / Isolated' };
      default:
        return { color: '#10b981', fill: 'rgba(16, 185, 129, 0.2)', text: 'fill-emerald-300 font-bold', label: 'Secure Baseline' };
    }
  };

  const links = [
    { from: 'EXT-WAN', to: 'FW-01', active: currentStage >= 2, critical: currentStage >= 2 && currentStage < 7, contained: currentStage >= 7 },
    { from: 'FW-01', to: 'WEB-01', active: currentStage >= 2, critical: currentStage >= 2 && currentStage < 7, contained: currentStage >= 7 },
    { from: 'FW-01', to: 'APP-01', active: false, critical: false, contained: false },
    { from: 'WEB-01', to: 'DC-01', active: currentStage >= 4, critical: currentStage >= 4 && currentStage < 7, contained: currentStage >= 7 },
    { from: 'APP-01', to: 'USER-042', active: currentStage >= 3, critical: currentStage >= 3 && currentStage < 7, contained: currentStage >= 7 },
    { from: 'USER-042', to: 'DC-01', active: currentStage >= 4, critical: currentStage >= 4 && currentStage < 7, contained: currentStage >= 7 },
    { from: 'DC-01', to: 'DB-01', active: currentStage >= 6, critical: currentStage >= 6 && currentStage < 7, contained: currentStage >= 7 },
    { from: 'APP-01', to: 'DB-01', active: false, critical: false, contained: false },
  ];

  return (
    <Card className="p-4 sm:p-5 relative border-border/80">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-primary" />
          <CardTitle className="text-xs uppercase tracking-wider text-foreground font-bold">
            Network Topology & Attack Propagation Vector
          </CardTitle>
          <Badge variant="cyber" className="text-[10px] px-2 py-0">
            Scenario: {selectedScenario}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Secure</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Probed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Compromised</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-400"></span> Forecast Target</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Contained</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-x-auto">
        <svg viewBox="0 0 680 215" className="w-full h-auto min-w-[550px] select-none">
          
          {/* Subtle connecting lines */}
          {links.map((link, i) => {
            const src = nodes.find(n => n.id === link.from)!;
            const dst = nodes.find(n => n.id === link.to)!;
            
            const midX = (src.x + dst.x) / 2;
            const d = `M ${src.x} ${src.y} Q ${midX} ${(src.y + dst.y) / 2} ${dst.x} ${dst.y}`;

            return (
              <g key={i}>
                {/* Background base path */}
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(71, 85, 105, 0.35)"
                  strokeWidth="2.5"
                />

                {/* Animated Packet Stream */}
                <path
                  d={d}
                  fill="none"
                  stroke={
                    link.contained 
                      ? '#10b981' 
                      : link.critical 
                      ? '#f43f5e' 
                      : link.active 
                      ? '#fbbf24' 
                      : '#38bdf8'
                  }
                  strokeWidth={link.critical ? '3.5' : '2.5'}
                  strokeOpacity={link.critical ? '1' : link.active ? '0.9' : '0.75'}
                  className={
                    link.contained
                      ? 'flow-packet-contained'
                      : link.critical || link.active 
                      ? 'flow-packet-active' 
                      : 'flow-packet-normal'
                  }
                />
              </g>
            );
          })}

          {/* Node Elements */}
          {nodes.map((node) => {
            const status = getNodeStatus(node.id);
            const style = getStatusVisuals(status);
            const isSelected = selectedNode === node.id;
            const isHovered = hoveredNode === node.id;
            const isTarget = status === 'PREDICTED_TARGET';
            const isThreat = status === 'COMPROMISED' || status === 'C2_BEACON' || status === 'BREACHED';
            const isContained = status === 'CONTAINED';

            return (
              <g
                key={node.id}
                onClick={() => onSelectNode && onSelectNode(node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer transition-transform duration-200"
              >
                {/* Predictive Target Pulsing Ring */}
                {isTarget && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="25"
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    className="animate-spin"
                  />
                )}

                {/* Compromised Threat Halo Animation */}
                {isThreat && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    fill={style.color}
                    className="animate-halo"
                  />
                )}

                {/* Contained Defense Shield Ring */}
                {isContained && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="24"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    className="animate-shield"
                  />
                )}

                {/* Node Main Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isSelected || isHovered ? 21 : 18}
                  fill={style.fill}
                  stroke={isSelected ? '#38bdf8' : style.color}
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all duration-200"
                />

                {/* Inner Dot Accent */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="5"
                  fill={style.color}
                />

                {/* Node Label (Top) - Ultra Crisp Bright Pure White */}
                <text
                  x={node.x}
                  y={node.y - 24}
                  textAnchor="middle"
                  className="text-[11.5px] font-extrabold fill-foreground tracking-wide"
                >
                  {node.id}
                </text>

                {/* IP Address (Bottom 1) - High Contrast Slate */}
                <text
                  x={node.x}
                  y={node.y + 27}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-bold fill-muted-foreground"
                >
                  {node.ip}
                </text>

                {/* Status Pill (Bottom 2) */}
                <text
                  x={node.x}
                  y={node.y + 40}
                  textAnchor="middle"
                  className={`text-[9px] font-mono uppercase font-bold tracking-tight ${style.text}`}
                >
                  {style.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Stage Tactical Progression Indicator */}
      <div className="mt-2.5 p-3 rounded-lg bg-muted/60 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-sky-400 animate-pulse shrink-0" />
          <span className="text-foreground text-xs font-medium">
            {currentStage === 1 && 'Stage 1 • Baseline Operations: Standard Gaussian traffic distribution across all 6 core telemetry nodes.'}
            {currentStage === 2 && 'Stage 2 • Reconnaissance Phase: Targeted SYN-flood port sweep discovered originating from Internet Gateway.'}
            {currentStage === 3 && 'Stage 3 • Exploit & Initial Access: Memory injection / Kerberos ticket probing targeting finance host USER-042.'}
            {currentStage === 4 && 'Stage 4 • Forecast C2 Active: High-frequency encrypted C2 beacon active. LSTM predicts DC-01 breach at t+1.'}
            {currentStage === 5 && 'Stage 5 • Early Warning Dispatched: Predictive isolation advisory issued for USER-042 before lateral pivot.'}
            {currentStage === 6 && 'Stage 6 • Lateral Movement: Pass-the-hash authentication attempt intercepted targeting Active Directory DC-01.'}
            {currentStage === 7 && 'Stage 7 • Active Autonomous Mitigation: Adversary neutralized. Firewall ACL isolation active; zero data lost.'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10.5px] text-muted-foreground font-sans">Click node for deep audit</span>
          <Badge variant="cyber" className="text-xs font-bold px-2 py-0.5">
            Stage {currentStage} / 7
          </Badge>
        </div>
      </div>

    </Card>
  );
};
