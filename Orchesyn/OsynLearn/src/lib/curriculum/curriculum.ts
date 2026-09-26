import type { CurriculumLesson } from './types';

/**
 * Seed curriculum — representative content for EVERY implemented exercise
 * type, with prerequisites, objectives, difficulty, duration and mastery
 * evidence. Coverage gaps are listed honestly in coverage.ts instead of
 * being papered over.
 *
 * Rights: all seed items are original OsynLearn material (CC-BY-NC internally);
 * device-TTS transcripts are labelled practice audio wherever they play.
 */

export const CURRICULUM: CurriculumLesson[] = [
  /* ---------------- listening ---------------- */
  {
    id: 'L1',
    skill: 'listening',
    module: 'Section 1 survival',
    title: 'Signposts & spelling in everyday conversations',
    objectives: ['Catch names, numbers and dates on one hearing', 'Use signpost words to predict the next answer'],
    prereqs: [],
    difficulty: 1,
    questionTypes: ['mcq'],
    minutes: 8,
    mastery: { metric: 'independent-accuracy', threshold: 0.75 },
    explain:
      'IELTS Listening Section 1 is a two-voice everyday conversation. Answers arrive after signpost words ("so", "right", "now") and names are usually spelled once, fast. Train your ear to expect the answer at the signpost, not after it.',
    worked: {
      prompt: 'Audio (practice): "So the booking is for the fourteenth, not the fourth — and spell your surname for me?"  "Certainly — W-I-L-S-O-N."',
      solution: 'Date: 14th · Name: WILSON',
      notes: 'The correction ("not the fourth") is the classic distractor; the signpost "so" introduced the real answer.',
    },
    guided: [
      {
        id: 'L1g1', kind: 'mcq', skill: 'listening',
        prompt: 'Practice audio: "The library closes at six on weekdays, but on Saturdays we shut an hour early." When does it close on Saturday?',
        options: ['5 pm', '6 pm', '7 pm'], answer: '5 pm',
        explanation: '"An hour early" relative to 6 pm = 5 pm. The weekday time is the distractor.',
        hint: 'Listen for the contrast word "but".', tts: 'The library closes at six on weekdays, but on Saturdays we shut an hour early.',
      },
      {
        id: 'L1g2', kind: 'mcq', skill: 'listening',
        prompt: 'Practice audio: "I\'d like to book a table for three — no wait, make that five, sorry." How many people?',
        options: ['3', '4', '5'], answer: '5',
        explanation: 'Self-corrections ("no wait…") override the first number. Write the last one.',
        hint: 'Self-corrections replace the first number.', tts: 'I would like to book a table for three. No wait, make that five, sorry.',
      },
    ],
    independent: [
      {
        id: 'L1i1', kind: 'mcq', skill: 'listening',
        prompt: 'Practice audio: "The train to Chester departs at 9:17 from platform 4 — that\'s a change from the usual platform 2." Which platform?',
        options: ['2', '4', '9'], answer: '4',
        explanation: '"A change from the usual" marks platform 2 as the distractor.', tts: 'The train to Chester departs at 9:17 from platform 4. That is a change from the usual platform 2.',
      },
      {
        id: 'L1i2', kind: 'mcq', skill: 'listening',
        prompt: 'Practice audio: "Membership costs thirty pounds a year, though students pay half." What does a student pay?',
        options: ['£13', '£15', '£30'], answer: '£15',
        explanation: 'Half of £30 = £15; the full price is the trap.', tts: 'Membership costs thirty pounds a year, though students pay half.',
      },
    ],
    path: 'both', status: 'published', version: 2, aiGenerated: false,
    source: 'OsynLearn content team', rights: 'original, internal use',
  },
  {
    id: 'L2',
    skill: 'listening',
    module: 'Section 2–3',
    title: 'Following a talk: purpose, attitude, and paraphrase',
    objectives: ['Match paraphrased options to what is said', 'Detect speaker attitude from stress and but-clauses'],
    prereqs: ['L1'],
    difficulty: 3,
    questionTypes: ['mcq'],
    minutes: 10,
    mastery: { metric: 'independent-accuracy', threshold: 0.7 },
    explain:
      'Sections 2–3 never repeat the question\'s words: "free entry" becomes "you don\'t have to pay". The correct option paraphrases; the trap option quotes. Attitude lives in stress: "it was FINE" is not praise.',
    worked: {
      prompt: 'Question: What does the speaker say about the museum? Audio: "You don\'t have to pay to get in, which surprises most first-time visitors."',
      solution: 'Entry is free (and visitors are surprised by it).',
      notes: '"Don\'t have to pay" paraphrases "free"; the surprise is extra information, not the answer.',
    },
    guided: [
      {
        id: 'L2g1', kind: 'mcq', skill: 'listening',
        prompt: 'Practice audio: "The draft was adequate, but the final version is genuinely strong." How does the speaker rate the final version?',
        options: ['adequate', 'strong', 'weak'], answer: 'strong',
        explanation: 'The but-clause carries the judgement; "adequate" describes the draft.',
        hint: 'The contrast after "but" is the real opinion.', tts: 'The draft was adequate, but the final version is genuinely strong.',
      },
    ],
    independent: [
      {
        id: 'L2i1', kind: 'mcq', skill: 'listening',
        prompt: 'Practice audio: "We expected forty responses; in the event we received nearly twice that." How many responses, roughly?',
        options: ['40', '80', '20'], answer: '80',
        explanation: '"Twice that" = 2×40 ≈ 80; "in the event" signals the real figure.', tts: 'We expected forty responses. In the event we received nearly twice that.',
      },
      {
        id: 'L2i2', kind: 'mcq', skill: 'listening',
        prompt: 'Practice audio: "The café is cheap, although frankly the food is nothing to write home about." What is the criticism?',
        options: ['price', 'food quality', 'location'], answer: 'food quality',
        explanation: 'The idiom "nothing to write home about" = unremarkable; the concession targets the food.', tts: 'The cafe is cheap, although frankly the food is nothing to write home about.',
      },
    ],
    path: 'both', status: 'published', version: 1, aiGenerated: false,
    source: 'OsynLearn content team', rights: 'original, internal use',
  },

  /* ---------------- reading ---------------- */
  {
    id: 'R1',
    skill: 'reading',
    module: 'True / False / Not given',
    title: 'TFNG: the three-way judgement',
    objectives: ['Separate False (contradiction) from Not given (absence)', 'Stop importing world knowledge into the text'],
    prereqs: [],
    difficulty: 2,
    questionTypes: ['tfng'],
    minutes: 9,
    mastery: { metric: 'independent-accuracy', threshold: 0.7 },
    explain:
      'TRUE = the text says it (paraphrased). FALSE = the text says the opposite. NOT GIVEN = the text is silent. If you need even one extra assumption from real life, it is Not given.',
    worked: {
      prompt: 'Text: "The bridge opened in 1894 after nine years of construction." Statement: "The bridge took a decade to build."',
      solution: 'FALSE',
      notes: 'Nine years contradicts a decade. Compare numbers first — they are the fastest evidence.',
    },
    guided: [
      {
        id: 'R1g1', kind: 'tfng', skill: 'reading',
        prompt: 'Text: "Most commuters cycle along the river path." Statement: "All commuters cycle along the river path."',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'], answer: 'FALSE',
        explanation: '"Most" ≠ "all": a quantity word flipping is a contradiction.',
        hint: 'Compare the quantity words.',
      },
    ],
    independent: [
      {
        id: 'R1i1', kind: 'tfng', skill: 'reading',
        prompt: 'Text: "The museum is closed on Mondays." Statement: "The museum is busiest on Saturdays."',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'], answer: 'NOT GIVEN',
        explanation: 'Closing day says nothing about busy days — silence, not contradiction.',
      },
      {
        id: 'R1i2', kind: 'tfng', skill: 'reading',
        prompt: 'Text: "Fewer than a third of the seeds germinated." Statement: "More than half of the seeds germinated."',
        options: ['TRUE', 'FALSE', 'NOT GIVEN'], answer: 'FALSE',
        explanation: '< 1/3 directly contradicts > 1/2.',
      },
    ],
    path: 'both', status: 'published', version: 3, aiGenerated: false,
    source: 'OsynLearn content team', rights: 'original, internal use',
  },
  {
    id: 'R2',
    skill: 'reading',
    module: 'Matching headings',
    title: 'Headings: paragraph gist, not word-spotting',
    objectives: ['Reject headings that reuse a single word', 'Find the paragraph\'s one job'],
    prereqs: ['R1'],
    difficulty: 3,
    questionTypes: ['mcq'],
    minutes: 10,
    mastery: { metric: 'independent-accuracy', threshold: 0.7 },
    explain:
      'A heading names the paragraph\'s function (cause, contrast, method). Traps quote one word from the paragraph while describing something else. Read the first and last line, then name the job in your own words before looking at options.',
    worked: {
      prompt: 'Paragraph: "Although the first trials failed, the team changed the alloy and the second series succeeded beyond expectation." Headings: A) An unexpected failure  B) A problem and its solution  C) The choice of materials',
      solution: 'B',
      notes: 'Failure→fix→success is problem+solution. A quotes "failed" but flips the story; C quotes "alloy" only.',
    },
    guided: [
      {
        id: 'R2g1', kind: 'mcq', skill: 'reading',
        prompt: 'Paragraph: "The council\'s plan looked perfect on paper; in practice, traffic doubled within a month." Best heading?',
        options: ['A promise that failed in practice', 'A plan for reducing traffic', 'How councils measure traffic'], answer: 'A promise that failed in practice',
        explanation: 'Paper-vs-practice contrast = failed promise. "Traffic" in other options is word-spotting.',
        hint: 'What is the paragraph\'s one job — praise, contrast, method?',
      },
    ],
    independent: [
      {
        id: 'R2i1', kind: 'mcq', skill: 'reading',
        prompt: 'Paragraph: "Bees navigate using the sun, but on cloudy days they fall back on polarised light patterns invisible to us." Best heading?',
        options: ['A backup navigation system', 'Why bees prefer sunny days', 'Human vision limits'], answer: 'A backup navigation system',
        explanation: '"Fall back on" = backup. The other two quote surface words.',
      },
    ],
    path: 'both', status: 'published', version: 1, aiGenerated: false,
    source: 'OsynLearn content team', rights: 'original, internal use',
  },

  /* ---------------- writing ---------------- */
  {
    id: 'W1',
    skill: 'writing',
    module: 'Academic Task 1',
    title: 'Describing a line graph: overview first',
    objectives: ['Write a true overview (no numbers)', 'Group trends before detailing figures'],
    prereqs: [],
    difficulty: 3,
    questionTypes: ['typed'],
    minutes: 14,
    mastery: { metric: 'independent-accuracy', threshold: 0.7 },
    explain:
      'Task 1 is graded on overview quality as much as data. Structure: paraphrase the prompt → overview (2–3 trend sentences, zero numbers) → detail paragraph 1 → detail paragraph 2. "Overall" is your favourite sentence-starter.',
    worked: {
      prompt: 'Line graph: car sales 2010–2020, Brand A rising 10k→45k, Brand B falling 30k→18k, crossing in 2015.',
      solution:
        'Overall, Brand A\'s sales grew steadily while Brand B\'s declined, with A overtaking B midway through the period. … In 2010 B led by 20,000; by 2020 the gap had reversed to 27,000 in A\'s favour.',
      notes: 'Overview carries no figures; the detail paragraphs carry the numbers and the crossover year.',
    },
    guided: [
      {
        id: 'W1g1', kind: 'typed', skill: 'writing',
        prompt: 'Write ONLY an overview sentence for: "The chart shows internet use in two age groups, 2000–2020; both rise, the younger group always higher, the gap narrowing."',
        answer: 'overall|both|rose|narrow',
        explanation: 'A valid overview names the shared trend (both rose) and the gap change, with no numbers.',
        hint: 'Start with "Overall," and avoid figures.',
      },
    ],
    independent: [
      {
        id: 'W1i1', kind: 'typed', skill: 'writing',
        prompt: 'Write a 2-sentence overview for: "Bar chart: coffee vs tea consumption in 4 countries, 2023; coffee highest in Norway, tea highest in Turkey; all countries consume both."',
        answer: 'overall|coffee|tea|highest',
        explanation: 'Must compare the two drinks across countries without listing every figure.',
      },
    ],
    path: 'academic', status: 'published', version: 2, aiGenerated: false,
    source: 'OsynLearn content team', rights: 'original, internal use',
  },
  {
    id: 'W2',
    skill: 'writing',
    module: 'General Training Task 1',
    title: 'The GT letter: tone is the task',
    objectives: ['Pick formal/semi-formal/informal correctly', 'Hit the three bullet points in order'],
    prereqs: [],
    difficulty: 2,
    questionTypes: ['typed'],
    minutes: 12,
    mastery: { metric: 'independent-accuracy', threshold: 0.7 },
    explain:
      'GT Task 1 is graded heavily on tone matching. Stranger/manager = formal ("I am writing to enquire…"), colleague = semi-formal, friend = informal ("Thanks so much for…"). Cover the three bullets in order, one paragraph each.',
    worked: {
      prompt: 'Task: Write to your building manager about a broken lift. Bullets: describe the problem, say how it affects you, request a repair date.',
      solution:
        'Dear Mr Khan, I am writing to report that the lift in Block B has been out of order since Monday. As I live on the sixth floor and have a knee injury, I am currently unable to leave my flat easily. I would be grateful if you could confirm a date for the repair. Yours sincerely, …',
      notes: 'Formal opener, one paragraph per bullet, polite request closes.',
    },
    guided: [
      {
        id: 'W2g1', kind: 'typed', skill: 'writing',
        prompt: 'Write ONLY the opening line of a FORMAL complaint letter to a hotel manager.',
        answer: 'dear|writing',
        explanation: 'Formal openings state the purpose: "Dear …, I am writing to …".',
        hint: 'Dear + purpose verb ("I am writing to…").',
      },
    ],
    independent: [
      {
        id: 'W2i1', kind: 'typed', skill: 'writing',
        prompt: 'Write ONLY an informal opening line to a friend apologising for missing their party.',
        answer: 'sorry|so sorry|hi|hey',
        explanation: 'Informal tone: contractions, first name, direct apology.',
      },
    ],
    path: 'general', status: 'published', version: 1, aiGenerated: false,
    source: 'OsynLearn content team', rights: 'original, internal use',
  },
  {
    id: 'W3',
    skill: 'writing',
    module: 'Task 2',
    title: 'Essay skeleton: position, two bodies, concession',
    objectives: ['State a position in the intro', 'One idea per body paragraph with a concession'],
    prereqs: ['W1'],
    difficulty: 4,
    questionTypes: ['typed'],
    minutes: 16,
    mastery: { metric: 'independent-accuracy', threshold: 0.7 },
    explain:
      'Examiners reward a clear position and organised ideas. Skeleton: intro (paraphrase + position) → body 1 (strongest idea + example) → body 2 (second idea or concession + rebuttal) → conclusion (restate position). Write the position before you write anything else.',
    worked: {
      prompt: '"Some people think university education should be free for all. To what extent do you agree?"',
      solution:
        'Position sentence: "I largely agree, provided funding is tied to completion." Body 1: widening access raises national skill levels (e.g. …). Body 2 concession: unconditional funding can be abused → completion clauses answer this.',
      notes: 'A qualified position ("largely agree, provided…") earns Task Response marks.',
    },
    guided: [
      {
        id: 'W3g1', kind: 'typed', skill: 'writing',
        prompt: 'Write ONLY a position sentence for: "Remote work makes employees more productive. Do you agree or disagree?"',
        answer: 'agree|disagree|partly|largely',
        explanation: 'A scorable position commits to a side or a qualified side.',
        hint: 'Start with "I (largely/partially) agree/disagree because…".',
      },
    ],
    independent: [
      {
        id: 'W3i1', kind: 'typed', skill: 'writing',
        prompt: 'Write a concession sentence for the remote-work essay (the opposing view, fairly stated).',
        answer: 'however|admittedly|critics|opponents|some argue',
        explanation: 'A fair concession uses a contrast frame and the other side\'s strongest point.',
      },
    ],
    path: 'both', status: 'published', version: 1, aiGenerated: false,
    source: 'OsynLearn content team', rights: 'original, internal use',
  },

  /* ---------------- speaking ---------------- */
  {
    id: 'S1',
    skill: 'speaking',
    module: 'Part 1',
    title: 'Part 1: answer + one reason + one detail',
    objectives: ['Extend answers to 2–3 sentences without rambling', 'Kill fillers at the start'],
    prereqs: [],
    difficulty: 1,
    questionTypes: ['spoken'],
    minutes: 6,
    mastery: { metric: 'independent-accuracy', threshold: 0.7 },
    explain:
      'Part 1 answers die in two ways: one word, or two minutes. The fix is a shape: direct answer → reason → tiny detail. "Do you like cooking?" → "Yes, mostly because it switches my brain off — I made a new curry last night, actually."',
    worked: {
      prompt: '"Do you like your hometown?"',
      solution: 'Yes, I do — it\'s small enough to feel friendly, and the river market at weekends is something I genuinely miss when I travel.',
      notes: 'Answer (yes) → reason (small/friendly) → detail (river market). Three sentences, zero fillers.',
    },
    guided: [
      {
        id: 'S1g1', kind: 'spoken', skill: 'speaking',
        prompt: 'Answer aloud (or type): "What do you usually do in the evenings?" Use answer+reason+detail.',
        answer: 'because|usually|often|most',
        explanation: 'A reason connector (because/usually) is the minimum evidence of extension.',
        hint: 'Give a reason with "because" or a frequency word.',
      },
    ],
    independent: [
      {
        id: 'S1i1', kind: 'spoken', skill: 'speaking',
        prompt: 'Answer aloud (or type): "Do you prefer mornings or evenings? Why?" — 2–3 sentences, no filler openers.',
        answer: 'because|prefer|rather',
        explanation: 'Preference + reason must both appear; fillers like "um/you know" count against.',
      },
    ],
    path: 'both', status: 'published', version: 2, aiGenerated: false,
    source: 'OsynLearn content team', rights: 'original, internal use',
  },
  {
    id: 'S2',
    skill: 'speaking',
    module: 'Part 2',
    title: 'The long turn: 4-line cue card, 4-beat story',
    objectives: ['Use the 1 minute to write beats, not sentences', 'Cover all four cue bullets'],
    prereqs: ['S1'],
    difficulty: 3,
    questionTypes: ['spoken'],
    minutes: 8,
    mastery: { metric: 'independent-accuracy', threshold: 0.65 },
    explain:
      'The cue card gives four bullets — treat them as four beats of one story. In your prep minute write ONE word per beat. Speak 1:45–2:00: beat 1 (what/who), beat 2 (where/when), beat 3 (what happened), beat 4 (why it matters). Ending early costs fluency marks.',
    worked: {
      prompt: 'Describe a skill you learned. / what it is / how you learned it / how long it took / why it matters to you',
      solution: 'Beats: cycling · uncle\'s old bike · two summers · freedom = job commute. Then speak the four beats as one story.',
      notes: 'Four words on paper; two minutes on the mic.',
    },
    guided: [
      {
        id: 'S2g1', kind: 'spoken', skill: 'speaking',
        prompt: 'Prep 60s, then speak (or type) beat 1+2 for: "Describe a meal you remember." (what/where)',
        answer: 'meal|restaurant|home|cooked|ate',
        explanation: 'Beats 1–2 must name the meal and the place without finishing the story.',
        hint: 'One sentence per beat.',
      },
    ],
    independent: [
      {
        id: 'S2i1', kind: 'spoken', skill: 'speaking',
        prompt: 'Speak (or type) all four beats for "Describe a meal you remember": what / where / what happened / why it stays with you.',
        answer: 'because|remember|felt|made',
        explanation: 'All four beats with a closing "why" = a complete long turn.',
      },
    ],
    path: 'both', status: 'published', version: 1, aiGenerated: false,
    source: 'OsynLearn content team', rights: 'original, internal use',
  },
  {
    id: 'S3',
    skill: 'speaking',
    module: 'Part 3',
    title: 'Part 3: opinion → reason → example → alternative',
    objectives: ['Answer abstract questions structurally', 'Hedge like a native ("tends to", "in most cases")'],
    prereqs: ['S2'],
    difficulty: 4,
    questionTypes: ['spoken'],
    minutes: 9,
    mastery: { metric: 'independent-accuracy', threshold: 0.65 },
    explain:
      'Part 3 is discussion, not description. Shape: opinion → reason → example → (contrast). Abstract language scores: "people tend to", "in most cases", "whereas". Never answer with a personal anecdote alone — generalise first, then illustrate.',
    worked: {
      prompt: '"Should museums be free?"',
      solution:
        'In most cases, yes — public funding tends to widen access, as free national museums in several countries show; whereas ticketing can quietly exclude lower-income visitors, though small private venues may need fees to survive.',
      notes: 'Generalise → example → conceded exception. Hedging verbs carry the grammar score.',
    },
    guided: [
      {
        id: 'S3g1', kind: 'spoken', skill: 'speaking',
        prompt: 'Speak/type an OPINION + REASON for: "Is it better to study alone or in groups?"',
        answer: 'because|tends|depends|whereas',
        explanation: 'A general claim plus a reason connector meets the bar.',
        hint: 'Start with "In most cases…" or "It depends…".',
      },
    ],
    independent: [
      {
        id: 'S3i1', kind: 'spoken', skill: 'speaking',
        prompt: 'Full shape (opinion→reason→example→contrast), spoken or typed: "Will people stop reading printed books?"',
        answer: 'example|whereas|however|tend|some',
        explanation: 'Four-part structure with at least one hedge and one contrast.',
      },
    ],
    path: 'both', status: 'published', version: 1, aiGenerated: false,
    source: 'OsynLearn content team', rights: 'original, internal use',
  },

  /* ---------------- vocabulary & grammar ---------------- */
  {
    id: 'V1',
    skill: 'reading',
    module: 'Vocabulary',
    title: 'Collocation pairs, not lonely words',
    objectives: ['Learn words with their verb/noun partners', 'Retrieve, don\'t recognise'],
    prereqs: [],
    difficulty: 2,
    questionTypes: ['mcq'],
    minutes: 6,
    mastery: { metric: 'independent-accuracy', threshold: 0.8 },
    explain:
      'Words are remembered by their company: "make a decision" (not *do*), "heavy rain" (not *strong*). Learning the pair doubles the retrieval hooks. Retrieval (producing the partner) beats recognition (choosing it) for retention.',
    worked: { prompt: '"___ a mistake" — make or do?', solution: 'make a mistake', notes: 'make + creations/results; do + tasks/activities.' },
    guided: [
      {
        id: 'V1g1', kind: 'mcq', skill: 'reading',
        prompt: 'Which collocation is natural?', options: ['do a decision', 'make a decision', 'take a decision making', 'give a decision'], answer: 'make a decision',
        explanation: 'make + decision is the fixed pair.', hint: 'make creates results.',
      },
    ],
    independent: [
      {
        id: 'V1i1', kind: 'mcq', skill: 'reading',
        prompt: 'Natural collocation?', options: ['strong rain', 'heavy rain', 'thick rain', 'deep rain'], answer: 'heavy rain',
        explanation: 'Rain collocates with heavy/light.',
      },
      {
        id: 'V1i2', kind: 'mcq', skill: 'reading',
        prompt: 'Natural collocation?', options: ['make research', 'do research', 'research doing', 'take research'], answer: 'do research',
        explanation: 'research takes do — a classic trap for make.',
      },
    ],
    path: 'both', status: 'published', version: 1, aiGenerated: false,
    source: 'OsynLearn content team', rights: 'original, internal use',
  },
  {
    id: 'G1',
    skill: 'writing',
    module: 'Grammar',
    title: 'Articles: the / a / zero in one decision tree',
    objectives: ['Apply the specific→general check', 'Fix the top 3 article errors'],
    prereqs: [],
    difficulty: 3,
    questionTypes: ['mcq'],
    minutes: 7,
    mastery: { metric: 'independent-accuracy', threshold: 0.8 },
    explain:
      'Decision tree: 1) Is the noun countable-singular? → it needs *a/an* or *the*. 2) Can the listener identify WHICH one? → *the*. 3) Plural/uncountable used generally? → zero article ("Education changes lives", not "The education…").',
    worked: { prompt: '"___ water in ___ glass on your desk is clean." Fill both.', solution: 'The water in the glass…', notes: 'Both are identifiable: which water? The water in the glass.' },
    guided: [
      {
        id: 'G1g1', kind: 'mcq', skill: 'writing',
        prompt: 'Choose: "___ life is unpredictable."', options: ['A', 'The', '(no article)'], answer: '(no article)',
        explanation: 'General uncountable/abstract noun → zero article.', hint: 'General statement about an abstraction.',
      },
    ],
    independent: [
      {
        id: 'G1i1', kind: 'mcq', skill: 'writing',
        prompt: 'Choose: "She is ___ best candidate we interviewed."', options: ['a', 'the', '(no article)'], answer: 'the',
        explanation: 'Superlatives identify uniquely → the.',
      },
      {
        id: 'G1i2', kind: 'mcq', skill: 'writing',
        prompt: 'Choose: "He wants to buy ___ car."', options: ['a', 'the', '(no article)'], answer: 'a',
        explanation: 'First mention, countable singular, not identifiable → a.',
      },
    ],
    path: 'both', status: 'published', version: 1, aiGenerated: false,
    source: 'OsynLearn content team', rights: 'original, internal use',
  },

  /* ---------------- AI-drafted, awaiting expert review ---------------- */
  {
    id: 'R3',
    skill: 'reading',
    module: 'Matching information',
    title: 'Scanning for detail: which paragraph contains…',
    objectives: ['Scan by meaning, not by word'],
    prereqs: ['R1'],
    difficulty: 4,
    questionTypes: ['mcq'],
    minutes: 10,
    mastery: { metric: 'independent-accuracy', threshold: 0.7 },
    explain: 'AI-drafted lesson awaiting expert review: scanning for meaning across paragraphs.',
    worked: { prompt: '—', solution: '—', notes: 'Pending review.' },
    guided: [
      {
        id: 'R3g1', kind: 'mcq', skill: 'reading',
        prompt: 'Which paragraph mentions a funding cut? A) "The team expanded in 2019." B) "Grants shrank by a fifth the following year." C) "Offices moved to the dockside."',
        options: ['A', 'B', 'C'], answer: 'B',
        explanation: '"Grants shrank" paraphrases funding cut.',
      },
    ],
    independent: [
      {
        id: 'R3i1', kind: 'mcq', skill: 'reading',
        prompt: 'Which paragraph mentions staff wellbeing? A) "Morale slipped after the restructure." B) "Revenue rose sharply." C) "The canteen reopened in March."',
        options: ['A', 'B', 'C'], answer: 'A',
        explanation: 'Morale = wellbeing; canteen is a word-spotting trap.',
      },
    ],
    path: 'both', status: 'review', version: 1, aiGenerated: true,
    rights: 'AI-drafted — pending expert review, not shown to learners',
  },
];

export const lessonById = (id: string): CurriculumLesson | undefined => CURRICULUM.find((l) => l.id === id);

/** lessons visible to learners: published only */
export function publishedLessons(statusOf: (id: string) => ContentStatusLike): CurriculumLesson[] {
  return CURRICULUM.filter((l) => statusOf(l.id) === 'published');
}

type ContentStatusLike = 'draft' | 'review' | 'published';

/** mistake-book kinds → the lesson that trains them */
export const LESSON_FOR_MISTAKE: Record<string, string> = {
  filler: 'S1',
  grammar: 'G1',
  pronunciation: 'S1',
  vocab: 'V1',
  pause: 'S3',
};
