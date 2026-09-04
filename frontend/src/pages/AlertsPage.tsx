import React, { useState } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  CheckCircle2, 
  Search, 
  Filter, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  CheckCheck,
  Eye,
  Activity,
  Compass
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { RiskBadge } from '../components/common/RiskBadge';
import { AlertItem } from '../types';

export const AlertsPage: React.FC = () => {
  const { alerts, updateAlertStatus, setCurrentPage } = useSimulation();
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(alerts[0] || null);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredAlerts = alerts.filter(a => {
    const matchSev = filterSeverity === 'ALL' || a.severity === filterSeverity;
    const matchStat = filterStatus === 'ALL' || a.status === filterStatus;
    return matchSev && matchStat;
  });

  const activeAlert = selectedAlert || alerts[0];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20 font-mono">
                Early Warning Queue
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-300">Predictive Incident Triage</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
              <Bell className="w-5 h-5 text-rose-400" />
              Proactive Early Warnings & SOC Alerts
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Alerts generated before attack execution based on multi-window temporal forecasting, enabling proactive isolation.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-mono">Active Alerts: {alerts.length}</span>
            <span className="text-slate-500">•</span>
            <span className="text-rose-400 font-bold font-mono">
              {alerts.filter(a => a.status === 'NEW').length} New
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left (Alert List) & Right (Early Warning Inspection Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Alert List Table */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-300">Filter:</span>
              
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 font-mono focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="ALL">Severity: ALL</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 font-mono focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="ALL">Status: ALL</option>
                <option value="NEW">New</option>
                <option value="UNDER_INVESTIGATION">Under Investigation</option>
                <option value="REVIEWED">Reviewed</option>
              </select>
            </div>

            <span className="text-[11px] text-slate-400 font-mono">
              Showing {filteredAlerts.length} alerts
            </span>
          </div>

          {/* Alerts Cards */}
          <div className="space-y-3">
            {filteredAlerts.map((al) => {
              const isSelected = activeAlert?.id === al.id;
              return (
                <div
                  key={al.id}
                  onClick={() => setSelectedAlert(al)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-slate-900 border-sky-500/60 shadow-glow-cyan'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={al.severity} />
                      <span className="font-mono text-xs text-sky-400 font-bold">{al.id}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="font-mono text-xs text-slate-400">{al.timestamp_ist}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white">{al.title}</h4>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                      <span>Source: <strong className="text-slate-200">{al.source_asset || al.source_ip}</strong></span>
                      <span>Target: <strong className="text-slate-200">{al.destination_asset || al.destination_ip}</strong></span>
                      <span>Stage: <strong className="text-indigo-300">{al.predicted_stage}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2 shrink-0 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                        al.status === 'NEW'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                          : al.status === 'UNDER_INVESTIGATION'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {al.status.replace('_', ' ')}
                      </span>
                      <RiskBadge level={al.risk_score > 7 ? 'HIGH' : 'MEDIUM'} size="sm" />
                    </div>

                    <div className="flex items-center gap-1 text-xs">
                      {al.status === 'NEW' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateAlertStatus(al.id, 'UNDER_INVESTIGATION');
                          }}
                          className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-white font-bold text-[11px] cursor-pointer transition-colors"
                        >
                          Investigate
                        </button>
                      )}
                      {al.status === 'UNDER_INVESTIGATION' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateAlertStatus(al.id, 'REVIEWED');
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer transition-colors"
                        >
                          Mark Reviewed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Column: Early Warning Inspection Card */}
        {activeAlert && (
          <div className="bg-slate-900/90 rounded-xl border border-slate-700/80 p-5 space-y-5 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Card Header */}
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 font-mono">
                    EARLY WARNING ADVISORY
                  </span>
                  <SeverityBadge severity={activeAlert.severity} />
                </div>
                <h3 className="text-base font-bold text-white mt-1">{activeAlert.title}</h3>
                <p className="text-xs text-slate-300 mt-1">{activeAlert.reason}</p>
              </div>

              {/* Threat Matrix */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Risk Score:</span>
                  <span className="font-bold text-rose-400 text-sm">{activeAlert.risk_score.toFixed(1)} / 10</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Attack Probability:</span>
                  <span className="font-bold text-white text-sm">{(activeAlert.attack_probability * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Forecast Horizon:</span>
                  <span className="font-bold text-sky-400">{activeAlert.forecast_horizon} Time Windows</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Predicted Next Stage:</span>
                  <span className="font-bold text-indigo-300 uppercase">{activeAlert.predicted_stage}</span>
                </div>
              </div>

              {/* Main Contributors */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  Key Feature Contributors:
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {activeAlert.main_contributors.map((contrib, i) => (
                    <li key={i} className="flex items-start gap-2 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                      <span className="font-mono text-sky-400 font-bold">{i + 1}.</span>
                      <span>{contrib}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Status Update Buttons */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 block uppercase">Update Alert Lifecycle:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => updateAlertStatus(activeAlert.id, 'NEW')}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      activeAlert.status === 'NEW'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-glow-red'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    New
                  </button>

                  <button
                    onClick={() => updateAlertStatus(activeAlert.id, 'UNDER_INVESTIGATION')}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      activeAlert.status === 'UNDER_INVESTIGATION'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-glow-amber'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    Investigating
                  </button>

                  <button
                    onClick={() => updateAlertStatus(activeAlert.id, 'REVIEWED')}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      activeAlert.status === 'REVIEWED'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-glow-green'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    Reviewed
                  </button>
                </div>
              </div>

            </div>

            {/* Navigation Actions */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                onClick={() => setCurrentPage('forecast')}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-glow-cyan cursor-pointer transition-colors"
              >
                <Compass className="w-4 h-4" />
                <span>View Attack Forecast Timeline</span>
              </button>

              <button
                onClick={() => setCurrentPage('traffic')}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>Inspect Raw Flow Telemetry</span>
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
