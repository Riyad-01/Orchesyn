import type { GrammarIssue } from '@/types';
import { type Token } from './text';

/**
 * Rule-based grammatical range & accuracy checker.
 *
 * Every rule runs over the tokenised transcript and reports a word index, so the
 * UI can underline the exact offending span. Rules are deliberately conservative:
 * a false correction is worse for learner trust than a missed one, so anything
 * ambiguous (ASR homophones, "too/to", "their/there") is not attempted.
 */

export interface GrammarRule {
  id: string;
  category: GrammarIssue['category'];
  severity: GrammarIssue['severity'];
  /** short human label used in the insights breakdown */
  label: string;
  run: (tokens: Token[]) => Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[];
}

/* ---------------- helpers ---------------- */

const THIRD_PERSON = new Set([
  'he', 'she', 'it', 'this', 'that', 'everyone', 'everybody', 'nobody', 'noone', 'someone',
  'somebody', 'anyone', 'anybody', 'nothing', 'something', 'everything', 'government', 'company',
  'world', 'country', 'family', 'society', 'technology', 'internet', 'time', 'money', 'work', 'life',
]);


const BASE_TO_PAST: Record<string, string> = {
  go: 'went', come: 'came', see: 'saw', make: 'made', take: 'took', give: 'gave',
  tell: 'told', say: 'said', find: 'found', know: 'knew', get: 'got', think: 'thought',
  feel: 'felt', leave: 'left', keep: 'kept', begin: 'began', hear: 'heard', run: 'ran',
  mean: 'meant', speak: 'spoke', write: 'wrote', read: 'read', eat: 'ate', drink: 'drank',
  become: 'became',
};

const PLURAL_SUBJECTS = new Set([
  'i', 'we', 'you', 'they', 'people', 'students', 'children', 'men', 'women', 'parents', 'friends',
  'these', 'those', 'both', 'many', 'some', 'others',
]);

const BARE_VERBS = new Set([
  'go', 'want', 'need', 'like', 'think', 'know', 'say', 'make', 'take', 'come', 'see', 'find',
  'give', 'tell', 'feel', 'believe', 'seem', 'become', 'leave', 'keep', 'begin', 'show', 'hear',
  'play', 'run', 'move', 'live', 'work', 'study', 'help', 'learn', 'love', 'hate', 'mean', 'look',
  'seem', 'speak', 'write', 'read', 'eat', 'drink', 'watch', 'try', 'use', 'happen', 'change',
]);

const IRREGULAR_PAST = new Set([
  'went', 'came', 'saw', 'did', 'made', 'took', 'gave', 'told', 'said', 'found', 'knew', 'got',
  'thought', 'bought', 'brought', 'taught', 'caught', 'felt', 'left', 'met', 'paid', 'sent',
  'spent', 'stood', 'understood', 'wrote', 'ate', 'drank', 'drove', 'ran', 'sang', 'swam', 'began',
  'fell', 'won', 'lost', 'flew', 'grew', 'threw', 'wore', 'spoke', 'chose', 'broke', 'forgot',
]);

const MODAL_OR_DO = new Set([
  "didn't", 'did', "don't", "doesn't", 'do', 'does', "can't", 'can', 'cannot', 'could', 'should',
  'would', 'will', 'must', 'may', 'might', "won't", "wouldn't", "shouldn't", "couldn't", "mustn't",
]);

const STATIVE_VING = new Set([
  'knowing', 'believing', 'understanding', 'wanting', 'needing', 'liking', 'loving', 'hating',
  'preferring', 'remembering', 'forgetting', 'owning', 'possessing', 'agreeing', 'meaning',
  'consisting', 'containing', 'belonging', 'seeming', 'appearing',
]);

const UNCOUNTABLE_S = new Set([
  'peoples', 'informations', 'advices', 'furnitures', 'luggages', 'equipments', 'softwares',
  'sceneries', 'homeworks', 'researches', 'evidences', 'knowledges', 'staffs', 'moneys', 'datas',
  'feedbacks', 'breads', 'furnitures', 'traffics', 'luggages', 'musics', 'poetries', 'knowledges',
]);

const UNCOUNTABLE_SINGULAR = new Set([
  'information', 'advice', 'furniture', 'luggage', 'equipment', 'software', 'scenery', 'homework',
  'research', 'evidence', 'knowledge', 'staff', 'money', 'data', 'feedback', 'traffic', 'music',
  'poetry', 'news', 'work', 'progress', 'hair',
]);

/** plural form -> correct singular. Explicit, because regex stripping mangles "advices" -> "advic". */
const SINGULAR_OF: Record<string, string> = {
  peoples: 'people', informations: 'information', advices: 'advice', furnitures: 'furniture',
  luggages: 'luggage', equipments: 'equipment', softwares: 'software', sceneries: 'scenery',
  homeworks: 'homework', researches: 'research', evidences: 'evidence', knowledges: 'knowledge',
  staffs: 'staff', moneys: 'money', datas: 'data', feedbacks: 'feedback', breads: 'bread',
  traffics: 'traffic', musics: 'music', poetries: 'poetry',
};

const IRREGULAR_PLURALS = new Set(['children', 'people', 'men', 'women', 'feet', 'teeth', 'mice', 'geese']);

const VOWEL_SOUND_STARTS = [
  'hour', 'honest', 'honestly', 'honor', 'honour', 'heir', 'mba', 'mnc', 'x-ray', 'fbi', 'nri',
  'msc', 'mtech', 'mca', 'mbbs', 'btech', 'bba', 'ugc', 'un', 'uno',
];

const CONSONANT_SOUND_VOWEL_WORDS = new Set([
  'university', 'universities', 'uniform', 'uniforms', 'unique', 'uniquely', 'united', 'union',
  'useful', 'useless', 'user', 'users', 'usage', 'usual', 'usually', 'european', 'europeans',
  'eucalyptus', 'one', 'once', 'euro', 'euros', 'ewe', 'uk', 'us',
]);

const POINT_IN_TIME = new Set([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'yesterday', 'today',
  'tonight', 'tomorrow', 'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december', 'morning', 'afternoon', 'evening', 'weekend',
  'christmas', 'diwali', 'eid',
]);

const DAYS = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);

const INFORMAL = new Set(['gonna', 'wanna', 'kinda', 'gotta', 'dunno', 'lemme', 'gimme', 'sorta', 'hafta', 'oughta']);

const REPEAT_WHITELIST = new Set(['had', 'that', 'the', 'very', 'so', 'much', 'far', 'long', 'wait', 'no', 'stop', 'run']);

const QUOTE = (tokens: Token[], from: number, to: number) =>
  tokens.slice(from, to + 1).map((t) => t.raw).join(' ');


/* past tense -> past participle, ONLY where they differ (for "have went" -> "have gone") */
const PAST_TO_PARTICIPLE: Record<string, string> = {
  went: 'gone', saw: 'seen', ate: 'eaten', drank: 'drunk', drove: 'driven', ran: 'run',
  sang: 'sung', swam: 'swum', began: 'begun', fell: 'fallen', flew: 'flown', grew: 'grown',
  threw: 'thrown', wore: 'worn', spoke: 'spoken', chose: 'chosen', broke: 'broken',
  forgot: 'forgotten', took: 'taken', gave: 'given', knew: 'known', wrote: 'written',
  came: 'come', did: 'done', got: 'gotten',
};

/* past tense -> base form, for the "did + base" rule ("did not went" -> "did not go") */
const PAST_TO_BASE: Record<string, string> = {
  went: 'go', saw: 'see', ate: 'eat', drank: 'drink', drove: 'drive', ran: 'run', sang: 'sing',
  swam: 'swim', began: 'begin', fell: 'fall', flew: 'fly', grew: 'grow', threw: 'throw',
  wore: 'wear', spoke: 'speak', chose: 'choose', broke: 'break', forgot: 'forget', took: 'take',
  gave: 'give', knew: 'know', wrote: 'write', came: 'come', did: 'do', got: 'get', made: 'make',
  said: 'say', told: 'tell', found: 'find', thought: 'think', bought: 'buy', brought: 'bring',
  taught: 'teach', caught: 'catch', felt: 'feel', left: 'leave', met: 'meet', paid: 'pay',
  sent: 'send', spent: 'spend', stood: 'stand', understood: 'understand', won: 'win', lost: 'lose',
};

/* common non-word past forms of irregular verbs (never correct) */
const COMMON_BAD_PAST: Record<string, string> = {
  buyed: 'bought', goed: 'went', eated: 'ate', teached: 'taught', thinked: 'thought',
  bringed: 'brought', catched: 'caught', feeled: 'felt', writed: 'wrote', speaked: 'spoke',
  taked: 'took', maked: 'made', sayed: 'said', heared: 'heard', runned: 'ran', swimmed: 'swam',
};

/* ---------------- rules ---------------- */

export const GRAMMAR_RULES: GrammarRule[] = [
  {
    id: 'article-a-before-vowel',
    category: 'article',
    severity: 'bad',
    label: 'a / an',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length - 1; i++) {
        if (tokens[i].word !== 'a') continue;
        const nxt = tokens[i + 1].word;
        if (!nxt) continue;
        if (CONSONANT_SOUND_VOWEL_WORDS.has(nxt)) continue;
        if (/^[aeiou]/.test(nxt) && nxt.length > 1) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `an ${tokens[i + 1].raw}`,
            explanation: `"${nxt}" starts with a vowel sound, so the article must be "an".`,
            wordIndex: i,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'article-an-before-consonant',
    category: 'article',
    severity: 'bad',
    label: 'a / an',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length - 1; i++) {
        if (tokens[i].word !== 'an') continue;
        const nxt = tokens[i + 1].word;
        if (!nxt) continue;
        const vowelSound = /^[aeiou]/.test(nxt) && !CONSONANT_SOUND_VOWEL_WORDS.has(nxt);
        if (!vowelSound && !VOWEL_SOUND_STARTS.includes(nxt)) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `a ${tokens[i + 1].raw}`,
            explanation: `"${nxt}" starts with a consonant sound, so the article must be "a".`,
            wordIndex: i,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'agreement-third-person',
    category: 'agreement',
    severity: 'bad',
    label: 'subject-verb agreement',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length - 1; i++) {
        const subj = tokens[i].word;
        const verb = tokens[i + 1].word;
        const subjectIsThird = THIRD_PERSON.has(subj);
        if (!subjectIsThird) continue;
        if (BARE_VERBS.has(verb)) {
          const fixed = verb === 'go' ? 'goes' : verb === 'do' ? 'does' : verb === 'have' ? 'has' : `${verb}s`;
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `${tokens[i].raw} ${fixed}`,
            explanation: `Third-person singular subjects take "-s" on the verb: "${subj} ${fixed}".`,
            wordIndex: i + 1,
          });
        } else if (['am', 'are', 'were', 'have', 'do'].includes(verb) && !['i', 'we', 'you', 'they'].includes(subj)) {
          const map: Record<string, string> = { am: 'is', are: 'is', were: 'was', have: 'has', do: 'does' };
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `${tokens[i].raw} ${map[verb]}`,
            explanation: `"${subj}" is singular, so the auxiliary should be "${map[verb]}".`,
            wordIndex: i + 1,
          });
        } else if (["don't", "aren't", "weren't", "haven't", "didn't"].includes(verb) && !['i', 'we', 'you', 'they'].includes(subj)) {
          const map: Record<string, string> = { "don't": "doesn't", "aren't": "isn't", "weren't": "wasn't", "haven't": "hasn't", "didn't": "didn't" };
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `${tokens[i].raw} ${map[verb]}`,
            explanation: `Negative auxiliary for a singular subject: "${subj} ${map[verb]}".`,
            wordIndex: i + 1,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'agreement-plural-subject',
    category: 'agreement',
    severity: 'bad',
    label: 'subject-verb agreement',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      const badForPlural: Record<string, string> = {
        is: 'are', was: 'were', has: 'have', does: 'do', goes: 'go', wants: 'want', needs: 'need',
        likes: 'like', thinks: 'think', knows: 'know', says: 'say', makes: 'make', takes: 'take',
        comes: 'come', sees: 'see', gives: 'give', tells: 'tell', feels: 'feel', seems: 'seem',
      };
      for (let i = 0; i < tokens.length - 1; i++) {
        const subj = tokens[i].word;
        const verb = tokens[i + 1].word;
        // "you" + "is/was/has" only; "you" + bare verb is already correct
        const applies =
          subj === 'you' ? ['is', 'was', 'has', 'does'].includes(verb) : PLURAL_SUBJECTS.has(subj) && !!badForPlural[verb];
        if (applies && badForPlural[verb]) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `${tokens[i].raw} ${badForPlural[verb]}`,
            explanation: `"${subj}" takes the plural form: "${badForPlural[verb]}".`,
            wordIndex: i + 1,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'stative-progressive',
    category: 'tense',
    severity: 'bad',
    label: 'stative verbs',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      const be = new Set(['am', 'is', 'are', "i'm", "it's", "that's", "he's", "she's", "we're", "they're", "you're"]);
      for (let i = 0; i < tokens.length - 1; i++) {
        if (!be.has(tokens[i].word)) continue;
        const v = tokens[i + 1].word;
        if (STATIVE_VING.has(v)) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `${tokens[i].raw} ${v.replace(/ing$/, '')}`,
            explanation: `"${v.replace(/ing$/, '')}" is a state, not an action — it is not used in the -ing form here.`,
            wordIndex: i + 1,
          });
        } else if (v === 'agree') {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `${tokens[i].raw === 'am' ? 'I' : tokens[i].raw} agree`,
            explanation: '"Agree" is a verb in English, not an adjective: "I agree", not "I am agree".',
            wordIndex: i + 1,
          });
        } else if (v === 'having') {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `${tokens[i].raw} have`,
            explanation: 'For possession and states use the simple form: "I have a car", not "I am having a car". ("I am having lunch" is fine — that is an action.)',
            wordIndex: i + 1,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'past-after-auxiliary',
    category: 'tense',
    severity: 'bad',
    label: 'base form after auxiliary',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      const baseOf: Record<string, string> = {
        went: 'go', came: 'come', saw: 'see', did: 'do', made: 'make', took: 'take', gave: 'give',
        told: 'tell', said: 'say', found: 'find', knew: 'know', got: 'get', thought: 'think',
        bought: 'buy', brought: 'bring', taught: 'teach', caught: 'catch', felt: 'feel', left: 'leave',
        met: 'meet', paid: 'pay', sent: 'send', spent: 'spend', stood: 'stand', understood: 'understand',
        wrote: 'write', ate: 'eat', drank: 'drink', drove: 'drive', ran: 'run', sang: 'sing',
        swam: 'swim', began: 'begin', fell: 'fall', won: 'win', lost: 'lose', flew: 'fly', grew: 'grow',
        threw: 'throw', wore: 'wear', spoke: 'speak', chose: 'choose', broke: 'break', forgot: 'forget',
      };
      for (let i = 0; i < tokens.length - 1; i++) {
        const aux = tokens[i].word;
        // Bare "did"/"do"/"does" is usually a main verb ("I did my homework"),
        // so only negative forms and true modals open this rule.
        if (!MODAL_OR_DO.has(aux)) continue;
        if (['did', 'do', 'does'].includes(aux) && !tokens[i].raw.includes("'")) continue;
        const v = tokens[i + 1].word;
        let base: string | undefined;
        if (IRREGULAR_PAST.has(v)) base = baseOf[v];
        else if (/ed$/.test(v) && v.length > 3 && !['need', 'used', 'bed', 'red', 'fed'].includes(v)) base = v.slice(0, -2);
        if (base) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `${tokens[i].raw} ${base}`,
            explanation: `After "${aux}" the verb stays in its base form: "${base}", not "${v}".`,
            wordIndex: i + 1,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'uncountable-plural',
    category: 'word-form',
    severity: 'bad',
    label: 'countable / uncountable',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length; i++) {
        const w = tokens[i].word;
        if (UNCOUNTABLE_S.has(w)) {
          const singular = SINGULAR_OF[w] ?? w.replace(/s$/, '');
          out.push({
            quote: tokens[i].raw,
            correction: singular,
            explanation: `"${singular}" is uncountable in English — it has no plural form. Say "a piece of ${singular}" if you need to count it.`,
            wordIndex: i,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'double-comparative',
    category: 'word-form',
    severity: 'bad',
    label: 'comparatives',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      const alreadyComparative = new Set([
        'better', 'worse', 'best', 'worst', 'easier', 'easiest', 'harder', 'hardest', 'bigger',
        'biggest', 'faster', 'fastest', 'older', 'oldest', 'younger', 'youngest', 'more', 'most',
        'smaller', 'smallest', 'higher', 'highest', 'stronger', 'strongest',
      ]);
      for (let i = 0; i < tokens.length - 1; i++) {
        const a = tokens[i].word;
        const b = tokens[i + 1].word;
        if (['more', 'most'].includes(a) && alreadyComparative.has(b) && b !== 'more' && b !== 'most') {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: b,
            explanation: `"${b}" is already a comparative/superlative — drop "${a}".`,
            wordIndex: i,
          });
        } else if (a === 'very' && ['unique', 'perfect', 'impossible', 'dead', 'pregnant', 'excellent'].includes(b)) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: b,
            explanation: `"${b}" is absolute — it cannot be graded with "very".`,
            wordIndex: i,
          });
        } else if (['more', 'most'].includes(a) && /(er|est)$/.test(b) && b.length > 4 && !alreadyComparative.has(b)) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: b,
            explanation: `"${b}" already carries the comparison ending — "${a}" is redundant.`,
            wordIndex: i,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'since-vs-for',
    category: 'preposition',
    severity: 'bad',
    label: 'since / for',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length - 1; i++) {
        const w = tokens[i].word;
        const nxt = tokens[i + 1].word;
        if (w === 'since' && (/^\d+$/.test(nxt) || ['many', 'several', 'a', 'some', 'ages', 'years', 'months', 'days', 'weeks'].includes(nxt))) {
          out.push({
            quote: QUOTE(tokens, i, Math.min(i + 2, tokens.length - 1)),
            correction: `for ${QUOTE(tokens, i + 1, Math.min(i + 2, tokens.length - 1)).replace(/^since\s*/, '')}`,
            explanation: 'Use "for" with a length of time and "since" with a starting point.',
            wordIndex: i,
          });
        } else if (w === 'for' && POINT_IN_TIME.has(nxt)) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `since ${tokens[i + 1].raw}`,
            explanation: 'Use "since" with a point in time and "for" with a duration.',
            wordIndex: i,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'redundant-partner-words',
    category: 'style',
    severity: 'warn',
    label: 'redundancy',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      const pairs: [string, string, string][] = [
        ['discuss', 'about', 'Discuss already contains "about": "discuss the plan".'],
        ['return', 'back', '"Return" already means come back: just "return".'],
        ['revert', 'back', '"Revert" already means go back: "I will revert to you".'],
        ['repeat', 'again', '"Repeat" already means do again.'],
        ['married', 'with', 'The collocation is "married to".'],
        ['reach', 'to', '"Reach" takes no preposition: "reach home".'],
        ['enter', 'into', '"Enter" takes no preposition for a place: "enter the room".'],
        ['ordered', 'for', '"Order" takes no "for": "I ordered a coffee".'],
        ['cousin', 'brother', 'English says simply "cousin".'],
        ['cousin', 'sister', 'English says simply "cousin".'],
        ['passing', 'out', 'In standard English use "graduating".'],
      ];
      for (let i = 0; i < tokens.length - 1; i++) {
        for (const [a, b, explanation] of pairs) {
          if (tokens[i].word === a && tokens[i + 1].word === b) {
            out.push({
              quote: QUOTE(tokens, i, i + 1),
              correction: tokens[i].raw,
              explanation,
              wordIndex: i + 1,
            });
          }
        }
      }
      return out;
    },
  },
  {
    id: 'time-prepositions',
    category: 'preposition',
    severity: 'bad',
    label: 'prepositions of time',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length - 1; i++) {
        const w = tokens[i].word;
        const nxt = tokens[i + 1].word;
        if (['on', 'in'].includes(w) && ['yesterday', 'today', 'tomorrow', 'tonight'].includes(nxt)) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: tokens[i + 1].raw,
            explanation: `"${nxt}" needs no preposition.`,
            wordIndex: i,
          });
        } else if (w === 'in' && DAYS.has(nxt)) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `on ${tokens[i + 1].raw}`,
            explanation: 'Days of the week take "on".',
            wordIndex: i,
          });
        } else if (w === 'at' && /^(19|20)\d{2}$/.test(nxt)) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `in ${tokens[i + 1].raw}`,
            explanation: 'Years take "in".',
            wordIndex: i,
          });
        } else if (w === 'in' && nxt === 'night') {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: 'at night',
            explanation: 'The fixed phrase is "at night" (but "in the morning/afternoon/evening").',
            wordIndex: i,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'double-negative',
    category: 'word-form',
    severity: 'bad',
    label: 'double negative',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      const negAux = ["don't", "didn't", "doesn't", "can't", 'cannot', "won't", "isn't", "aren't", "wasn't", "weren't", 'never'];
      for (let i = 0; i < tokens.length - 1; i++) {
        if (!negAux.includes(tokens[i].word)) continue;
        // allow one intervening word ("don't have no", "didn't see nothing")
        for (let k = i + 1; k <= Math.min(i + 3, tokens.length - 1); k++) {
          if (['no', 'nothing', 'nobody', 'nowhere', 'never', 'none', 'neither'].includes(tokens[k].word)) {
            out.push({
              quote: QUOTE(tokens, i, k),
              correction: `${tokens[i].raw} ${QUOTE(tokens, i + 1, k - 1)} ${tokens[k].word === 'no' ? 'any' : 'any' + tokens[k].word.slice(2)}`.replace(/\s+/g, ' ').trim(),
              explanation: 'Standard English uses one negative per clause: pair a negative auxiliary with "any-", not "no-".',
              wordIndex: k,
            });
            break;
          }
          if (tokens[k].endsSentence) break;
        }
      }
      return out;
    },
  },
  {
    id: 'modal-of',
    category: 'word-form',
    severity: 'bad',
    label: 'modal + have',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length - 1; i++) {
        if (['should', 'would', 'could', 'must', 'might'].includes(tokens[i].word) && tokens[i + 1].word === 'of') {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `${tokens[i].raw} have`,
            explanation: `It is "${tokens[i].word} have" — "should of" is a spelling of the sound, not the grammar.`,
            wordIndex: i + 1,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'much-countable',
    category: 'word-form',
    severity: 'bad',
    label: 'much / many',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length - 1; i++) {
        const w = tokens[i].word;
        const nxt = tokens[i + 1].word;
        if (w === 'much' && /s$/.test(nxt) && !UNCOUNTABLE_SINGULAR.has(nxt)) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `many ${tokens[i + 1].raw}`,
            explanation: `"${nxt}" is countable and plural, so it takes "many".`,
            wordIndex: i,
          });
        } else if (w === 'many' && UNCOUNTABLE_SINGULAR.has(nxt)) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `much ${tokens[i + 1].raw}`,
            explanation: `"${nxt}" is uncountable, so it takes "much" (or "a lot of").`,
            wordIndex: i,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'one-of-plural',
    category: 'word-form',
    severity: 'bad',
    label: 'one of + plural',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length - 2; i++) {
        if (tokens[i].word !== 'one' || tokens[i + 1].word !== 'of') continue;
        const det = tokens[i + 2].word;
        if (!['my', 'the', 'his', 'her', 'their', 'our', 'those', 'these', 'your'].includes(det)) continue;
        const noun = tokens[i + 3]?.word;
        if (!noun) continue;
        const isPlural = /s$/.test(noun) || IRREGULAR_PLURALS.has(noun);
        if (!isPlural) {
          out.push({
            quote: QUOTE(tokens, i, i + 3),
            correction: `${QUOTE(tokens, i, i + 2)} ${noun}s`,
            explanation: '"One of" is followed by a plural noun: "one of my friends".',
            wordIndex: i + 3,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'there-is-plural',
    category: 'agreement',
    severity: 'bad',
    label: 'there is / there are',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length - 2; i++) {
        if (tokens[i].word !== 'there') continue;
        const be = tokens[i + 1].word;
        if (!['is', 'was'].includes(be)) continue;
        const nxt = tokens[i + 2].word;
        // Only explicit plural markers — guessing from a trailing "s" produces
        // false positives on uncountables like "business" or "news".
        const plural = ['many', 'several', 'lots', 'people', 'children', 'students', 'things',
          'reasons', 'ways', 'problems', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
          'nine', 'ten', 'hundreds', 'thousands', 'millions', 'both', 'others', 'countries',
          'years', 'days', 'weeks', 'months', 'hours', 'options', 'points', 'areas'].includes(nxt);
        if (plural) {
          out.push({
            quote: QUOTE(tokens, i, i + 2),
            correction: `there ${be === 'is' ? 'are' : 'were'} ${tokens[i + 2].raw}`,
            explanation: `"${nxt}" is plural, so use "there ${be === 'is' ? 'are' : 'were'}".`,
            wordIndex: i + 1,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'informal-contraction',
    category: 'style',
    severity: 'warn',
    label: 'register',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      const full: Record<string, string> = {
        gonna: 'going to', wanna: 'want to', kinda: 'kind of', gotta: 'got to', dunno: "don't know",
        lemme: 'let me', gimme: 'give me', sorta: 'sort of', hafta: 'have to', oughta: 'ought to',
      };
      for (let i = 0; i < tokens.length; i++) {
        const w = tokens[i].word;
        if (INFORMAL.has(w)) {
          out.push({
            quote: tokens[i].raw,
            correction: full[w] ?? w,
            explanation: `"${w}" is very informal. In an exam or interview, say "${full[w]}".`,
            wordIndex: i,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'repeated-word',
    category: 'repetition',
    severity: 'warn',
    label: 'repetition',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 1; i < tokens.length; i++) {
        const a = tokens[i - 1].word;
        const b = tokens[i].word;
        if (!a || a !== b) continue;
        if (REPEAT_WHITELIST.has(a) || a.length < 3) continue;
        out.push({
          quote: QUOTE(tokens, i - 1, i),
          correction: tokens[i].raw,
          explanation: `"${a}" is repeated — this reads as a false start.`,
          wordIndex: i,
        });
      }
      return out;
    },
  },
  {
    id: 'me-and-x',
    category: 'style',
    severity: 'warn',
    label: 'pronoun order',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length - 2; i++) {
        if (tokens[i].word === 'me' && tokens[i + 1].word === 'and') {
          out.push({
            quote: QUOTE(tokens, i, Math.min(i + 3, tokens.length - 1)),
            correction: `${QUOTE(tokens, i + 2, Math.min(i + 3, tokens.length - 1))} and I`,
            explanation: 'As the subject of a sentence, put the other person first and use "I".',
            wordIndex: i,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'perfect-needs-participle',
    category: 'tense',
    severity: 'bad',
    label: 'past participle',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length - 1; i++) {
        const aux = tokens[i].word;
        if (aux !== 'have' && aux !== 'has' && aux !== 'had') continue;
        const nxt = tokens[i + 1].word;
        const part = PAST_TO_PARTICIPLE[nxt];
        if (part) {
          out.push({
            quote: QUOTE(tokens, i, i + 1),
            correction: `${tokens[i].raw} ${part}`,
            explanation: `After "${aux}", use the past participle "${part}", not the simple past "${nxt}".`,
            wordIndex: i + 1,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'do-auxiliary-bare-verb',
    category: 'tense',
    severity: 'bad',
    label: 'verb form after did',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length - 1; i++) {
        const aux = tokens[i].word;
        if (aux !== 'did' && aux !== "didn't") continue;
        let j = i + 1;
        if (tokens[j]?.word === 'not') j = i + 2;
        const verb = tokens[j]?.word;
        if (!verb) continue;
        const base = PAST_TO_BASE[verb];
        if (base) {
          out.push({
            quote: QUOTE(tokens, i, j),
            correction: `${tokens[i].raw}${j > i + 1 ? ' not' : ''} ${base}`,
            explanation: `After "did", use the base form "${base}", not the past tense "${verb}".`,
            wordIndex: j,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'misspelled-irregular-past',
    category: 'word-form',
    severity: 'bad',
    label: 'irregular past tense',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      for (let i = 0; i < tokens.length; i++) {
        const fix = COMMON_BAD_PAST[tokens[i].word];
        if (fix) {
          out.push({
            quote: QUOTE(tokens, i, i),
            correction: fix,
            explanation: `"${tokens[i].raw}" is not a word — the past tense of this verb is "${fix}".`,
            wordIndex: i,
          });
        }
      }
      return out;
    },
  },
  {
    id: 'past-time-marker',
    category: 'tense',
    severity: 'bad',
    label: 'past time + base verb',
    run: (tokens) => {
      const out: Omit<GrammarIssue, 'ruleId' | 'category' | 'severity'>[] = [];
      const isPastMarker = (w: string) =>
        w === 'yesterday' || w === 'last' || /ago$/.test(w) || /^(19|20)\d{2}$/.test(w);
      const hasMarker = (from: number, to: number) => {
        for (let k = Math.max(0, from); k <= Math.min(to, tokens.length - 1); k++) {
          if (isPastMarker(tokens[k].word)) return true;
        }
        return false;
      };
      for (let i = 0; i < tokens.length - 1; i++) {
        const subj = tokens[i].word;
        const verb = tokens[i + 1].word;
        if (!PLURAL_SUBJECTS.has(subj) || !BARE_VERBS.has(verb)) continue;
        if (IRREGULAR_PAST.has(verb) || /ed$/.test(verb)) continue;
        if (!hasMarker(i + 2, i + 8) && !hasMarker(i - 3, i - 1)) continue;
        const past =
          BASE_TO_PAST[verb] ??
          (/[aeiou]y$/.test(verb)
            ? verb + 'ed'
            : /y$/.test(verb)
              ? verb.slice(0, -1) + 'ied'
              : verb.endsWith('e')
                ? verb + 'd'
                : verb + 'ed');
        out.push({
          quote: QUOTE(tokens, i, i + 1),
          correction: `${tokens[i].raw} ${past}`,
          explanation: 'A past time word (yesterday, last week, … ago) needs the past form of the verb.',
          wordIndex: i + 1,
        });
      }
      return out;
    },
  },
];

/* ---------------- driver ---------------- */

export interface GrammarResult {
  issues: GrammarIssue[];
  errorCount: number;
  errorsPer100Words: number;
  byCategory: Record<string, number>;
  score: number;
  verdict: string;
}

export function analyseGrammar(tokens: Token[]): GrammarResult {
  const issues: GrammarIssue[] = [];
  for (const rule of GRAMMAR_RULES) {
    for (const found of rule.run(tokens)) {
      issues.push({ ...found, ruleId: rule.id, category: rule.category, severity: rule.severity });
    }
  }

  // de-duplicate overlapping spans, keeping the more severe issue
  const seen = new Set<string>();
  const unique = issues
    .sort((a, b) => (a.severity === b.severity ? a.wordIndex - b.wordIndex : a.severity === 'bad' ? -1 : 1))
    .filter((issue) => {
      const key = `${issue.wordIndex}:${issue.quote}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.wordIndex - b.wordIndex);

  const wordCount = Math.max(tokens.filter((t) => t.word).length, 1);
  const errorCount = unique.length;
  const errorsPer100Words = Math.round((errorCount / wordCount) * 100 * 10) / 10;
  const score = scoreGrammar(unique, wordCount);

  const byCategory: Record<string, number> = {};
  for (const i of unique) byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;

  const verdict =
    score < 0 ? 'Not enough speech'
      : score >= 90 ? 'Accurate' : score >= 78 ? 'Mostly accurate' : score >= 62 ? 'Some errors'
      : score >= 45 ? 'Frequent errors' : 'Errors block meaning';

  return { issues: unique, errorCount, errorsPer100Words, byCategory, score, verdict };
}

/** Below this many words there is no basis for a grammatical-accuracy score. */
export const MIN_WORDS_FOR_GRAMMAR = 6;

export function scoreGrammar(issues: GrammarIssue[], wordCount: number): number {
  if (wordCount < MIN_WORDS_FOR_GRAMMAR) return -1;
  // Weight serious errors more than style notes.
  const weighted = issues.reduce((a, i) => a + (i.severity === 'bad' ? 1 : 0.45), 0);
  const perHundred = (weighted / wordCount) * 100;
  let score =
    perHundred <= 0.5 ? 98
      : perHundred <= 1.5 ? 92
      : perHundred <= 3 ? 84
      : perHundred <= 5 ? 74
      : perHundred <= 8 ? 62
      : perHundred <= 12 ? 50
      : perHundred <= 18 ? 38
      : perHundred <= 26 ? 26
      : 15;
  // Variety bonus: using several different structures is itself a band descriptor.
  const distinctCategories = new Set(issues.map((i) => i.category)).size;
  if (issues.length === 0 && wordCount >= 40) score = 98;
  if (distinctCategories >= 4) score -= 3;
  return Math.max(0, Math.min(100, Math.round(score)));
}
