import type { Drill, RoadmapDay } from '@/types';

/**
 * Targeted drills. Each one attacks a single dimension with a measurable
 * success criterion, so "practise your fluency" becomes something you can
 * actually do in ninety seconds and check.
 */
export const DRILLS: Drill[] = [
  /* ---- fluency ---- */
  {
    id: 'linker-bridges', title: 'Bridge the gaps', dimension: 'fluency', level: 'any', seconds: 90, category: 'fluency',
    instruction: 'Speak for 90 seconds. Every time you feel a pause coming, use a linker instead of silence.',
    prompt: 'Talk about a typical day in your life, from waking up to going to sleep.',
    successCriterion: 'Fewer than 2 awkward pauses (over 1.2s) in 90 seconds.',
  },
  {
    id: 'openers', title: 'Zero-lag openers', dimension: 'fluency', level: 'any', seconds: 60, category: 'fluency',
    instruction: 'Start speaking within 1 second of the timer starting. Use a stock opener while you plan.',
    prompt: 'Do you think your country is changing quickly? Begin immediately with "Well, I would say that…"',
    successCriterion: 'First word within 1.5 seconds.',
  },
  {
    id: 'two-minute-turn', title: 'Two-minute long turn', dimension: 'fluency', level: 'B2', seconds: 120, category: 'fluency',
    instruction: 'Speak continuously for two full minutes on one topic. Do not stop, even to correct yourself.',
    prompt: 'Describe a person who has influenced the way you think.',
    successCriterion: 'At least 200 words with no pause over 1.5 seconds.',
  },
  {
    id: 'false-starts', title: 'No false starts', dimension: 'fluency', level: 'any', seconds: 60, category: 'fluency',
    instruction: 'Slow the first two words of each sentence slightly. Finish every clause you begin.',
    prompt: 'Describe your home town to someone who has never visited your country.',
    successCriterion: 'Zero self-corrections or restarted sentences.',
  },

  /* ---- pace ---- */
  {
    id: 'pace-metronome', title: 'Hit the 140 wpm band', dimension: 'pace', level: 'any', seconds: 60, category: 'delivery',
    instruction: 'Aim for 110-165 words per minute. If you are a slow speaker, link short phrases; if fast, pause at commas.',
    prompt: 'Explain how to make your favourite drink, step by step.',
    successCriterion: 'Between 110 and 165 words per minute.',
  },
  {
    id: 'slow-down', title: 'Deliberately slower', dimension: 'pace', level: 'any', seconds: 60, category: 'delivery',
    instruction: 'Speak at roughly 110 wpm. Pause one full beat at every comma.',
    prompt: 'Describe a journey you remember well.',
    successCriterion: 'Under 140 wpm with natural pauses at clause boundaries.',
  },

  /* ---- fillers ---- */
  {
    id: 'filler-free-60', title: 'Sixty seconds, zero fillers', dimension: 'fillers', level: 'any', seconds: 60, category: 'delivery',
    instruction: 'Speak for 60 seconds. Every time you would say "um", pause silently instead.',
    prompt: 'Talk about something you are looking forward to.',
    successCriterion: 'No more than 1 filler in 60 seconds.',
  },
  {
    id: 'filler-swap', title: 'Swap fillers for linkers', dimension: 'fillers', level: 'B1', seconds: 90, category: 'delivery',
    instruction: 'Replace every "um" or "like" with a linker: that said, on the other hand, in other words.',
    prompt: 'Do you think social media has made communication better or worse?',
    successCriterion: 'At least 3 linkers used and fewer than 3 fillers.',
  },

  /* ---- pronunciation ---- */
  {
    id: 'pronunciation-minimal-pairs', title: 'Minimal pairs', dimension: 'pronunciation', level: 'any', seconds: 90, category: 'sounds',
    instruction: 'Say each pair slowly, exaggerating the difference, then at natural speed: ship/sheep, pin/pen, thin/then, boat/bought, full/fool.',
    prompt: 'Repeat: "The sheep on the ship shipped six thick pins." then "She sells thin things on Thursday."',
    successCriterion: 'Every word recognised correctly on the first attempt.',
  },
  {
    id: 'word-stress', title: 'Word stress patterns', dimension: 'pronunciation', level: 'any', seconds: 90, category: 'sounds',
    instruction: 'Stress the syllable in capitals: PHOtograph, phoTOGraphy, photoGRAPHic. Keep the rhythm even.',
    prompt: 'Say: photograph, photography, photographic. Then: develop, development, developmental.',
    successCriterion: 'Stress lands on the correct syllable in all six words.',
  },
  {
    id: 'sentence-stress', title: 'Sentence stress', dimension: 'pronunciation', level: 'B1', seconds: 90, category: 'sounds',
    instruction: 'Stress only the content words. Function words should be short and quiet.',
    prompt: 'Say: "I WANT to GO to the MARket BEFORE it CLOSES."',
    successCriterion: 'Content words are clearly longer and louder than function words.',
  },
  {
    id: 'th-sounds', title: 'The /θ/ and /ð/ sounds', dimension: 'pronunciation', level: 'any', seconds: 60, category: 'sounds',
    instruction: 'Tongue between the teeth. Not "t", not "d", not "s".',
    prompt: 'Say: think, thank, three, birthday. Then: this, that, those, brother, weather.',
    successCriterion: 'All nine words recognised correctly.',
  },
  {
    id: 'projection', title: 'Project your voice', dimension: 'clarity', level: 'any', seconds: 60, category: 'sounds',
    instruction: 'Speak as if addressing someone three metres away. Hold the device 15-20cm from your mouth.',
    prompt: 'Introduce yourself and describe what you do, as if to a room of twenty people.',
    successCriterion: 'Average loudness above 0.03 with no clipping.',
  },

  /* ---- grammar ---- */
  {
    id: 'articles-a-an', title: 'a / an accuracy', dimension: 'grammar', level: 'any', seconds: 60, category: 'accuracy',
    instruction: 'Speak in full sentences. Watch every article: "an" before a vowel sound, "a" before a consonant sound.',
    prompt: 'Describe an object in the room: an apple, a university degree, an hour, a uniform.',
    successCriterion: 'Zero article errors.',
  },
  {
    id: 'subject-verb', title: 'Subject-verb agreement', dimension: 'grammar', level: 'A2', seconds: 60, category: 'accuracy',
    instruction: 'Third person singular takes -s. Say each sentence twice: once about yourself, once about a friend.',
    prompt: 'Talk about your daily routine, then about your best friend\'s routine.',
    successCriterion: 'Zero agreement errors across both descriptions.',
  },
  {
    id: 'auxiliary-base-form', title: 'Base form after auxiliaries', dimension: 'grammar', level: 'A2', seconds: 60, category: 'accuracy',
    instruction: 'After did / didn\'t / can / should the verb stays in its base form: "didn\'t go", never "didn\'t went".',
    prompt: 'Describe three things you did yesterday and three things you did not do.',
    successCriterion: 'Zero past-tense errors after an auxiliary.',
  },
  {
    id: 'countable-uncountable', title: 'Countable vs uncountable', dimension: 'grammar', level: 'B1', seconds: 60, category: 'accuracy',
    instruction: 'Information, advice, furniture, luggage, equipment and research have no plural. Say "a piece of…".',
    prompt: 'Describe what you packed for your last trip and what advice you were given.',
    successCriterion: 'No uncountable noun given a plural.',
  },
  {
    id: 'complex-structures', title: 'Complex structures', dimension: 'grammar', level: 'B2', seconds: 90, category: 'accuracy',
    instruction: 'Use at least one conditional, one relative clause and one passive in your answer.',
    prompt: 'If you could change one thing about your city, what would it be and why?',
    successCriterion: 'Three complex structures used accurately.',
  },
  {
    id: 'register-clean-up', title: 'Formal register', dimension: 'grammar', level: 'B2', seconds: 90, category: 'accuracy',
    instruction: 'No "gonna", no "discuss about", no "return back". Use full forms and precise collocations.',
    prompt: 'Explain to a manager why a project is delayed and what you will do about it.',
    successCriterion: 'Zero informal forms or redundancies.',
  },
  {
    id: 'time-prepositions', title: 'Prepositions of time', dimension: 'grammar', level: 'A2', seconds: 60, category: 'accuracy',
    instruction: '"on" + day, "in" + month/year, "at" + clock time. Nothing before yesterday, today, tomorrow.',
    prompt: 'Describe your schedule for yesterday, today and tomorrow.',
    successCriterion: 'Zero preposition errors.',
  },

  /* ---- vocabulary ---- */
  {
    id: 'lexical-upgrades', title: 'Upgrade five words', dimension: 'vocabulary', level: 'B1', seconds: 90, category: 'range',
    instruction: 'Before you speak, choose five common words and decide the precise alternative for each (good → excellent, big → substantial).',
    prompt: 'Describe a recent purchase and whether it was worth it.',
    successCriterion: 'At least 5 less common words used accurately.',
  },
  {
    id: 'no-repeat', title: 'No repeated content words', dimension: 'vocabulary', level: 'B1', seconds: 90, category: 'range',
    instruction: 'Pick a topic and speak without using the same content word twice. Use synonyms and pronouns.',
    prompt: 'Describe your favourite place in your city.',
    successCriterion: 'No content word used more than twice.',
  },
  {
    id: 'collocations', title: 'Collocation practice', dimension: 'vocabulary', level: 'B2', seconds: 90, category: 'range',
    instruction: 'Use natural pairings: make a decision, take responsibility, heavy rain, strong coffee, deep sleep.',
    prompt: 'Describe a difficult decision you made recently.',
    successCriterion: 'At least 4 correct collocations.',
  },
  {
    id: 'ielts-part2-longturn', title: 'IELTS Part 2 long turn', dimension: 'fluency', level: 'B2', seconds: 120, category: 'exam',
    instruction: 'One minute of notes, then speak for two full minutes without stopping.',
    prompt: 'Describe a skill you would like to learn. Say what it is, why you want it, how you would learn it, and how it would benefit you.',
    successCriterion: 'Two full minutes of speech covering all four cue points.',
  },
];

export function getDrill(id: string): Drill | undefined {
  return DRILLS.find((d) => d.id === id);
}

export function drillsForDimension(dimension: string): Drill[] {
  return DRILLS.filter((d) => d.dimension === dimension);
}

/* ------------------------------------------------------------------ *
 * Day-wise roadmap
 * ------------------------------------------------------------------ */

const FOCUS_CYCLE = ['fluency', 'pronunciation', 'grammar', 'vocabulary', 'fillers', 'pace'] as const;

const DAY_TITLES = [
  'Find your flow', 'Clear sounds', 'Accurate sentences', 'Wider words', 'Drop the fillers',
  'Steady pace', 'Long turns', 'Exam rehearsal', 'Review and repeat', 'Push your band',
];

/**
 * Build a day-wise plan. Days cycle through the six dimensions, and the daily
 * minutes come from what the learner said they realistically have.
 */
export function buildRoadmap(opts: {
  days: number;
  minutesPerDay: number;
  goal?: string;
  weakest?: string[];
}): RoadmapDay[] {
  const days: RoadmapDay[] = [];
  for (let i = 1; i <= opts.days; i++) {
    // weakest dimensions get scheduled twice as often
    const focus =
      opts.weakest?.length && i % 2 === 1
        ? (opts.weakest[i % opts.weakest.length] as (typeof FOCUS_CYCLE)[number])
        : FOCUS_CYCLE[i % FOCUS_CYCLE.length];

    const drills = drillsForDimension(focus);
    const drill = drills[i % drills.length];
    const items: RoadmapDay['items'] = [
      { kind: 'drill', id: drill.id, label: drill.title },
    ];

    if (opts.minutesPerDay >= 10) {
      items.push({ kind: 'impromptu', id: 'random', label: 'One 60-second impromptu speech' });
    }
    if (opts.minutesPerDay >= 15) {
      items.push({ kind: 'coach', id: 'random', label: 'A short conversation with Sarah' });
    }
    if (opts.minutesPerDay >= 25 && i % 7 === 0) {
      items.push({ kind: 'ielts', id: `mock-${((i / 7 - 1) % 6) + 1}`, label: 'Full IELTS speaking mock' });
    }
    if (opts.goal === 'ielts' && i % 3 === 0) {
      items.push({ kind: 'ielts', id: 'part2-practice', label: 'One Part 2 cue card' });
    }
    items.push({ kind: 'review', id: 'yesterday', label: 'Re-read yesterday\'s feedback' });

    days.push({
      day: i,
      title: DAY_TITLES[(i - 1) % DAY_TITLES.length],
      focus,
      minutes: Math.max(5, Math.round(items.length * (opts.minutesPerDay / items.length))),
      items,
      tip: DAY_TIPS[focus],
    });
  }
  return days;
}

export const DAY_TIPS: Record<string, string> = {
  fluency: 'Fluency is not speed. It is the ability to keep going without breaking the thread.',
  pronunciation: 'Exaggerate the problem sound slowly first, then speed up. Muscles learn slowly.',
  grammar: 'Pick one error type per day. Fixing everything at once fixes nothing.',
  vocabulary: 'Learn words in chunks, not alone: "make a decision", not "decision".',
  fillers: 'A silent pause sounds confident. A filler sounds unsure. Silence is free.',
  pace: 'Native monologue sits at 110-165 wpm. Faster is not better; clearer is better.',
  clarity: 'Slow the ends of your words. Most unclear speech is swallowed word endings.',
};
