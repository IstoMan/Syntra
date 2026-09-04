import React from 'react';
import { ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

export const USPBanner: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-slate-900/95 via-indigo-950/40 to-slate-900/95 border border-indigo-500/30 rounded-xl p-4 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-full bg-sky-500/5 blur-3xl pointer-events-none" />
      
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 mt-0.5">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                Core Innovation (SIH26153)
              </span>
              <span className="text-xs text-slate-400">Detect → Forecast → Explain → Alert</span>
            </div>
            <h3 className="text-sm md:text-base font-bold text-white mt-1">
              Traditional IDS detects present attacks. <span className="text-sky-400">SYNTRA forecasts what happens next.</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
              Learns multi-window temporal state sequences to predict future attack stages before system compromise occurs.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-md border border-slate-700/60 text-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>5-Window Lead Time</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-md border border-slate-700/60 text-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Explainable SHAP</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-md border border-slate-700/60 text-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>MITRE ATT&CK Mapping</span>
          </div>
        </div>
      </div>
    </div>
  );
};
