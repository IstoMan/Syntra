import React from 'react';
import { 
  Compass, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Info,
  Layers,
  Activity
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { RiskBadge } from '../components/common/RiskBadge';

export const AttackForecastPage: React.FC = () => {
  const { forecastData, currentStage, setCurrentPage } = useSimulation();

  const currentState = forecastData?.current_state;
  const predictions = forecastData?.predictions || [];
  const reasoning = forecastData?.forecast_reasoning || [];
  const summary = forecastData?.forecast_summary || '';

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Top Banner: Current Network State */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/40 p-5 rounded-xl border border-sky-500/30 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded border border-sky-500/20 font-mono">
                State ID: {currentState?.state_id || 'NS-00428'}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-300 font-mono">{currentState?.timestamp || '10:30:21 IST'}</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
              <Compass className="w-5 h-5 text-sky-400" />
              Multi-Step Cyberattack Horizon Forecasting
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              SYNTRA uses an LSTM temporal transition model trained on sequence embeddings to predict impending attack stages before system compromise occurs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Current Risk</span>
              <div className="mt-0.5">
                <RiskBadge level={currentState?.risk_level || 'HIGH'} size="sm" showPulse />
              </div>
            </div>

            <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Attack Probability</span>
              <span className="text-base font-extrabold text-rose-400 font-mono">
                {((currentState?.attack_probability || 0.82) * 100).toFixed(0)}%
              </span>
            </div>

            <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Forecast Horizon</span>
              <span className="text-base font-extrabold text-sky-400 font-mono">5 Windows</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Forecast Progression Timeline */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              Temporal Attack Progression Timeline (Current → t+5)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any predicted state to view tactical details and confidence scores
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Resolution: 60s per window</span>
          </div>
        </div>

        {/* Timeline Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 relative">
          {predictions.map((pred, idx) => {
            const isCritical = pred.risk_badge === 'CRITICAL';
            const isHigh = pred.risk_badge === 'HIGH';
            const isMed = pred.risk_badge === 'MEDIUM';

            return (
              <div
                key={pred.window}
                className={`relative p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                  isCritical
                    ? 'bg-red-950/20 border-red-500/40 shadow-glow-red hover:bg-red-950/30'
                    : isHigh
                    ? 'bg-rose-950/20 border-rose-500/40 shadow-glow-red hover:bg-rose-950/30'
                    : isMed
                    ? 'bg-amber-950/20 border-amber-500/30 shadow-glow-amber hover:bg-amber-950/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Window Step Header */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      {pred.window_label}
                    </span>
                    <RiskBadge level={pred.risk_badge} size="sm" />
                  </div>

                  <h4 className="text-sm font-bold text-white mt-1 leading-snug">
                    {pred.predicted_stage}
                  </h4>

                  {pred.mitre_technique_id && (
                    <span className="inline-block mt-1 text-[10px] font-mono text-indigo-300 bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-500/30">
                      {pred.mitre_technique_id} • {pred.mitre_technique_name}
                    </span>
                  )}
                </div>

                {/* Probability & Metrics */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Probability:</span>
                    <span className="font-mono font-bold text-white">{(pred.probability * 100).toFixed(0)}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pred.probability > 0.7 ? 'bg-rose-500' : pred.probability > 0.4 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pred.probability * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>Conf: {(pred.confidence * 100).toFixed(0)}%</span>
                    <span>{pred.expected_time_ist.replace(' IST', '')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forecast Reasoning and AI Security Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Reasoning Checklist */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Observed Temporal State Indicators
            </h3>
            <span className="text-xs text-slate-400 font-mono">Sequential Extraction</span>
          </div>

          <div className="space-y-2.5">
            {reasoning.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs">
            <button
              onClick={() => setCurrentPage('explainability')}
              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect SHAP Feature Weights</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Narrative & Uncertainty Communication */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">AI Forecast Synthesis</h3>
            </div>

            <div className="p-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl text-xs text-indigo-200 leading-relaxed">
              <p className="font-semibold text-white mb-1">Analyst Advisory:</p>
              {summary}
            </div>

            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-[11px] text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                <strong>Defensive Guidance:</strong> Forecasting communicates probabilistic likelihood based on historical state transition modeling. It serves as an early decision-support indicator to allow proactive containment before compromise.
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={() => setCurrentPage('alerts')}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer transition-colors"
            >
              Generate Early Warning Alert
            </button>
            <button
              onClick={() => setCurrentPage('mitre')}
              className="text-slate-300 hover:text-white font-medium cursor-pointer"
            >
              View in MITRE Matrix →
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
