'use client';

import { useCallback, useRef, useState } from 'react';
import { AudioMeter } from '@/lib/speech/audio-meter';

export interface MicCheckResult {
  ok: boolean;
  message: string;
  avgLoudness: number;
  clipped: boolean;
  silenceRatio: number;
}

/**
 * A 2.5-second microphone self-test before recording: permission, level,
 * silence and clipping. Failing the check never blocks practice — it warns,
 * because assessment quality depends on what the mic actually heard.
 */
export function useMicCheck() {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [live, setLive] = useState(0);
  const [result, setResult] = useState<MicCheckResult | null>(null);
  const busy = useRef(false);

  const run = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setState('running');
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const meter = new AudioMeter();
      await meter.attach(stream, setLive);
      const t0 = Date.now();
      await new Promise((r) => setTimeout(r, 2500));
      const stats = meter.stats(Date.now() - t0);
      meter.dispose();

      const silenceRatio = Math.round((stats.silenceMs / Math.max(stats.durationMs, 1)) * 100) / 100;
      let ok = true;
      let message = 'Microphone hears you clearly — good to record.';
      if (stats.clipped) {
        ok = false;
        message = 'Clipping detected — the mic is too close or too loud. Back off slightly.';
      } else if (silenceRatio > 0.85) {
        ok = false;
        message = 'Mostly silent — speak toward the mic, or pick a different input device.';
      } else if (stats.avgLoudness < 0.015) {
        ok = false;
        message = 'Very quiet input — check that the mic is not muted.';
      } else if (silenceRatio > 0.5) {
        message = 'Heard you, but with long quiet stretches — a quieter room will improve assessment.';
      }
      setResult({ ok, message, avgLoudness: stats.avgLoudness, clipped: stats.clipped, silenceRatio });
      setState('done');
    } catch {
      setResult({ ok: false, message: 'Microphone unavailable or permission denied. You can still type your answer.', avgLoudness: 0, clipped: false, silenceRatio: 1 });
      setState('error');
    } finally {
      busy.current = false;
    }
  }, []);

  return { state, live, result, run };
}
