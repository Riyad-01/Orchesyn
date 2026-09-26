/**
 * The offline tutor engine.
 *
 * When no LLM endpoint is configured, the AI chat still has to be genuinely
 * useful — not a canned apology. This module turns the learner's message into a
 * real, structured response by reusing the *actual* scoring engine (grammar
 * rules, filler detection, vocabulary tier, WPM) plus a curated knowledge base,
 * then shaping the output for the active persona.
 *
 * Everything here is deterministic and synchronous, so it runs offline in the PWA.
 */

import type { SpeechCapture } from '@/types';
import { analyseSpeech } from '@/lib/scoring';
import { scoreToBand, suggestedUpgrades } from '@/lib/scoring';
import { tokenize } from '@/lib/scoring';
import {
  findDefinition,
  findGrammarNote,
  findIdioms,
  findMinimalPair,
  findUpgrade,
  PRONUNCIATION,
} from './knowledge';
import type { AiPersona } from './personas';

export interface TutorContext {
  level: string;
  name: string;
  goal: string;
  /** one-line snapshot of the learner's actual recent evidence (attempts, unseen accuracy, current lesson) */
  evidence?: string;
}

export interface TutorReply {
  markdown: string;
  /** small stats the UI shows as chips under the bubble */
  meta?: { label: string; value: string; tone?: 'good' | 'mid' | 'bad' | 'brand' }[];
  /** follow-up prompt suggestions rendered as chips */
  chips?: string[];
}

/** Build a SpeechCapture from typed text so the scoring engine can analyse it. */
export function captureFromText(text: string): SpeechCapture {
  const words = text.split(/\s+/).filter(Boolean);
  const durationMs = Math.max(2, Math.round((words.length / 130) * 60)) * 1000;
  const per = durationMs / Math.max(words.length, 1);
  return {
    transcript: text.trim(),
    words: words.map((word, i) => ({
      word,
      startMs: Math.round(i * per),
      endMs: Math.round(i * per + per * 0.78),
      confidence: -1,
    })),
    segments: [],
    audio: {
      durationMs,
      avgLoudness: 0.5,
      peakLoudness: 0.7,
      silenceMs: 0,
      envelope: [],
      clipped: false,
    },
    engine: 'manual',
    latencyMs: 0,
    typedFallback: true,
  };
}

const isQuestion = (t: string) => /\?$/.test(t.trim()) || /^(what|when|where|why|how|who|which|can|could|should|do|does|did|is|are|am)\b/i.test(t.trim());
const asksDefinition = (t: string) => /\b(mean|meaning|define|definition|what does|what is)\b/i.test(t);
const asksGrammar = (t: string) => /\b(grammar|tense|article|preposition|conditional|rule|when do i use|difference between)\b/i.test(t);
const asksIdiom = (t: string) => /\b(idiom|phrase|expression|slang|saying)\b/i.test(t);
const asksBetterWay = (t: string) => /\b(better way|another way|instead of|upgrade|synonym|fancy word|professional)\b/i.test(t);
const asksPronounce = (t: string) => /\b(pronounce|pronunciation|say |syllable|stress|sound)\b/i.test(t);

function bulletList(items: string[]): string {
  return items.map((i) => `- ${i}`).join('\n');
}

/** The main entry point: produce a persona-shaped reply to a learner message. */
export function tutorRespond(rawText: string, persona: AiPersona, ctx: TutorContext): TutorReply {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const words = tokenize(text).filter((t) => t.word).length;

  // Very short greetings — respond conversationally, no analysis.
  if (words <= 2 && !isQuestion(text)) {
    return {
      markdown: `Hey ${ctx.name}! 👋 I'm your ${persona.name.toLowerCase()}. Send me a sentence, a paragraph, or a question and I'll jump in. You can also tap one of the starter prompts below.`,
      chips: persona.starters,
    };
  }

  // Explicit correction requests always route to the corrector, whatever persona is active.
  const asksCorrection =
    /^(check|correct|fix|proofread)\b/i.test(text) ||
    /\b(check|correct|fix|review)\s+(my|this|the)\s+(sentence|paragraph|essay|answer|text|grammar)\b/i.test(text);
  if (asksCorrection) persona = { ...persona, focus: 'grammar' };

  // ---- Intent-based answers that don't need full scoring ----
  if (asksDefinition(text)) {
    const m = text.match(/(?:what does|what is|define|definition of|meaning of|meaning|mean)\s+([a-zA-Z][a-zA-Z-]*)/i);
    const term = m ? m[1] : '';
    const d = findDefinition(term);
    if (d) {
      return {
        markdown: `**${d.term}** — ${d.def}.\n\n> ${d.example}${d.syn?.length ? `\n\n**Synonyms:** ${d.syn.join(', ')}` : ''}`,
        chips: [`Teach me an idiom about ${d.term}`, `Use "${d.term}" in 3 sentences`],
      };
    }
  }

  if (asksGrammar(text)) {
    const note = findGrammarNote(text);
    if (note) {
      return {
        markdown: `### ${note.title}\n\n${note.body}`,
        chips: ['Give me a practice sentence', 'Correct my sentence with this rule'],
      };
    }
  }

  if (asksIdiom(text)) {
    const list = findIdioms(text, 3);
    return {
      markdown: `Here are some natural idioms you can use:\n\n${list
        .map((i) => `**${i.idiom}** — ${i.meaning}.\n  *"${i.example}"*`)
        .join('\n\n')}`,
      chips: ['Use these in a sentence about work', 'Give me more idioms'],
    };
  }

  if (asksBetterWay(text)) {
    const m = text.match(/(?:better way to say|another way to say|instead of|upgrade)\s+["']?([a-zA-Z][a-zA-Z ]*?)["']?[?.!]*$/i);
    const target = m ? m[1].trim() : text;
    const up = findUpgrade(target);
    if (up) {
      return {
        markdown: `Instead of **"${up.phrase}"**, try:\n\n${bulletList(up.options.map((o) => `**${o}**`))}\n\nPick based on tone — the first options are more neutral, the later ones stronger.`,
        chips: ['Use one in a sentence', 'Upgrade a whole paragraph'],
      };
    }
  }

  if (asksPronounce(text)) {
    const m = text.match(/(?:pronounce|pronunciation of|say)\s+["']?([a-zA-Z][a-zA-Z-]*)/i);
    const word = m ? m[1].toLowerCase() : '';
    const breakdown = word ? PRONUNCIATION[word] : null;
    const pair = word ? findMinimalPair(word) : null;
    if (breakdown || pair) {
      let md = breakdown ? `**${word}** is pronounced: **${breakdown}**.` : `**${word}** — here's how to nail it:`;
      if (pair) md += `\n\nPractice this minimal pair: **${pair.a}** vs **${pair.b}** (${pair.sound}). Say them slowly, then faster.`;
      md += `\n\n💡 Tip: record yourself in the **Speak** tab and compare — the engine flags the exact syllable.`;
      return { markdown: md, chips: ['Another tricky word', `What's the stress in "${word}"?`] };
    }
  }

  // ---- Contextual coaching: answer plan/advice questions from the learner's REAL evidence ----
  const asksPlan =
    /\b(how|what) (should|can|do) i (practice|improve|study)\b/.test(lower) ||
    /\b(my|a) (study|practice) plan\b/.test(lower) ||
    /\bwhat should i (work on|focus on)\b/.test(lower) ||
    /\bhow do i improve\b/.test(lower);
  if (asksPlan && ctx.evidence) {
    return {
      markdown: `Here is what YOUR recent attempts actually show:\n\n${ctx.evidence}\n\nSo today: attack the weakest area above first — one lesson aimed at it, then one attempt on unseen material (a fresh prompt, not a rewrite). Fifteen focused minutes beats an hour of rereading.`,
      meta: [{ label: 'source', value: 'your attempts', tone: 'brand' }],
      chips: ['Give me a drill for my weakest area', 'Start a fresh speaking topic'],
    };
  }

  // ---- Otherwise: analyse the text with the real scoring engine ----
  const report = analyseSpeech({ sessionId: 'ai-tutor', mode: 'coach', capture: captureFromText(text) });
  const g = report.grammarIssues;
  const band = report.band;
  const wpm = Math.round(report.metrics.wpm);
  const fillers = report.metrics.fillerCount;

  switch (persona.focus) {
    case 'grammar':
    case 'writing': {
      if (!g.length && words < 40) {
        return {
          markdown: `That's clean — I didn't find any grammar errors. 👏 ${persona.focus === 'writing' ? 'It reads naturally.' : 'Well done.'}\n\nWant a bigger challenge? Paste a longer paragraph or ask me for a tougher rewrite.`,
          meta: [{ label: 'errors', value: '0', tone: 'good' }, { label: 'words', value: String(words) }],
          chips: ['Give me a harder sentence to correct', 'Teach me a grammar rule'],
        };
      }
      const fixes = g.slice(0, 5).map((i) => `**"${i.quote}"** → **${i.correction}**\n  ${i.explanation}`);
      const corrected = applyCorrections(text, g);
      const head = persona.focus === 'writing' ? 'Here is a polished version:' : 'Here are the fixes:';
      return {
        markdown: `${g.length ? `**${g.length} issue${g.length > 1 ? 's' : ''} found.**\n\n${fixes.join('\n\n')}\n\n` : ''}${head}\n\n> ${corrected}`,
        meta: [
          { label: 'issues', value: String(g.length), tone: g.length ? 'mid' : 'good' },
          { label: 'est. band', value: band.toFixed(1), tone: 'brand' },
        ],
        chips: ['Why is that wrong?', 'Rewrite it more formally'],
      };
    }

    case 'vocab': {
      const upgrades = suggestedUpgrades(tokenize(text)).slice(0, 4);
      const idiom = findIdioms(text, 1)[0];
      let md = `Nice — you used **${report.metrics.uniqueWords} different words** in ${words} words.`;
      if (upgrades.length) {
        md += `\n\n**Level-up suggestions:**\n${bulletList(upgrades.map((u) => `"${u.instead}" → **${u.use}** — _${u.why}_`))}`;
      }
      md += `\n\n**Idiom of the moment:** *${idiom.idiom}* — ${idiom.meaning}. \n> ${idiom.example}`;
      return {
        markdown: md,
        meta: [
          { label: 'unique words', value: String(report.metrics.uniqueWords) },
          { label: 'rare words', value: String(report.metrics.rareWordCount), tone: 'brand' },
        ],
        chips: ['More synonyms', 'Teach me 5 topic words'],
      };
    }

    case 'exam': {
      const crit = report;
      return {
        markdown: `**Estimated IELTS Speaking band: ${band.toFixed(1)}** (from this answer alone).\n\n` +
          `**Fluency & coherence:** ${scoreToBand(crit.dimensions.find((d) => d.key === 'fluency')?.score ?? 0).toFixed(1)}\n` +
          `**Lexical resource:** ${scoreToBand(crit.dimensions.find((d) => d.key === 'vocabulary')?.score ?? 0).toFixed(1)}\n` +
          `**Grammar:** ${scoreToBand(crit.dimensions.find((d) => d.key === 'grammar')?.score ?? 0).toFixed(1)}\n\n` +
          `**To lift your band:**\n${bulletList([
            g.length ? `Reduce small grammar slips (${g.length} here) — accuracy at speed is what separates 6.5 from 7.5.` : 'Your accuracy is solid; add more complex structures (conditionals, relative clauses).',
            report.metrics.uniqueWords < words * 0.6 ? 'Avoid repeating words — use paraphrase and topic vocabulary.' : 'Good lexical range; add one idiomatic phrase.',
            words < 45 ? 'Extend your answer: give a reason and an example (the "AREA" method).' : 'Good length — keep a clear point, reason, example structure.',
          ])}`,
        meta: [
          { label: 'band', value: band.toFixed(1), tone: 'brand' },
          { label: 'words', value: String(words) },
          { label: 'pace', value: `${wpm} wpm` },
        ],
        chips: ['Give me a Part 2 cue card', 'Ask me a Part 3 question'],
      };
    }

    case 'interview': {
      const structured = words > 60;
      return {
        markdown: `Good attempt. Quick feedback:\n\n` +
          bulletList([
            structured ? '✅ You gave enough detail — good length for a behavioural answer.' : '⚠️ Keep it short — aim for ~60–90 seconds. Structure with **S**ituation, **T**ask, **A**ction, **R**esult.',
            g.length ? `Watch small grammar slips (${g.length}) — slow down slightly to stay accurate.` : '✅ Grammar was accurate.',
            fillers ? `You used ${fillers} filler${fillers > 1 ? 's' : ''} — pause silently instead of "um" to sound more confident.` : '✅ No filler words — confident delivery.',
          ]) +
          `\n\n**Model opener:** "In my last role, I was responsible for ___ , and one challenge I remember is ___ . I decided to ___ , which resulted in ___ ."`,
        meta: [
          { label: 'fillers', value: String(fillers), tone: fillers ? 'mid' : 'good' },
          { label: 'pace', value: `${wpm} wpm` },
        ],
        chips: ['Ask me the next question', 'Give me a STAR example'],
      };
    }

    case 'pronounce': {
      const flags = report.pronunciationFlags.slice(0, 4);
      return {
        markdown: flags.length
          ? `From your text, these words often trip learners up — practise them:\n\n${bulletList(flags.map((f) => `**${f.word}**`))}\n\nOpen the **Speak** tab and record — I'll mark the exact syllable and give a score.`
          : `Your word choice is clear. To practise pronunciation, record yourself in the **Speak** tab — I'll score each word and show the exact syllable to fix.`,
        chips: ['How do I pronounce "entrepreneur"?', 'Give me a minimal pair drill'],
      };
    }

    case 'roleplay': {
      return {
        markdown: `Got it — let's keep the scene going. 👍\n\n*(in character)* "${roleplayLine(lower)}"\n\n${g.length ? `_Tiny tip: "${g[0].quote}" → **${g[0].correction}**._` : ''}`,
        chips: ['Continue the scene', 'End the role-play and give feedback'],
      };
    }

    // free conversation (default)
    default: {
      const opener = freeTalkOpener(lower, ctx.name);
      const note = g.length
        ? `\n\n_Quick fix: "${g[0].quote}" → **${g[0].correction}** (${g[0].explanation})_`
        : '';
      return {
        markdown: `${opener}${note}`,
        meta: words > 6 ? [
          { label: 'words', value: String(words) },
          { label: 'band', value: band.toFixed(1), tone: 'brand' },
          { label: 'fillers', value: String(fillers), tone: fillers ? 'mid' : 'good' },
        ] : undefined,
        chips: ['Ask me a follow-up question', 'Correct my last message', 'Change topic'],
      };
    }
  }
}

/* ---------------- helpers ---------------- */

function applyCorrections(text: string, issues: { quote: string; correction: string }[]): string {
  let out = text;
  for (const i of issues) {
    if (!i.quote) continue;
    const idx = out.toLowerCase().indexOf(i.quote.toLowerCase());
    if (idx >= 0) out = out.slice(0, idx) + i.correction + out.slice(idx + i.quote.length);
  }
  return out;
}

function freeTalkOpener(lower: string, name: string): string {
  if (/(hello|hi|hey|good (morning|evening|afternoon))/.test(lower)) return `Hey ${name}! Great to see you. What's been the highlight of your day so far?`;
  if (/(travel|trip|holiday|vacation|visit)/.test(lower)) return `Ooh, travel — I love this topic. What's the most memorable place you've ever been to, and what made it special?`;
  if (/(work|job|office|boss|career)/.test(lower)) return `Work talk! What's the most interesting project you've worked on recently, and what did you enjoy about it?`;
  if (/(food|eat|cook|restaurant|meal)/.test(lower)) return `Food is the best conversation starter. What's a dish from your hometown you could eat every single day?`;
  if (/(study|exam|school|university|learn)/.test(lower)) return `Nice — what are you studying right now, and what's the hardest part about it?`;
  if (/(movie|film|series|music|song|book)/.test(lower)) return `Good taste topic! What's the last thing you watched or read that you'd actually recommend to a friend?`;
  return `Interesting — tell me more about that. What made you think of it, ${name}?`;
}

function roleplayLine(lower: string): string {
  if (/(coffee|cafe|order)/.test(lower)) return `Hi there! Welcome in. What can I get started for you today — we have a new cold brew special.'`;
  if (/(interview|recruiter|job)/.test(lower)) return `Thanks for coming in today. To start, could you tell me a little about yourself and why you're interested in this role?`;
  if (/(delivery|late|complain|refund)/.test(lower)) return `I'm sorry to hear there's an issue with your order. Can you tell me exactly what arrived and what you were expecting?`;
  if (/(hotel|room|check)/.test(lower)) return `Welcome! Do you have a reservation with us, and how many nights will you be staying?`;
  return `Sure, let's continue. What would you like to say next in this situation?`;
}
