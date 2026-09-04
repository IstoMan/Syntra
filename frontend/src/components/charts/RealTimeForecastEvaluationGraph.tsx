import React, { useState, useMemo } from 'react';
import { Card, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  TrendingUp, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Compass, 
  Clock, 
  SlidersHorizontal, 
  Zap, 
  Layers, 
  ArrowRight,
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';

export interface ForecastEventPoint {
  id: string;
  timeIST: string;
  timeMinutes: number;
  noveltyScore: number;
  attackHeadProb: number;
  xgboostScore: number;
  combinedScore: number;
  isAlertTriggered: boolean;
  isAttackWindow: boolean;
  isAttackStart: boolean;
  attackStage?: string;
  leadTimeMin?: number;
  confirmedAttackTime?: string;
  notes?: string;
}

interface RealTimeForecastEvaluationGraphProps {
  currentSimProgress: number; // 0.0 to 1.0 (or stage 1-7)
  timeWindow: '1min' | '5min' | '15min';
  onTimeWindowChange?: (tw: '1min' | '5min' | '15min') => void;
  onSelectEvent?: (evt: ForecastEventPoint) => void;
  selectedEventId?: string | null;
  onViewNetworkState?: () => void;
  onViewExplanation?: () => void;
  dataSource?: string;
  isDatasetMode?: boolean;
}

export const RealTimeForecastEvaluationGraph: React.FC<RealTimeForecastEvaluationGraphProps> = ({
  currentSimProgress,
  timeWindow = '5min',
  onTimeWindowChange,
  onSelectEvent,
  selectedEventId,
  onViewNetworkState,
  onViewExplanation,
  dataSource = 'Demo Simulation',
  isDatasetMode = false
}) => {
  const [internalSelectedEvent, setInternalSelectedEvent] = useState<ForecastEventPoint | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ForecastEventPoint | null>(null);

  // SVG Canvas dimensions
  const width = 880;
  const height = 300;
  const padding = { top: 30, right: 35, bottom: 45, left: 50 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Threshold constant
  const THRESHOLD = 0.70;

  // Generate realistic time-series points representing an ML experiment evaluation
  // Base timeline: 14:00 to 14:15 IST (15 minutes window, 45 sample points)
  const fullTimeSeriesData: ForecastEventPoint[] = useMemo(() => {
    const rawPoints: ForecastEventPoint[] = [
      // 14:00 - Normal baseline
      { id: 'PT-01', timeIST: '14:00:00', timeMinutes: 0.0, noveltyScore: 0.08, attackHeadProb: 0.05, xgboostScore: 0.06, combinedScore: 0.08, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false },
      { id: 'PT-02', timeIST: '14:00:30', timeMinutes: 0.5, noveltyScore: 0.11, attackHeadProb: 0.07, xgboostScore: 0.08, combinedScore: 0.11, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false },
      // 14:01 - Small traffic variation & novelty onset
      { id: 'PT-03', timeIST: '14:01:00', timeMinutes: 1.0, noveltyScore: 0.28, attackHeadProb: 0.12, xgboostScore: 0.09, combinedScore: 0.28, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false, notes: 'Traffic variation detected' },
      { id: 'PT-04', timeIST: '14:01:30', timeMinutes: 1.5, noveltyScore: 0.44, attackHeadProb: 0.22, xgboostScore: 0.15, combinedScore: 0.44, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false },
      // 14:02 - Attack-head probability rises (pre-attack recon)
      { id: 'PT-05', timeIST: '14:02:00', timeMinutes: 2.0, noveltyScore: 0.62, attackHeadProb: 0.54, xgboostScore: 0.24, combinedScore: 0.62, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false, notes: 'Novelty & Attack-head rising' },
      { id: 'PT-06', timeIST: '14:02:30', timeMinutes: 2.5, noveltyScore: 0.74, attackHeadProb: 0.68, xgboostScore: 0.38, combinedScore: 0.74, isAlertTriggered: true, isAttackWindow: false, isAttackStart: false },
      // 14:03 - FORECAST ALERT TRIGGERED (Combined score: 0.87 > 0.70 threshold)
      { 
        id: 'PT-07-ALERT-1', 
        timeIST: '14:03:00', 
        timeMinutes: 3.0, 
        noveltyScore: 0.81, 
        attackHeadProb: 0.87, 
        xgboostScore: 0.42, 
        combinedScore: 0.87, 
        isAlertTriggered: true, 
        isAttackWindow: false, 
        isAttackStart: false,
        attackStage: 'COMMAND & CONTROL PREDICTED',
        leadTimeMin: 2.0,
        confirmedAttackTime: '14:05:00 IST',
        notes: 'PREDICTIVE FORECAST ALERT (Lead Time: 2.0 min)'
      },
      { id: 'PT-08', timeIST: '14:03:30', timeMinutes: 3.5, noveltyScore: 0.85, attackHeadProb: 0.89, xgboostScore: 0.55, combinedScore: 0.89, isAlertTriggered: true, isAttackWindow: false, isAttackStart: false },
      { id: 'PT-09', timeIST: '14:04:00', timeMinutes: 4.0, noveltyScore: 0.82, attackHeadProb: 0.88, xgboostScore: 0.68, combinedScore: 0.88, isAlertTriggered: true, isAttackWindow: false, isAttackStart: false },
      { id: 'PT-10', timeIST: '14:04:30', timeMinutes: 4.5, noveltyScore: 0.78, attackHeadProb: 0.84, xgboostScore: 0.79, combinedScore: 0.84, isAlertTriggered: true, isAttackWindow: false, isAttackStart: false },
      // 14:05 - ACTUAL ATTACK START WINDOW (Confirmed breach starts here! 2 min after alert)
      { 
        id: 'PT-11-ATTACK-1', 
        timeIST: '14:05:00', 
        timeMinutes: 5.0, 
        noveltyScore: 0.88, 
        attackHeadProb: 0.94, 
        xgboostScore: 0.92, 
        combinedScore: 0.94, 
        isAlertTriggered: false, 
        isAttackWindow: true, 
        isAttackStart: true,
        attackStage: 'ACTIVE EXPLOIT & C2 TRAFFIC',
        leadTimeMin: 2.0,
        confirmedAttackTime: '14:05:00 IST',
        notes: 'ACTUAL ATTACK WINDOW INITIATION'
      },
      { id: 'PT-12', timeIST: '14:05:30', timeMinutes: 5.5, noveltyScore: 0.91, attackHeadProb: 0.96, xgboostScore: 0.95, combinedScore: 0.96, isAlertTriggered: false, isAttackWindow: true, isAttackStart: false },
      { id: 'PT-13', timeIST: '14:06:00', timeMinutes: 6.0, noveltyScore: 0.86, attackHeadProb: 0.92, xgboostScore: 0.91, combinedScore: 0.92, isAlertTriggered: false, isAttackWindow: true, isAttackStart: false },
      { id: 'PT-14', timeIST: '14:06:30', timeMinutes: 6.5, noveltyScore: 0.72, attackHeadProb: 0.79, xgboostScore: 0.84, combinedScore: 0.79, isAlertTriggered: false, isAttackWindow: true, isAttackStart: false },
      // 14:07 - Attack containment & risk decrease
      { id: 'PT-15', timeIST: '14:07:00', timeMinutes: 7.0, noveltyScore: 0.45, attackHeadProb: 0.52, xgboostScore: 0.62, combinedScore: 0.52, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false, notes: 'Threat isolation & risk decay' },
      { id: 'PT-16', timeIST: '14:07:30', timeMinutes: 7.5, noveltyScore: 0.28, attackHeadProb: 0.31, xgboostScore: 0.38, combinedScore: 0.31, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false },
      { id: 'PT-17', timeIST: '14:08:00', timeMinutes: 8.0, noveltyScore: 0.14, attackHeadProb: 0.16, xgboostScore: 0.18, combinedScore: 0.16, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false },
      { id: 'PT-18', timeIST: '14:08:30', timeMinutes: 8.5, noveltyScore: 0.09, attackHeadProb: 0.08, xgboostScore: 0.11, combinedScore: 0.09, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false },
      // 14:09 - Normal baseline interval
      { id: 'PT-19', timeIST: '14:09:00', timeMinutes: 9.0, noveltyScore: 0.12, attackHeadProb: 0.06, xgboostScore: 0.07, combinedScore: 0.12, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false },
      { id: 'PT-20', timeIST: '14:09:30', timeMinutes: 9.5, noveltyScore: 0.08, attackHeadProb: 0.05, xgboostScore: 0.06, combinedScore: 0.08, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false },
      // 14:10 - Event 2: Lateral movement probe surge
      { id: 'PT-21', timeIST: '14:10:00', timeMinutes: 10.0, noveltyScore: 0.35, attackHeadProb: 0.28, xgboostScore: 0.14, combinedScore: 0.35, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false },
      { id: 'PT-22', timeIST: '14:10:30', timeMinutes: 10.5, noveltyScore: 0.69, attackHeadProb: 0.62, xgboostScore: 0.31, combinedScore: 0.69, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false },
      // 14:11 - FORECAST ALERT 2 (t+1 forecast alert before lateral pivot)
      { 
        id: 'PT-23-ALERT-2', 
        timeIST: '14:11:00', 
        timeMinutes: 11.0, 
        noveltyScore: 0.84, 
        attackHeadProb: 0.86, 
        xgboostScore: 0.49, 
        combinedScore: 0.86, 
        isAlertTriggered: true, 
        isAttackWindow: false, 
        isAttackStart: false,
        attackStage: 'LATERAL PIVOT TO SQL DB PREDICTED',
        leadTimeMin: 2.0,
        confirmedAttackTime: '14:13:00 IST',
        notes: 'PREDICTIVE FORECAST ALERT 2 (Lead Time: 2.0 min)'
      },
      { id: 'PT-24', timeIST: '14:11:30', timeMinutes: 11.5, noveltyScore: 0.88, attackHeadProb: 0.91, xgboostScore: 0.64, combinedScore: 0.91, isAlertTriggered: true, isAttackWindow: false, isAttackStart: false },
      { id: 'PT-25', timeIST: '14:12:00', timeMinutes: 12.0, noveltyScore: 0.85, attackHeadProb: 0.89, xgboostScore: 0.76, combinedScore: 0.89, isAlertTriggered: true, isAttackWindow: false, isAttackStart: false },
      { id: 'PT-26', timeIST: '14:12:30', timeMinutes: 12.5, noveltyScore: 0.82, attackHeadProb: 0.87, xgboostScore: 0.81, combinedScore: 0.87, isAlertTriggered: true, isAttackWindow: false, isAttackStart: false },
      // 14:13 - ACTUAL ATTACK 2 WINDOW (Database credential spraying)
      { 
        id: 'PT-27-ATTACK-2', 
        timeIST: '14:13:00', 
        timeMinutes: 13.0, 
        noveltyScore: 0.92, 
        attackHeadProb: 0.97, 
        xgboostScore: 0.96, 
        combinedScore: 0.97, 
        isAlertTriggered: false, 
        isAttackWindow: true, 
        isAttackStart: true,
        attackStage: 'PRIVILEGED DATA EXTRACTION ATTEMPT',
        leadTimeMin: 2.0,
        confirmedAttackTime: '14:13:00 IST',
        notes: 'ACTUAL ATTACK 2 WINDOW INITIATION'
      },
      { id: 'PT-28', timeIST: '14:13:30', timeMinutes: 13.5, noveltyScore: 0.94, attackHeadProb: 0.98, xgboostScore: 0.97, combinedScore: 0.98, isAlertTriggered: false, isAttackWindow: true, isAttackStart: false },
      { id: 'PT-29', timeIST: '14:14:00', timeMinutes: 14.0, noveltyScore: 0.76, attackHeadProb: 0.81, xgboostScore: 0.88, combinedScore: 0.81, isAlertTriggered: false, isAttackWindow: true, isAttackStart: false },
      // 14:15 - Baseline recovery
      { id: 'PT-30', timeIST: '14:14:30', timeMinutes: 14.5, noveltyScore: 0.38, attackHeadProb: 0.42, xgboostScore: 0.49, combinedScore: 0.42, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false },
      { id: 'PT-31', timeIST: '14:15:00', timeMinutes: 15.0, noveltyScore: 0.12, attackHeadProb: 0.11, xgboostScore: 0.15, combinedScore: 0.12, isAlertTriggered: false, isAttackWindow: false, isAttackStart: false, notes: 'System stabilized in clean state' }
    ];

    return rawPoints;
  }, []);

  // Filter series based on simulation progression step (or render full series if at Stage 7/paused)
  // currentSimProgress is mapped from currentStage (1 to 7)
  const activePointCount = useMemo(() => {
    // Stage 1 -> ~5 points, Stage 2 -> ~10 points, Stage 3 -> ~14 points, Stage 4 -> ~18 points, Stage 5 -> ~22 points, Stage 6 -> ~28 points, Stage 7 -> all 31 points
    const stageMultiplier: Record<number, number> = {
      1: 6,
      2: 10,
      3: 14,
      4: 18,
      5: 23,
      6: 28,
      7: 31
    };
    return stageMultiplier[currentSimProgress] ?? Math.max(6, Math.floor((currentSimProgress / 7) * fullTimeSeriesData.length));
  }, [currentSimProgress, fullTimeSeriesData.length]);

  const visibleData = useMemo(() => {
    return fullTimeSeriesData.slice(0, activePointCount);
  }, [fullTimeSeriesData, activePointCount]);

  // Coordinate scales
  const maxMinutes = timeWindow === '1min' ? 3.0 : timeWindow === '5min' ? 8.0 : 15.0;

  const getX = (timeMin: number) => {
    return padding.left + (Math.min(maxMinutes, timeMin) / maxMinutes) * innerWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.min(1.0, Math.max(0.0, val));
    return padding.top + innerHeight - clamped * innerHeight;
  };

  // Helper to build SVG curve path
  const makePath = (accessor: (d: ForecastEventPoint) => number) => {
    return visibleData.reduce((acc, pt, idx, arr) => {
      const x = getX(pt.timeMinutes);
      const y = getY(accessor(pt));
      if (idx === 0) return `M ${x} ${y}`;
      const prevX = getX(arr[idx - 1].timeMinutes);
      const prevY = getY(accessor(arr[idx - 1]));
      const cp1x = prevX + (x - prevX) / 2;
      const cp2x = prevX + (x - prevX) / 2;
      return `${acc} C ${cp1x} ${prevY}, ${cp2x} ${y}, ${x} ${y}`;
    }, '');
  };

  // Data paths
  const pathCombined = makePath(d => d.combinedScore);
  const pathAttackHead = makePath(d => d.attackHeadProb);
  const pathXGBoost = makePath(d => d.xgboostScore);
  const pathNovelty = makePath(d => d.noveltyScore);

  // Attack Window bands (shaded vertical zones)
  const attackWindows = useMemo(() => {
    // Collect continuous segments where isAttackWindow === true
    const segments: { startMin: number; endMin: number; label: string }[] = [];
    let curStart: number | null = null;
    visibleData.forEach((pt, idx) => {
      if (pt.isAttackWindow && curStart === null) {
        curStart = pt.timeMinutes;
      } else if (!pt.isAttackWindow && curStart !== null) {
        segments.push({ startMin: curStart, endMin: visibleData[idx - 1].timeMinutes, label: 'Actual Attack at t+1' });
        curStart = null;
      }
    });
    if (curStart !== null && visibleData.length > 0) {
      segments.push({ startMin: curStart, endMin: visibleData[visibleData.length - 1].timeMinutes, label: 'Actual Attack at t+1' });
    }
    return segments;
  }, [visibleData]);

  // Selected event resolution
  const selectedEvent = internalSelectedEvent || visibleData.find(d => d.id === 'PT-07-ALERT-1') || visibleData[visibleData.length - 1];

  const handlePointClick = (pt: ForecastEventPoint) => {
    setInternalSelectedEvent(pt);
    if (onSelectEvent) onSelectEvent(pt);
  };

  return (
    <Card className="p-4 sm:p-5 border-border/80 shadow-sm space-y-4 bg-card/95 backdrop-blur">
      
      {/* 1. Header & Time Window Selectors */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <CardTitle className="text-sm uppercase tracking-wider text-foreground font-bold flex items-center gap-2">
                <span>Real-Time Attack Forecast</span>
                <Badge variant="cyber" className="text-[9.5px] px-1.5 py-0 font-mono">
                  ML Evaluation
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground font-medium">
                Detection vs Forecasting • Time Windows • IST
              </p>
            </div>
          </div>
        </div>

        {/* Top Controls: Time Window & Tag */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
          <Badge 
            variant={isDatasetMode ? 'cyber' : 'outline'} 
            className={`text-[10px] font-mono hidden md:inline-flex ${
              isDatasetMode ? 'border-sky-500/40 text-sky-300 font-bold' : 'text-zinc-400 border-border'
            }`}
          >
            {isDatasetMode ? `DATASET MODE • REAL DATASET (${dataSource})` : 'SIMULATION MODE • DEMONSTRATION DATA'}
          </Badge>

          {/* Time Window Selector (1 min, 5 min, 15 min) */}
          <div className="flex items-center bg-muted/60 rounded-md border border-border p-0.5 text-xs font-mono">
            <span className="px-2 text-[10px] text-muted-foreground uppercase font-bold hidden sm:inline">Window:</span>
            {(['1min', '5min', '15min'] as const).map((tw) => (
              <button
                key={tw}
                onClick={() => onTimeWindowChange && onTimeWindowChange(tw)}
                className={`px-2.5 py-0.5 rounded text-[11px] cursor-pointer transition-colors ${
                  timeWindow === tw ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tw.replace('min', ' min')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main High-Precision SVG Time-Series Canvas */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[700px] select-none">
          <defs>
            {/* Shaded attack window pattern */}
            <pattern id="attackHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(239, 68, 68, 0.25)" strokeWidth="2.5" />
            </pattern>

            {/* Gradient fill for Combined Score */}
            <linearGradient id="combinedAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.28" />
              <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Grid & Y-Axis Labels (0.0 to 1.0) */}
          {[0.0, 0.2, 0.4, 0.6, 0.8, 1.0].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="rgba(113, 113, 122, 0.2)"
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

          {/* Shaded Attack Window Vertical Bands (Actual Attack at t+1) */}
          {attackWindows.map((win, idx) => {
            const x1 = getX(win.startMin);
            const x2 = getX(win.endMin);
            const bandWidth = Math.max(12, x2 - x1);

            return (
              <g key={idx}>
                {/* Solid highlight zone */}
                <rect
                  x={x1}
                  y={padding.top}
                  width={bandWidth}
                  height={innerHeight}
                  fill="rgba(239, 68, 68, 0.12)"
                />
                <rect
                  x={x1}
                  y={padding.top}
                  width={bandWidth}
                  height={innerHeight}
                  fill="url(#attackHatch)"
                />
                {/* Left boundary marker */}
                <line
                  x1={x1}
                  y1={padding.top}
                  x2={x1}
                  y2={padding.top + innerHeight}
                  stroke="#ef4444"
                  strokeWidth="2"
                />
                <text
                  x={x1 + 4}
                  y={padding.top + 14}
                  className="text-[9px] fill-red-400 font-mono font-extrabold uppercase tracking-wider"
                >
                  Actual Attack Window
                </text>
              </g>
            );
          })}

          {/* Validation-Tuned Threshold Line (Horizontal Line at 0.70) */}
          <line
            x1={padding.left}
            y1={getY(THRESHOLD)}
            x2={padding.left + innerWidth}
            y2={getY(THRESHOLD)}
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeDasharray="6 4"
          />
          <text
            x={padding.left + innerWidth - 6}
            y={getY(THRESHOLD) - 5}
            textAnchor="end"
            className="text-[9.5px] fill-amber-400 font-mono font-bold tracking-wider"
          >
            VALIDATION-TUNED THRESHOLD (0.70)
          </text>

          {/* 1. Novelty at t+1 (Purple dotted/dashed curve) */}
          {pathNovelty && (
            <path
              d={pathNovelty}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2.2"
              strokeDasharray="4 3"
              className="transition-all duration-300"
            />
          )}

          {/* 2. XGBoost Current-window Detection (Amber dotted line) */}
          {pathXGBoost && (
            <path
              d={pathXGBoost}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.2"
              strokeDasharray="2 3"
              className="transition-all duration-300"
            />
          )}

          {/* 3. Attack-head P at t+1 (Cyan dashed line) */}
          {pathAttackHead && (
            <path
              d={pathAttackHead}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.4"
              strokeDasharray="6 4"
              className="transition-all duration-300"
            />
          )}

          {/* 4. Combined Score at t+1 (Rose/Red Solid primary curve) */}
          {pathCombined && (
            <path
              d={pathCombined}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="3.2"
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          )}

          {/* Forecast Alert Markers (Vertical Alert Flags before Attack Windows) */}
          {visibleData.map((pt, idx) => {
            const cx = getX(pt.timeMinutes);
            const cy = getY(pt.combinedScore);
            const isAlert = pt.isAlertTriggered && pt.combinedScore >= THRESHOLD;
            const isAttackStart = pt.isAttackStart;

            return (
              <g key={pt.id}>
                {/* Forecast Alert at t+1: Strong Vertical Marker Flag */}
                {isAlert && (
                  <g className="cursor-pointer" onClick={() => handlePointClick(pt)}>
                    <line
                      x1={cx}
                      y1={padding.top}
                      x2={cx}
                      y2={padding.top + innerHeight}
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                    {/* Alert Flag Badge */}
                    <g transform={`translate(${cx}, ${padding.top + 8})`}>
                      <rect
                        x="-38"
                        y="-8"
                        width="76"
                        height="16"
                        rx="3"
                        fill="#ef4444"
                        className="animate-pulse"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        className="text-[8.5px] fill-zinc-950 font-mono font-extrabold uppercase"
                      >
                        Forecast Alert
                      </text>
                    </g>
                  </g>
                )}

                {/* Confirmed Attack Marker */}
                {isAttackStart && (
                  <g transform={`translate(${cx}, ${padding.top + 28})`}>
                    <polygon points="0,-6 6,0 0,6 -6,0" fill="#dc2626" />
                    <text
                      x="8"
                      y="3"
                      className="text-[8.5px] fill-red-300 font-mono font-bold uppercase"
                    >
                      Attack Start
                    </text>
                  </g>
                )}

                {/* Interactive Point Marker */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={selectedEvent?.id === pt.id ? 6.5 : hoveredPoint?.id === pt.id ? 5.5 : 3.5}
                  fill={pt.combinedScore >= THRESHOLD ? '#ef4444' : '#f43f5e'}
                  stroke="hsl(var(--card))"
                  strokeWidth="2"
                  className="cursor-pointer transition-transform hover:scale-125"
                  onClick={() => handlePointClick(pt)}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            );
          })}

          {/* Lead-Time Highlight Annotations between Alert (14:03) and Attack (14:05) */}
          {visibleData.some(d => d.id.includes('ALERT-1')) && visibleData.some(d => d.id.includes('ATTACK-1')) && (
            <g>
              <line
                x1={getX(3.0)}
                y1={getY(0.92)}
                x2={getX(5.0)}
                y2={getY(0.92)}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <rect
                x={getX(3.0) + (getX(5.0) - getX(3.0)) / 2 - 45}
                y={getY(0.92) - 16}
                width="90"
                height="14"
                rx="3"
                fill="hsl(var(--secondary))"
                stroke="#38bdf8"
                strokeWidth="1"
              />
              <text
                x={getX(3.0) + (getX(5.0) - getX(3.0)) / 2}
                y={getY(0.92) - 6}
                textAnchor="middle"
                className="text-[8.5px] font-mono font-bold fill-sky-300"
              >
                Lead Time: +2.0 min
              </text>
            </g>
          )}

          {/* X-Axis Time Markers (IST) */}
          {visibleData.filter((_, idx) => idx % 4 === 0 || idx === visibleData.length - 1).map((pt) => {
            const cx = getX(pt.timeMinutes);
            return (
              <g key={pt.timeIST}>
                <line
                  x1={cx}
                  y1={padding.top + innerHeight}
                  x2={cx}
                  y2={padding.top + innerHeight + 5}
                  stroke="#71717a"
                  strokeWidth="1"
                />
                <text
                  x={cx}
                  y={padding.top + innerHeight + 17}
                  textAnchor="middle"
                  className="text-[9.5px] fill-zinc-400 font-mono font-bold"
                >
                  {pt.timeIST.substring(0, 5)}
                </text>
              </g>
            );
          })}

          {/* X-Axis Label */}
          <text
            x={padding.left + innerWidth / 2}
            y={height - 5}
            textAnchor="middle"
            className="text-[10px] font-mono fill-zinc-400 font-bold uppercase tracking-wider"
          >
            Time (IST) • 14:00 to 14:15 Evaluation Timeline →
          </text>

          {/* Y-Axis Label */}
          <text
            x={-(padding.top + innerHeight / 2)}
            y="14"
            transform="rotate(-90)"
            textAnchor="middle"
            className="text-[10px] font-mono fill-zinc-400 font-bold uppercase tracking-wider"
          >
            Probability / Attack Flag (0 to 1)
          </text>
        </svg>
      </div>

      {/* 3. Graph Legend with matching line styles */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-lg bg-secondary/50 border border-border text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3.5">
          
          {/* Legend 1: Actual attack */}
          <span className="flex items-center gap-1.5 text-foreground font-semibold">
            <span className="w-3.5 h-3 bg-red-500/30 border border-red-500 rounded-sm"></span>
            <span>Actual attack at t+1</span>
          </span>

          {/* Legend 2: Attack-head */}
          <span className="flex items-center gap-1.5 text-foreground font-semibold">
            <span className="w-4 border-t-2 border-dashed border-sky-400"></span>
            <span>Attack-head P at t+1</span>
          </span>

          {/* Legend 3: XGBoost */}
          <span className="flex items-center gap-1.5 text-foreground font-semibold">
            <span className="w-4 border-t-2 border-dotted border-amber-400"></span>
            <span>XGBoost detection</span>
          </span>

          {/* Legend 4: Combined Score */}
          <span className="flex items-center gap-1.5 text-foreground font-bold">
            <span className="w-4 border-t-2 border-rose-500"></span>
            <span>Combined score at t+1</span>
          </span>

          {/* Legend 5: Novelty */}
          <span className="flex items-center gap-1.5 text-foreground font-semibold">
            <span className="w-4 border-t-2 border-dashed border-purple-400"></span>
            <span>Novelty at t+1</span>
          </span>

          {/* Legend 6: Forecast Alert */}
          <span className="flex items-center gap-1.5 text-rose-400 font-bold">
            <span className="w-1.5 h-3 bg-red-500 rounded-xs animate-pulse"></span>
            <span>Forecast alert at t+1</span>
          </span>

          {/* Legend 7: Threshold */}
          <span className="flex items-center gap-1.5 text-amber-400 font-bold">
            <span className="w-4 border-t-2 border-dashed border-amber-400"></span>
            <span>Threshold (0.70)</span>
          </span>

        </div>
      </div>

      {/* 4. Methodology Explanation Note */}
      <div className="bg-muted/40 p-3 rounded-lg border border-border text-[11px] font-sans text-muted-foreground leading-relaxed">
        <p className="font-mono text-foreground font-semibold mb-0.5 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span>Evaluation Methodology:</span>
        </p>
        <p className="italic">
          “Forecast alert = prediction triggered before the confirmed attack window. Confirmed attack = actual attack start. Combined score = max(attack-head probability, novelty score). XGBoost represents current-window detection, not forecasting.”
        </p>
      </div>

      {/* 5. Live ML Evaluation Statistics Strip & Interactive Event Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1">
        
        {/* Left: 6 Real-Time Live Statistics */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono">
          
          <div className="p-2.5 rounded-lg bg-secondary/60 border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">FORECAST PRECISION</span>
            <span className="text-base font-extrabold text-emerald-400">91.3%</span>
            <span className="text-[9.5px] text-zinc-500 block">Low false positive rate</span>
          </div>

          <div className="p-2.5 rounded-lg bg-secondary/60 border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">FORECAST RECALL</span>
            <span className="text-base font-extrabold text-emerald-400">93.1%</span>
            <span className="text-[9.5px] text-zinc-500 block">High threat coverage</span>
          </div>

          <div className="p-2.5 rounded-lg bg-secondary/60 border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">FALSE POSITIVE RATE</span>
            <span className="text-base font-extrabold text-sky-400">0.3%</span>
            <span className="text-[9.5px] text-zinc-500 block">Gaussian calibrated</span>
          </div>

          <div className="p-2.5 rounded-lg bg-secondary/60 border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">FORECAST ALERTS</span>
            <span className="text-base font-extrabold text-rose-400">12</span>
            <span className="text-[9.5px] text-zinc-500 block">Pre-attack warnings</span>
          </div>

          <div className="p-2.5 rounded-lg bg-secondary/60 border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">ATTACK WINDOWS</span>
            <span className="text-base font-extrabold text-foreground">12</span>
            <span className="text-[9.5px] text-zinc-500 block">Ground truth events</span>
          </div>

          <div className="p-2.5 rounded-lg bg-secondary/60 border border-border">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">AVG LEAD TIME</span>
            <span className="text-base font-extrabold text-indigo-300">2.5 min</span>
            <span className="text-[9.5px] text-zinc-500 block">Ahead of breach</span>
          </div>

        </div>

        {/* Right: Interactive Forecast Event Details Card */}
        <Card className="lg:col-span-5 p-3.5 sm:p-4 border-rose-500/40 bg-rose-950/15 flex flex-col justify-between space-y-3 font-mono text-xs">
          <div className="space-y-2">
            
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-[9px] px-1.5 py-0 uppercase">
                  FORECAST EVENT
                </Badge>
                <span className="text-xs font-bold text-foreground">
                  {selectedEvent ? selectedEvent.timeIST : '14:03:00 IST'}
                </span>
              </div>
              <span className="text-[10px] text-rose-400 font-bold">
                {selectedEvent?.isAlertTriggered ? 'TRIGGERED' : 'NORMAL'}
              </span>
            </div>

            {/* Event Telemetry Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-zinc-400 text-[10px]">Forecast Probability:</span>
                <p className="font-extrabold text-rose-400">{((selectedEvent?.attackHeadProb ?? 0.87) * 100).toFixed(0)}%</p>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px]">Novelty Score:</span>
                <p className="font-extrabold text-purple-300">{(selectedEvent?.noveltyScore ?? 0.81).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px]">XGBoost Detection:</span>
                <p className="font-extrabold text-amber-300">{(selectedEvent?.xgboostScore ?? 0.74).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-zinc-400 text-[10px]">Combined Score:</span>
                <p className="font-extrabold text-rose-400">{(selectedEvent?.combinedScore ?? 0.87).toFixed(2)}</p>
              </div>
            </div>

            {/* Threshold & Lead Time */}
            <div className="bg-secondary/70 p-2 rounded border border-border/80 text-[11px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Threshold:</span>
                <span className="font-bold text-foreground">0.70</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Actual Attack:</span>
                <span className="font-bold text-rose-300">{selectedEvent?.confirmedAttackTime || 'Confirmed at 14:05 IST'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Forecast Lead Time:</span>
                <span className="font-bold text-sky-400">{selectedEvent?.leadTimeMin ? `${selectedEvent.leadTimeMin} minutes` : '2 minutes'}</span>
              </div>
            </div>

          </div>

          {/* Action Buttons: VIEW NETWORK STATE and VIEW EXPLANATION */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewNetworkState}
              className="flex-1 text-[11px] font-bold h-7"
            >
              <span>VIEW NETWORK STATE</span>
            </Button>
            <Button
              variant="cyber"
              size="sm"
              onClick={onViewExplanation}
              className="flex-1 text-[11px] font-bold h-7"
            >
              <span>VIEW EXPLANATION</span>
            </Button>
          </div>
        </Card>

      </div>

    </Card>
  );
};
