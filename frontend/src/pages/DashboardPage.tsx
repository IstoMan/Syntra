import React from 'react';
import { 
  Activity, 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  ArrowUpRight, 
  Bell, 
  Sparkles, 
  Layers, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { RiskBadge } from '../components/common/RiskBadge';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { USPBanner } from '../components/common/USPBanner';
import { RiskTimeChart } from '../components/charts/RiskTimeChart';
import { ShapBarChart } from '../components/charts/ShapBarChart';

export const DashboardPage: React.FC = () => {
  const { 
    currentStage, 
    forecastData, 
    riskData, 
    explanationData, 
    alerts, 
    setCurrentPage,
    startJudgeDemo,
    togglePlay,
    isPlaying,
    resetSimulation
  } = useSimulation();

  const currentState = forecastData?.current_state;
  const riskScore = currentState?.risk_score ?? 8.7;
  const attackProb = currentState?.attack_probability ?? 0.82;
  const riskLevel = currentState?.risk_level ?? 'HIGH';
  const networkStatus = currentState?.network_status ?? 'HIGH RISK';
  const predictedStage = currentState?.current_stage ?? 'COMMAND & CONTROL';

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Top USP Innovation Banner */}
      <USPBanner />

      {/* Action Header Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-semibold text-slate-200">
            Live Telemetry Pipeline Active — Monitored Nodes: 6
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <button
            onClick={() => setCurrentPage('datasource')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700 cursor-pointer"
          >
            Upload CSV / Ingest
          </button>
          
          <button
            onClick={startJudgeDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 text-white font-bold cursor-pointer shadow-glow-cyan"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Start Attack Forecast Demo</span>
          </button>

          <button
            onClick={togglePlay}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={resetSimulation}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6 Key KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* KPI 1: Network Status */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Network Status</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2">
            <span className={`text-base font-extrabold font-mono ${
              networkStatus === 'NORMAL' ? 'text-emerald-400' : networkStatus === 'ANOMALY' ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {networkStatus}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Monitoring active</p>
          </div>
        </div>

        {/* KPI 2: Total Flows */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Flows</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-extrabold font-mono text-white">
              {(currentState?.total_flows_window || 28547).toLocaleString()}
            </span>
            <p className="text-[11px] text-emerald-400 flex items-center gap-0.5 mt-0.5 font-medium">
              <ArrowUpRight className="w-3 h-3" /> +12.4% vs last window
            </p>
          </div>
        </div>

        {/* KPI 3: Attack Probability */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Attack Probability</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className={`text-xl font-extrabold font-mono ${attackProb > 0.6 ? 'text-rose-400' : attackProb > 0.3 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {(attackProb * 100).toFixed(0)}%
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {attackProb > 0.6 ? 'High Probability' : attackProb > 0.3 ? 'Moderate Risk' : 'Normal Envelope'}
            </p>
          </div>
        </div>

        {/* KPI 4: Risk Level */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Risk Level</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold font-mono text-white">{riskScore.toFixed(1)}</span>
              <span className="text-xs text-slate-400 font-mono">/ 10</span>
            </div>
            <div className="mt-1">
              <RiskBadge level={riskLevel} size="sm" showPulse={riskScore > 7} />
            </div>
          </div>
        </div>

        {/* KPI 5: Forecast Lead Time */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Forecast Lead Time</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-extrabold font-mono text-sky-400">5</span>
              <span className="text-xs text-slate-300">Windows</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Ahead of compromise</p>
          </div>
        </div>

        {/* KPI 6: Predicted Stage */}
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Predicted Stage</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <span className="text-xs font-extrabold text-indigo-300 uppercase tracking-tight block truncate">
              {predictedStage}
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">Next likely stage</p>
          </div>
        </div>

      </div>

      {/* Main Grid: Left (Risk Chart & SHAP) + Right (Forecast Horizon & Recent Alerts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Dynamic Attack Risk Over Time Chart */}
          <RiskTimeChart 
            history={riskData?.history || []} 
            currentScore={riskScore} 
          />

          {/* Explainability / SHAP Mini Panel */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  Why is the Risk Score {riskScore.toFixed(1)} / 10? (SHAP Feature Attributions)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Quantified positive & negative feature impacts relative to normal baseline
                </p>
              </div>
              <button
                onClick={() => setCurrentPage('explainability')}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <span>Full XAI Analysis</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <ShapBarChart features={explanationData?.feature_impacts || []} />

            <div className="mt-4 p-3 bg-slate-950/60 rounded-lg border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2">
              <span className="font-bold text-sky-400 shrink-0">Model Insight:</span>
              <span>{explanationData?.plain_english_explanation}</span>
            </div>
          </div>

        </div>

        {/* Right Column (1 Col on lg) */}
        <div className="space-y-6">
          
          {/* 5-Window Forecast Horizon Panel */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  Attack Forecast — Next 5 Windows
                </h3>
                <p className="text-[11px] text-slate-400">Temporal transition probabilities</p>
              </div>
              <button
                onClick={() => setCurrentPage('forecast')}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>Timeline</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {forecastData?.predictions.map((pred) => (
                <div
                  key={pred.window}
                  onClick={() => setCurrentPage('forecast')}
                  className="p-2.5 rounded-lg bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      {pred.window_label}
                    </span>
                    <div>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-white block">
                        {pred.predicted_stage}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {pred.expected_time_ist}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {(pred.probability * 100).toFixed(0)}%
                    </span>
                    <RiskBadge level={pred.risk_badge} size="sm" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Model Architecture:</span>
              <span className="font-mono text-slate-300">LSTM-Temporal (K=5)</span>
            </div>
          </div>

          {/* Recent Alerts Feed */}
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-rose-400" />
                Recent Alerts & Warnings
              </h3>
              <button
                onClick={() => setCurrentPage('alerts')}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
              >
                View All ({alerts.length})
              </button>
            </div>

            <div className="space-y-2.5">
              {alerts.slice(0, 3).map((al) => (
                <div
                  key={al.id}
                  onClick={() => setCurrentPage('alerts')}
                  className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[180px]">
                      {al.title}
                    </span>
                    <SeverityBadge severity={al.severity} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Source: {al.source_asset ? `${al.source_asset} (${al.source_ip})` : al.source_ip}</span>
                    <span>{al.timestamp_ist}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 line-clamp-1">{al.reason}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
