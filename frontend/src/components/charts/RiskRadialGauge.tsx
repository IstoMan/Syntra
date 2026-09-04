import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { RiskBadge } from '../common/RiskBadge';
import { RiskLevel } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';

interface RiskRadialGaugeProps {
  score: number;
  level: RiskLevel;
  attackProbability: number;
}

export const RiskRadialGauge: React.FC<RiskRadialGaugeProps> = ({
  score,
  level,
  attackProbability
}) => {
  const boundedScore = Math.min(10, Math.max(0, score));
  const percentage = boundedScore / 10;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.666;
  const strokeDashoffset = arcLength * (1 - percentage);

  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between space-y-3 border-border/80">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <CardTitle className="text-xs uppercase tracking-wider text-foreground font-bold">
            Composite Threat Risk Dial
          </CardTitle>
        </div>
        <RiskBadge level={level} size="sm" showPulse={score > 7} />
      </div>

      {/* Radial Speedometer Gauge */}
      <div className="relative flex flex-col items-center justify-center my-1">
        <svg width="180" height="115" viewBox="0 0 180 115" className="overflow-visible select-none">
          <defs>
            <linearGradient id="clearGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <filter id="gaugeGlowDark">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Arc */}
          <path
            d="M 26 108 A 64 64 0 1 1 154 108"
            fill="none"
            stroke="rgba(71, 85, 105, 0.4)"
            strokeWidth="11"
            strokeLinecap="round"
          />

          {/* Active Arc with Smooth Animation & Glow */}
          <path
            d="M 26 108 A 64 64 0 1 1 154 108"
            fill="none"
            stroke="url(#clearGaugeGrad)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            filter="url(#gaugeGlowDark)"
            className="transition-all duration-700 ease-out"
          />

          {/* Digital Numeric Ticks */}
          {[0, 2.5, 5, 7.5, 10].map((tick, i) => {
            const angle = -120 + (i / 4) * 240;
            const rad = (angle * Math.PI) / 180;
            const x = 90 + 78 * Math.cos(rad);
            const y = 88 + 78 * Math.sin(rad);
            return (
              <text
                key={tick}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] font-mono fill-muted-foreground font-bold"
              >
                {tick}
              </text>
            );
          })}
        </svg>

        {/* Center Readout */}
        <div className="absolute top-8 flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-extrabold font-mono tracking-tight transition-colors duration-300 ${
              score >= 8 ? 'text-rose-400' : score >= 5 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {score.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground font-mono font-bold">/ 10</span>
          </div>
          <span className="text-[10px] font-mono uppercase font-bold text-foreground mt-0.5 tracking-wider">
            {score >= 8 ? 'Critical Threat' : score >= 5 ? 'Elevated Risk' : 'Normal State'}
          </span>
        </div>
      </div>

      {/* 4 Dimension Breakdown */}
      <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-border font-mono">
        
        <div className="bg-muted/50 p-2.5 rounded-lg border border-border/70">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10.5px] font-medium">Anomaly Drift</span>
            <span className="text-amber-300 font-bold">{Math.min(99, Math.round(score * 9.8))}%</span>
          </div>
          <Progress value={Math.min(100, score * 9.8)} indicatorClassName="bg-amber-400" className="h-1.5" />
        </div>

        <div className="bg-muted/50 p-2.5 rounded-lg border border-border/70">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10.5px] font-medium">Temporal Velocity</span>
            <span className="text-rose-400 font-bold">{Math.min(99, Math.round(score * 10.2))}%</span>
          </div>
          <Progress value={Math.min(100, score * 10.2)} indicatorClassName="bg-rose-500" className="h-1.5" />
        </div>

        <div className="bg-muted/50 p-2.5 rounded-lg border border-border/70">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10.5px] font-medium">Attack Prob</span>
            <span className="text-sky-300 font-bold">{(attackProbability * 100).toFixed(0)}%</span>
          </div>
          <Progress value={attackProbability * 100} indicatorClassName="bg-sky-400" className="h-1.5" />
        </div>

        <div className="bg-muted/50 p-2.5 rounded-lg border border-border/70">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[10.5px] font-medium">Asset Criticality</span>
            <span className="text-purple-300 font-bold">Tier 1 (DC)</span>
          </div>
          <Progress value={95} indicatorClassName="bg-purple-400" className="h-1.5" />
        </div>

      </div>

    </Card>
  );
};
