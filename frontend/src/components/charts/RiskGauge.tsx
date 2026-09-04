import React from 'react';
import { RiskBadge } from '../common/RiskBadge';
import { RiskLevel } from '../../types';

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
  size?: number;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, level, size = 220 }) => {
  const normalized = Math.min(10, Math.max(0, score));
  const radius = (size / 2) - 24;
  const circumference = Math.PI * radius; // Half circle
  const strokeDashoffset = circumference - (normalized / 10) * circumference;

  const getColor = () => {
    if (normalized >= 8.0) return '#ef4444';
    if (normalized >= 6.0) return '#f43f5e';
    if (normalized >= 3.5) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="flex flex-col items-center justify-center relative p-2">
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`} className="overflow-visible">
        {/* Background Arc */}
        <path
          d={`M 24 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 24} ${size / 2}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Value Arc */}
        <path
          d={`M 24 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 24} ${size / 2}`}
          fill="none"
          stroke={getColor()}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />

        {/* Ticks 0, 5, 10 */}
        <text x="24" y={(size / 2) + 20} className="text-[11px] fill-slate-400 font-mono" textAnchor="middle">0</text>
        <text x={size / 2} y={24} className="text-[11px] fill-slate-400 font-mono" textAnchor="middle">5</text>
        <text x={size - 24} y={(size / 2) + 20} className="text-[11px] fill-slate-400 font-mono" textAnchor="middle">10</text>
      </svg>

      {/* Center Value Badge */}
      <div className="absolute top-[35%] flex flex-col items-center">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl md:text-4xl font-extrabold font-mono text-white tracking-tight" style={{ color: getColor() }}>
            {normalized.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400 font-mono font-medium">/ 10</span>
        </div>
        <div className="mt-1">
          <RiskBadge level={level} size="md" showPulse={normalized >= 7.0} />
        </div>
      </div>
    </div>
  );
};
