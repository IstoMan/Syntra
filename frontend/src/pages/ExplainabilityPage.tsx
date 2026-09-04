import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  Clock, 
  Layers, 
  HelpCircle, 
  TrendingUp, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { ShapBarChart } from '../components/charts/ShapBarChart';
import { RiskBadge } from '../components/common/RiskBadge';

export const ExplainabilityPage: React.FC = () => {
  const { explanationData, forecastData } = useSimulation();
  const [activeTab, setActiveTab] = useState<'shap' | 'timeline' | 'drift'>('shap');

  const impacts = explanationData?.feature_impacts || [];
  const timeline = explanationData?.prediction_timeline || [];
  const explanation = explanationData?.plain_english_explanation || '';
  const driftSummary = explanationData?.temporal_drift_summary || '';

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20 font-mono">
                Explainable AI (XAI)
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-300">SHAP Attributions & Sequence Analysis</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              Understand Why the AI Predicted This Attack Risk
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Provides granular mathematical attribution for every network telemetry feature that influenced the temporal transition model.
            </p>
          </div>

          <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-center text-xs">
            <span className="text-slate-400 text-[10px] block uppercase font-mono">SHAP Base Value</span>
            <span className="font-mono font-bold text-sky-400 text-base">E[f(x)] = 1.20</span>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('shap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'shap'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>1. Feature Impact (SHAP)</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'timeline'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>2. Prediction Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('drift')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'drift'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>3. Network State Drift & Z-Scores</span>
        </button>
      </div>

      {/* Tab 1: Feature Impact (SHAP) */}
      {activeTab === 'shap' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">SHAP Feature Attribution Values</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Positive values (+red) elevate forecasted risk; Negative values (-green) indicate normal behavior.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-400">TreeSHAP / DeepSHAP</span>
            </div>

            <ShapBarChart features={impacts} />

            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-1">
              <span className="font-bold text-sky-400">Plain-English Analyst Explanation:</span>
              <p className="text-slate-200 leading-relaxed">{explanation}</p>
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400" />
              How SHAP Works in SYNTRA
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              SHAP (SHapley Additive exPlanations) computes fair marginal contributions from cooperative game theory.
            </p>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                <span className="text-white font-bold block mb-0.5">1. Baseline Modeling:</span>
                Learns non-attack enterprise flow characteristics during calibration.
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                <span className="text-white font-bold block mb-0.5">2. Perturbation Delta:</span>
                Measures deviation when specific sequence features are masked or varied.
              </div>
              <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
                <span className="text-white font-bold block mb-0.5">3. Explainable Action:</span>
                Gives SOC engineers explicit evidence rather than an unexplainable black-box alert.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Prediction Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Temporal Risk Sequence Progression</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Observed step-by-step risk escalation leading up to the current forecast state
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">IST Timestamps</span>
          </div>

          <div className="space-y-3">
            {timeline.map((step, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-all font-mono text-xs"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sky-400 font-bold w-12">{step.time}</span>
                  <RiskBadge level={step.level} size="sm" />
                  <span className="text-slate-300 font-sans">{step.note}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-[11px]">Score:</span>
                  <span className="font-bold text-white text-sm">{step.score.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Network State Drift & Z-Scores */}
      {activeTab === 'drift' && (
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Statistical Drift vs Learned Normal Baseline</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard deviation z-scores ($Z = (x - \mu)/\sigma$) across monitored Indian CII enterprise features
              </p>
            </div>
            <span className="text-xs text-sky-400 font-mono">Baseline: CIC-IDS2017 / CII Net</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Packet Rate Drift</span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-rose-400 font-mono">+3.82 σ</span>
                <span className="text-xs text-rose-300 font-semibold">High Anomaly</span>
              </div>
              <p className="text-[10px] text-slate-500">Current: 580 pkts/s vs Base: 85.0 pkts/s</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Port Diversity Drift</span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-rose-400 font-mono">+4.12 σ</span>
                <span className="text-xs text-rose-300 font-semibold">High Anomaly</span>
              </div>
              <p className="text-[10px] text-slate-500">Targeted probing across non-standard ports</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Flow Duration Drift</span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-amber-400 font-mono">+2.94 σ</span>
                <span className="text-xs text-amber-300 font-semibold">Moderate Drift</span>
              </div>
              <p className="text-[10px] text-slate-500">Sustained sessions (18-28 sec)</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Beaconing Regularity</span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-red-400 font-mono">+4.80 σ</span>
                <span className="text-xs text-red-300 font-semibold">Critical C2</span>
              </div>
              <p className="text-[10px] text-slate-500">Fixed-interval egress jitter pattern</p>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <span className="font-bold text-sky-400">Drift Summary:</span>
            <span>{driftSummary}</span>
          </div>
        </div>
      )}

    </div>
  );
};
