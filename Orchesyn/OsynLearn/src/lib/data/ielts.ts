import type { IeltsMock, IeltsQuestion } from '@/types';

/**
 * IELTS Speaking question bank.
 * Structure follows the real exam:
 *   Part 1  4-5 min   familiar topics, short answers
 *   Part 2  3-4 min   1-minute prep on a cue card, then a 2-minute long turn
 *   Part 3  4-5 min   abstract discussion linked to the Part 2 topic
 */

const q = (
  id: string,
  part: 1 | 2 | 3,
  topic: string,
  question: string,
  extra: Partial<IeltsQuestion> = {},
): IeltsQuestion => ({ id, part, topic, question, ...extra });

export const PART1_BANK: IeltsQuestion[] = [
  q('p1-home', 1, 'Home', 'Let us talk about where you live. Do you live in a house or an apartment?', { sampleAnswer: "I live in a small apartment on the fifth floor of a building near the city centre. It is not very big, but it has a lovely balcony where I keep a few plants, and the evening view is wonderful." }),
  q('p1-home-2', 1, 'Home', 'What is your favourite room in your home, and why?', { sampleAnswer: "Definitely the living room, because that is where my whole family gathers after dinner. We chat, watch films, or sometimes just sit with our tea, so it feels like the warmest corner of the house." }),
  q('p1-work', 1, 'Work', 'Do you work, or are you a student?', { sampleAnswer: "I am a student at the moment. I study business administration at university, and I also work part-time in a bookshop at weekends, which I enjoy because I love being around books and readers." }),
  q('p1-work-2', 1, 'Work', 'What is the most interesting part of your work or studies?', { sampleAnswer: "For me it is solving problems that have no obvious answer. We often analyse real company cases in class, and finding a workable solution feels like completing a difficult puzzle." }),
  q('1-morning', 1, 'Mornings', 'Are you a morning person?', { sampleAnswer: "Not at all, unfortunately. I usually need two alarms and a strong cup of tea before I feel human. My most productive hours are definitely in the evening." }),
  q('p1-morning-2', 1, 'Mornings', 'Has your morning routine changed since you were a child?', { sampleAnswer: "Yes, quite a lot. As a child, mornings meant cartoons and a slow breakfast, but now they are rushed. I check messages, gulp down coffee, and run for the bus." }),
  q('p1-music', 1, 'Music', 'What kind of music do you like to listen to?', { sampleAnswer: "I mostly listen to soft rock and acoustic songs, especially while travelling. Recently I have been exploring traditional folk music from my region as well, which surprises me with how modern it feels." }),
  q('p1-music-2', 1, 'Music', 'Have you ever learned to play an instrument?', { sampleAnswer: "I tried learning the guitar when I was about twelve. I only managed a few chords, honestly, but it taught me to appreciate how much practice real musicians put in." }),
  q('p1-weather', 1, 'Weather', 'What is the weather like in your hometown?', { sampleAnswer: "My hometown has a tropical climate, so it is hot and humid for most of the year. We get heavy monsoon rains for about four months, and honestly that season is my favourite." }),
  q('p1-weather-2', 1, 'Weather', 'Does the weather affect your mood?', { sampleAnswer: "It definitely does. Bright sunny mornings put me in a good mood straight away, while grey rainy days make me sluggish, so I plan indoor activities to stay positive." }),
  q('p1-reading', 1, 'Reading', 'Do you prefer reading books or reading online?', { sampleAnswer: "I prefer real books, if I am honest. There is something about holding paper pages that a screen cannot replace. I do read the news online, though, because it is faster and always up to date." }),
  q('p1-neighbours', 1, 'Neighbours', 'Do you know your neighbours well?', { sampleAnswer: "I know a couple of them quite well, especially the family next door. We sometimes share food during festivals. In a big city, though, most people keep to themselves, which I think is a shame." }),
  q('p1-cooking', 1, 'Cooking', 'Do you enjoy cooking?', { sampleAnswer: "I do, actually. I find it relaxing after a long day, and I like experimenting with recipes I find online. My specialty is biryani, although my family says it is still a work in progress." }),
  q('p1-photography', 1, 'Photography', 'Do you take a lot of photographs?', { sampleAnswer: "Far more than I used to, because my phone makes it so easy. I mostly photograph food and sunsets, which is not very original, but looking back at those pictures always makes me smile." }),
  q('p1-public-transport', 1, 'Transport', 'How do you usually travel around your city?', { sampleAnswer: "I usually take the bus, because it is cheap and the network covers almost the whole city. When I am in a hurry, I book a ride-sharing bike, which is much faster in traffic." }),
];

export const PART2_BANK: IeltsQuestion[] = [
  q('p2-place', 2, 'A place', 'Describe a place you like to visit in your free time.', {
    bullets: ['Where it is', 'How often you go there', 'What you do there', 'And explain why you like it'],
    prepSec: 60,
    speakSec: 120,
    sampleAnswer:
      'The place I go most often is a small botanical garden about twenty minutes from my home. I try to go every Sunday morning, usually before it gets busy. I walk the same loop, sit by the pond for a while and read a little. What I like about it is that it is one of the few places in the city where the noise genuinely stops, and an hour there resets the rest of my week.',
    bandDescriptors: [
      'Speak for the full two minutes without the examiner interrupting.',
      'Use the cue-card points as a structure, not as a checklist to read out.',
      'Add one past example and one comparison to extend the turn.',
    ],
  }),
  q('p2-person', 2, 'A person', 'Describe a person who has helped you in your life.', {
    bullets: ['Who the person is', 'How you met them', 'How they helped you', 'And explain why you are grateful'],
    prepSec: 60,
    speakSec: 120,
    sampleAnswer:
      'The person I would describe is my first manager, who took a chance on me when I had no relevant experience. We met at a job fair where I had almost given up for the day. She helped me most by giving me work that was slightly beyond my ability and then defending the mistakes I made while learning it. I am grateful because that combination of challenge and cover is rare, and it shaped how I now treat juniors myself.',
    bandDescriptors: [
      'Move beyond description into why it mattered.',
      'Use past tenses accurately across the whole turn.',
      'End with a reflection, not a summary.',
    ],
  }),
  q('p2-object', 2, 'An object', 'Describe something you own that is important to you.', {
    bullets: ['What it is', 'How long you have had it', 'Where you got it', 'And explain why it is important'],
    prepSec: 60,
    speakSec: 120,
    sampleAnswer:
      'The object I would choose is a steel water bottle my father gave me before I left for university. I have had it for about seven years now. It is dented and the paint has mostly gone, so objectively it is worthless. What makes it important is that it was the one practical thing he knew how to offer at the time, and I use it every single day, which I think is the best use an object can have.',
    bandDescriptors: [
      'Give concrete physical detail — examiners reward specificity.',
      'Contrast objective value with personal value.',
      'Avoid running out at 90 seconds: prepare a closing thought.',
    ],
  }),
  q('p2-event', 2, 'An event', 'Describe an occasion when you had to make a difficult decision.', {
    bullets: ['What the decision was', 'When you made it', 'Who you consulted', 'And explain why it was difficult'],
    prepSec: 60,
    speakSec: 120,
    sampleAnswer:
      'The decision was whether to leave a stable government job for a smaller company that might not survive the year. I made it about three years ago, after roughly two months of going back and forth. I consulted my parents, who were firmly against it, and one former colleague who had done something similar. It was difficult because the safe option was not bad — it was comfortable — and choosing against comfort feels like ingratitude.',
    bandDescriptors: [
      'Narrate a sequence: situation, options, decision, outcome.',
      'Use a range of past and perfect tenses.',
      'Explain the emotional difficulty, not just the practical one.',
    ],
  }),
  q('p2-habit', 2, 'A habit', 'Describe a habit you have that keeps you healthy.', {
    bullets: ['What the habit is', 'When you started it', 'How easy it is to maintain', 'And explain how it benefits you'],
    prepSec: 60,
    speakSec: 120,
    sampleAnswer:
      'The habit is a thirty-minute walk immediately after dinner. I started it about two years ago when a health check gave me a warning I was too young to ignore. It is genuinely easy to maintain because it requires no equipment and no decision — I simply leave the table and go. The benefit is less physical than I expected; the clearest effect is that I sleep better and my mind stops running.',
    bandDescriptors: [
      'Address all four cue points, in order.',
      'Use adverbials of frequency accurately.',
      'Finish with an unexpected or reflective point to sound natural.',
    ],
  }),
  q('p2-skill', 2, 'A skill', 'Describe a skill you would like to learn in the future.', {
    bullets: ['What the skill is', 'Why you want to learn it', 'How you would learn it', 'And explain how it would benefit you'],
    prepSec: 60,
    speakSec: 120,
    sampleAnswer:
      'The skill I would most like to learn is a second language, specifically German. I want it partly for work, since a lot of the technical documentation I need is not translated, and partly because I have noticed that learning a language changes how you think about your own. I would learn it through daily short sessions rather than classes, because consistency is the only thing that has ever worked for me. It would benefit me professionally, but I suspect the sharper benefit would be cognitive.',
    bandDescriptors: [
      'Use conditionals naturally ("I would…", "If I had time…").',
      'Give two reasons, not five shallow ones.',
      'Keep the long turn going with examples, not repetition.',
    ],
  }),
];

export const PART3_BANK: IeltsQuestion[] = [
  q('p3-places', 3, 'Public spaces', 'Why do you think cities need public spaces like parks?', { sampleAnswer: "I think public spaces are essential because they give people room to breathe in crowded cities. Parks are where families spend time together, children play safely, and older people stay active. Without them, a city becomes just concrete and traffic, which affects mental health." }),
  q('p3-places-2', 3, 'Public spaces', 'Do people today spend less time outdoors than previous generations?', { sampleAnswer: "Generally, yes. Previous generations worked outdoors or walked everywhere, while today most jobs and entertainment are screen-based. My grandparents spent their evenings outside with neighbours, but now even socialising happens online, so we go out far less." }),
  q('p3-places-3', 3, 'Public spaces', 'Who should be responsible for maintaining these spaces?', { sampleAnswer: "In my view it should be a shared responsibility. The government must fund and maintain these spaces properly, because they are public property, but citizens also need to respect them. When communities adopt a park and keep it clean, it stays usable for everyone." }),
  q('p3-help', 3, 'Helping others', 'Why do some people help strangers while others do not?', { sampleAnswer: "I believe it depends on upbringing and empathy. People who were taught kindness at home, or who have been helped themselves, tend to step in more easily. Others may hesitate out of fear, or because they assume someone else will act." }),
  q('p3-help-2', 3, 'Helping others', 'Should volunteering be a required part of education?', { sampleAnswer: "I think schools should strongly encourage volunteering rather than force it. Compulsory service can feel like a chore, but when students see its impact first-hand, many continue by choice. Real empathy grows from experience, not obligation." }),
  q('p3-help-3', 3, 'Helping others', 'Has technology made it easier or harder for communities to support each other?', { sampleAnswer: "It cuts both ways. Technology makes it easy to organise help, like crowdfunding for a sick neighbour, and to stay connected across distances. But it can also weaken local bonds, because people chat online instead of meeting the people next door." }),
  q('p3-possessions', 3, 'Possessions', 'Do you think people place too much importance on owning things?', { sampleAnswer: "To some extent, yes. Advertising convinces us that possessions signal success, so people buy things they rarely use. Yet I notice many younger people now prefer spending on travel and experiences, which suggests attitudes may be shifting." }),
  q('p3-possessions-2', 3, 'Possessions', 'Why do certain objects carry emotional value?', { sampleAnswer: "Because objects hold memories. A grandmother's old watch is valuable not for its price but for the person and the stories attached to it. In a way, we keep these items to stay connected to moments we do not want to lose." }),
  q('p3-possessions-3', 3, 'Possessions', 'Will younger generations own less than their parents did?', { sampleAnswer: "Probably, yes. Housing is becoming unaffordable in many cities, and services like streaming and ride-sharing mean we no longer need to own DVDs or cars. I think access is slowly replacing ownership for my generation." }),
  q('p3-decisions', 3, 'Decision making', 'Are people today facing more decisions than in the past?', { sampleAnswer: "Definitely. In the past, career, marriage, and even where to live were largely decided by family or tradition. Today we choose from endless options in every area of life, which brings freedom but also a lot of anxiety." }),
  q('p3-decisions-2', 3, 'Decision making', 'Is it better to make decisions quickly or slowly?', { sampleAnswer: "It depends on the stakes. For small daily choices, deciding quickly saves time and energy, but major decisions like changing careers deserve careful thought. The danger is overthinking, because waiting for perfect information can mean never deciding at all." }),
  q('p3-decisions-3', 3, 'Decision making', 'How much should emotion influence a major decision?', { sampleAnswer: "Emotion should inform a decision but not drive it. If a choice fills you with dread, that is useful data about your values. However, acting purely on excitement or fear usually leads to regret, so the best approach balances logic with honest feelings." }),
  q('p3-health', 3, 'Healthy living', 'Whose responsibility is it to keep citizens healthy?', { sampleAnswer: "It is a joint effort. Governments must provide clean air, safe food, and affordable healthcare, because individuals cannot control those conditions. But personal habits like diet and exercise remain our own responsibility, so neither side can succeed alone." }),
  q('p3-health-2', 3, 'Healthy living', 'Why do people abandon habits they know are good for them?', { sampleAnswer: "Mainly because good habits reward us slowly while temptation rewards us instantly. Nobody feels healthier after one salad, but cake tastes good immediately. People give up when motivation fades and the habit has not yet become automatic." }),
  q('p3-learning', 3, 'Learning', 'Are adults more or less able to learn new things than children?', { sampleAnswer: "Children absorb language and skills faster, partly because their brains are still developing and they have no fear of mistakes. Adults, however, learn more efficiently when the topic connects to real goals, because they bring experience and discipline that children lack." }),
  q('p3-learning-2', 3, 'Learning', 'Will formal education still exist in fifty years?', { sampleAnswer: "I think formal education will survive, but in a very different shape. AI can personalise learning at home, yet schools provide structure, social skills, and recognised qualifications that self-study cannot replace. My guess is classrooms will focus more on collaboration and less on memorisation." }),
];

function pick<T>(list: T[], n: number, seed: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(list[(seed * 7 + i * 3) % list.length]);
  return [...new Set(out)].slice(0, n);
}

/**
 * Full-length mocks. Each is a realistic 11-14 minute sitting:
 * four Part 1 questions, one cue card, and three Part 3 discussions.
 */
export const IELTS_MOCKS: IeltsMock[] = [
  {
    id: 'mock-1',
    title: 'Mock Test 1 — Places & Belonging',
    durationMin: 13,
    part1: [PART1_BANK[0], PART1_BANK[1], PART1_BANK[2], PART1_BANK[9]],
    part2: PART2_BANK[0],
    part3: [PART3_BANK[0], PART3_BANK[1], PART3_BANK[2]],
  },
  {
    id: 'mock-2',
    title: 'Mock Test 2 — People & Community',
    durationMin: 13,
    part1: [PART1_BANK[3], PART1_BANK[11], PART1_BANK[6], PART1_BANK[12]],
    part2: PART2_BANK[1],
    part3: [PART3_BANK[3], PART3_BANK[4], PART3_BANK[5]],
  },
  {
    id: 'mock-3',
    title: 'Mock Test 3 — Possessions & Value',
    durationMin: 12,
    part1: [PART1_BANK[4], PART1_BANK[5], PART1_BANK[13], PART1_BANK[14]],
    part2: PART2_BANK[2],
    part3: [PART3_BANK[6], PART3_BANK[7], PART3_BANK[8]],
  },
  {
    id: 'mock-4',
    title: 'Mock Test 4 — Decisions & Change',
    durationMin: 14,
    part1: [PART1_BANK[7], PART1_BANK[8], PART1_BANK[10], PART1_BANK[14]],
    part2: PART2_BANK[3],
    part3: [PART3_BANK[9], PART3_BANK[10], PART3_BANK[11]],
  },
  {
    id: 'mock-5',
    title: 'Mock Test 5 — Health & Learning',
    durationMin: 13,
    part1: [PART1_BANK[2], PART1_BANK[12], PART1_BANK[5], PART1_BANK[6]],
    part2: PART2_BANK[4],
    part3: [PART3_BANK[12], PART3_BANK[13], PART3_BANK[14]],
  },
  {
    id: 'mock-6',
    title: 'Mock Test 6 — Skills & the Future',
    durationMin: 13,
    part1: [PART1_BANK[10], PART1_BANK[3], PART1_BANK[1], PART1_BANK[9]],
    part2: PART2_BANK[5],
    part3: [PART3_BANK[14], PART3_BANK[15], PART3_BANK[10]],
  },
];

export function getMock(id: string): IeltsMock | undefined {
  return IELTS_MOCKS.find((m) => m.id === id);
}

/**
 * Band descriptors surfaced in the mock report so the learner can see what the
 * number actually means rather than just receiving it.
 */
export const BAND_DESCRIPTORS: Record<number, { title: string; fluency: string; vocabulary: string }> = {
  5: {
    title: 'Modest user',
    fluency: 'Maintains speech at length, but hesitation is frequent and often language-related.',
    vocabulary: 'Uses sufficient vocabulary for familiar topics, with noticeable errors in word choice.',
  },
  6: {
    title: 'Competent user',
    fluency: 'Willing to speak at length; coherence is sometimes lost through over-use of connectives.',
    vocabulary: 'Has a wide enough vocabulary to discuss topics at length and make meaning clear despite errors.',
  },
  7: {
    title: 'Good user',
    fluency: 'Speaks at length without noticeable effort; some hesitation is usually content-related.',
    vocabulary: 'Uses vocabulary resources flexibly and uses some less common and idiomatic vocabulary.',
  },
  8: {
    title: 'Very good user',
    fluency: 'Fluent with only occasional repetition or self-correction; topics are developed coherently.',
    vocabulary: 'Uses a wide vocabulary fluently and flexibly to convey precise meaning; skillful use of less common items.',
  },
  9: {
    title: 'Expert user',
    fluency: 'Fluent, with no discernible effort; fully operational command of the language.',
    vocabulary: 'Uses vocabulary with full flexibility and precision in all topics.',
  },
};

export function descriptorForBand(band: number) {
  const rounded = Math.round(band) as number;
  return BAND_DESCRIPTORS[Math.min(9, Math.max(5, rounded))];
}

export { pick };
