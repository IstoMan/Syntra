import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, AlertTriangle } from 'lucide-react';
import { ReplayTimeline } from '../types';
import { api } from '../services/api';
import {
  evaluateThreshold,
  formatClock,
  formatFeatureValue,
  driverBarPercent,
  readWindow,
  windowSeconds,
  VERDICT_STYLE,
} from '../lib/replay';
import { ForecastTimelineChart } from '../components/charts/ForecastTimelineChart';
import { NetworkActivityPanel } from '../components/charts/NetworkActivityPanel';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
const SPEEDS = [1, 4, 16];
const BASE_TICK_MS = 240;

function duration(seconds: number): string {
  if (seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m ? `${m}m ${s}s` : `${s}s`;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export const ForecastReplayPage: React.FC = () => {
  const [timeline, setTimeline] = useState<ReplayTimeline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.9);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);

  useEffect(() => {
    api
      .getReplayTimeline()
      .then((data) => {
        setTimeline(data);
        setThreshold(Number(data.provenance.tuned_threshold.toFixed(2)));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!playing || !timeline) return;
    const id = setInterval(() => {
      setCursor((prev) => {
        if (prev >= timeline.windows.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, BASE_TICK_MS / speed);
    return () => clearInterval(id);
  }, [playing, speed, timeline]);

  const outcome = useMemo(
    () => (timeline ? evaluateThreshold(timeline, threshold) : null),
    [timeline, threshold]
  );
  const reading = useMemo(
    () => (timeline ? readWindow(timeline, cursor, threshold) : null),
    [timeline, cursor, threshold]
  );
  const featureMeta = useMemo(
    () => Object.fromEntries((timeline?.feature_meta ?? []).map((m) => [m.name, m])),
    [timeline]
  );

  const togglePlay = useCallback(() => {
    if (!timeline) return;
    setPlaying((prev) => {
      if (!prev && cursor >= timeline.windows.length - 1) setCursor(0);
      return !prev;
    });
  }, [timeline, cursor]);

  if (error) {
    return (
      <Card className="p-6 border-rose-500/40 bg-rose-950/15 space-y-2">
        <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Evaluation artifacts unavailable</span>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{error}</p>
        <p className="text-xs text-muted-foreground">
          Run <code className="text-foreground">python -m syntra.evaluate</code> in <code className="text-foreground">ai/</code>{' '}
          to regenerate <code className="text-foreground">timeline.parquet</code>.
        </p>
      </Card>
    );
  }

  if (!timeline || !outcome || !reading) {
    return (
      <Card className="p-6">
        <p className="text-xs font-mono text-muted-foreground">Loading held-out evaluation…</p>
      </Card>
    );
  }

  const { provenance, windows, drivers } = timeline;
  const style = VERDICT_STYLE[reading.verdict];
  const secs = windowSeconds(windows);
  const tuned = Number(provenance.tuned_threshold.toFixed(2));

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5 space-y-4">
        {/* Title + replay transport */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-extrabold tracking-tight">Attack Forecast — Held-Out Replay</h2>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {provenance.dataset.toUpperCase()} {provenance.day} test split · {windows.length} windows of{' '}
              {secs}s · horizon K={provenance.horizon_k}
            </p>
          </div>

          {/* Speed segments and icon-only transport, merged into one pill */}
          <div className="flex items-center gap-0.5 self-start lg:self-auto shrink-0 rounded-full border border-border bg-muted/70 p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                title={`Play at ${s}x speed`}
                className={`px-2.5 py-1 rounded-full font-mono text-[11px] cursor-pointer transition-colors ${
                  speed === s
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}x
              </button>
            ))}

            <span className="w-px h-4 bg-border mx-1 shrink-0" aria-hidden="true" />

            <button
              onClick={togglePlay}
              title={playing ? 'Pause the replay' : 'Replay the held-out day'}
              aria-label={playing ? 'Pause the replay' : 'Replay the held-out day'}
              className="p-1.5 rounded-full text-primary cursor-pointer transition-colors hover:bg-primary/15"
            >
              {playing ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
            </button>

            <button
              onClick={() => {
                setPlaying(false);
                setCursor(0);
                setThreshold(tuned);
              }}
              title="Reset to the first window and the tuned threshold"
              aria-label="Reset to the first window and the tuned threshold"
              className="p-1.5 rounded-full text-muted-foreground cursor-pointer transition-colors hover:text-foreground hover:bg-foreground/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* The dynamic label */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
          <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-foreground">
                {formatClock(reading.window.timestamp)}
              </span>
              <Badge variant="outline" className={`text-[9.5px] px-1.5 py-0 font-mono font-bold ${style.tone}`}>
                {style.label}
              </Badge>
              <span className="text-[10px] font-mono text-muted-foreground">
                window {reading.window.index + 1} / {windows.length}
              </span>
            </div>
            <p className={`text-sm font-semibold mt-1 ${style.tone}`}>{reading.headline}</p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{reading.detail}</p>
          </div>
        </div>

        <ForecastTimelineChart
          timeline={timeline}
          threshold={threshold}
          onThresholdChange={setThreshold}
          cursor={cursor}
          onCursorChange={(i) => {
            setPlaying(false);
            setCursor(i);
          }}
        />

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-mono px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-4 border-t-2 border-rose-500" />
            Forecast score at t+1
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3 bg-rose-500/30 rounded-sm" />
            Actual attack windows
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Alert fired before the attack
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-4 border-t-2 border-dashed border-amber-400" />
            Threshold
          </span>
          {threshold !== tuned && (
            <button
              onClick={() => setThreshold(tuned)}
              title={`Snap back to the val-tuned threshold of ${tuned.toFixed(2)}`}
              className="text-[9.5px] px-1.5 py-0.5 rounded-full border border-sky-500/40 text-sky-300 font-mono cursor-pointer hover:bg-sky-500/10 transition-colors"
            >
              exploring {threshold.toFixed(2)} · snap back to tuned {tuned.toFixed(2)}
            </button>
          )}
        </div>
      </Card>

      {/* Real network telemetry for the window under the cursor, next to the graph it explains */}
      <NetworkActivityPanel timeline={timeline} cursor={cursor} />

      {/* Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-4 space-y-2">
          <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
            Warned before the attack
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-extrabold ${
                outcome.episodesCaught ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {outcome.episodesCaught}
            </span>
            <span className="text-sm font-mono text-muted-foreground">/ {outcome.episodesTotal} episodes</span>
          </div>
          <div className="text-xs font-mono">
            Mean lead <strong className="text-foreground">{duration(outcome.meanLeadSeconds)}</strong>
          </div>
          <p className="text-[10.5px] text-muted-foreground leading-snug">
            {outcome.caughtFamilies.length
              ? `Caught early: ${outcome.caughtFamilies.join(', ')}.`
              : 'No episode is alerted before it begins at this threshold.'}
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
            Cost of that threshold
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-amber-400">{outcome.falseAlarms}</span>
            <span className="text-sm font-mono text-muted-foreground">false alarms</span>
          </div>
          <div className="text-xs font-mono">
            <strong className="text-foreground">{percent(outcome.falseAlarmRate)}</strong> of{' '}
            {outcome.benignWindows} benign windows
          </div>
          <p className="text-[10.5px] text-muted-foreground leading-snug">
            {outcome.alertsTotal} alerts total, {outcome.alertsDuringAttack} of them raised while an attack was
            already running.
          </p>
        </Card>

        <Card className="p-4 space-y-2">
          <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
            This window
          </span>
          <div className="space-y-1 text-xs font-mono">
            {[
              ['Combined', reading.window.combined],
              ['Attack head', reading.window.attack_head],
              ['Novelty', reading.window.novelty],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-bold text-foreground">{(value as number).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="pt-1.5 border-t border-border/60 space-y-1 text-[10.5px] font-mono">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Predicted</span>
              <span className="text-indigo-300 font-semibold">{reading.window.predicted_family}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Actual</span>
              <span className="text-foreground font-semibold">{reading.window.true_family}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground shrink-0">MITRE</span>
              <span className="text-foreground truncate">{reading.window.mitre_technique}</span>
            </div>
          </div>
          <div className="pt-1.5 border-t border-border/60">
            <span className="text-[10px] font-mono text-muted-foreground block mb-1">
              Rollout t+1 … t+{provenance.horizon_k}
            </span>
            <div className="flex items-end gap-1 h-8">
              {reading.window.horizon.map((v, i) => (
                <div key={i} className="flex-1 bg-muted/60 rounded-sm relative" title={`t+${i + 1}: ${v.toFixed(2)}`}>
                  <div
                    className={`absolute bottom-0 inset-x-0 rounded-sm ${
                      v >= threshold ? 'bg-rose-500' : 'bg-sky-500/70'
                    }`}
                    style={{ height: `${Math.max(3, v * 100)}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
            What drives the forecast
          </span>
          <div className="space-y-1.5">
            {(() => {
              const shown = drivers.slice(0, 6);
              const maxW = shown[0]?.weight ?? 1;
              const minW = shown[shown.length - 1]?.weight ?? maxW;
              return shown.map((d) => {
                const meta = featureMeta[d.feature];
                return (
                  <div key={d.feature} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10.5px] font-mono">
                      <span className="text-foreground truncate">{d.feature.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">
                        {meta
                          ? formatFeatureValue(meta, reading.window.features[d.feature])
                          : '—'}
                      </span>
                    </div>
                    <div className="h-1 bg-muted/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-400"
                        style={{ width: `${driverBarPercent(d.weight, maxW, minW)}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug pt-0.5">
            Bars are relative influence on the future-attack score (log scale). Numbers are this
            window's raw values.
          </p>
        </Card>
      </div>

      {/* Provenance */}
      <Card className="p-3.5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[10.5px] font-mono text-muted-foreground">
          <span>
            Split: <strong className="text-foreground">{provenance.split}</strong>
          </span>
          <span>
            Tuned θ: <strong className="text-foreground">{tuned.toFixed(2)}</strong> ({provenance.threshold_source})
          </span>
          {provenance.headline_precision != null && (
            <span>
              Test P/R @k=1:{' '}
              <strong className="text-foreground">
                {percent(provenance.headline_precision)} / {percent(provenance.headline_recall ?? 0)}
              </strong>
            </span>
          )}
          {provenance.headline_ece != null && (
            <span>
              ECE: <strong className="text-foreground">{provenance.headline_ece.toFixed(2)}</strong>
            </span>
          )}
          <span>
            Unseen family held out: <strong className="text-foreground">{provenance.unseen_family}</strong>
          </span>
          {!provenance.met_fpr_cap && (
            <span className="text-amber-400">
              Tuner did not reach its {percent(provenance.fpr_cap)} FPR cap.
            </span>
          )}
        </div>
      </Card>
    </div>
  );
};
