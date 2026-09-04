import React from 'react';

interface RocCurveProps {
  points: { fpr: number; tpr: number }[];
  auc: number;
}

export const RocCurve: React.FC<RocCurveProps> = ({ points, auc }) => {
  const width = 300;
  const height = 200;
  const padding = { top: 15, right: 20, bottom: 30, left: 35 };

  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const getX = (fpr: number) => padding.left + fpr * innerW;
  const getY = (tpr: number) => padding.top + innerH - tpr * innerH;

  const pathD = points.reduce((acc, pt, idx) => {
    const x = getX(pt.fpr);
    const y = getY(pt.tpr);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const areaD = `${pathD} L ${getX(1.0)} ${padding.top + innerH} L ${getX(0.0)} ${padding.top + innerH} Z`;

  return (
    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">ROC-AUC Characteristic</h4>
        <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
          AUC = {auc.toFixed(3)}
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <defs>
          <linearGradient id="rocGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Diagonal Baseline (Random Guess) */}
        <line
          x1={getX(0)}
          y1={getY(0)}
          x2={getX(1)}
          y2={getY(1)}
          stroke="rgba(100, 116, 139, 0.4)"
          strokeDasharray="3 3"
        />

        {/* ROC Area */}
        <path d={areaD} fill="url(#rocGrad)" />

        {/* ROC Curve */}
        <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" />

        {/* Points */}
        {points.map((pt, i) => (
          <circle key={i} cx={getX(pt.fpr)} cy={getY(pt.tpr)} r="3" fill="#38bdf8" />
        ))}

        {/* Axes */}
        <line x1={padding.left} y1={padding.top + innerH} x2={padding.left + innerW} y2={padding.top + innerH} stroke="#475569" />
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerH} stroke="#475569" />

        {/* Labels */}
        <text x={padding.left + innerW / 2} y={height - 5} textAnchor="middle" className="text-[9px] fill-slate-400">
          False Positive Rate (FPR)
        </text>
        <text x={10} y={padding.top + innerH / 2} textAnchor="middle" transform={`rotate(-90 10 ${padding.top + innerH / 2})`} className="text-[9px] fill-slate-400">
          True Positive Rate (TPR)
        </text>
      </svg>
    </div>
  );
};
