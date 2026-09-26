import { analyseSpeech } from '@/lib/scoring';
import { TOPICS } from '@/lib/data/topics';
import { uid } from '@/lib/utils';
import type { Repository } from '@/lib/store/repository';
import type { FeedbackReport, Session, SpeechCapture, WordToken } from '@/types';

/**
 * Demo seeder — generates two weeks of realistic sessions by running real
 * transcripts through the real scoring engine, so every surface (Insights,
 * History, Mistake Book, spaced revisits) shows genuine engine output.
 */

interface Script {
  text: string;
  /** words the recogniser "heard badly" → pronunciation flags */
  lowConf?: string[];
  /** word indexes followed by a 2.6s silence → long-pause events */
  pauses?: number[];
  daysAgo: number;
}

/* early sessions are messy, later ones cleaner → visible improvement arc */
const SCRIPTS: Script[] = [
  {
    daysAgo: 13,
    text: 'um so i want to talk about my hometown basically it is a very nice place um there are many good things uh like the food you know and the people are very friendly i am knowing the city since ten years um he don t have much pollutions there and i didn t went there last year because of my job um the weather is good and nice in winter so i think it is a very important place for me',
    lowConf: ['pollutions', 'friendly'],
    pauses: [10, 34],
  },
  {
    daysAgo: 12,
    text: 'uh today i will describe my favourite teacher basically she was very good uh she teach us english in college um i was feeling very happy in her class you know because she never make us feel bad um she don t give us many homeworks and that was a good thing uh i think she is a very important person in my life so um yeah',
    lowConf: ['favourite', 'homeworks'],
    pauses: [22],
  },
  {
    daysAgo: 11,
    text: 'um i would like to talk about a book i read recently uh it was a very good book basically about a man who travel to many countries um he was seeing many nice things and he meet interesting people you know i think reading is a very important habit um it make us more knowledgable uh so i recommend this book to everyone um',
    lowConf: ['knowledgable', 'recommend'],
    pauses: [18, 40],
  },
  {
    daysAgo: 9,
    text: 'so uh let me talk about my daily routine um i wake up early and basically drink tea uh then i go for a walk you know the morning air is very nice um after that i eat breakfast and go to work i am working in a small company since three years um my job is good but sometimes very stressful uh i try to stay calm um',
    lowConf: ['stressful'],
    pauses: [30],
  },
  {
    daysAgo: 8,
    text: 'um i want to describe a festival we celebrate uh it is a very big festival basically everyone in my family come together um we cook nice food and wear good clothes you know children are very happy uh we don t went to school on that day um it is a very important day for us so i love this festival um yeah',
    lowConf: ['celebrate'],
    pauses: [26],
  },
  {
    daysAgo: 6,
    text: 'today i will talk about learning english online uh it is very useful basically you can practise anytime um i use an app you know and i speak for ten minutes daily um at first i was feeling shy but now i am more confident uh my fluency is better than before um i still make some mistakes but basically i am improving',
    lowConf: ['confident', 'fluency'],
  },
  {
    daysAgo: 5,
    text: 'um let me describe my best friend uh we know each other since school days basically he is a very honest person you know he always help me when i need um we play cricket together on weekends uh he is more taller than me and he run very fast um i think friendship is a very important thing in life',
    lowConf: ['honest', 'friendship'],
    pauses: [20],
  },
  {
    daysAgo: 4,
    text: 'so i would like to talk about my favourite food uh basically i love biryani um it is a very tasty dish you know we cook it with rice and chicken uh my mother makes the best biryani i have ever eaten um we eat it on special occasions uh i think food brings people together so it is important to me',
    lowConf: ['occasions'],
  },
  {
    daysAgo: 3,
    text: 'um today i want to talk about travelling uh i visited the hills last winter basically the view was breathtaking you know the mountains were covered with fog um we stayed in a small hotel and the people there were kind uh i felt completely relaxed uh travelling teaches us so much about other cultures i think',
    lowConf: ['breathtaking', 'cultures'],
  },
  {
    daysAgo: 2,
    text: 'let me talk about my ambitions uh i want to become a skilled public speaker basically because communication opens doors you know i practise speaking every day and i record myself um i notice my pauses are getting shorter uh my vocabulary is growing steadily and i feel considerably more assured than before',
    lowConf: ['ambitions', 'assured'],
  },
  {
    daysAgo: 1,
    text: 'today i will describe how my english has changed uh three weeks ago i hesitated constantly you know now i respond considerably faster basically i replaced my fillers with deliberate pauses um my colleagues noticed the difference uh i still revise grammar occasionally but overall my confidence has grown remarkably',
    lowConf: ['deliberate', 'occasionally'],
  },
  {
    daysAgo: 0,
    text: 'um so finally let me reflect on this journey uh speaking daily has transformed how i express myself you know i choose precise words almost naturally now um my pacing feels measured and my ideas connect smoothly basically i am proud of the progress and i intend to keep practising consistently',
  },
];

function makeCapture(script: Script): SpeechCapture {
  const raw = script.text.split(/\s+/).filter(Boolean);
  const low = new Set((script.lowConf ?? []).map((w) => w.toLowerCase()));
  const pauseAt = new Set(script.pauses ?? []);
  const words: WordToken[] = [];
  let t = 0;
  raw.forEach((word, i) => {
    const wordMs = 240 + (i % 3) * 40;
    words.push({
      word,
      startMs: t,
      endMs: t + wordMs,
      confidence: low.has(word.toLowerCase()) ? 0.42 : 0.82,
    });
    t += wordMs + (pauseAt.has(i) ? 2600 : 150);
  });
  const durationMs = t - 150;
  return {
    transcript: script.text,
    words,
    segments: [{ text: script.text, startMs: 0, endMs: durationMs, confidence: 0.8, final: true }],
    audio: {
      durationMs,
      avgLoudness: 0.09,
      peakLoudness: 0.18,
      silenceMs: 150 * raw.length + 2600 * (script.pauses?.length ?? 0),
      envelope: new Array(Math.ceil(durationMs / 100)).fill(0.09),
      clipped: false,
    },
    engine: 'web-speech',
    latencyMs: 900,
    typedFallback: false,
  };
}

export async function seedDemoData(
  repo: Repository,
  userId: string,
): Promise<{ sessions: number }> {
  const now = Date.now();
  let created = 0;
  for (let i = 0; i < SCRIPTS.length; i++) {
    const script = SCRIPTS[i];
    const topic = TOPICS[(i * 7) % TOPICS.length];
    const startedAt = new Date(now - script.daysAgo * 86_400_000 - (9 + (i % 6)) * 3_600_000);
    const capture = makeCapture(script);
    const report: FeedbackReport = analyseSpeech({
      sessionId: uid('sess'),
      mode: i % 3 === 2 ? 'drill' : 'impromptu',
      capture,
      topicTitle: topic.title,
      now: startedAt,
    });
    report.createdAt = startedAt.toISOString();
    const session: Session = {
      id: report.sessionId,
      userId,
      mode: report.mode,
      topicId: topic.id,
      title: `Sample · ${topic.title}`,
      status: 'completed',
      startedAt: startedAt.toISOString(),
      finishedAt: new Date(startedAt.getTime() + capture.audio.durationMs).toISOString(),
      spokenSec: Math.round(capture.audio.durationMs / 1000),
      overall: report.overall,
      band: report.band,
      dimensionScores: Object.fromEntries(report.dimensions.map((d) => [d.key, d.score])),
      reportId: report.id,
      demo: true,
    };
    await repo.saveReport(report);
    await repo.saveSession(session);
    created += 1;
  }
  return { sessions: created };
}
