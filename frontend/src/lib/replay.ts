import { ReplayEpisode, ReplayTimeline, ReplayWindow } from '../types';

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
    .filter((g) => Number.isFinite(g) && g > 0)
    .sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)] ?? 60;
}

export function formatClock(timestamp: string): string {
  return timestamp.slice(11, 16);
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

export const VERDICT_STYLE: Record<Verdict, { label: string; tone: string; dot: string }> = {
  early_warning: { label: 'EARLY WARNING', tone: 'text-emerald-400', dot: 'bg-emerald-400' },
  detecting: { label: 'DETECTING', tone: 'text-amber-400', dot: 'bg-amber-400' },
  false_alarm: { label: 'FALSE ALARM', tone: 'text-orange-400', dot: 'bg-orange-400' },
  missed_ongoing: { label: 'MISSED', tone: 'text-rose-400', dot: 'bg-rose-400' },
  missed_upcoming: { label: 'MISSED', tone: 'text-rose-400', dot: 'bg-rose-400' },
  quiet: { label: 'QUIET', tone: 'text-zinc-400', dot: 'bg-zinc-500' },
};
