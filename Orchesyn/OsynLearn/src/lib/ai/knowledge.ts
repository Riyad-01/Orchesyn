/**
 * A small, hand-curated knowledge base the offline tutor leans on so it can give
 * genuinely useful answers with zero API keys. It is intentionally compact —
 * enough to handle the common asks a learner actually types, and honest fallbacks
 * for everything else.
 */

/* ---------------- word / phrase definitions ---------------- */
export const DEFINITIONS: Record<string, { def: string; example: string; syn?: string[] }> = {
  ambiguous: { def: 'having more than one possible meaning; unclear', example: 'The instruction was ambiguous, so nobody knew what to do.', syn: ['vague', 'unclear'] },
  diligent: { def: 'hard-working and careful', example: 'She is a diligent student who never misses a deadline.', syn: ['hard-working', 'conscientious'] },
  resilient: { def: 'able to recover quickly from difficulty', example: 'Children are surprisingly resilient.', syn: ['tough', 'adaptable'] },
  meticulous: { def: 'very careful about small details', example: 'He kept meticulous records.', syn: ['thorough', 'precise'] },
  pragmatic: { def: 'dealing with things in a practical, realistic way', example: 'We need a pragmatic solution, not a perfect one.', syn: ['practical', 'sensible'] },
  inevitable: { def: 'certain to happen; unavoidable', example: 'Change is inevitable.', syn: ['unavoidable', 'certain'] },
  profound: { def: 'very deep or intense', example: 'The book had a profound effect on me.', syn: ['deep', 'significant'] },
  reluctant: { def: 'unwilling or hesitant to do something', example: 'He was reluctant to ask for help.', syn: ['hesitant', 'unwilling'] },
  ubiquitous: { def: 'present or found everywhere', example: 'Smartphones are now ubiquitous.', syn: ['everywhere', 'widespread'] },
  candid: { def: 'honest and direct, even when it is uncomfortable', example: 'She gave a candid opinion.', syn: ['frank', 'honest'] },
};

/* ---------------- idioms ---------------- */
export const IDIOMS: { idiom: string; meaning: string; example: string; topic: string[] }[] = [
  { idiom: 'break the ice', meaning: 'start a conversation in an awkward situation', example: 'He told a joke to break the ice.', topic: ['social', 'conversation', 'meeting', 'interview'] },
  { idiom: 'hit the nail on the head', meaning: 'describe exactly what is true', example: 'You hit the nail on the head with that comment.', topic: ['agreement', 'opinion'] },
  { idiom: 'a blessing in disguise', meaning: 'something good that seemed bad at first', example: 'Losing that job was a blessing in disguise.', topic: ['life', 'work'] },
  { idiom: 'bite the bullet', meaning: 'do something difficult you have been avoiding', example: 'I finally bit the bullet and booked the exam.', topic: ['courage', 'decision', 'work'] },
  { idiom: 'cost an arm and a leg', meaning: 'be very expensive', example: 'That laptop cost an arm and a leg.', topic: ['money', 'shopping'] },
  { idiom: 'once in a blue moon', meaning: 'very rarely', example: 'I see my cousins once in a blue moon.', topic: ['frequency', 'life'] },
  { idiom: 'the ball is in your court', meaning: 'it is your turn to act or decide', example: "I've made my offer; the ball is in your court.", topic: ['decision', 'negotiation', 'interview'] },
  { idiom: 'piece of cake', meaning: 'very easy', example: 'The interview was a piece of cake.', topic: ['difficulty', 'exam', 'interview'] },
  { idiom: 'under the weather', meaning: 'feeling slightly ill', example: "I'm feeling a bit under the weather today.", topic: ['health', 'life'] },
  { idiom: 'call it a day', meaning: 'stop working on something', example: "We're tired, let's call it a day.", topic: ['work'] },
];

/* ---------------- grammar rule explanations ---------------- */
export const GRAMMAR_NOTES: { keys: string[]; title: string; body: string }[] = [
  {
    keys: ['present perfect', 'have been', 'have done', 'since', 'for'],
    title: 'Present perfect vs past simple',
    body: 'Use the **present perfect** (have/has + past participle) for an action connected to now, or a time that is not finished: "I **have lived** here for two years." Use the **past simple** for a finished time: "I **lived** here in 2020." Signal words: *for, since, already, yet, ever, never* → present perfect; *yesterday, last week, in 2019* → past simple.',
  },
  {
    keys: ['article', 'a or an', 'the', 'a/an'],
    title: 'When to use a / an / the',
    body: 'Use **a/an** for one non-specific thing ("I saw **a** dog"). Use **the** when both you and the listener know which one ("**the** dog next door"). Use **no article** for plural/uncountable things in general ("**Dogs** are loyal", "**Water** is essential"). Use **an** before a vowel *sound**: an hour, an MBA.',
  },
  {
    keys: ['conditional', 'if', 'would', 'second conditional', 'third conditional'],
    title: 'The conditionals',
    body: '**Zero**: If + present, present — general truths: "If you heat ice, it melts." **First**: If + present, will — real future: "If it rains, I **will** stay home." **Second**: If + past, would — unreal present: "If I **had** time, I **would** travel." **Third**: If + past perfect, would have — unreal past: "If I **had known**, I **would have called**."',
  },
  {
    keys: ['preposition', 'in on at', 'in/on/at'],
    title: 'in / on / at (time & place)',
    body: '**Time**: *at* a clock time (at 6pm), *on* a day (on Monday), *in* a month/year/season (in June, in 2024). **Place**: *at* a point (at the door), *on* a surface (on the table), *in* an enclosed space (in the room).',
  },
  {
    keys: ['countable', 'much many', 'much/many', 'a lot'],
    title: 'much / many / a lot of',
    body: '**Many** for countable nouns ("many books"), **much** for uncountable ("much water"), mostly in questions/negatives. In positive sentences prefer **a lot of** for both: "a lot of books", "a lot of water."',
  },
  {
    keys: ['modal', 'should', 'must', 'have to'],
    title: 'should / must / have to',
    body: '**Should** = advice ("You should rest"). **Must** = strong obligation or the speaker’s rule ("You must wear a badge"). **Have to** = external obligation ("I have to leave at 6"). Negative: "mustn’t" = forbidden; "don’t have to" = not necessary.',
  },
];

/* ---------------- "better ways to say" upgrades ---------------- */
export const UPGRADES: Record<string, string[]> = {
  'very good': ['excellent', 'outstanding', 'impressive', 'first-rate'],
  'very bad': ['terrible', 'awful', 'dreadful', 'poor'],
  'very big': ['enormous', 'massive', 'vast', 'considerable'],
  'very small': ['tiny', 'minuscule', 'slight'],
  'very happy': ['thrilled', 'delighted', 'overjoyed'],
  'very sad': ['devastated', 'heartbroken', 'miserable'],
  'very tired': ['exhausted', 'drained', 'worn out'],
  'very important': ['crucial', 'essential', 'vital', 'critical'],
  'very interesting': ['fascinating', 'compelling', 'captivating'],
  'a lot': ['a great deal', 'plenty', 'a considerable amount'],
  'i think': ['I believe', 'In my view', 'It seems to me'],
  'get': ['obtain', 'receive', 'acquire'],
  'good': ['beneficial', 'effective', 'favourable'],
  nice: ['pleasant', 'delightful', 'lovely'],
  'said': ['mentioned', 'remarked', 'explained', 'noted'],
};

/* ---------------- minimal pairs for pronunciation ---------------- */
export const MINIMAL_PAIRS: { a: string; b: string; sound: string }[] = [
  { a: 'ship', b: 'sheep', sound: '/ɪ/ vs /iː/' },
  { a: 'bat', b: 'bet', sound: '/æ/ vs /e/' },
  { a: 'full', b: 'fool', sound: '/ʊ/ vs /uː/' },
  { a: 'cat', b: 'cut', sound: '/æ/ vs /ʌ/' },
  { a: 'think', b: 'sink', sound: '/θ/ vs /s/' },
  { a: 'live', b: 'leave', sound: '/ɪ/ vs /iː/' },
];

/* ---------------- pronunciation breakdown for hard words ---------------- */
export const PRONUNCIATION: Record<string, string> = {
  entrepreneur: 'on-truh-pruh-NUR (stress on the last syllable)',
  rural: 'ROO-ruhl (two syllables, roll the r lightly)',
  comfortable: 'KUMF-ter-bul (three syllables, not four)',
  vegetable: 'VEJ-tuh-bul (three syllables)',
  photograph: 'FOH-tuh-graf (stress first)',
  photography: 'fuh-TOG-ruh-fee (stress moves to the middle)',
  world: 'wurld (one syllable — the r and l blend together)',
  squirrel: 'SKWIR-ul (two syllables)',
  colonel: 'KER-nul (sounds nothing like it is spelled)',
  choir: 'KWY-ur (one syllable)',
};

export function findDefinition(term: string) {
  const key = term.toLowerCase().trim().replace(/[?.!]+$/, '');
  return DEFINITIONS[key] ? { term: key, ...DEFINITIONS[key] } : null;
}

export function findIdioms(query: string, limit = 3) {
  const q = query.toLowerCase();
  const scored = IDIOMS.map((i) => {
    let s = 0;
    for (const t of i.topic) if (q.includes(t)) s += 2;
    for (const w of i.idiom.split(' ')) if (w.length > 3 && q.includes(w)) s += 1;
    return { i, s };
  });
  const matched = scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.i);
  return (matched.length ? matched : IDIOMS).slice(0, limit);
}

export function findGrammarNote(query: string) {
  const q = query.toLowerCase();
  let best: { note: (typeof GRAMMAR_NOTES)[number]; s: number } | null = null;
  for (const note of GRAMMAR_NOTES) {
    let s = 0;
    for (const k of note.keys) if (q.includes(k.toLowerCase())) s += k.includes(' ') ? 3 : 2;
    if (s && (!best || s > best.s)) best = { note, s };
  }
  return best?.note ?? null;
}

export function findUpgrade(phrase: string): { phrase: string; options: string[] } | null {
  const key = phrase.toLowerCase().trim();
  if (UPGRADES[key]) return { phrase: key, options: UPGRADES[key] };
  for (const [k, v] of Object.entries(UPGRADES)) if (key.includes(k)) return { phrase: k, options: v };
  return null;
}

export function findMinimalPair(word: string) {
  const w = word.toLowerCase();
  return MINIMAL_PAIRS.find((p) => p.a === w || p.b === w) ?? null;
}
