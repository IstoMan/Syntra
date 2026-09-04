import React from 'react';
import { FeatureImpact } from '../../types';

interface ShapBarChartProps {
  features: FeatureImpact[];
  maxVal?: number;
}

export const ShapBarChart: React.FC<ShapBarChartProps> = ({ features, maxVal = 0.5 }) => {
  return (
    <div className="space-y-3">
      {features.map((feat) => {
        const isPos = feat.shap_value > 0;
        const widthPct = Math.min(100, (Math.abs(feat.shap_value) / maxVal) * 100);

        return (
          <div key={feat.feature_name} className="group">
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-200">{feat.display_name}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({feat.current_value} {feat.unit} vs base {feat.baseline_value})
                </span>
              </div>
              <span className={`font-mono font-bold ${isPos ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isPos ? `+${feat.shap_value.toFixed(2)}` : feat.shap_value.toFixed(2)}
              </span>
            </div>

            {/* Bar Container */}
            <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden flex relative">
              {/* Baseline center indicator */}
              <div className="w-full bg-slate-900 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    isPos
                      ? 'bg-gradient-to-r from-rose-500/70 to-rose-500 shadow-glow-red'
                      : 'bg-gradient-to-r from-emerald-500/70 to-emerald-500 shadow-glow-green'
                  }`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
