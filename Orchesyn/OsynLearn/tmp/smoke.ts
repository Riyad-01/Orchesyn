import { analyseSpeech } from '@/lib/scoring';
import type { SpeechCapture, WordToken } from '@/types';

function cap(text: string, gapMs: number, conf: number): SpeechCapture {
  const raw = text.split(/\s+/).filter(Boolean);
  const words: WordToken[] = [];
  let t = 0;
  for (const w of raw) { words.push({ word: w, startMs: t, endMs: t + 280, confidence: conf }); t += 280 + gapMs; }
  const dur = t - gapMs;
  return { transcript: text, words, segments: [], audio: { durationMs: dur, avgLoudness: 0.1, peakLoudness: 0.3, silenceMs: gapMs*raw.length, envelope: [], clipped: false }, engine: 'web-speech', latencyMs: 1100, typedFallback: false };
}

const answers: [string,string,string,number,number][] = [
  ['B2-ish good', `Well, I would say that renewable energy has completely transformed my village. Earlier we depended on kerosene lamps, which were expensive and hazardous. Now that solar panels have been installed, children can study after sunset and small businesses operate throughout the evening. The government should certainly subsidise these installations, because the initial cost remains prohibitive for most households. Personally, I believe the environmental benefit is equally significant, although we still need better maintenance facilities.`, 170, 0.93],
  ['Band 6 typical', `I think technology is very important in our daily life. For example, mobile phones help us to communicate with our family and friends easily. In my opinion, technology has many advantages but it also has some disadvantages. Many students spend too much time on social media, so they cannot focus on their studies. I believe that we should use technology in a balanced way, because it can improve our life if we use it properly.`, 240, 0.85],
  ['Weak A2/B1', `um so basically I think that like technology is very very good and um it is like you know it help peoples a lot and I am agree with this and we are having many informations about it since 5 years and it is more better than before`, 400, 0.6],
  ['Silence-ish', `Yes. It is good.`, 900, 0.7],
];

for (const [label, text, gap, conf] of answers) {
  const r = analyseSpeech({ sessionId: 'x', mode: 'impromptu', capture: cap(text, gap, conf), topicTitle: 'Technology' });
  const dims = r.dimensions.map(d => `${d.key.slice(0,4)}=${d.score}`).join(' ');
  console.log(`\n### ${label}`);
  console.log(`overall ${r.overall}/100  band ${r.band}  cefr ${r.cefr}  (${r.metrics.durationMs/1000}s, ${r.metrics.wordCount}w, ${r.metrics.wpm}wpm)`);
  console.log(`  ${dims}`);
  console.log(`  fillers ${r.metrics.fillerCount} (${r.metrics.fillerRatePerMin}/min) | grammar ${r.metrics.errorCount} | awkwardPauses ${r.metrics.awkwardPauseCount} | uniq ${r.metrics.uniqueWords} mtld ${r.metrics.mtld}`);
  console.log(`  strong: ${r.strongPoints[0]}`);
  console.log(`  focus : ${r.focusAreas[0]?.slice(0,110)}`);
}
