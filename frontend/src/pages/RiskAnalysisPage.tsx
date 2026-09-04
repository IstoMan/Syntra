import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  TrendingUp, 
  Layers, 
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { RiskGauge } from '../components/charts/RiskGauge';
import { RiskTimeChart } from '../components/charts/RiskTimeChart';
import { RiskBadge } from '../components/common/RiskBadge';

export const RiskAnalysisPage: React.FC = () => {
  const { riskData, forecastData, setCurrentPage } = useSimulation();

  const score = riskData?.current_risk_score ?? 8.7;
  const level = riskData?.risk_level ?? 'HIGH';
  const components = riskData?.components || [];
  const interpretation = riskData?.soc_interpretation || '';

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      
      {/* Top Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Large Radial Risk Gauge Card */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-between shadow-xl">
          <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Composite Risk Score
            </h3>
            <span className="text-[10px] font-mono uppercase text-slate-400">Dynamic (0 - 10)</span>
          </div>

          <div className="my-4">
            <RiskGauge score={score} level={level} size={240} />
          </div>

          <div className="w-full bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-center text-xs text-slate-300">
            <span>Forecast Model Confidence: </span>
            <span className="font-mono font-bold text-sky-400">91.3%</span>
          </div>
        </div>

        {/* 4-Component Risk Weight Breakdown */}
        <div className="lg:col-span-2 bg-slate-900/80 rounded-xl border border-slate-800 p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  Multi-Factor Risk Component Breakdown
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Algorithmic weights computed across traffic anomaly, sequence rate, and asset criticality
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {components.map((comp, idx) => (
                <div key={idx} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{comp.name}</span>
                    <span className="font-mono font-extrabold text-white text-sm">
                      {comp.score_percentage.toFixed(0)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        comp.score_percentage > 75 ? 'bg-rose-500' : comp.score_percentage > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${comp.score_percentage}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 leading-snug">{comp.description}</p>
                  
                  <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Component Weight</span>
                    <span>{(comp.weight * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Target Asset Category:</span>
            <span className="font-mono text-sky-400">Critical Information Infrastructure (CII)</span>
          </div>
        </div>

      </div>

      {/* Historical Risk Timeline Chart */}
      <RiskTimeChart 
        history={riskData?.history || []} 
        currentScore={score} 
      />

      {/* SOC Analyst Interpretation Box */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              SOC Security Analyst Assessment
            </h4>
            <p className="text-xs text-slate-200 mt-1 leading-relaxed max-w-3xl">
              {interpretation}
            </p>
          </div>
        </div>

        <button
          onClick={() => setCurrentPage('explainability')}
          className="shrink-0 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-glow-cyan cursor-pointer transition-colors"
        >
          <span>View Feature SHAP Impact</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
};
