'use client';

export interface Consent {
  /** recordings may leave the device for cloud transcription */
  recordingUpload: boolean;
  retentionDays: 30 | 90 | 365;
}

const CONSENT_KEY = 'stim:consent';

export function readConsent(): Consent {
  try {
    return { recordingUpload: false, retentionDays: 90, ...(JSON.parse(window.localStorage.getItem(CONSENT_KEY) ?? '{}') as Partial<Consent>) };
  } catch {
    return { recordingUpload: false, retentionDays: 90 };
  }
}

export function saveConsent(next: Consent): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
  } catch {
    /* fine */
  }
}
