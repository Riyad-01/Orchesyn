/**
 * Content-management workflow (on-device):
 *   draft → review → published, plus corrections that bump the version.
 * The overlay lives in localStorage; CURRICULUM carries the seeded defaults.
 * Learner surfaces ONLY ever see items whose effective status is 'published'.
 */

import { CURRICULUM, lessonById } from './curriculum';
import type { ContentStatus } from './types';

const LS = 'stim:studio';

export interface StudioRecord {
  status: ContentStatus;
  version: number;
  /** correction requests logged against a published item */
  corrections: { at: number; note: string }[];
  /** honest provenance */
  aiGenerated: boolean;
  source?: string;
  rights?: string;
}

type Overlay = Record<string, StudioRecord>;

function readOverlay(): Overlay {
  try {
    return JSON.parse(window.localStorage.getItem(LS) ?? '{}') as Overlay;
  } catch {
    return {};
  }
}

function writeOverlay(o: Overlay) {
  window.localStorage.setItem(LS, JSON.stringify(o));
}

export function recordFor(id: string): StudioRecord {
  const seeded = lessonById(id);
  const ov = typeof window === 'undefined' ? {} : readOverlay();
  return (
    ov[id] ?? {
      status: seeded?.status ?? 'draft',
      version: seeded?.version ?? 1,
      corrections: [],
      aiGenerated: seeded?.aiGenerated ?? false,
      source: seeded?.source,
      rights: seeded?.rights,
    }
  );
}

export const effectiveStatus = (id: string): ContentStatus => recordFor(id).status;

/** the only list learners may see */
export function publishedLessonIds(): string[] {
  return CURRICULUM.filter((l) => effectiveStatus(l.id) === 'published').map((l) => l.id);
}

export function publish(id: string): StudioRecord {
  const o = readOverlay();
  const r = recordFor(id);
  r.status = 'published';
  r.version += 1;
  o[id] = r;
  writeOverlay(o);
  return r;
}

export function toDraft(id: string): StudioRecord {
  const o = readOverlay();
  const r = recordFor(id);
  r.status = 'draft';
  o[id] = r;
  writeOverlay(o);
  return r;
}

export function toReview(id: string): StudioRecord {
  const o = readOverlay();
  const r = recordFor(id);
  r.status = 'review';
  o[id] = r;
  writeOverlay(o);
  return r;
}

export function requestCorrection(id: string, note: string): StudioRecord {
  const o = readOverlay();
  const r = recordFor(id);
  r.corrections = [...r.corrections, { at: Date.now(), note }];
  r.status = 'review'; // corrected items leave learner surfaces until re-published
  r.version += 1;
  o[id] = r;
  writeOverlay(o);
  return r;
}

export function createDraft(meta: { id: string; aiGenerated: boolean; source?: string; rights?: string }): StudioRecord {
  const o = readOverlay();
  const r: StudioRecord = { status: 'draft', version: 1, corrections: [], ...meta };
  o[meta.id] = r;
  writeOverlay(o);
  return r;
}
