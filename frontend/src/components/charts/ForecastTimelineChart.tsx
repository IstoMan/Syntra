import React, { useEffect, useMemo, useRef, useState } from "react";
import { ReplayTimeline } from "../../types";
import { formatClock } from "../../lib/replay";

interface ForecastTimelineChartProps {
  timeline: ReplayTimeline;
  threshold: number;
  onThresholdChange: (value: number) => void;
  cursor: number;
  onCursorChange: (index: number) => void;
}

const HEIGHT = 320;
const PAD = { top: 18, right: 56, bottom: 28, left: 42 };
const INNER_H = HEIGHT - PAD.top - PAD.bottom;
/** Plot is 20% wider than the viewport so points open up a little and the chart scrolls. */
const WIDTH_SCALE = 2;

/**
 * Windows are plotted on their index rather than wall-clock time: overnight
 * gaps between held-out day blocks would otherwise swallow the axis.
 */
export const ForecastTimelineChart: React.FC<ForecastTimelineChartProps> = ({
  timeline,
  threshold,
  onThresholdChange,
  cursor,
  onCursorChange,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [containerW, setContainerW] = useState(800);

  const { windows, episodes } = timeline;
  const n = windows.length;

  const innerW = Math.max(1, (containerW - PAD.left - PAD.right) * WIDTH_SCALE);
  const width = PAD.left + PAD.right + innerW;

  const x = (index: number) =>
    PAD.left + (n <= 1 ? 0 : (index / (n - 1)) * innerW);
  const y = (value: number) =>
    PAD.top + INNER_H - Math.min(1, Math.max(0, value)) * INNER_H;

  const combinedPath = useMemo(() => {
    if (n === 0) return "";
    return windows
      .map(
        (w, i) =>
          `${i === 0 ? "M" : "L"} ${x(i).toFixed(2)} ${y(w.combined).toFixed(2)}`,
      )
      .join(" ");
  }, [windows, innerW, n]);

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

  /** Day (or capture) boundaries — jumps of more than ten minutes. */
  const gapIndices = useMemo(() => {
    const gaps: number[] = [];
    for (let i = 1; i < n; i += 1) {
      const delta =
        Date.parse(windows[i].timestamp) - Date.parse(windows[i - 1].timestamp);
      if (delta > 10 * 60 * 1000) gaps.push(i);
    }
    return gaps;
  }, [windows, n]);

  const tickEvery = Math.max(1, Math.ceil(n / 12));

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (event.shiftKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX))
        return;
      el.scrollLeft += event.deltaY;
      event.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || n <= 1) return;
    const cx = x(cursor);
    const view = el.clientWidth;
    const margin = Math.min(120, view * 0.22);
    if (
      cx - PAD.left < el.scrollLeft + margin ||
      cx > el.scrollLeft + view - margin
    ) {
      el.scrollTo({ left: Math.max(0, cx - view * 0.4) });
    }
  }, [cursor, width, n]);

  const clampThreshold = (value: number) =>
    Math.min(0.99, Math.max(0.01, Math.round(value * 100) / 100));

  const indexFromEvent = (event: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return cursor;
    const rect = svg.getBoundingClientRect();
    const xPos = ((event.clientX - rect.left) / rect.width) * width;
    const index = Math.round(((xPos - PAD.left) / innerW) * (n - 1));
    return Math.min(n - 1, Math.max(0, index));
  };

  const valueFromEvent = (event: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return threshold;
    const rect = svg.getBoundingClientRect();
    const yPos = ((event.clientY - rect.top) / rect.height) * HEIGHT;
    return clampThreshold(1 - (yPos - PAD.top) / INNER_H);
  };

  const handleMove = (event: React.PointerEvent) => {
    if (dragging) onThresholdChange(valueFromEvent(event));
    else onCursorChange(indexFromEvent(event));
  };

  const nudgeThreshold = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 0.05 : 0.01;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
      event.preventDefault();
      onThresholdChange(clampThreshold(threshold + step));
    } else if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
      event.preventDefault();
      onThresholdChange(clampThreshold(threshold - step));
    }
  };

  const cursorWindow = windows[cursor];

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 [scrollbar-width:thin] [scrollbar-color:rgba(161,161,170,0.75)_transparent]"
      >
        <svg
          ref={svgRef}
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="block max-w-none select-none touch-none"
          onPointerMove={handleMove}
          onPointerDown={(e) => onCursorChange(indexFromEvent(e))}
          onPointerUp={(e) => {
            if (dragging) svgRef.current?.releasePointerCapture(e.pointerId);
          }}
          onLostPointerCapture={() => setDragging(false)}
        >
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

          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
            <line
              key={v}
              x1={PAD.left}
              y1={y(v)}
              x2={PAD.left + innerW}
              y2={y(v)}
              stroke="rgba(113,113,122,0.18)"
              strokeDasharray="3 4"
            />
          ))}

          {gapIndices.map((at) => (
            <g key={`gap-${at}`}>
              <line
                x1={x(at)}
                y1={PAD.top}
                x2={x(at)}
                y2={PAD.top + INNER_H}
                stroke="rgba(161,161,170,0.5)"
                strokeWidth="1"
                strokeDasharray="2 5"
              />
              <text
                x={x(at) + 6}
                y={PAD.top + INNER_H - 6}
                className="fill-zinc-500 text-[9px] font-mono"
              >
                {formatClock(windows[at].timestamp)}
              </text>
            </g>
          ))}

          <path
            d={combinedPath}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {earlyAlerts.map((i) => (
            <g key={`early-${i}`}>
              <circle
                cx={x(i)}
                cy={y(windows[i].combined)}
                r="4.5"
                fill="#10b981"
                stroke="hsl(var(--card))"
                strokeWidth="1.5"
              />
            </g>
          ))}

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
            <rect
              x={PAD.left}
              y={y(threshold) - 10}
              width={innerW}
              height="20"
              fill="transparent"
            />
            <line
              x1={PAD.left}
              y1={y(threshold)}
              x2={PAD.left + innerW}
              y2={y(threshold)}
              stroke="#f59e0b"
              strokeWidth={dragging ? 2.4 : 1.6}
              strokeDasharray="6 4"
            />
          </g>

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

          {windows
            .filter((_, i) => i % tickEvery === 0 || i === n - 1)
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
        </svg>
      </div>

      {/* Sticky y-axis so labels stay put while the plot scrolls. */}
      <div className="pointer-events-none absolute left-0 top-0 z-[1] h-[320px] w-[42px] bg-card">
        <svg width={42} height={HEIGHT} aria-hidden="true">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
            <text
              key={v}
              x={34}
              y={y(v) + 3.5}
              textAnchor="end"
              className="fill-zinc-500 text-[10px] font-mono"
            >
              {v.toFixed(1)}
            </text>
          ))}
        </svg>
      </div>

      {/* Threshold readout stays in the visible viewport, not at the far end of the plot. */}
      <div
        className="pointer-events-none absolute right-1 z-[1] flex flex-col items-end gap-0.5"
        style={{ top: Math.max(4, y(threshold) - 22) }}
      >
        <span className="text-[9.5px] font-mono font-bold text-amber-400/90">
          alert threshold — drag or ↑↓
        </span>
        <span className="rounded bg-amber-400 px-1.5 py-0.5 font-mono text-[11px] font-bold text-zinc-950">
          {threshold.toFixed(2)}
        </span>
      </div>
    </div>
  );
};
