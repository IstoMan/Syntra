import React from 'react';

interface ConfusionMatrixProps {
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export const ConfusionMatrix: React.FC<ConfusionMatrixProps> = ({ tp, fp, tn, fn }) => {
  return (
    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
        <span>Validation Confusion Matrix</span>
        <span className="text-[10px] text-sky-400 font-mono">15,877 Test Flows</span>
      </h4>

      <div className="grid grid-cols-2 gap-2 text-center font-mono">
        <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-lg flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-emerald-400">{tp.toLocaleString()}</span>
          <span className="text-[10px] text-emerald-300 uppercase tracking-wider mt-1">True Positive (TP)</span>
          <span className="text-[9px] text-slate-400">Correctly Forecasted Attack</span>
        </div>

        <div className="bg-rose-950/30 border border-rose-500/30 p-3 rounded-lg flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-rose-400">{fp.toLocaleString()}</span>
          <span className="text-[10px] text-rose-300 uppercase tracking-wider mt-1">False Positive (FP)</span>
          <span className="text-[9px] text-slate-400">Normal Flagged as Attack</span>
        </div>

        <div className="bg-rose-950/30 border border-rose-500/30 p-3 rounded-lg flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-rose-400">{fn.toLocaleString()}</span>
          <span className="text-[10px] text-rose-300 uppercase tracking-wider mt-1">False Negative (FN)</span>
          <span className="text-[9px] text-slate-400">Missed Attack Stage</span>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-lg flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-emerald-400">{tn.toLocaleString()}</span>
          <span className="text-[10px] text-emerald-300 uppercase tracking-wider mt-1">True Negative (TN)</span>
          <span className="text-[9px] text-slate-400">Correctly Identified Normal</span>
        </div>
      </div>
    </div>
  );
};
