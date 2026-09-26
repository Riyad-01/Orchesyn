/**
 * Coach voice.
 *
 * Uses the browser's speechSynthesis so the AI coach actually talks — no audio
 * assets, no network, works offline in a PWA. Voice selection is heuristic
 * because the available list differs per platform, so we score candidates rather
 * than hard-code a name that only exists on one OS.
 */

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let preferredVoice: SpeechSynthesisVoice | null = null;

export function supported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!supported()) return Promise.resolve([]);
  if (cachedVoices.length) return Promise.resolve(cachedVoices);
  return new Promise((resolve) => {
    const read = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      if (cachedVoices.length) {
        preferredVoice = pickCoachVoice(cachedVoices);
        resolve(cachedVoices);
        return true;
      }
      return false;
    };
    if (read()) return;
    // Chrome populates the list asynchronously
    window.speechSynthesis.onvoiceschanged = () => {
      read();
    };
    setTimeout(() => {
      read();
      resolve(cachedVoices);
    }, 1200);
  });
}

/**
 * Score every installed voice and pick the most "coach-like": an English voice,
 * ideally female, ideally a natural/neural one rather than a compact system voice.
 */
export function pickCoachVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  const pool = english.length ? english : voices;
  if (!pool.length) return null;

  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    const name = `${v.name} ${v.voiceURI}`.toLowerCase();
    if (/^en-gb/i.test(v.lang)) s += 3; // OsynLearn's Sarah is British-English
    if (/^en-us/i.test(v.lang)) s += 2;
    if (/(female|woman|zira|samantha|karen|serena|kate|fiona|moira|tessa|veena|heera|susan|allison|ava|jenny|aria|libby|sonia|natasha)/.test(name)) s += 4;
    if (/(google|natural|neural|enhanced|premium|siri)/.test(name)) s += 3;
    if (/(compact|eloquence|espeak)/.test(name)) s -= 4;
    if (v.localService) s += 1; // lower latency
    if (v.default) s += 1;
    return s;
  };

  return [...pool].sort((a, b) => score(b) - score(a))[0];
}

/** Split long text so browsers that truncate utterances still read everything. */
function chunk(text: string, max = 220): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const out: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if ((buf + s).length > max && buf) {
      out.push(buf.trim());
      buf = s;
    } else {
      buf += s;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length ? out : [text];
}

let activeUtterances: SpeechSynthesisUtterance[] = [];

export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  if (!supported() || !text.trim()) {
    options.onEnd?.();
    return;
  }
  const voices = await loadVoices();
  const voice = preferredVoice ?? pickCoachVoice(voices);

  window.speechSynthesis.cancel();
  activeUtterances = [];

  const pieces = chunk(text);
  await new Promise<void>((resolve) => {
    let done = 0;
    pieces.forEach((piece, index) => {
      const utterance = new SpeechSynthesisUtterance(piece);
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang ?? 'en-GB';
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.05;
      utterance.volume = options.volume ?? 1;
      utterance.onstart = () => {
        if (index === 0) options.onStart?.();
      };
      utterance.onend = () => {
        done += 1;
        if (done === pieces.length) {
          options.onEnd?.();
          resolve();
        }
      };
      utterance.onerror = (event) => {
        // 'interrupted' is expected when we cancel; anything else is reported
        if ((event as SpeechSynthesisErrorEvent).error !== 'interrupted') {
          options.onError?.((event as SpeechSynthesisErrorEvent).error);
        }
        done += 1;
        if (done === pieces.length) resolve();
      };
      activeUtterances.push(utterance);
      window.speechSynthesis.speak(utterance);
    });
    // Safety net: some browsers never fire onend when the tab is backgrounded
    setTimeout(resolve, Math.min(60000, pieces.length * 12000 + 4000));
  });
}

export function stopSpeaking(): void {
  if (!supported()) return;
  activeUtterances = [];
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return supported() && window.speechSynthesis.speaking;
}

export function voiceLabel(): string {
  return preferredVoice?.name ?? 'System voice';
}
