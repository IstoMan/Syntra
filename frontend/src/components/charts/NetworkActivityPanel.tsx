import React, { useMemo } from 'react';
import { ReplayFeatureMeta, ReplayTimeline } from '../../types';
import { compareToBenign, formatFeatureValue } from '../../lib/replay';
import { Card } from '../ui/card';

interface NetworkActivityPanelProps {
  timeline: ReplayTimeline;
  cursor: number;
}

const SPARK_W = 240;
const SPARK_H = 40;

interface Spark {
  meta: ReplayFeatureMeta;
  path: string;
  /** Benign median in sparkline coordinates, or null when it sits off-scale. */
  medianY: number | null;
}

/**
 * The eight window-state features the model actually reads, in the units they were
 * measured in. Values are recovered from the min-max scaler, so they are the real
 * CIC-IDS2017 counts rather than normalised inputs.
 */
export const NetworkActivityPanel: React.FC<NetworkActivityPanelProps> = ({ timeline, cursor }) => {
  const { windows, episodes, feature_meta: features } = timeline;
  const n = windows.length;
  const current = windows[cursor];

  const x = (index: number) => (n <= 1 ? 0 : (index / (n - 1)) * SPARK_W);

  const sparks = useMemo<Spark[]>(
    () =>
      features
        .filter((meta) => meta.panel)
        .map((meta) => {
          const span = meta.day_max - meta.day_min;
          const y = (value: number) =>
            span <= 0 ? SPARK_H / 2 : SPARK_H - ((value - meta.day_min) / span) * SPARK_H;
          const path = windows
            .map(
              (w, i) =>
                `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(w.features[meta.name]).toFixed(1)}`
            )
            .join(' ');
          const medianY =
            meta.benign_median >= meta.day_min && meta.benign_median <= meta.day_max
              ? y(meta.benign_median)
              : null;
          return { meta, path, medianY };
        }),
    [features, windows, n]
  );

  return (
    <Card className="p-3 sm:p-4 space-y-2.5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
          Network activity in this window
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          8 of the 40 state features the model reads · real CIC-IDS2017 counts · Nx is the multiple
          of the benign median
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-x-3 gap-y-2.5">
        {sparks.map(({ meta, path, medianY }) => {
          const value = current.features[meta.name];
          const comparison = compareToBenign(meta, value);
          return (
            <div key={meta.name} className="space-y-0.5 min-w-0" title={meta.note}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9.5px] font-mono text-muted-foreground truncate">
                  {meta.label}
                </span>
                <span
                  className="text-[9px] font-mono text-indigo-300/70 shrink-0"
                  title={`Rank ${meta.shap_rank} of 40 by mean |gradient| of the future-attack logit`}
                >
                  #{meta.shap_rank}
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-1.5">
                <span className="text-[15px] font-extrabold text-foreground leading-none tabular-nums truncate">
                  {formatFeatureValue(meta, value)}
                </span>
                <span
                  className={`text-[9.5px] font-mono shrink-0 ${comparison.tone}`}
                  title={comparison.title}
                >
                  {comparison.label}
                </span>
              </div>

              <svg
                viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
                preserveAspectRatio="none"
                className="w-full h-6 mt-1 overflow-visible"
                aria-hidden="true"
              >
                {episodes.map((ep) => (
                  <rect
                    key={ep.index}
                    x={x(ep.start)}
                    y={0}
                    width={Math.max(1, x(ep.end) - x(ep.start))}
                    height={SPARK_H}
                    fill="rgba(244, 63, 94, 0.16)"
                  />
                ))}
                {medianY !== null && (
                  <line
                    x1={0}
                    y1={medianY}
                    x2={SPARK_W}
                    y2={medianY}
                    stroke="rgba(113,113,122,0.55)"
                    strokeWidth="1"
                    strokeDasharray="3 4"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                <path
                  d={path}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.25"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1={x(cursor)}
                  y1={0}
                  x2={x(cursor)}
                  y2={SPARK_H}
                  stroke="#e4e4e7"
                  strokeWidth="1"
                  opacity="0.8"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          );
        })}
      </div>

      <p className="text-[9.5px] text-muted-foreground leading-snug pt-1.5 border-t border-border/60">
        Sparklines span the whole test day: rose bands are real attack windows, the dashed line is the
        benign median, #n is the feature's rank among all 40 by influence on the forecast. Packet rate
        divides by the 30s window_seconds in config while windows are 60s apart, so it reads about 2x high.
      </p>
    </Card>
  );
};
