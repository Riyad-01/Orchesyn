import type { Topic } from '@/types';

/**
 * Impromptu speaking topics — the "60-second magic" content.
 *
 * Each topic ships with cue prompts (what to cover), a model answer written at
 * roughly band 7 so the learner can compare structure rather than wording, and the
 * vocabulary that lifts an answer on this subject.
 */

export const TOPIC_CATEGORIES = [
  { id: 'personal', name: 'Personal', emoji: '🙋' },
  { id: 'society', name: 'Society', emoji: '🏙️' },
  { id: 'technology', name: 'Technology', emoji: '📱' },
  { id: 'education', name: 'Education', emoji: '🎓' },
  { id: 'work', name: 'Work', emoji: '💼' },
  { id: 'environment', name: 'Environment', emoji: '🌍' },
  { id: 'culture', name: 'Culture', emoji: '🎭' },
  { id: 'abstract', name: 'Abstract', emoji: '🧠' },
] as const;

export const TOPICS: Topic[] = [
  /* ---------------- personal ---------------- */
  {
    id: 't-morning-routine',
    title: 'Describe your typical morning routine',
    category: 'personal',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['What time you wake up and why', 'The three things you always do', 'How it has changed over the years'],
    sampleAnswer:
      'I usually wake up around seven, mostly because my body has simply got used to it. The first thing I do is drink a glass of water, then I make tea while checking my messages. Honestly, my routine is far more relaxed than it was during college, when I would skip breakfast entirely and regret it by eleven.',
    keyVocab: ['consistently', 'unwind', 'prioritise', 'habitual', 'refreshed'],
  },
  {
    id: 't-role-model',
    title: 'Talk about someone you admire',
    category: 'personal',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['Who they are and how you know them', 'What they achieved', 'Why they influence you'],
    sampleAnswer:
      "The person I admire most is my grandmother, who raised four children while running a small tailoring business. What strikes me is not her success but her consistency — she never missed a day of work in thirty years. I think that quiet discipline has influenced me far more than any advice she ever gave.",
    keyVocab: ['resilience', 'diligent', 'humble', 'look up to', 'perseverance'],
  },
  {
    id: 't-hometown',
    title: 'Describe the place you grew up',
    category: 'personal',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['Where it is', 'What it is known for', 'How it has changed'],
    sampleAnswer:
      'I grew up in a mid-sized city that is mainly known for its tea gardens. When I was young it felt enormous, but visiting now it seems surprisingly compact. The biggest change is the traffic and the shopping malls, though the old market street still smells exactly the same.',
    keyVocab: ['nostalgic', 'bustling', 'suburb', 'landmark', 'transform'],
  },
  {
    id: 't-failure',
    title: 'Describe a failure that taught you something',
    category: 'personal',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['What happened', 'How you felt at the time', 'What you do differently now'],
    sampleAnswer:
      'In my second year I failed a statistics exam I was certain I would pass. I had revised by rereading my notes rather than solving problems, which felt like studying but was not. Since then I test myself before every exam, and that single habit has probably done more for my grades than any extra hour in the library.',
    keyVocab: ['setback', 'overconfident', 'revise', 'accountable', 'silver lining'],
  },
  {
    id: 't-perfect-day',
    title: 'What would your perfect day look like?',
    category: 'personal',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['Where you would be', 'Who would be there', 'What you would do'],
    sampleAnswer:
      'My perfect day would start late, with no alarm and nowhere to be. I would spend the morning reading near water, have a long lunch with friends, and finish with a walk as it gets dark. What makes it perfect is the absence of obligation rather than anything extravagant.',
    keyVocab: ['leisurely', 'spontaneous', 'unhurried', 'contentment', 'idyllic'],
  },
  {
    id: 't-fear',
    title: 'Talk about something you are afraid of',
    category: 'personal',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['What the fear is', 'When it started', 'How you cope with it'],
    sampleAnswer:
      'I am genuinely afraid of public speaking, which is ironic given how much I enjoy conversation. It started at school when I froze during a presentation. I cope by over-preparing and by treating any small chance to speak as practice, which has slowly made it manageable rather than terrifying.',
    keyVocab: ['apprehensive', 'overwhelm', 'desensitise', 'coping mechanism', 'daunting'],
  },
  {
    id: 't-friendship',
    title: 'What makes a good friend?',
    category: 'personal',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['Qualities you value most', 'A friend who showed them', 'What breaks a friendship'],
    sampleAnswer:
      'For me the essential quality is reliability — a good friend does what they said they would do. My closest friend drove four hours to collect me when my car broke down, and did not mention it once afterwards. What usually ends friendships is not a big betrayal but a slow accumulation of small disappointments.',
    keyVocab: ['dependable', 'candid', 'empathy', 'reciprocity', 'drift apart'],
  },
  {
    id: 't-hobby',
    title: 'Describe a hobby you would like to take up',
    category: 'personal',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['What it is', 'Why it appeals to you', 'What is stopping you'],
    sampleAnswer:
      'I would love to learn the piano, mainly because it is one of the few activities that demands your full attention. Whenever I have tried, the obstacle has been consistency rather than ability — I practise enthusiastically for two weeks and then stop. What I need is a fixed daily slot, not more motivation.',
    keyVocab: ['absorbing', 'dexterity', 'commitment', 'therapeutic', 'put off'],
  },

  /* ---------------- society ---------------- */
  {
    id: 't-social-media',
    title: 'Has social media brought people closer or pushed them apart?',
    category: 'society',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['Take a position', 'Give a concrete example', 'Acknowledge the other side'],
    sampleAnswer:
      'I think it has done both, but in different directions. It keeps me connected to cousins abroad whom I would otherwise never speak to, which is a genuine gain. At the same time, I have noticed that people in the same room often converse through their phones. On balance I would say it widens our network while thinning our attention.',
    keyVocab: ['superficial', 'curated', 'echo chamber', 'on balance', 'genuine connection'],
  },
  {
    id: 't-urbanisation',
    title: 'Is city life better than village life?',
    category: 'society',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['Opportunities in each', 'The costs of each', 'Your own preference'],
    sampleAnswer:
      'Cities offer opportunity and villages offer time, and which matters more depends on your stage of life. In my twenties I want the careers, hospitals and anonymity a city provides. My parents, however, have moved back to the village and describe it as the best decision they made, so I suspect my answer will change.',
    keyVocab: ['infrastructure', 'congestion', 'tight-knit', 'trade-off', 'migration'],
  },
  {
    id: 't-traffic',
    title: 'How could your city reduce traffic congestion?',
    category: 'society',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['The main cause', 'One realistic solution', 'Why it would or would not work'],
    sampleAnswer:
      'The root cause here is that public transport is unreliable, so owning a car is a necessity rather than a luxury. Building more roads rarely helps, because the new capacity simply fills up. I would invest in a bus network with dedicated lanes and predictable timings, because that is the only measure that has worked elsewhere.',
    keyVocab: ['bottleneck', 'dedicated lane', 'induced demand', 'commuter', 'feasible'],
  },
  {
    id: 't-gender-equality',
    title: 'How far has gender equality progressed in your country?',
    category: 'society',
    difficulty: 3,
    prepSec: 30,
    targetSec: 60,
    prompts: ['Where progress is visible', 'Where it is not', 'What would accelerate it'],
    sampleAnswer:
      'Progress is very visible in education, where girls now often outperform boys at school. It is far less visible in domestic labour, which is still distributed unevenly even in dual-income households. I believe affordable childcare would change more than any awareness campaign, because it addresses the practical constraint directly.',
    keyVocab: ['disparity', 'unpaid labour', 'representation', 'systemic', 'level playing field'],
  },
  {
    id: 't-news',
    title: 'Do people today get better informed or more misinformed?',
    category: 'society',
    difficulty: 3,
    prepSec: 30,
    targetSec: 60,
    prompts: ['Access versus accuracy', 'The role of algorithms', 'Your own news habits'],
    sampleAnswer:
      'We have unprecedented access and unprecedented noise, and the second problem has grown faster than the first. Algorithms reward outrage because outrage holds attention, so the incentive structure works against accuracy. Personally I now read two sources with opposing biases and treat the truth as somewhere between them.',
    keyVocab: ['misinformation', 'sensationalism', 'media literacy', 'confirmation bias', 'nuance'],
  },
  {
    id: 't-ageing',
    title: 'Should governments do more for elderly citizens?',
    category: 'society',
    difficulty: 3,
    prepSec: 30,
    targetSec: 60,
    prompts: ['The current situation', 'The main gap', 'Who should pay for it'],
    sampleAnswer:
      'Most elderly care in my country is provided informally by families, which works until the family is small or working abroad. The obvious gap is affordable medical care and pension coverage for those in informal employment. Since the current generation built the economy, I think it is reasonable for the state to carry a substantial share of the cost.',
    keyVocab: ['pension', 'informal sector', 'nuclear family', 'dignity', 'social security'],
  },

  /* ---------------- technology ---------------- */
  {
    id: 't-ai-jobs',
    title: 'Will artificial intelligence take your job?',
    category: 'technology',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['What your work involves', 'Which parts are automatable', 'What you would do about it'],
    sampleAnswer:
      'Part of it certainly will be. The routine elements — drafting standard documents, summarising meetings — are already faster with a machine. What cannot be automated is judging what a client actually needs when they have not articulated it. So my plan is to move toward that judgement work and treat the tool as an assistant.',
    keyVocab: ['automate', 'displacement', 'augment', 'routine task', 'retrain'],
  },
  {
    id: 't-screen-time',
    title: 'Should we limit our screen time?',
    category: 'technology',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['Your current usage', 'What it displaces', 'Whether limits actually work'],
    sampleAnswer:
      'My screen time is around six hours a day, which sounds alarming until you notice that four of those are work. The problem is not the total but the fragmentation — I check my phone perhaps eighty times for no reason. App timers have never worked for me; what did work was leaving the phone in another room while I read.',
    keyVocab: ['fragmented attention', 'compulsive', 'digital wellbeing', 'displace', 'boundary'],
  },
  {
    id: 't-cashless',
    title: 'Is a cashless society a good idea?',
    category: 'technology',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['Convenience gains', 'Risks', 'Who gets left behind'],
    sampleAnswer:
      'The convenience is undeniable and the reduction in petty theft is real. But a fully cashless system excludes anyone without a bank account or a smartphone, which in my country is still a large minority. There is also a privacy cost: every purchase becomes a permanent record held by a private company.',
    keyVocab: ['financial inclusion', 'transaction', 'surveillance', 'exclusion', 'convenience'],
  },
  {
    id: 't-online-learning',
    title: 'Can online learning replace classrooms?',
    category: 'technology',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['What online does better', 'What it cannot do', 'Your own experience'],
    sampleAnswer:
      'Online is better for delivering content to people who cannot travel, and it lets you rewatch a difficult explanation. What it cannot replicate is the social pressure of a room full of peers, which is what actually makes most students study. I finished one online course and abandoned three, and the difference was whether anyone noticed.',
    keyVocab: ['asynchronous', 'self-discipline', 'engagement', 'accessibility', 'attrition'],
  },
  {
    id: 't-privacy',
    title: 'Is privacy still possible today?',
    category: 'technology',
    difficulty: 3,
    prepSec: 30,
    targetSec: 60,
    prompts: ['What you actually give away', 'What you get in return', 'Where you would draw the line'],
    sampleAnswer:
      'Complete privacy is no longer realistic, but meaningful privacy still is. I give away my location and my browsing habits in exchange for maps and free software, which feels like a fair trade. Where I draw the line is biometric data, because unlike a password it cannot be changed once it leaks.',
    keyVocab: ['consent', 'data broker', 'trade-off', 'irreversible', 'surveillance capitalism'],
  },
  {
    id: 't-gaming',
    title: 'Are video games a waste of time?',
    category: 'technology',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['What games teach', 'When they become harmful', 'Your view'],
    sampleAnswer:
      'I would argue they teach planning, resource management and persistence under failure, which are not trivial skills. They become harmful when they displace sleep or real relationships, which is a question of dose rather than substance. I play a couple of hours a week and consider it no worse than watching television.',
    keyVocab: ['cognitive', 'moderation', 'immersive', 'problem-solving', 'escapism'],
  },

  /* ---------------- education ---------------- */
  {
    id: 't-exams',
    title: 'Do examinations measure intelligence?',
    category: 'education',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['What exams do measure', 'What they miss', 'A better alternative'],
    sampleAnswer:
      'Exams measure the ability to recall and apply known material under time pressure, which is a narrow but real skill. They miss creativity, collaboration and the capacity to work on a problem for months. A portfolio of long projects would assess those better, though it is far harder to mark fairly at scale.',
    keyVocab: ['rote learning', 'assessment', 'cramming', 'holistic', 'standardised'],
  },
  {
    id: 't-english',
    title: 'Why is English so important in your country?',
    category: 'education',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['Where it is required', 'The advantage it gives', 'Whether that is fair'],
    sampleAnswer:
      'English is the gateway to higher education and to the better-paying jobs, particularly in technology and aviation. That creates an unfair advantage for children from English-medium schools, regardless of their actual ability. I think it is a practical necessity, but we should stop treating fluency as a proxy for intelligence.',
    keyVocab: ['proficiency', 'social mobility', 'medium of instruction', 'gatekeeper', 'fluency'],
  },
  {
    id: 't-teacher',
    title: 'Describe a teacher who influenced you',
    category: 'education',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['Who and what they taught', 'What they did differently', 'The lasting effect'],
    sampleAnswer:
      'My physics teacher had a habit of never answering a question directly; he would ask something back until you found the answer yourself. It was infuriating at the time. Years later I realised he was teaching me to think rather than to memorise, and that is the only teaching method I have carried into my own work.',
    keyVocab: ['inquisitive', 'encourage', 'critical thinking', 'unconventional', 'lasting impact'],
  },
  {
    id: 't-university',
    title: 'Is a university degree still worth it?',
    category: 'education',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['The cost', 'The benefits beyond the certificate', 'Who should skip it'],
    sampleAnswer:
      'The financial cost is now so high that it depends entirely on the field. For medicine or engineering the return is clear. For many other subjects the value lies in the three years of independent living and the network rather than the certificate, which is real but should be weighed honestly against the debt.',
    keyVocab: ['return on investment', 'credential', 'tuition', 'employability', 'alternative pathway'],
  },
  {
    id: 't-homework',
    title: 'Should homework be abolished?',
    category: 'education',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['Arguments for', 'Arguments against', 'A middle position'],
    sampleAnswer:
      'Countries that assign very little homework consistently perform well, which suggests most of it is wasted effort. But some practice is genuinely necessary in subjects like mathematics, where fluency comes from repetition. I would abolish routine worksheets and keep only short, purposeful practice.',
    keyVocab: ['consolidation', 'workload', 'burnout', 'evidence-based', 'diminishing returns'],
  },
  {
    id: 't-skill-vs-degree',
    title: 'Skills or certificates: which matters more now?',
    category: 'education',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['How hiring has changed', 'Where certificates still rule', 'Your strategy'],
    sampleAnswer:
      'In technology hiring has visibly shifted toward demonstrated ability, and portfolios often beat degrees. In law, medicine and the civil service the certificate remains a hard gate. My own strategy is to hold one recognised qualification and then let a public body of work do the persuading.',
    keyVocab: ['portfolio', 'competency', 'credential inflation', 'meritocratic', 'gatekeeping'],
  },

  /* ---------------- work ---------------- */
  {
    id: 't-remote-work',
    title: 'Is remote work better than office work?',
    category: 'work',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['What you gain', 'What you lose', 'The best arrangement'],
    sampleAnswer:
      'Remote work gives back two hours of commuting and allows deep, uninterrupted focus. What it costs is the informal learning that happens when you overhear a colleague solve a problem. I think three days remote and two in the office captures most of both, provided the office days are used for collaboration.',
    keyVocab: ['commute', 'deep work', 'serendipity', 'hybrid', 'isolation'],
  },
  {
    id: 't-dream-job',
    title: 'Describe your ideal job',
    category: 'work',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['What the work involves', 'The conditions you need', 'Why it suits you'],
    sampleAnswer:
      'My ideal job would involve solving problems that have a visible result within a few months, rather than years. I need autonomy over how I work and colleagues who disagree openly. The pay matters less than the rate at which I would learn, which I recognise is an easier position to hold early in a career.',
    keyVocab: ['autonomy', 'fulfilling', 'progression', 'work-life balance', 'meaningful'],
  },
  {
    id: 't-interview',
    title: 'What makes a job interview go well?',
    category: 'work',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['Preparation', 'What interviewers actually assess', 'Common mistakes'],
    sampleAnswer:
      'Preparation matters, but what interviewers assess is whether you can think clearly with incomplete information. Most candidates fail by describing responsibilities instead of outcomes. I now prepare three stories with numbers attached, because a specific result is far more persuasive than a list of duties.',
    keyVocab: ['articulate', 'competency', 'quantify', 'rapport', 'follow-up'],
  },
  {
    id: 't-work-life',
    title: 'Is work-life balance achievable?',
    category: 'work',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['What balance means to you', 'What prevents it', 'What has helped'],
    sampleAnswer:
      'I have stopped thinking of it as balance and started thinking of it as boundaries, because balance implies a stable state that never actually exists. What prevents it is the assumption that availability equals commitment. The single most effective change for me was turning off notifications after nine.',
    keyVocab: ['burnout', 'boundaries', 'always-on culture', 'sustainable', 'disconnect'],
  },
  {
    id: 't-failure-at-work',
    title: 'Describe a mistake you made at work',
    category: 'work',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['What went wrong', 'How you handled it', 'What changed afterwards'],
    sampleAnswer:
      'I once sent a client the wrong pricing sheet and did not notice for two days. When I realised, I called them immediately rather than hoping it would pass. They were annoyed but respected the honesty, and we introduced a two-person check on every outbound document, which has prevented it recurring.',
    keyVocab: ['accountability', 'rectify', 'oversight', 'own up', 'preventive measure'],
  },
  {
    id: 't-leader',
    title: 'What qualities make a good leader?',
    category: 'work',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['The most important quality', 'A leader you have observed', 'What bad leaders do'],
    sampleAnswer:
      'The quality I value most is the willingness to be clear about what is going badly. The best manager I have had told us within a week that a project was in trouble, which gave us time to fix it. Bad leaders mostly do the opposite: they protect their own image until the problem is too large to hide.',
    keyVocab: ['transparent', 'delegate', 'psychological safety', 'micromanage', 'accountable'],
  },

  /* ---------------- environment ---------------- */
  {
    id: 't-climate',
    title: 'What can one person do about climate change?',
    category: 'environment',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['Individual actions', 'Their real impact', 'What matters more'],
    sampleAnswer:
      'Individual actions like flying less and eating less meat do reduce your footprint, and they are worth doing. But their greater value is political, because they normalise the behaviour you want regulated. Honestly, the decisive lever is voting and pressure on industry, not the straw you refuse at a restaurant.',
    keyVocab: ['carbon footprint', 'systemic change', 'sustainable', 'consumption', 'advocacy'],
  },
  {
    id: 't-plastic',
    title: 'How should we deal with plastic waste?',
    category: 'environment',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['The scale of the problem', 'What has worked', 'Who should act'],
    sampleAnswer:
      'Recycling has largely failed because the economics never worked; most collected plastic is simply buried. What has actually reduced waste is banning specific items, as several countries did with thin carrier bags. I would place the obligation on manufacturers, since consumers cannot choose packaging that does not exist.',
    keyVocab: ['single-use', 'circular economy', 'biodegradable', 'extended producer responsibility', 'landfill'],
  },
  {
    id: 't-public-transport',
    title: 'Would you give up your car?',
    category: 'environment',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['What you use a car for', 'What would need to change', 'Your honest answer'],
    sampleAnswer:
      'I would give it up tomorrow if the alternative were reliable, which today it is not. I use the car mainly for a thirty-kilometre commute that takes an hour by car and two and a half by bus. Give me a service that runs every ten minutes and I would happily sell it.',
    keyVocab: ['reliability', 'last-mile connectivity', 'emissions', 'commuter rail', 'behaviour change'],
  },
  {
    id: 't-water',
    title: 'Is your country facing a water problem?',
    category: 'environment',
    difficulty: 3,
    prepSec: 30,
    targetSec: 60,
    prompts: ['The current situation', 'The causes', 'Possible solutions'],
    sampleAnswer:
      'Groundwater is being extracted far faster than it is replenished, particularly for agriculture. The cause is largely free electricity for irrigation pumps, which removes any incentive to conserve. Metering that power and pricing water realistically would be unpopular but effective, and rainwater harvesting should be mandatory in new buildings.',
    keyVocab: ['depletion', 'aquifer', 'irrigation', 'water table', 'rationing'],
  },
  {
    id: 't-trees',
    title: 'Why should cities plant more trees?',
    category: 'environment',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['Benefits beyond beauty', 'Why it does not happen', 'What you would do'],
    sampleAnswer:
      'Trees reduce street temperature by several degrees, absorb drainage that would otherwise flood, and measurably improve mental health. Cities rarely prioritise them because a sapling delivers nothing before the next election. I would tie new construction permits to a mature-tree requirement.',
    keyVocab: ['canopy', 'urban heat island', 'biodiversity', 'stormwater', 'wellbeing'],
  },
  {
    id: 't-energy',
    title: 'Should your country invest in nuclear power?',
    category: 'environment',
    difficulty: 3,
    prepSec: 30,
    targetSec: 60,
    prompts: ['The case for', 'The case against', 'Your conclusion'],
    sampleAnswer:
      'The case for is that nuclear is the only low-carbon source that runs continuously, while solar and wind need storage we cannot yet afford at scale. The case against is cost overruns and the unsolved waste problem. On balance I would build a limited number of plants while treating renewables as the primary investment.',
    keyVocab: ['baseload', 'intermittent', 'grid', 'decommissioning', 'radioactive waste'],
  },

  /* ---------------- culture ---------------- */
  {
    id: 't-festival',
    title: 'Describe an important festival in your country',
    category: 'culture',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['What is celebrated', 'How people mark it', 'How it has changed'],
    sampleAnswer:
      'The most widely celebrated festival marks the harvest, and families travel home regardless of the distance. The food, the lamps and the noise are the visible parts; the real function is that it forces an annual reunion. It has become noticeably more commercial, though the family gathering remains central.',
    keyVocab: ['heritage', 'custom', 'communal', 'ritual', 'commercialisation'],
  },
  {
    id: 't-language',
    title: 'Are local languages disappearing?',
    category: 'culture',
    difficulty: 3,
    prepSec: 30,
    targetSec: 60,
    prompts: ['The evidence', 'Why it happens', 'Whether it matters'],
    sampleAnswer:
      'In my country several regional languages have fewer young speakers each decade, because schooling and employment run through English or the national language. It matters more than it appears, since a language carries concepts and humour that do not translate. I would make mother-tongue schooling properly funded rather than symbolic.',
    keyVocab: ['linguistic diversity', 'mother tongue', 'extinction', 'preservation', 'identity'],
  },
  {
    id: 't-music',
    title: 'How has music changed in your lifetime?',
    category: 'culture',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['How you accessed it as a child', 'How you access it now', 'What was lost'],
    sampleAnswer:
      'As a child I owned perhaps twenty albums and knew every track, because acquiring music took effort. Now I have effectively all of it for a monthly fee. What was lost is the deep familiarity that came from limitation, and I do genuinely miss sitting with one record for a month.',
    keyVocab: ['streaming', 'accessibility', 'curation', 'album culture', 'disposable'],
  },
  {
    id: 't-tradition',
    title: 'Which tradition should be preserved, and which should go?',
    category: 'culture',
    difficulty: 3,
    prepSec: 30,
    targetSec: 60,
    prompts: ['One worth keeping and why', 'One worth dropping and why', 'Who decides'],
    sampleAnswer:
      'I would keep the tradition of extended family eating together, because it is a cheap and effective support network. I would drop the expectation that wedding costs fall on one family, which pushes people into years of debt. Decisions like these are made slowly by each generation choosing differently, not by any authority.',
    keyVocab: ['heritage', 'obsolete', 'social cohesion', 'dowry', 'generational shift'],
  },
  {
    id: 't-food',
    title: 'Describe a dish from your region',
    category: 'culture',
    difficulty: 1,
    prepSec: 20,
    targetSec: 60,
    prompts: ['What it is', 'How it is made', 'When it is eaten'],
    sampleAnswer:
      'The dish I would choose is a slow-cooked rice and lentil preparation eaten mainly at breakfast. It takes hours, so it is now usually bought rather than made at home. The flavour depends entirely on the fermentation overnight, which is why restaurant versions rarely match a household one.',
    keyVocab: ['cuisine', 'aromatic', 'staple', 'fermentation', 'authentic'],
  },
  {
    id: 't-tourism',
    title: 'Does tourism help or harm a place?',
    category: 'culture',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['Economic benefit', 'The costs', 'How to manage it'],
    sampleAnswer:
      'Tourism brings income to regions that have few other options, which is significant. The cost is that prices rise for residents and historic areas become theme parks for visitors. Limiting daily visitor numbers and taxing short-term rentals are the two measures that seem to work best.',
    keyVocab: ['overtourism', 'local economy', 'preservation', 'infrastructure strain', 'sustainable tourism'],
  },

  /* ---------------- abstract ---------------- */
  {
    id: 't-success',
    title: 'How do you define success?',
    category: 'abstract',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['Your definition', 'Whether it has changed', 'Someone who embodies it'],
    sampleAnswer:
      'I define success as having control over how you spend your time, which sounds vague but is quite hard to achieve. In my early twenties I would have said income, and I think that shift came from watching well-paid people who had no freedom at all. The person closest to it that I know earns modestly and chooses her own hours.',
    keyVocab: ['autonomy', 'fulfilment', 'extrinsic', 'intrinsic', 'contentment'],
  },
  {
    id: 't-happiness',
    title: 'Can money buy happiness?',
    category: 'abstract',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['Up to what point', 'What the research suggests', 'Your own view'],
    sampleAnswer:
      'Money clearly buys relief from misery, and that should not be romanticised away. Beyond a comfortable income the effect flattens sharply, and the research on this is fairly consistent. What continues to predict happiness is the quality of close relationships, which no amount of money purchases directly.',
    keyVocab: ['diminishing returns', 'financial security', 'wellbeing', 'relative deprivation', 'threshold'],
  },
  {
    id: 't-change',
    title: 'Is change always good?',
    category: 'abstract',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['When change helps', 'When it does not', 'Your conclusion'],
    sampleAnswer:
      'Change is neutral; what matters is whether it was chosen. A career change you decided on is energising, while a reorganisation imposed on you is simply stressful. I would say the useful question is not whether to change but who is deciding, because that determines most of how it feels.',
    keyVocab: ['adaptability', 'disruption', 'agency', 'status quo', 'transition'],
  },
  {
    id: 't-time',
    title: 'Does time pass faster as you get older?',
    category: 'abstract',
    difficulty: 2,
    prepSec: 25,
    targetSec: 60,
    prompts: ['Your experience', 'A possible explanation', 'What to do about it'],
    sampleAnswer:
      'It absolutely feels that way, and the usual explanation is that novelty compresses memory — a year of firsts is remembered in detail while a routine year leaves almost no trace. If that is right, the remedy is to keep inserting unfamiliar experiences, which is a slightly alarming conclusion.',
    keyVocab: ['perception', 'novelty', 'monotony', 'milestone', 'autobiographical memory'],
  },
  {
    id: 't-truth',
    title: 'Is honesty always the best policy?',
    category: 'abstract',
    difficulty: 3,
    prepSec: 30,
    targetSec: 60,
    prompts: ['Where honesty is essential', 'Where it does harm', 'How you decide'],
    sampleAnswer:
      'Honesty is essential where someone is making a decision on your information, so I would never mislead a colleague or a doctor. Small social lies — saying a meal was enjoyable — protect people without distorting anything that matters. My test is whether the person would thank me later for knowing.',
    keyVocab: ['candour', 'tact', 'white lie', 'integrity', 'withhold'],
  },
  {
    id: 't-luck',
    title: 'How much of success is luck?',
    category: 'abstract',
    difficulty: 3,
    prepSec: 30,
    targetSec: 60,
    prompts: ['What luck provides', 'What effort provides', 'Why people deny luck'],
    sampleAnswer:
      'Luck determines where you start, which country you are born in and which people you happen to meet, and that is a very large share. Effort determines how much of a given opportunity you convert. We downplay luck because it is uncomfortable to admit that our achievements were not entirely earned.',
    keyVocab: ['circumstance', 'merit', 'opportunity', 'privilege', 'attribution'],
  },
];

export function topicsByCategory(categoryId: string): Topic[] {
  return TOPICS.filter((t) => t.category === categoryId);
}

export function getTopic(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}

/** Pick a topic the learner has not used recently. */
export function pickTopic(opts: {
  category?: string;
  difficulty?: 1 | 2 | 3;
  excludeIds?: string[];
} = {}): Topic {
  const exclude = new Set(opts.excludeIds ?? []);
  let pool = TOPICS.filter((t) => !exclude.has(t.id));
  if (opts.category && opts.category !== 'all') pool = pool.filter((t) => t.category === opts.category);
  if (opts.difficulty) pool = pool.filter((t) => t.difficulty === opts.difficulty);
  if (!pool.length) pool = TOPICS;
  return pool[Math.floor(Math.random() * pool.length)];
}
