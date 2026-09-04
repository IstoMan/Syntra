import React, { useState } from 'react';
import { RiskHistoryPoint } from '../../types';
import { TrendingUp } from 'lucide-react';
import { Card, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';

interface RiskTimeChartProps {
  history?: RiskHistoryPoint[];
  currentScore: number;
  stageIndex?: number;
}

export const RiskTimeChart: React.FC<RiskTimeChartProps> = ({ 
  history, 
  currentScore,
  stageIndex = 1 
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    time: string;
    score: number;
    stage: string;
    label: string;
  } | null>(null);

  // SVG Chart dimensions
  const width = 720;
  const height = 230;
  const padding = { top: 25, right: 35, bottom: 42, left: 45 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // The 6 exact milestone progression points: 1.2 -> 2.8 -> 4.1 -> 5.7 -> 7.2 -> 8.7
  const progressionMilestones = [
    { time: '10:30:01', score: 1.2, stage: 'Baseline', label: 'Normal Traffic', level: 'LOW' },
    { time: '10:30:08', score: 2.8, stage: 'Packet Surge', label: 'Anomaly Detected', level: 'LOW' },
    { time: '10:30:15', score: 4.1, stage: 'Port Activity', label: 'Unusual Ports', level: 'MEDIUM' },
    { time: '10:30:22', score: 5.7, stage: 'Suspicious State', label: 'Flow Anomaly', level: 'MEDIUM' },
    { time: '10:30:30', score: 7.2, stage: 'Forecast Gen', label: 'C2 Trajectory', level: 'HIGH' },
    { time: '10:30:45', score: 8.7, stage: 'Early Warning', label: 'Critical Risk', level: 'CRITICAL' }
  ];

  // Dynamically slice points up to current progression stage
  const visibleCount = Math.min(progressionMilestones.length, Math.max(1, stageIndex));
  const activeMilestones = progressionMilestones.slice(0, visibleCount);

  // If on stage 7 (Mitigated), add a drop to 0.8
  const points = stageIndex === 7 
    ? [
        ...progressionMilestones, 
        { time: '10:30:52', score: 0.8, stage: 'Mitigated', label: 'Threat Neutralized', level: 'LOW' }
      ]
    : activeMilestones;

  const getX = (index: number) => {
    if (progressionMilestones.length === 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (progressionMilestones.length - 1)) * innerWidth;
  };

  const getY = (score: number) => {
    const clamped = Math.min(10, Math.max(0, score));
    return padding.top + innerHeight - (clamped / 10) * innerHeight;
  };

  // Construct smooth SVG Bezier curve
  const pathD = points.reduce((acc, pt, idx, arr) => {
    const x = getX(idx);
    const y = getY(pt.score);
    if (idx === 0) return `M ${x} ${y}`;
    const prevX = getX(idx - 1);
    const prevY = getY(arr[idx - 1].score);
    const cp1x = prevX + (x - prevX) / 2;
    const cp2x = prevX + (x - prevX) / 2;
    return `${acc} C ${cp1x} ${prevY}, ${cp2x} ${y}, ${x} ${y}`;
  }, '');

  const areaD = points.length > 1
    ? `${pathD} L ${getX(points.length - 1)} ${padding.top + innerHeight} L ${getX(0)} ${padding.top + innerHeight} Z`
    : '';

  return (
    <Card className="p-4 sm:p-5 relative border-border/80 flex flex-col justify-between">
      
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xs uppercase tracking-wider text-foreground font-bold flex items-center gap-2">
              <span>Risk Score Over Time</span>
              <Badge variant="cyber" className="text-[10px] px-1.5 py-0 font-mono">
                1.2 → 8.7 Real-Time
              </Badge>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground font-medium">
              Multi-window cumulative risk progression and trajectory gradient
            </p>
          </div>
        </div>

        {/* Threshold Legend */}
        <div className="flex items-center gap-3 text-[10.5px] font-mono text-muted-foreground bg-secondary/70 border border-border px-2.5 py-1 rounded-md">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Low (&lt;3.0)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span> Med (3-6)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> High (6-8)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600"></span> Crit (&gt;8)
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[540px] select-none">
          <defs>
            <linearGradient id="riskAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.32" />
              <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="riskLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="30%" stopColor="#38bdf8" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="85%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y labels */}
          {[0, 2.5, 5.0, 7.5, 10.0].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="rgba(113, 113, 122, 0.22)"
                  strokeDasharray="3 4"
                />
                <text
                  x={padding.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-zinc-400 font-mono font-bold"
                >
                  {val.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Early Warning Critical Threshold Guideline (7.0) */}
          <line
            x1={padding.left}
            y1={getY(7.0)}
            x2={padding.left + innerWidth}
            y2={getY(7.0)}
            stroke="#ef4444"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.5"
          />
          <text
            x={padding.left + innerWidth - 5}
            y={getY(7.0) - 4}
            textAnchor="end"
            className="text-[9px] fill-red-400 font-mono font-bold tracking-wider"
          >
            CRITICAL THRESHOLD (7.0)
          </text>

          {/* Area Fill */}
          {areaD && (
            <path d={areaD} fill="url(#riskAreaGradient)" className="transition-all duration-300" />
          )}

          {/* Line Path */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#riskLineGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Background milestone slots for visual continuity */}
          {progressionMilestones.map((m, idx) => {
            const cx = getX(idx);
            const cy = getY(m.score);
            const isVisible = idx < visibleCount || stageIndex === 7;

            return (
              <g key={idx} className="opacity-40">
                {!isVisible && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="4"
                    fill="transparent"
                    stroke="#71717a"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}
              </g>
            );
          })}

          {/* Interactive Data Points */}
          {points.map((pt, idx) => {
            const cx = getX(idx);
            const cy = getY(pt.score);
            const isLast = idx === points.length - 1;
            const isHovered = hoveredPoint?.time === pt.time;
            const isHigh = pt.score >= 7.0;
            const isMed = pt.score >= 4.0 && pt.score < 7.0;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer transition-transform duration-200"
              >
                {/* Ping wave for latest active point */}
                {isLast && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="12"
                    fill={isHigh ? 'rgba(239, 68, 68, 0.4)' : isMed ? 'rgba(245, 158, 11, 0.35)' : 'rgba(56, 189, 248, 0.35)'}
                    className="animate-ping"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 7.5 : isLast ? 6 : 4.5}
                  fill={isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#10b981'}
                  stroke="hsl(var(--card))"
                  strokeWidth="2.5"
                  className="transition-all duration-200"
                />

                {/* Score Tag above point */}
                <g transform={`translate(${cx}, ${cy - 12})`}>
                  <rect
                    x="-16"
                    y="-12"
                    width="32"
                    height="14"
                    rx="3"
                    fill="hsl(var(--secondary))"
                    stroke={isHigh ? '#ef4444' : isMed ? '#f59e0b' : '#27272a'}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="-2"
                    textAnchor="middle"
                    className="text-[9.5px] font-mono font-extrabold fill-foreground"
                  >
                    {pt.score.toFixed(1)}
                  </text>
                </g>

                {/* X-Axis Time Stamp */}
                <text
                  x={cx}
                  y={padding.top + innerHeight + 16}
                  textAnchor="middle"
                  className="text-[10px] fill-zinc-400 font-mono font-bold"
                >
                  {pt.time}
                </text>

                {/* Stage Tag below timestamp */}
                <text
                  x={cx}
                  y={padding.top + innerHeight + 29}
                  textAnchor="middle"
                  className={`text-[9px] font-mono font-medium ${
                    isHigh ? 'fill-red-400' : isMed ? 'fill-amber-400' : 'fill-emerald-400'
                  }`}
                >
                  {pt.stage}
                </text>
              </g>
            );
          })}

          {/* Timeline Axis Footer Guide */}
          <text
            x={padding.left + innerWidth / 2}
            y={height - 2}
            textAnchor="middle"
            className="text-[9.5px] font-mono fill-zinc-500 font-bold uppercase tracking-wider"
          >
            ← Live Time Windows Progression (IST) →
          </text>
        </svg>
      </div>

      {/* Floating Hover Tooltip if point hovered */}
      {hoveredPoint && (
        <div className="absolute top-14 right-6 bg-popover/95 border border-border p-2.5 rounded-lg shadow-xl text-xs font-mono backdrop-blur z-20">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-foreground">{hoveredPoint.label}</span>
            <Badge variant="cyber" className="text-[9px] px-1 py-0">{hoveredPoint.time}</Badge>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Risk Score: <span className="font-bold text-foreground">{hoveredPoint.score.toFixed(1)} / 10</span>
          </div>
        </div>
      )}

    </Card>
  );
};
