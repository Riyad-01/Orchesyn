/**
 * IELTS Listening / Reading / Writing content.
 *
 * Listening is deliberately TTS-driven (the browser reads the script aloud):
 * zero extra megabytes, works offline, no audio hosting — the "smart, mb-minimal"
 * way to ship listening practice. Scripts follow the real 4-section structure.
 */

export interface Lq {
  id: string;
  text: string;
  options: string[];
  answer: number; // index into options
}

export interface ListeningSection {
  title: string;
  context: string;
  /** each line is spoken by the TTS narrator in order */
  script: string[];
  questions: Lq[];
}

export interface ListeningSet {
  id: string;
  title: string;
  level: 'Foundation' | 'Intermediate' | 'Advanced';
  minutes: number;
  sections: ListeningSection[];
}

export interface Rq {
  id: string;
  kind: 'mcq' | 'truefalse';
  text: string;
  options: string[];
  answer: number;
}

export interface ReadingPassage {
  id: string;
  title: string;
  level: 'Foundation' | 'Intermediate' | 'Advanced';
  minutes: number;
  paragraphs: string[];
  questions: Rq[];
}

export interface WritingTask {
  id: string;
  task: 1 | 2;
  title: string;
  minutes: number;
  minWords: number;
  prompt: string;
  /** data points the answer must cover (task 1) / idea seeds (task 2) */
  hints: string[];
  model: string;
}

/* ------------------------------------------------------------------ */
/* LISTENING                                                           */
/* ------------------------------------------------------------------ */

export const LISTENING_SETS: ListeningSet[] = [
  {
    id: 'ls-1',
    title: 'Set 1 · Campus & City Life',
    level: 'Foundation',
    minutes: 8,
    sections: [
      {
        title: 'Section 1 · Booking a sports hall',
        context: 'A phone call between a student and a leisure centre receptionist.',
        script: [
          'Good morning, Riverside Leisure Centre, how can I help?',
          'Hello, I would like to book the sports hall for our university basketball team. We need it on Saturday afternoon.',
          'Certainly. Saturday afternoon we have two slots: half past one until three, or four until six. Which suits you?',
          'The four until six slot, please. How much is it for twelve players?',
          'The hall is thirty pounds per hour, but university teams get a twenty percent discount, so that is forty eight pounds for two hours.',
          'Great. Do we need to bring our own balls?',
          'No, we provide match balls, but please bring clean indoor shoes — outdoor shoes are not allowed on the court.',
        ],
        questions: [
          { id: 'l1q1', text: 'Which time slot does the student book?', options: ['1:30 – 3:00', '4:00 – 6:00', '6:00 – 8:00'], answer: 1 },
          { id: 'l1q2', text: 'How much will the team pay in total?', options: ['£30', '£48', '£60'], answer: 1 },
          { id: 'l1q3', text: 'What must the players bring?', options: ['Their own balls', 'Clean indoor shoes', 'Team uniforms'], answer: 1 },
        ],
      },
      {
        title: 'Section 2 · Museum audio guide',
        context: 'A guide welcoming visitors to a city history museum.',
        script: [
          'Welcome to the Milltown Museum of City History. Before you explore, a few practical points.',
          'The museum is open daily except Monday, from ten in the morning until six in the evening.',
          'Photography is allowed in all galleries except the Textile Room, where flash damages the old fabrics.',
          'Our most popular exhibit, the 1850 river map, is on the second floor, at the far end of the Industry Gallery.',
          'There is a cafe on the ground floor, and a free cloakroom next to it if you are carrying heavy bags.',
          'Children under five enter free; the family ticket covers two adults and up to three children for eighteen pounds.',
        ],
        questions: [
          { id: 'l2q1', text: 'On which day is the museum closed?', options: ['Sunday', 'Monday', 'Friday'], answer: 1 },
          { id: 'l2q2', text: 'Why is photography banned in the Textile Room?', options: ['The room is too dark', 'Flash damages old fabrics', 'The exhibits are on loan'], answer: 1 },
          { id: 'l2q3', text: 'Where is the 1850 river map?', options: ['Ground floor cafe', 'Second floor, Industry Gallery', 'Cloakroom entrance'], answer: 1 },
        ],
      },
      {
        title: 'Section 3 · Tutor and student',
        context: 'Two students discuss a group project with their tutor.',
        script: [
          'So, Maya and Jonas, your group presentation on urban flooding is in three weeks. How is the research going?',
          'Well, I have finished the survey of residents near the canal. Two hundred people responded, which was more than we expected.',
          'Good. Jonas, what about the historical rainfall data?',
          'I am still waiting for access to the city records office. They said the files will be digitised by next Tuesday.',
          'Then let us be realistic. Maya, you should start drafting the slides with the survey results, and Jonas can add the rainfall charts when the data arrives.',
          'One more thing — the examiners want a clear recommendation section, not just findings. Many groups lose marks there.',
        ],
        questions: [
          { id: 'l3q1', text: 'How many residents responded to the survey?', options: ['About 120', 'About 200', 'About 300'], answer: 1 },
          { id: 'l3q2', text: 'Why has Jonas not finished his part?', options: ['The data is not digitised yet', 'He disagreed with the topic', 'The tutor rejected his draft'], answer: 0 },
          { id: 'l3q3', text: 'What does the tutor warn many groups forget?', options: ['The survey method', 'A recommendation section', 'The presentation time limit'], answer: 1 },
        ],
      },
      {
        title: 'Section 4 · Lecture on bees',
        context: 'A university lecture about urban beekeeping.',
        script: [
          'Today we continue our series on urban ecology, with a focus on beekeeping in cities.',
          'A common myth is that city bees struggle. In fact, studies show urban hives often produce more honey than rural ones, because cities offer a longer flowering season from parks, gardens and window boxes.',
          'The main threats are not traffic or pollution, but two things: varroa mites, a parasite every beekeeper must monitor, and the loss of nesting sites when old buildings are demolished.',
          'Beginners often buy too much equipment. A single hive, one suit and a smoker are enough for the first year.',
          'Legally, hives must be placed at least three metres from a public path, and neighbours within ten metres should be informed.',
          'Next week we will look at how rooftop hives change the temperature of the buildings below them.',
        ],
        questions: [
          { id: 'l4q1', text: 'According to the lecture, urban hives often produce more honey because cities have…', options: ['cleaner air', 'a longer flowering season', 'fewer predators'], answer: 1 },
          { id: 'l4q2', text: 'What are the two main threats mentioned?', options: ['Traffic and pollution', 'Varroa mites and lost nesting sites', 'Weather and pesticides'], answer: 1 },
          { id: 'l4q3', text: 'How far must hives be from a public path?', options: ['3 metres', '10 metres', '30 metres'], answer: 0 },
        ],
      },
    ],
  },
  {
    id: 'ls-2',
    title: 'Set 2 · Work & Science',
    level: 'Intermediate',
    minutes: 9,
    sections: [
      {
        title: 'Section 1 · Job enquiry',
        context: 'A caller asks about a part-time job at a bookshop.',
        script: [
          'Hello, Page & Co bookshop.',
          'Hi, I am calling about the part-time assistant job in your window. Is it still available?',
          'Yes. We need someone for Thursday evenings and the full day Saturday — that is twelve hours a week.',
          'The pay starts at eleven pounds fifty per hour, and it rises to twelve fifty after the three-month trial.',
          'Is there any flexibility with exam weeks? I am a student.',
          'We can swap shifts with the other assistants, as long as the rota is covered. You would need to speak to Amira, our manager.',
          'One requirement: you must be comfortable recommending books, because customers ask for advice every day.',
        ],
        questions: [
          { id: 'l2sq1', text: 'When would the assistant work?', options: ['Weekday mornings', 'Thursday evenings and Saturdays', 'Sunday only'], answer: 1 },
          { id: 'l2sq2', text: 'What is the starting pay?', options: ['£11.50/hour', '£12.50/hour', '£13.50/hour'], answer: 0 },
          { id: 'l2sq3', text: 'Who manages the shift rota?', options: ['The owner', 'Amira', 'The head of sales'], answer: 1 },
        ],
      },
      {
        title: 'Section 2 · Safety briefing',
        context: 'A factory supervisor briefs new workers.',
        script: [
          'Welcome to the Greenline packaging plant. This briefing takes ten minutes and covers the essentials.',
          'High-visibility vests and safety boots are compulsory in the warehouse at all times, without exception.',
          'The emergency exits are marked in green; the assembly point is the north car park, by the flagpole.',
          'If the alarm sounds, stop your machine using the red button first, then walk — never run — to the exit.',
          'The canteen serves from eleven thirty until two, and drinking water stations are at both ends of every aisle.',
          'Finally, report any damaged equipment to your line leader the same day. Do not attempt repairs yourself.',
        ],
        questions: [
          { id: 'l2sq4', text: 'Where is the assembly point?', options: ['The canteen', 'North car park by the flagpole', 'Main office reception'], answer: 1 },
          { id: 'l2sq5', text: 'What must workers do first when the alarm sounds?', options: ['Run to the exit', 'Stop the machine with the red button', 'Call the line leader'], answer: 1 },
          { id: 'l2sq6', text: 'What should workers do with damaged equipment?', options: ['Repair it themselves', 'Report it to the line leader the same day', 'Leave it for the morning team'], answer: 1 },
        ],
      },
      {
        title: 'Section 3 · Research supervision',
        context: 'A PhD student reviews her study design with her supervisor.',
        script: [
          'Lena, your proposal on sleep and memory is strong, but the sample worries me. Thirty students from one university is not enough to generalise.',
          'I agree. I plan to recruit across three universities, which would bring us to about a hundred and twenty participants.',
          'Better. But remember, half your participants are night-shift workers — you must test them at a consistent point in their cycle, or the data becomes noise.',
          'Yes, I will schedule every session at the same circadian point for each participant.',
          'And the ethics committee will ask about your exclusion criteria. People on sleep medication must be excluded, and that needs to be explicit.',
          'Finally, budget for dropouts. In sleep studies, around fifteen percent usually withdraw, so plan for more recruits than your target.',
        ],
        questions: [
          { id: 'l3sq1', text: 'Why is the original sample a problem?', options: ['The students are too young', 'One university is not enough to generalise', 'Thirty is too many to test'], answer: 1 },
          { id: 'l3sq2', text: 'How must night-shift workers be tested?', options: ['At night only', 'At a consistent point in their cycle', 'Last, after other participants'], answer: 1 },
          { id: 'l3sq3', text: 'What dropout rate should Lena plan for?', options: ['About 5%', 'About 15%', 'About 30%'], answer: 1 },
        ],
      },
      {
        title: 'Section 4 · Lecture on bridges',
        context: 'An engineering lecture about bridge failures and lessons learned.',
        script: [
          'Bridge engineering teaches humility. Every famous failure has rewritten the safety codes we use today.',
          'In 1940, the Tacoma Narrows bridge collapsed just four months after opening. Engineers had made it slender and elegant, but failed to account for wind creating a twisting oscillation.',
          'The lesson was not that the design was lazy — it was that wind tunnel testing had focused on steady winds, not rhythmic ones. Today, every long-span bridge is tested against rhythmic forces.',
          'A quieter failure mode is fatigue. Tiny cracks grow with each passing load, invisible until suddenly they are not. Modern codes therefore mandate inspection cycles based on load counts, not just age.',
          'The most expensive lesson, though, is organisational. In several disasters, engineers noticed warning signs but their reports were filed away by managers who trusted the structure too much.',
          'That is why safety culture now demands that any engineer can halt work without penalty — a rule born from these tragedies.',
        ],
        questions: [
          { id: 'l4sq1', text: 'How long after opening did Tacoma Narrows collapse?', options: ['Four weeks', 'Four months', 'Four years'], answer: 1 },
          { id: 'l4sq2', text: 'What did earlier wind tunnel tests fail to simulate?', options: ['Heavy rain', 'Rhythmic winds', 'Extreme heat'], answer: 1 },
          { id: 'l4sq3', text: 'Modern inspection cycles are based on…', options: ['the age of the bridge', 'load counts', 'the weather forecast'], answer: 1 },
          { id: 'l4sq4', text: 'What organisational rule came from these disasters?', options: ['Only managers may inspect', 'Any engineer can halt work without penalty', 'Reports must go through two departments'], answer: 1 },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* READING                                                             */
/* ------------------------------------------------------------------ */

export const READING_PASSAGES: ReadingPassage[] = [
  {
    id: 'rp-1',
    title: 'The Return of the City Bee',
    level: 'Foundation',
    minutes: 8,
    paragraphs: [
      'For decades, people assumed that bees belonged in the countryside. Cities seemed hostile: polluted air, traffic noise and few flowers. Yet over the past twenty years, researchers have documented something surprising — urban bee populations in many European cities are now healthier than their rural counterparts.',
      'The reasons are counter-intuitive. Countryside monocultures, such as vast fields of a single crop, offer an abundance of flowers for a few weeks and then nothing. Cities, by contrast, offer parks, gardens, balconies and roadside planting that flower from early spring to late autumn. This longer, more varied menu produces stronger colonies and, in several studies, more honey per hive.',
      'Urban beekeeping has grown alongside these findings. Rooftop hives now sit on opera houses in Paris and department stores in London. The honey they produce often sells at premium prices, partly because each neighbourhood tastes different — a phenomenon beekeepers call "terroir of the street".',
      'However, scientists caution against uncritical enthusiasm. Honeybees are effectively domesticated livestock, and placing too many hives in one area can squeeze out wild pollinators such as bumblebees and solitary bees, which do not produce honey but pollinate most wildflowers. A city with fifty rooftop hives and no wildflower meadows has missed the point.',
      'The emerging consensus is that the best thing a city can do for bees is not to install hives, but to plant flowers — long-flowering, pesticide-free and everywhere. The hives, experts say, should come last, not first.',
    ],
    questions: [
      { id: 'r1q1', kind: 'mcq', text: 'Why are city bees often healthier than rural bees?', options: ['Cities have cleaner air', 'Cities offer flowers for a longer season', 'Rural bees face more predators'], answer: 1 },
      { id: 'r1q2', kind: 'truefalse', text: 'Countryside monocultures provide flowers throughout the year.', options: ['True', 'False', 'Not given'], answer: 1 },
      { id: 'r1q3', kind: 'mcq', text: 'What does "terroir of the street" refer to?', options: ['The pollution honeybees absorb', 'Neighbourhood-specific honey flavours', 'The price of rooftop honey'], answer: 1 },
      { id: 'r1q4', kind: 'mcq', text: 'What risk do too many hives create?', options: ['They squeeze out wild pollinators', 'They increase traffic congestion', 'They lower honey prices'], answer: 0 },
      { id: 'r1q5', kind: 'truefalse', text: 'Experts believe planting flowers matters more than installing hives.', options: ['True', 'False', 'Not given'], answer: 0 },
      { id: 'r1q6', kind: 'mcq', text: 'Which statement best captures the passage?', options: ['Cities should ban beekeeping', 'Urban beekeeping needs thoughtful planning', 'Rural bees will soon disappear'], answer: 1 },
    ],
  },
  {
    id: 'rp-2',
    title: 'Sleep, Memory and the Night Shift',
    level: 'Intermediate',
    minutes: 10,
    paragraphs: [
      'When we sleep, the brain is anything but idle. Among its nightly tasks is memory consolidation — the process by which fragile new memories are stabilised and woven into long-term storage. Studies using functional imaging have shown that the hippocampus replays the day\'s experiences during deep sleep, transferring them to the cortex like files being moved from a temporary to a permanent drive.',
      'This has striking implications for learning. Students who sleep after studying retain significantly more than those who stay up revising, even when both groups spend the same total time awake. The effect is strongest for declarative memory — facts, vocabulary, dates — which is precisely the material examinations test.',
      'Night-shift workers present the sharpest evidence, because their schedules sever the natural link between experience and sleep. Long-term shift work is associated not only with fatigue but with measurably poorer memory performance and, over decades, elevated risks of metabolic and cardiovascular disease. The World Health Organization\'s cancer research agency has even classified night-shift work involving circadian disruption as "probably carcinogenic to humans".',
      'Not all sleep is equal in these effects. Deep slow-wave sleep appears to serve declarative memory, while REM sleep is more closely tied to emotional processing and procedural skills such as riding a bicycle or playing scales. A short nap containing only light sleep delivers rest without much consolidation.',
      'Practical guidance follows: protect sleep after intensive learning, keep consistent bedtimes even at weekends, and treat naps as supplements rather than substitutes. For shift workers, the evidence supports forward-rotating schedules and bright-light management, though the deepest fix — designing work around human biology — remains rare.',
    ],
    questions: [
      { id: 'r2q1', kind: 'mcq', text: 'According to the passage, the hippocampus during deep sleep…', options: ['deletes unimportant memories', 'replays experiences for transfer to the cortex', 'stops all memory activity'], answer: 1 },
      { id: 'r2q2', kind: 'mcq', text: 'Students who sleep after studying outperform those who stay awake because…', options: ['sleeping replaces revision time', 'consolidation strengthens new memories', 'they are less anxious in exams'], answer: 1 },
      { id: 'r2q3', kind: 'truefalse', text: 'The WHO cancer agency has classified night-shift work with circadian disruption as probably carcinogenic.', options: ['True', 'False', 'Not given'], answer: 0 },
      { id: 'r2q4', kind: 'mcq', text: 'REM sleep is most associated with…', options: ['declarative facts', 'emotional and procedural processing', 'physical growth only'], answer: 1 },
      { id: 'r2q5', kind: 'truefalse', text: 'Light-sleep naps deliver substantial memory consolidation.', options: ['True', 'False', 'Not given'], answer: 1 },
      { id: 'r2q6', kind: 'mcq', text: 'What does the author call "the deepest fix" for shift workers?', options: ['Bright-light management', 'Forward-rotating schedules', 'Designing work around human biology'], answer: 2 },
    ],
  },
  {
    id: 'rp-3',
    title: 'Why Bridges Fall — and What Engineers Learned',
    level: 'Advanced',
    minutes: 12,
    paragraphs: [
      'Structural engineering advances in disasters. Each famous collapse has rewritten the codes that govern the next generation of bridges, and the modern rulebook is, in a sense, a memorial to failure.',
      'The Tacoma Narrows bridge, opened in 1940, became the canonical example. Its slender, elegant deck began to twist in a steady wind, and within minutes the oscillation grew until the span tore itself apart. Investigators initially blamed resonance — the idea that the wind simply matched the bridge\'s natural frequency — but later analysis showed something subtler: the wind was feeding energy into the motion aerodynamically, a self-reinforcing flutter rather than a sympathetic vibration. The distinction matters, because resonance can be dodged by changing frequencies, whereas flutter demands a fundamental rethink of deck shapes and mandatory wind-tunnel testing against dynamic, not steady, forces.',
      'Fatigue offers a quieter lesson. Metals accumulate microscopic cracks under repeated loading; a bridge that survives a thousand trucks may fail on the thousand-and-first, with no prior warning visible to inspectors. After several fatigue-driven failures in the 1960s, codes began tying inspection intervals to counted load cycles rather than calendar age — an early example of maintenance driven by data.',
      'Perhaps the hardest lesson is organisational. Investigations repeatedly find that warning signs were noticed by engineers but absorbed into bureaucratic inertia: reports filed, decisions deferred, until the structure decided for everyone. Modern safety culture answers this with the "stop-work authority" — any engineer, regardless of rank, may halt a project without penalty. It is cheap on paper and politically expensive in practice, which is precisely why disasters keep reminding us of its value.',
      'None of this means bridges are unsafe today. It means they are safe because previous bridges were not, and the profession chose to treat each failure as data rather than embarrassment.',
    ],
    questions: [
      { id: 'r3q1', kind: 'mcq', text: 'Later analysis of Tacoma Narrows concluded the collapse was caused by…', options: ['simple resonance', 'aerodynamic flutter', 'metal fatigue'], answer: 1 },
      { id: 'r3q2', kind: 'mcq', text: 'Why does the resonance/flutter distinction matter?', options: ['Resonance is easier to fix by changing frequencies', 'Flutter cannot occur in wind', 'Resonance only affects narrow bridges'], answer: 0 },
      { id: 'r3q3', kind: 'truefalse', text: 'Modern inspection intervals are based on counted load cycles rather than age.', options: ['True', 'False', 'Not given'], answer: 0 },
      { id: 'r3q4', kind: 'mcq', text: 'What pattern do organisational investigations repeatedly reveal?', options: ['Engineers ignored all signs', 'Warnings were noticed but lost in bureaucracy', 'Inspections were never performed'], answer: 1 },
      { id: 'r3q5', kind: 'truefalse', text: 'Stop-work authority is described as cheap on paper but politically expensive in practice.', options: ['True', 'False', 'Not given'], answer: 0 },
      { id: 'r3q6', kind: 'mcq', text: 'The author\'s overall message is that modern bridge safety…', options: ['depends on luck', 'was earned by learning from failures', 'makes further codes unnecessary'], answer: 1 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* WRITING                                                             */
/* ------------------------------------------------------------------ */

export const WRITING_TASKS: WritingTask[] = [
  {
    id: 'wt1-rainfall',
    task: 1,
    title: 'Task 1 · Rainfall in four cities',
    minutes: 20,
    minWords: 150,
    prompt:
      'The table below shows average monthly rainfall (in millimetres) in four cities across four seasons. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    hints: [
      'Dhaka: Winter 20, Spring 90, Summer 320, Autumn 180',
      'London: Winter 55, Spring 45, Summer 50, Autumn 70',
      'Sydney: Winter 100, Spring 120, Summer 95, Autumn 110',
      'Cairo: Winter 10, Spring 5, Summer 0, Autumn 5',
    ],
    model:
      'The table compares average monthly rainfall across four seasons in Dhaka, London, Sydney and Cairo. Overall, rainfall patterns vary dramatically: Dhaka has an extreme monsoon-driven peak, while Cairo is arid in every season.\n\nDhaka records by far the highest figures, with summer rainfall reaching 320 mm per month — more than six times its autumn figure (180 mm) and sixteen times winter (20 mm). Sydney shows the most balanced pattern, ranging only between 95 mm in summer and 120 mm in spring. London is consistently modest, from 45 mm in spring to 70 mm in autumn, with its wettest period in autumn. Cairo, by contrast, receives almost no rain at all: zero millimetres in summer and no more than 10 mm in any other season.\n\nIn summary, while Sydney and London experience steady, moderate rainfall year-round, Dhaka and Cairo sit at opposite extremes of the global range.',
  },
  {
    id: 'wt1-timetable',
    task: 1,
    title: 'Task 1 · Museum visitor numbers',
    minutes: 20,
    minWords: 150,
    prompt:
      'The chart below shows the number of visitors (in thousands) to a city museum each year from 2019 to 2024. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    hints: [
      '2019: 120k · 2020: 40k (pandemic closure) · 2021: 65k · 2022: 110k · 2023: 150k · 2024: 145k',
      'Highlight: the fall and recovery, the 2023 peak, the slight 2024 dip',
      'Compare 2023/2024 with the pre-pandemic 2019 level',
    ],
    model:
      'The chart illustrates annual visitor numbers at a city museum over a six-year period from 2019 to 2024, measured in thousands.\n\nOverall, the museum experienced a sharp collapse in visitors during the pandemic years followed by a strong recovery that ultimately exceeded pre-pandemic levels, before a slight decline in the final year.\n\nIn 2019, the museum welcomed 120,000 visitors. This figure plummeted to just 40,000 in 2020 — a fall of two thirds — as pandemic restrictions took effect. Recovery was steady but initially slow, reaching 65,000 in 2021 and 110,000 in 2022, still below the 2019 level.\n\nThe turnaround came in 2023, when visitors surged to 150,000, the highest figure of the period and a quarter more than in 2019. However, 2024 saw a modest decline to 145,000, suggesting visitor growth may be levelling off after the post-pandemic rebound.',
  },
  {
    id: 'wt2-technology',
    task: 2,
    title: 'Task 2 · Technology and family life',
    minutes: 40,
    minWords: 250,
    prompt:
      'Some people believe that modern technology has weakened family relationships, while others argue it has strengthened them. Discuss both views and give your own opinion.',
    hints: [
      'View 1: screens replace face-to-face time; notifications fragment meals and conversations',
      'View 2: video calls keep distant families close; shared groups coordinate care',
      'Your position: agree/disagree partially, with concrete examples and a concession paragraph',
    ],
    model:
      'Whether smartphones have harmed or helped family bonds is a question almost every household could debate from experience. Both claims contain truth, and the outcome depends less on the technology itself than on the habits a family builds around it.\n\nCritics argue that devices have invaded the most intimate spaces of family life. Meals once devoted to conversation are now punctuated by notifications, and parents and teenagers increasingly share a room while inhabiting separate screens. This fragmentation is real: research on "phubbing" — snubbing others in favour of a phone — links the habit to lower reported relationship satisfaction. When presence becomes partial, intimacy erodes quietly.\n\nDefenders, however, point to the opposite evidence. For families separated by migration — a reality for millions — video calls transform absence into daily presence; grandparents watch grandchildren take first steps from another continent. Family group chats coordinate care for elderly parents, share medical updates and maintain rituals across time zones. The technology did not create these relationships, but it sustains ones that distance would otherwise sever.\n\nIn my view, the stronger argument lies with the defenders, but with an important caveat. Technology strengthens families that use it deliberately and weakens those that use it passively. The decisive factor is household culture: rules such as phone-free dinners and shared viewing habits allow families to capture the benefits while containing the costs.\n\nIn conclusion, technology amplifies whatever intentions a family brings to it. Blaming devices for weakened bonds lets us avoid the harder task of designing our attention — which has always been the true currency of family life.',
  },
  {
    id: 'wt2-education',
    task: 2,
    title: 'Task 2 · University education and jobs',
    minutes: 40,
    minWords: 250,
    prompt:
      'Some people think universities should focus on preparing students for employment, while others believe the purpose of higher education is to develop knowledge and critical thinking regardless of career value. Discuss both views and give your opinion.',
    hints: [
      'View 1: graduates carry debt; employability protects them; employers report skills gaps',
      'View 2: universities as places of inquiry; narrow training ages quickly; critical thinking transfers',
      'Your position: a synthesis — employability through transferable thinking, not narrow training',
    ],
    model:
      'As tuition costs rise in many countries, the purpose of a university degree has become a genuine public argument. Should higher education serve the labour market, or the life of the mind? Both positions rest on legitimate concerns.\n\nThose who emphasise employment point to hard realities. Graduates in many countries carry substantial debt, and a degree that does not lead to work inflicts lasting financial harm. Employers, meanwhile, consistently report skills gaps: graduates who can recite theory but struggle to analyse an unfamiliar dataset or communicate a recommendation. From this perspective, universities that ignore employability are asking students to gamble their futures.\n\nThe opposing view warns that narrow training ages badly. Specific tools and frameworks change every few years; the ability to learn, question evidence and construct an argument does not. Universities at their best are institutions of inquiry, where uncomfortable ideas are examined precisely because no employer is paying for the answer. History suggests that the most economically transformative knowledge — from basic mathematics to immunology — rarely began as job preparation.\n\nMy own view is that this is a false dichotomy. The most employable graduates are those who think well: employers themselves say that adaptability and critical analysis matter more than any particular software skill. Universities should therefore teach transferable thinking within practical contexts — real projects, real data, real constraints — rather than choosing between vocational drills and abstract scholarship.\n\nIn conclusion, universities serve employment best by refusing to train narrowly, and serve knowledge best by making that knowledge demonstrable in the world students will enter.',
  },
  {
    id: 'wt2-environment',
    task: 2,
    title: 'Task 2 · Who should fix the climate?',
    minutes: 40,
    minWords: 250,
    prompt:
      'Some people believe that governments and large companies are primarily responsible for tackling climate change, while others think individual actions matter most. Discuss both views and give your own opinion.',
    hints: [
      'View 1: a small number of producers emit most emissions; regulation moves whole systems',
      'View 2: consumer demand drives markets; individual habits scale culturally',
      'Your position: individuals as voters and consumers shape systems — the levels reinforce each other',
    ],
    model:
      'Debates about climate responsibility often harden into a blame contest between individuals and institutions. Yet examining both positions reveals that the separation itself is misleading.\n\nThe institutional argument is grounded in scale. Analyses consistently show that a relatively small number of fossil fuel producers account for the majority of historical emissions, and that choices about energy grids, transport systems and building codes are made by governments and corporations, not households. No individual can decarbonise a national electricity supply. From this standpoint, urging people to shorten showers while pipelines expand is not merely ineffective but distracting.\n\nThe individual argument, however, should not be dismissed. Markets respond to demand: the collapse in prices of solar panels and electric vehicles followed years of early adoption by households willing to pay a premium. More fundamentally, in democracies individuals are not only consumers but voters, and every major climate policy — from clean air acts to emissions trading — began as public pressure that politicians eventually found it costly to ignore.\n\nIn my view, the two levels are mutually reinforcing rather than opposed. Individual action matters most precisely when it is collective action: voting, shifting consumption visibly and demanding accountability. Institutions matter most when individuals hold them to their promises.\n\nIn conclusion, assigning primary responsibility to either side misunderstands how change actually happens. Governments and companies hold the levers, but individuals decide whether those levers get pulled.',
  },
];
