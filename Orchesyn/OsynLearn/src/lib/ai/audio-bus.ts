'use client';

/**
 * In-memory hand-off of the last recording so the report screen can offer
 * playback of what was just assessed. Recordings are too large and too
 * private for localStorage; after a reload playback honestly disappears and
 * the transcript-based report remains.
 */
let last: { sessionId: string; url: string } | null = null;

export function publishRecording(sessionId: string, blob: Blob): void {
  if (last) URL.revokeObjectURL(last.url);
  last = { sessionId, url: URL.createObjectURL(blob) };
}

export function recordingFor(sessionId: string): string | null {
  return last && last.sessionId === sessionId ? last.url : null;
}
