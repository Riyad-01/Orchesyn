import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Score -> semantic tone used consistently across rings, bars and chips. */
export function scoreTone(score: number): 'good' | 'mid' | 'bad' | 'none' {
  if (score < 0) return 'none';
  if (score >= 78) return 'good';
  if (score >= 55) return 'mid';
  return 'bad';
}

export const TONE_VAR: Record<string, string> = {
  good: 'rgb(var(--good))',
  mid: 'rgb(var(--warn))',
  bad: 'rgb(var(--bad))',
  none: 'rgb(var(--muted))',
  brand: 'rgb(var(--brand))',
  accent: 'rgb(var(--accent))',
};

export function toneColor(score: number): string {
  return TONE_VAR[scoreTone(score)];
}

export function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m}m ${rest}s` : `${m}m`;
}

export function formatMs(ms: number): string {
  return formatSeconds(ms / 1000);
}

/** yyyy-mm-dd in the learner's own timezone — streaks must not shift at UTC midnight. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysBetween(a: string, b: string): number {
  const pa = new Date(`${a}T00:00:00`);
  const pb = new Date(`${b}T00:00:00`);
  return Math.round((pb.getTime() - pa.getTime()) / 86400000);
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function pluralise(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : (plural ?? `${singular}s`);
}

export function uid(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

export function clampNumber(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function mean(values: number[]): number {
  const usable = values.filter((v) => Number.isFinite(v));
  if (!usable.length) return 0;
  return usable.reduce((a, b) => a + b, 0) / usable.length;
}
