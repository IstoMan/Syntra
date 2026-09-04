import React, { useMemo, useRef, useState } from 'react';
import { ReplayTimeline } from '../../types';
import { formatClock } from '../../lib/replay';

interface ForecastTimelineChartProps {
  timeline: ReplayTimeline;
  threshold: number;
  onThresholdChange: (value: number) => void;
  cursor: number;
  onCursorChange: (index: number) => void;
}

const WIDTH = 1000;
const HEIGHT = 320;
const PAD = { top: 18, right: 16, bottom: 34, left: 42 };
const INNER_W = WIDTH - PAD.left - PAD.right;
const INNER_H = HEIGHT - PAD.top - PAD.bottom;

/**
 * Windows are plotted on their index rather than wall-clock time: the Friday capture
 * contains a ~4 hour gap that would otherwise swallow most of the axis.
 */
export const ForecastTimelineChart: React.FC<ForecastTimelineChartProps> = ({
  timeline,
  threshold,
  onThresholdChange,
  cursor,
  onCursorChange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const { windows, episodes } = timeline;
  const n = windows.length;

  const x = (index: number) => PAD.left + (n <= 1 ? 0 : (index / (n - 1)) * INNER_W);
  const y = (value: number) => PAD.top + INNER_H - Math.min(1, Math.max(0, value)) * INNER_H;

  const linePath = (accessor: (w: (typeof windows)[number]) => number) =>
    windows.map((w, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(accessor(w)).toFixed(2)}`).join(' ');

  const combinedPath = useMemo(() => linePath((w) => w.combined), [windows]);

  /** Alerts that land in the horizon before an episode start are the ones that matter. */
  const earlyAlerts = useMemo(() => {
    const k = timeline.provenance.horizon_k;
    const hits: number[] = [];
    for (const ep of episodes) {
      for (let i = Math.max(0, ep.start - k); i < ep.start; i += 1) {
        if (windows[i].combined >= threshold) {
          hits.push(i);
          break;
        }
      }
    }
    return hits;
  }, [episodes, windows, threshold, timeline.provenance.horizon_k]);

  /** The single index where the capture jumps forward by hours. */
  const gapIndex = useMemo(() => {
    let at = -1;
    let biggest = 0;
    for (let i = 1; i < n; i += 1) {
      const delta = Date.parse(windows[i].timestamp) - Date.parse(windows[i - 1].timestamp);
      if (delta > biggest) {
        biggest = delta;
        at = i;
      }
    }
    return biggest > 10 * 60 * 1000 ? at : -1;
  }, [windows, n]);

  const clampThreshold = (value: number) =>
    Math.min(0.99, Math.max(0.01, Math.round(value * 100) / 100));

  const indexFromEvent = (event: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return cursor;
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(((ratio * WIDTH - PAD.left) / INNER_W) * (n - 1));
    return Math.min(n - 1, Math.max(0, index));
  };

  const valueFromEvent = (event: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return threshold;
    const rect = svg.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    return clampThreshold(1 - (ratio * HEIGHT - PAD.top) / INNER_H);
  };

  const handleMove = (event: React.PointerEvent) => {
    if (dragging) onThresholdChange(valueFromEvent(event));
    else onCursorChange(indexFromEvent(event));
  };

  const nudgeThreshold = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 0.05 : 0.01;
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault();
      onThresholdChange(clampThreshold(threshold + step));
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault();
      onThresholdChange(clampThreshold(threshold - step));
    }
  };

  const cursorWindow = windows[cursor];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full h-auto select-none touch-none"
      onPointerMove={handleMove}
      onPointerDown={(e) => onCursorChange(indexFromEvent(e))}
      onPointerUp={(e) => {
        if (dragging) svgRef.current?.releasePointerCapture(e.pointerId);
      }}
      onLostPointerCapture={() => setDragging(false)}
    >
      {/* Attack ground truth, drawn first so the score lines sit on top */}
      {episodes.map((ep) => (
        <rect
          key={ep.index}
          x={x(ep.start)}
          y={PAD.top}
          width={Math.max(1.5, x(ep.end) - x(ep.start))}
          height={INNER_H}
          fill="rgba(244, 63, 94, 0.16)"
        />
      ))}

      {/* Y grid */}
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            y1={y(v)}
            x2={PAD.left + INNER_W}
            y2={y(v)}
            stroke="rgba(113,113,122,0.18)"
            strokeDasharray="3 4"
          />
          <text x={PAD.left - 8} y={y(v) + 3.5} textAnchor="end" className="fill-zinc-500 text-[10px] font-mono">
            {v.toFixed(1)}
          </text>
        </g>
      ))}

      {/* Capture discontinuity */}
      {gapIndex > 0 && (
        <g>
          <line
            x1={x(gapIndex)}
            y1={PAD.top}
            x2={x(gapIndex)}
            y2={PAD.top + INNER_H}
            stroke="rgba(161,161,170,0.5)"
            strokeWidth="1"
            strokeDasharray="2 5"
          />
          <text x={x(gapIndex) + 4} y={PAD.top + INNER_H - 6} className="fill-zinc-500 text-[9px] font-mono">
            capture gap
          </text>
        </g>
      )}

      {/* Forecast score */}
      <path d={combinedPath} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinejoin="round" />

      {/* Alerts that beat the attack to the punch */}
      {earlyAlerts.map((i) => (
        <g key={`early-${i}`}>
          <circle cx={x(i)} cy={y(windows[i].combined)} r="5" fill="#10b981" stroke="hsl(var(--card))" strokeWidth="1.5" />
        </g>
      ))}

      {/* Alert threshold: drag the line, or focus it and use the arrow keys. */}
      <g
        role="slider"
        aria-label="Alert threshold"
        aria-valuemin={0.01}
        aria-valuemax={0.99}
        aria-valuenow={threshold}
        tabIndex={0}
        className="cursor-ns-resize focus:outline-none"
        onPointerDown={(e) => {
          e.stopPropagation();
          svgRef.current?.setPointerCapture(e.pointerId);
          setDragging(true);
        }}
        onKeyDown={nudgeThreshold}
      >
        {/* Grab band, wider than the line so it is easy to hit */}
        <rect x={PAD.left} y={y(threshold) - 10} width={INNER_W} height="20" fill="transparent" />
        <line
          x1={PAD.left}
          y1={y(threshold)}
          x2={PAD.left + INNER_W}
          y2={y(threshold)}
          stroke="#f59e0b"
          strokeWidth={dragging ? 2.4 : 1.6}
          strokeDasharray="6 4"
        />
        <text
          x={PAD.left + INNER_W - 50}
          y={y(threshold) - 7}
          textAnchor="end"
          className="fill-amber-400/90 text-[9.5px] font-mono font-bold"
        >
          alert threshold — drag or ↑↓
        </text>
        <g transform={`translate(${PAD.left + INNER_W}, ${y(threshold)})`}>
          <rect x="-44" y="-9" width="44" height="18" rx="4" fill="#f59e0b" />
          <text x="-22" y="4" textAnchor="middle" className="fill-zinc-950 text-[11px] font-mono font-bold">
            {threshold.toFixed(2)}
          </text>
        </g>
      </g>

      {/* Cursor */}
      <line
        x1={x(cursor)}
        y1={PAD.top}
        x2={x(cursor)}
        y2={PAD.top + INNER_H}
        stroke="#e4e4e7"
        strokeWidth="1"
        opacity="0.7"
      />
      <circle
        cx={x(cursor)}
        cy={y(cursorWindow.combined)}
        r="4.5"
        fill="#fafafa"
        stroke="#f43f5e"
        strokeWidth="2"
      />

      {/* X axis: real clock times */}
      {windows
        .filter((_, i) => i % Math.ceil(n / 10) === 0 || i === n - 1)
        .map((w) => (
          <text
            key={w.index}
            x={x(w.index)}
            y={PAD.top + INNER_H + 16}
            textAnchor="middle"
            className="fill-zinc-500 text-[10px] font-mono"
          >
            {formatClock(w.timestamp)}
          </text>
        ))}
      <text
        x={PAD.left + INNER_W / 2}
        y={HEIGHT - 4}
        textAnchor="middle"
        className="fill-zinc-500 text-[9.5px] font-mono uppercase tracking-wider"
      >
        {timeline.provenance.day} test capture · {n} windows · {timeline.episodes.length} attack episodes
      </text>
    </svg>
  );
};
