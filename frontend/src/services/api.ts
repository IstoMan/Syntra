import { HealthStatus, ReplayTimeline } from '../types';

const API_BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `${response.status} ${response.statusText} on ${path}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  getHealth: () => get<HealthStatus>('/health'),

  /** Per-window scores and ground truth for the held-out test day. */
  getReplayTimeline: () => get<ReplayTimeline>('/replay/timeline'),
};
