import React, { useState } from 'react';
import { 
  History, 
  ShieldAlert, 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowRight, 
  Clock, 
  AlertTriangle,
  Layers,
  Activity,
  Compass,
  Calendar,
  Eye,
  Server,
  TrendingUp,
  RotateCcw,
  Zap,
  Lock,
  FileCheck2
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { AlertItem } from '../types';

// shadcn/ui components
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Separator } from '../components/ui/separator';

export const HistoryPage: React.FC = () => {
  const { alerts, updateAlertStatus, setCurrentPage, setStage } = useSimulation();
  
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(alerts[0] || null);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredAlerts = alerts.filter(a => {
    const matchSev = filterSeverity === 'ALL' || a.severity === filterSeverity;
    const matchStat = filterStatus === 'ALL' || a.status === filterStatus;
    const matchQuery = 
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.source_ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.destination_ip.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.source_asset && a.source_asset.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.destination_asset && a.destination_asset.toLowerCase().includes(searchQuery.toLowerCase())) ||
      a.predicted_stage.toLowerCase().includes(searchQuery.toLowerCase());

    return matchSev && matchStat && matchQuery;
  });

  const activeAlert = selectedAlert || alerts[0];

  const totalIncidents = alerts.length;
  const newCount = alerts.filter(a => a.status === 'NEW').length;
  const investigatingCount = alerts.filter(a => a.status === 'UNDER_INVESTIGATION').length;
  const reviewedCount = alerts.filter(a => a.status === 'REVIEWED').length;

  return (
    <div className="space-y-4 pb-12 animate-entrance">
      
      {/* Historical Summary Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        <Card className="p-4 flex items-center justify-between border-border/80">
          <div>
            <span className="text-[10px] text-muted-foreground font-mono uppercase font-semibold">Threat Records</span>
            <div className="text-2xl font-extrabold font-mono text-foreground mt-1">{totalIncidents}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-foreground">
            <History className="w-4 h-4 text-sky-400" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-border/80">
          <div>
            <span className="text-[10px] text-rose-300 font-mono uppercase font-semibold">New Warnings</span>
            <div className="text-2xl font-extrabold font-mono text-rose-400 mt-1">{newCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-border/80">
          <div>
            <span className="text-[10px] text-amber-300 font-mono uppercase font-semibold">Active Triage</span>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-1">{investigatingCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-border/80">
          <div>
            <span className="text-[10px] text-emerald-300 font-mono uppercase font-semibold">Mitigated</span>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">{reviewedCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </Card>

      </div>

      {/* Main Grid: History Timeline List & Event Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Left Column (2 Cols): History Event Log */}
        <div className="lg:col-span-2 space-y-3">
          
          {/* Filters Bar */}
          <Card className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs border-border/80">
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search IP, asset, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-2.5 py-1 text-xs w-40 sm:w-52"
                />
              </div>

              {/* Severity Filter */}
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-secondary border border-border rounded-md px-2.5 py-1 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer text-xs"
              >
                <option value="ALL">Severity: ALL</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-secondary border border-border rounded-md px-2.5 py-1 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer text-xs"
              >
                <option value="ALL">Status: ALL</option>
                <option value="NEW">New</option>
                <option value="UNDER_INVESTIGATION">Investigating</option>
                <option value="REVIEWED">Reviewed</option>
              </select>
            </div>

            <span className="text-[11px] text-muted-foreground font-mono font-semibold">
              {filteredAlerts.length} Threat Records
            </span>
          </Card>

          {/* History Event Cards */}
          <div className="space-y-2.5">
            {filteredAlerts.map((al) => {
              const isSelected = activeAlert?.id === al.id;
              return (
                <Card
                  key={al.id}
                  onClick={() => setSelectedAlert(al)}
                  className={`p-4 transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-muted/70 border-primary shadow-sm'
                      : 'border-border/80 hover:border-border hover:bg-muted/30'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={al.severity} />
                      <span className="font-mono text-xs text-sky-400 font-bold">{al.id}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="font-mono text-xs text-muted-foreground">{al.timestamp_ist}</span>
                    </div>

                    <h4 className="text-sm font-bold text-foreground tracking-tight">{al.title}</h4>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span>Source: <strong className="text-foreground">{al.source_asset || al.source_ip}</strong></span>
                      <span>Target: <strong className="text-foreground">{al.destination_asset || al.destination_ip}</strong></span>
                      <span>Predicted: <strong className="text-indigo-300 font-semibold">{al.predicted_stage}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 shrink-0 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        al.status === 'NEW' ? 'high' :
                        al.status === 'UNDER_INVESTIGATION' ? 'medium' :
                        'low'
                      } className={al.status === 'NEW' ? 'animate-pulse text-[10px]' : 'text-[10px]'}>
                        {al.status.replace('_', ' ')}
                      </Badge>
                      <RiskBadge level={al.risk_score > 7 ? 'HIGH' : 'MEDIUM'} size="sm" />
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      {al.status === 'NEW' && (
                        <Button
                          variant="cyber"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateAlertStatus(al.id, 'UNDER_INVESTIGATION');
                          }}
                          className="h-6 text-[10.5px] px-2.5 py-0"
                        >
                          Investigate
                        </Button>
                      )}
                      {al.status === 'UNDER_INVESTIGATION' && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateAlertStatus(al.id, 'REVIEWED');
                          }}
                          className="h-6 text-[10.5px] px-2.5 py-0"
                        >
                          Mark Reviewed
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

        </div>

        {/* Right Column (1 Col): Historical Incident Inspector */}
        {activeAlert && (
          <Card className="p-5 space-y-4 shadow-xl flex flex-col justify-between border-border/80">
            <div className="space-y-4">
              
              {/* Card Header */}
              <div className="border-b border-border pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="cyber" className="text-[9.5px] px-1.5 py-0 uppercase">
                    Forensic Audit
                  </Badge>
                  <SeverityBadge severity={activeAlert.severity} />
                </div>
                <h3 className="text-base font-bold text-foreground mt-1.5">{activeAlert.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{activeAlert.reason}</p>
              </div>

              {/* Forensic Metrics */}
              <div className="bg-muted/50 p-3.5 rounded-lg border border-border space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Risk Severity:</span>
                  <span className="font-bold text-rose-400 text-sm">{activeAlert.risk_score.toFixed(1)} / 10</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Attack Probability:</span>
                  <span className="font-bold text-foreground text-sm">{(activeAlert.attack_probability * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Forecast Lead Time:</span>
                  <span className="font-bold text-sky-400">{activeAlert.forecast_horizon} Windows</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Predicted Impending Stage:</span>
                  <span className="font-bold text-indigo-300 uppercase">{activeAlert.predicted_stage}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border text-muted-foreground">
                  <span>Logged Timestamp:</span>
                  <span className="text-foreground font-medium">{activeAlert.timestamp_ist}</span>
                </div>
              </div>

              {/* Observed Contributing Factors */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider text-[10px] font-mono">
                  Forensic Indicators:
                </h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {activeAlert.main_contributors.map((contrib, i) => (
                    <li key={i} className="flex items-start gap-2 bg-muted/40 p-2.5 rounded-lg border border-border font-mono text-[11px]">
                      <span className="text-sky-400 font-bold">{i + 1}.</span>
                      <span className="text-foreground">{contrib}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Lifecycle Status Action */}
              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-mono font-bold text-muted-foreground block uppercase">Lifecycle Status:</span>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={activeAlert.status === 'NEW' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => updateAlertStatus(activeAlert.id, 'NEW')}
                    className="text-xs font-bold"
                  >
                    New
                  </Button>

                  <Button
                    variant={activeAlert.status === 'UNDER_INVESTIGATION' ? 'warning' : 'outline'}
                    size="sm"
                    onClick={() => updateAlertStatus(activeAlert.id, 'UNDER_INVESTIGATION')}
                    className="text-xs font-bold"
                  >
                    Triage
                  </Button>

                  <Button
                    variant={activeAlert.status === 'REVIEWED' ? 'success' : 'outline'}
                    size="sm"
                    onClick={() => updateAlertStatus(activeAlert.id, 'REVIEWED')}
                    className="text-xs font-bold"
                  >
                    Closed
                  </Button>
                </div>
              </div>

            </div>

            {/* Jump to Simulation Button */}
            <div className="pt-3 border-t border-border">
              <Button
                variant="cyber"
                onClick={() => {
                  setStage(4);
                  setCurrentPage('simulation');
                }}
                className="w-full py-2.5 h-auto font-bold text-xs"
              >
                <Compass className="w-4 h-4 mr-1.5" />
                <span>Simulate Stage in Live Console</span>
              </Button>
            </div>

          </Card>
        )}

      </div>

    </div>
  );
};
