import { ReplayEpisode, ReplayFeatureMeta, ReplayTimeline, ReplayWindow } from '../types';

/**
 * Analysis helpers for the held-out replay. Every figure here is derived from the
 * artifact rows served by /api/replay/timeline — nothing is assumed or hardcoded.
 */

export type Verdict =
  | 'early_warning'
  | 'detecting'
  | 'false_alarm'
  | 'missed_ongoing'
  | 'missed_upcoming'
  | 'quiet';

export interface WindowReading {
  window: ReplayWindow;
  verdict: Verdict;
  alerting: boolean;
  /** Windows until the next episode begins, or null if none remain. */
  windowsToNextAttack: number | null;
  headline: string;
  detail: string;
}

export interface ThresholdOutcome {
  threshold: number;
  episodesTotal: number;
  episodesCaught: number;
  catchRate: number;
  meanLeadSeconds: number;
  alertsTotal: number;
  alertsDuringAttack: number;
  falseAlarms: number;
  benignWindows: number;
  falseAlarmRate: number;
  /** Episode families the threshold manages to catch early, most common first. */
  caughtFamilies: string[];
}

/** Median wall-clock gap between windows. The pipeline config disagrees with the data. */
export function windowSeconds(windows: ReplayWindow[]): number {
  if (windows.length < 2) return 60;
  const gaps = windows
    .slice(1)
    .map((w, i) => (Date.parse(w.timestamp) - Date.parse(windows[i].timestamp)) / 1000)
    .filter((g) => Number.isFinite(g) && g > 0 && g < 10 * 60)
    .sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)] ?? 60;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatClock(timestamp: string): string {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return timestamp.slice(11, 16);
  const date = new Date(parsed);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${WEEKDAYS[date.getDay()]} ${hh}:${mm}`;
}

function nextEpisodeStart(index: number, episodes: ReplayEpisode[]): number | null {
  for (const ep of episodes) {
    if (ep.start > index) return ep.start;
  }
  return null;
}

/**
 * An episode counts as forecast if an alert fires in the K windows before it starts.
 * Lead is measured from the earliest such alert.
 */
export function evaluateThreshold(
  timeline: ReplayTimeline,
  threshold: number
): ThresholdOutcome {
  const { windows, episodes, provenance } = timeline;
  const secs = windowSeconds(windows);
  const k = provenance.horizon_k;

  let caught = 0;
  const leads: number[] = [];
  const families: Record<string, number> = {};

  for (const ep of episodes) {
    let earliest: number | null = null;
    for (let i = Math.max(0, ep.start - k); i < ep.start; i += 1) {
      if (windows[i].combined >= threshold) {
        earliest = i;
        break;
      }
    }
    if (earliest !== null) {
      caught += 1;
      leads.push(ep.start - earliest);
      families[ep.family] = (families[ep.family] ?? 0) + 1;
    }
  }

  const alerts = windows.filter((w) => w.combined >= threshold);
  const benign = windows.filter((w) => w.attack_now === 0);
  const falseAlarms = benign.filter((w) => w.combined >= threshold).length;

  return {
    threshold,
    episodesTotal: episodes.length,
    episodesCaught: caught,
    catchRate: episodes.length ? caught / episodes.length : 0,
    meanLeadSeconds: leads.length
      ? (leads.reduce((a, b) => a + b, 0) / leads.length) * secs
      : 0,
    alertsTotal: alerts.length,
    alertsDuringAttack: alerts.filter((w) => w.attack_now === 1).length,
    falseAlarms,
    benignWindows: benign.length,
    falseAlarmRate: benign.length ? falseAlarms / benign.length : 0,
    caughtFamilies: Object.entries(families)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name),
  };
}

/**
 * The dynamic label: what the model is actually doing at this window, stated plainly
 * and including the cases where it is wrong.
 */
export function readWindow(
  timeline: ReplayTimeline,
  index: number,
  threshold: number
): WindowReading {
  const window = timeline.windows[index];
  const alerting = window.combined >= threshold;
  const nextStart = nextEpisodeStart(index, timeline.episodes);
  const windowsToNextAttack = nextStart === null ? null : nextStart - index;
  const withinHorizon =
    windowsToNextAttack !== null && windowsToNextAttack <= timeline.provenance.horizon_k;

  let verdict: Verdict;
  let headline: string;

  if (alerting && window.attack_now === 1) {
    verdict = 'detecting';
    headline = `Alerting on a ${window.true_family} attack already in progress — detection, not forecast`;
  } else if (alerting && withinHorizon) {
    verdict = 'early_warning';
    headline = `Early warning: alert fired ${windowsToNextAttack} window${
      windowsToNextAttack === 1 ? '' : 's'
    } before the ${timeline.windows[nextStart!].true_family} attack starts`;
  } else if (alerting) {
    verdict = 'false_alarm';
    headline = 'False alarm — score is above threshold with no attack in the horizon';
  } else if (window.attack_now === 1) {
    verdict = 'missed_ongoing';
    headline = `Missed: a ${window.true_family} attack is running and the score is below threshold`;
  } else if (withinHorizon) {
    verdict = 'missed_upcoming';
    headline = `Missed: ${
      timeline.windows[nextStart!].true_family
    } attack begins in ${windowsToNextAttack} window${
      windowsToNextAttack === 1 ? '' : 's'
    } and the score has not crossed`;
  } else {
    verdict = 'quiet';
    headline = 'Quiet — benign traffic and the model is correctly silent';
  }

  const stage =
    window.predicted_stage === 'none'
      ? 'no attack stage'
      : `${window.predicted_stage.replace(/_/g, ' ')} (${window.mitre_technique})`;

  const detail =
    `Combined score ${window.combined.toFixed(2)} vs threshold ${threshold.toFixed(2)}. ` +
    `Model predicts ${stage}. Ground truth this window: ${window.true_family}.`;

  return { window, verdict, alerting, windowsToNextAttack, headline, detail };
}

function compact(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1000).toFixed(1)}k`;
  return Math.round(value).toLocaleString();
}

/** Render a raw feature value in the unit it was actually measured in. */
export function formatFeatureValue(meta: ReplayFeatureMeta, value: number): string {
  if (!Number.isFinite(value)) return '—';
  switch (meta.unit) {
    case 'bytes': {
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let v = value;
      let i = 0;
      while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i += 1;
      }
      return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
    }
    case 'rate':
      return `${compact(value)}/s`;
    case 'ratio':
      return `${(value * 100).toFixed(1)}%`;
    case 'us': {
      const abs = Math.abs(value);
      if (abs >= 1e6) return `${(value / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}s`;
      if (abs >= 1e3) return `${(value / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}ms`;
      return `${Math.round(value)}µs`;
    }
    default:
      return compact(value);
  }
}

/** Bar width for driver influence. Log scale so a 1000× outlier does not hide the rest. */
export function driverBarPercent(weight: number, maxWeight: number, minWeight: number): number {
  if (weight <= 0 || maxWeight <= 0) return 0;
  const span = maxWeight / Math.max(minWeight, 1e-12);
  if (span < 20) return (weight / maxWeight) * 100;
  const lo = Math.log10(Math.max(minWeight, maxWeight / 1e6));
  const hi = Math.log10(maxWeight);
  if (hi <= lo) return 100;
  return Math.max(6, ((Math.log10(weight) - lo) / (hi - lo)) * 100);
}

export interface BenignComparison {
  /** Multiple of the benign median, or null when that median is zero. */
  ratio: number | null;
  /** Terse form for a dense tile, e.g. "13x". */
  label: string;
  /** Spelled out, for the tile's tooltip. */
  title: string;
  tone: string;
}

/**
 * How far this window sits from the median benign window of the same day. Without
 * it a raw count like "392 destinations" means nothing to the reader.
 */
export function compareToBenign(meta: ReplayFeatureMeta, value: number): BenignComparison {
  if (meta.benign_median <= 0) {
    return {
      ratio: null,
      label: value > 0 ? '>0' : '0',
      title: value > 0 ? 'Above a benign median of zero' : 'At the benign median of zero',
      tone: value > 0 ? 'text-amber-400' : 'text-muted-foreground',
    };
  }
  const ratio = value / meta.benign_median;
  const digits = ratio >= 10 ? 0 : 1;
  const tone =
    ratio >= 4 ? 'text-rose-400' : ratio >= 1.75 ? 'text-amber-400' : 'text-muted-foreground';
  return {
    ratio,
    label: `${ratio.toFixed(digits)}x`,
    title: `${ratio.toFixed(digits)}x the benign median of ${formatFeatureValue(
      meta,
      meta.benign_median
    )} for this day`,
    tone,
  };
}

export const VERDICT_STYLE: Record<Verdict, { label: string; tone: string; dot: string }> = {
  early_warning: { label: 'EARLY WARNING', tone: 'text-emerald-400', dot: 'bg-emerald-400' },
  detecting: { label: 'DETECTING', tone: 'text-amber-400', dot: 'bg-amber-400' },
  false_alarm: { label: 'FALSE ALARM', tone: 'text-orange-400', dot: 'bg-orange-400' },
  missed_ongoing: { label: 'MISSED', tone: 'text-rose-400', dot: 'bg-rose-400' },
  missed_upcoming: { label: 'MISSED', tone: 'text-rose-400', dot: 'bg-rose-400' },
  quiet: { label: 'QUIET', tone: 'text-zinc-400', dot: 'bg-zinc-500' },
};
