import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  CheckCircle2, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Layers, 
  TrendingUp,
  Info
} from 'lucide-react';
import { ModelPerformanceMetrics } from '../types';
import { api } from '../services/api';
import { ConfusionMatrix } from '../components/charts/ConfusionMatrix';
import { RocCurve } from '../components/charts/RocCurve';

export const ModelPerformancePage: React.FC = () => {
  const [metrics, setMetrics] = useState<ModelPerformanceMetrics | null>(null);

  useEffect(() => {
    api.getModelPerformance().then(setMetrics);
  }, []);

  if (!metrics) {
    return <div className="p-8 text-center text-slate-400">Loading model evaluation metrics...</div>;
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Disclaimer Banner (Mandatory Requirement) */}
      <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-start gap-3 shadow-glow-amber">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold uppercase tracking-wider block text-amber-300">
            {metrics.notice}
          </span>
          <p className="text-amber-200/90 mt-0.5">
            Measured against CIC-IDS2017 multi-stage sequence benchmarks and simulated Indian Critical Information Infrastructure (CII) time-series data.
          </p>
        </div>
      </div>

      {/* Top 5 Evaluation Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400">Precision</span>
          <div className="mt-2">
            <span className="text-2xl font-extrabold font-mono text-emerald-400">{metrics.precision}%</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Low false alarm rate</p>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400">Recall (Sensitivity)</span>
          <div className="mt-2">
            <span className="text-2xl font-extrabold font-mono text-emerald-400">{metrics.recall}%</span>
            <p className="text-[11px] text-slate-400 mt-0.5">High threat capture</p>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400">F1 Score</span>
          <div className="mt-2">
            <span className="text-2xl font-extrabold font-mono text-sky-400">{metrics.f1_score}%</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Harmonic balance</p>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400">False Positive Rate</span>
          <div className="mt-2">
            <span className="text-2xl font-extrabold font-mono text-rose-400">{metrics.false_positive_rate}%</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Under 5% threshold</p>
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <span className="text-xs text-slate-400">Forecast Horizon</span>
          <div className="mt-2">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold font-mono text-indigo-400">{metrics.forecast_lead_time_windows}</span>
              <span className="text-xs text-slate-300">Windows</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Lead time advantage</p>
          </div>
        </div>

      </div>

      {/* Validation Visualizations: Confusion Matrix & ROC Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConfusionMatrix 
          tp={metrics.confusion_matrix.true_positive} 
          fp={metrics.confusion_matrix.false_positive} 
          tn={metrics.confusion_matrix.true_negative} 
          fn={metrics.confusion_matrix.false_negative} 
        />
        <RocCurve 
          points={metrics.roc_curve} 
          auc={metrics.auc_roc} 
        />
      </div>

      {/* Architecture Comparison Table */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            Comparison: Temporal Forecaster vs Point-in-Time Classifiers
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Demonstrates why sequential temporal learning outperforms static packet inspection
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Model Architecture</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Lead Time</th>
                <th className="py-2.5 px-3">F1 Score</th>
                <th className="py-2.5 px-3">FPR</th>
                <th className="py-2.5 px-3">Explainability</th>
                <th className="py-2.5 px-3">Operational Advantage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {metrics.model_comparison.map((row, idx) => {
                const isSyntra = row.model.includes('SYNTRA');
                return (
                  <tr
                    key={idx}
                    className={isSyntra ? 'bg-sky-500/10 font-bold border-l-2 border-l-sky-400' : 'hover:bg-slate-800/40'}
                  >
                    <td className={`py-3 px-3 ${isSyntra ? 'text-sky-300' : 'text-slate-300'}`}>{row.model}</td>
                    <td className="py-3 px-3 text-slate-400">{row.type}</td>
                    <td className="py-3 px-3 text-indigo-300">{row.lead_time}</td>
                    <td className="py-3 px-3 text-emerald-400">{row.f1}%</td>
                    <td className="py-3 px-3 text-rose-400">{row.fpr}%</td>
                    <td className="py-3 px-3 text-slate-300">{row.explainability}</td>
                    <td className="py-3 px-3 text-slate-200 font-sans">{row.usp}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
