export * from './engine';
export { WebSpeechEngine } from './web-speech';
export { AudioMeter } from './audio-meter';
export { CloudSpeechEngine, cloudConfig } from './cloud';

import { CloudSpeechEngine, cloudConfig } from './cloud';
import { detectCapabilities, getSpeechRecognitionCtor, type SpeechEngine } from './engine';
import { WebSpeechEngine } from './web-speech';

/**
 * Pick the best engine for this browser.
 * Preference order: cloud (if configured) -> web-speech -> none.
 */
export function createEngine(): SpeechEngine | null {
  const cloud = cloudConfig();
  if (cloud) return new CloudSpeechEngine(cloud);
  if (getSpeechRecognitionCtor()) return new WebSpeechEngine();
  return null;
}

export { detectCapabilities };
