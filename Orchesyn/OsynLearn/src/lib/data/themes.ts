import type { CoachTheme, Scenario } from '@/types';

/**
 * Conversation themes for the AI coach. Each one has an opening line, follow-ups
 * the coach rotates through, and a model answer so the learner can compare
 * structure after the session.
 */
export const THEMES: CoachTheme[] = [
  {
    id: 'family', name: 'Family', emoji: '👨‍👩‍👧', color: '#7C5CFF', level: 'beginner',
    blurb: 'Talk about the people you grew up with.',
    starter: 'Tell me about your family — who are you closest to, and why?',
    followUps: [
      'How has your relationship with them changed as you have got older?',
      'Do families in your country live together more than they used to?',
      'What is one tradition your family has that you would keep?',
    ],
    sampleAnswer:
      'There are five of us at home, and I am closest to my younger sister because we are only two years apart. We argued constantly as children, which I think is why we get on so well now. My parents are more traditional, so conversations with them are usually about plans rather than feelings.',
    keyVocab: ['siblings', 'upbringing', 'generation gap', 'close-knit', 'supportive'],
  },
  {
    id: 'hobbies', name: 'Hobbies', emoji: '🎨', color: '#2EE6A8', level: 'beginner',
    blurb: 'What you do when nobody is paying you.',
    starter: 'What do you enjoy doing in your free time?',
    followUps: [
      'How did you get into it?',
      'Is there a hobby you gave up? Why?',
      'Do you prefer hobbies you do alone or with other people?',
    ],
    sampleAnswer:
      'I mainly read and play badminton. Reading is what I do to switch off, whereas badminton is the only exercise I have stuck with for more than a year. I used to paint, but I stopped when I began judging my work instead of enjoying it.',
    keyVocab: ['pastime', 'unwind', 'take up', 'give up', 'therapeutic'],
  },
  {
    id: 'travel', name: 'Travel', emoji: '✈️', color: '#4DA6FF', level: 'beginner',
    blurb: 'Places, plans and disasters.',
    starter: 'What is the most memorable trip you have taken?',
    followUps: [
      'Do you prefer planning every detail or arriving with no plan?',
      'Where would you go next if money were no object?',
      'Has travel changed how you see your own country?',
    ],
    sampleAnswer:
      'The most memorable was a train journey through the northeast, mostly because everything went wrong. We missed a connection and ended up sharing food with strangers for four hours. I have learned that the trips I remember are rarely the comfortable ones.',
    keyVocab: ['itinerary', 'off the beaten track', 'hospitality', 'wanderlust', 'scenic'],
  },
  {
    id: 'food', name: 'Food', emoji: '🍛', color: '#F5A524', level: 'beginner',
    blurb: 'Cooking, craving and restaurant disasters.',
    starter: 'What is a dish you could eat every day without getting bored?',
    followUps: [
      'Can you cook? What is your best dish?',
      'Has your taste in food changed over the years?',
      'Street food or restaurants — which do you prefer?',
    ],
    sampleAnswer:
      'I could eat khichdi every day, which is a simple rice and lentil dish. My cooking is limited to about six recipes that I rotate, but I make one of them well. My taste has broadened a lot since I moved away from home, mostly out of necessity.',
    keyVocab: ['cuisine', 'ingredients', 'seasoning', 'comfort food', 'appetite'],
  },
  {
    id: 'work-study', name: 'Work & Study', emoji: '💼', color: '#7C5CFF', level: 'intermediate',
    blurb: 'Career plans, pressure and first jobs.',
    starter: 'What do you do — are you working or studying at the moment?',
    followUps: [
      'What is the hardest part of it?',
      'Where do you see yourself in five years?',
      'Would you rather have more money or more free time?',
    ],
    sampleAnswer:
      'I am working as a junior analyst while studying part-time. The hardest part is switching between the two, because each demands a different kind of attention. In five years I would like to be leading small projects rather than contributing to large ones.',
    keyVocab: ['workload', 'deadline', 'promotion', 'part-time', 'career progression'],
  },
  {
    id: 'technology', name: 'Technology', emoji: '📱', color: '#4DA6FF', level: 'intermediate',
    blurb: 'Devices, AI and whether it is all too much.',
    starter: 'Which piece of technology has changed your life the most?',
    followUps: [
      'Is there a technology you refuse to use?',
      'Do you think artificial intelligence will help or harm your work?',
      'What did people do before smartphones that we have lost?',
    ],
    sampleAnswer:
      'Maps, honestly. I have almost no sense of direction, and being able to travel somewhere new without anxiety changed how much I go out. The technology I refuse to adopt is smart speakers, because I do not want a microphone in my kitchen.',
    keyVocab: ['convenience', 'obsolete', 'automate', 'privacy', 'screen time'],
  },
  {
    id: 'health', name: 'Health & Fitness', emoji: '🏃', color: '#2EE6A8', level: 'intermediate',
    blurb: 'Exercise, sleep and staying sane.',
    starter: 'How do you keep yourself healthy, physically and mentally?',
    followUps: [
      'What is one habit you would like to build?',
      'Do you sleep well? What gets in the way?',
      'Is it harder to stay healthy now than it was for your parents?',
    ],
    sampleAnswer:
      'Physically I walk about eight thousand steps a day, which is not ambitious but it is consistent. Mentally I protect Sunday mornings and keep my phone out of the bedroom. Sleep is my weak point, mainly because I read on the same screen I use for work.',
    keyVocab: ['sedentary', 'consistency', 'wellbeing', 'burnout', 'routine'],
  },
  {
    id: 'education', name: 'Education', emoji: '🎓', color: '#F5A524', level: 'intermediate',
    blurb: 'School, exams and what learning should be.',
    starter: 'What subject did you enjoy most at school, and why?',
    followUps: [
      'Do exams measure intelligence?',
      'Would you change anything about how children are taught?',
      'Is university still worth the cost?',
    ],
    sampleAnswer:
      'I enjoyed history, largely because one teacher told it as a series of arguments rather than dates. I do not think exams measure intelligence so much as the ability to perform under time pressure. I would replace a third of the syllabus with projects.',
    keyVocab: ['curriculum', 'rote learning', 'critical thinking', 'assessment', 'syllabus'],
  },
  {
    id: 'environment', name: 'Environment', emoji: '🌍', color: '#2EE6A8', level: 'advanced',
    blurb: 'Climate, waste and what one person can do.',
    starter: 'What environmental problem worries you the most?',
    followUps: [
      'Whose responsibility is it — individuals, companies or governments?',
      'What has your city done about it?',
      'Are you optimistic or pessimistic?',
    ],
    sampleAnswer:
      'Groundwater depletion worries me most, because it is invisible until the wells run dry. It is caused mainly by agricultural pumping, so it is a policy problem rather than a personal one. I am cautiously optimistic, because the technology for fixing it already exists.',
    keyVocab: ['sustainability', 'depletion', 'emissions', 'renewable', 'policy'],
  },
  {
    id: 'money', name: 'Money', emoji: '💰', color: '#F5A524', level: 'intermediate',
    blurb: 'Earning, saving and what it buys.',
    starter: 'Are you a saver or a spender?',
    followUps: [
      'What is the best purchase you have made?',
      'Should financial education be taught at school?',
      'Can money buy happiness?',
    ],
    sampleAnswer:
      'I am a saver by temperament, which I now realise is partly anxiety rather than virtue. The best purchase I have made was a good mattress, because it improved every single day. I do think schools should teach tax and interest, since everyone uses both.',
    keyVocab: ['budget', 'impulse buying', 'investment', 'financial literacy', 'debt'],
  },
  {
    id: 'relationships', name: 'Relationships', emoji: '💬', color: '#F4526B', level: 'intermediate',
    blurb: 'Friendship, conflict and communication.',
    starter: 'What quality matters most to you in a friend?',
    followUps: [
      'How do you handle a disagreement with someone close?',
      'Is it easier to make friends as an adult?',
      'Do online friendships count?',
    ],
    sampleAnswer:
      'Reliability matters most to me — someone who does what they said they would do. When I disagree with a friend I try to raise it within a day, because delayed conversations turn into resentments. Making friends as an adult is harder, mostly because there is no shared routine to build on.',
    keyVocab: ['trust', 'boundaries', 'conflict resolution', 'reciprocity', 'drift apart'],
  },
  {
    id: 'media', name: 'Media & News', emoji: '📰', color: '#4DA6FF', level: 'advanced',
    blurb: 'How we find out what is happening.',
    starter: 'How do you usually find out about the news?',
    followUps: [
      'Do you trust what you read online?',
      'Should social media companies be responsible for what is posted?',
      'Has the news become more or less reliable?',
    ],
    sampleAnswer:
      'I read two newsletters in the morning and avoid the rest, because constant updates make me anxious without making me better informed. I trust very little online until a second source confirms it. I think reliability has fallen mainly because speed is rewarded.',
    keyVocab: ['misinformation', 'clickbait', 'source', 'verification', 'bias'],
  },
  {
    id: 'city-life', name: 'City Life', emoji: '🏙️', color: '#7C5CFF', level: 'intermediate',
    blurb: 'Traffic, noise and why people stay.',
    starter: 'What do you like most about the city you live in?',
    followUps: [
      'What would you fix first?',
      'Could you live in a village?',
      'How has your city changed in the last ten years?',
    ],
    sampleAnswer:
      'I like that anything I need is open late, which sounds small but shapes daily life. What I would fix first is the traffic, since it takes two hours of my day. I could live in a village for a year, but I suspect I would miss the anonymity of a city.',
    keyVocab: ['infrastructure', 'congestion', 'amenities', 'commute', 'urban sprawl'],
  },
  {
    id: 'ambition', name: 'Ambitions', emoji: '🎯', color: '#F5A524', level: 'intermediate',
    blurb: 'Goals, plans and Plan B.',
    starter: 'What is a goal you are working towards right now?',
    followUps: [
      'What is stopping you?',
      'Have your ambitions changed since you were a teenager?',
      'What would you do if you knew you could not fail?',
    ],
    sampleAnswer:
      'I am working towards a role where I manage a small team, which means learning to delegate rather than do everything myself. What stops me is impatience with explaining things twice. My ambitions have narrowed but become more specific, which I think is progress.',
    keyVocab: ['aspiration', 'milestone', 'delegate', 'setback', 'long-term'],
  },
  {
    id: 'childhood', name: 'Childhood', emoji: '🧒', color: '#2EE6A8', level: 'beginner',
    blurb: 'Games, school and memories.',
    starter: 'What is your earliest memory?',
    followUps: [
      'What games did you play as a child?',
      'Was your childhood happier than children have now?',
      'What do you miss most about it?',
    ],
    sampleAnswer:
      'My earliest memory is being carried through a market during a festival, mostly the noise and the lights. We played cricket in the street until it was too dark to see the ball. What I miss is the length of the days; a summer holiday felt like a year.',
    keyVocab: ['nostalgia', 'carefree', 'imagination', 'simple pleasures', 'grow up'],
  },
  {
    id: 'fashion', name: 'Fashion & Style', emoji: '👗', color: '#F4526B', level: 'beginner',
    blurb: 'What clothes say about us.',
    starter: 'How would you describe the way you dress?',
    followUps: [
      'Does what you wear change how you feel?',
      'Is fashion important in your country?',
      'What do you think of fast fashion?',
    ],
    sampleAnswer:
      'I dress for comfort and end up wearing the same three colours. I have noticed that a well-fitted shirt does change how I speak in meetings, which is slightly embarrassing to admit. Fast fashion concerns me because the price is hidden in someone else\'s working conditions.',
    keyVocab: ['attire', 'trend', 'sustainable fashion', 'expression', 'wardrobe'],
  },
  {
    id: 'sports', name: 'Sports', emoji: '⚽', color: '#2EE6A8', level: 'beginner',
    blurb: 'Playing, watching and losing.',
    starter: 'Do you follow any sport?',
    followUps: [
      'Have you played competitively?',
      'Why do you think cricket is so popular in your country?',
      'Should sports be a bigger part of school?',
    ],
    sampleAnswer:
      'I follow football more than cricket, which makes me a minority here. I played competitively until I was sixteen and stopped when exams took over. I do think schools underuse sport, given how much it teaches about losing gracefully.',
    keyVocab: ['competitive', 'stamina', 'team spirit', 'spectator', 'tournament'],
  },
  {
    id: 'art', name: 'Art & Creativity', emoji: '🎭', color: '#7C5CFF', level: 'advanced',
    blurb: 'Music, film and why art matters.',
    starter: 'Is there a film or book that changed how you think?',
    followUps: [
      'Do you think art should have a message?',
      'Is creativity something you are born with?',
      'Should governments fund the arts?',
    ],
    sampleAnswer:
      'A documentary about factory farming changed how I eat, which is about as concrete an effect as art can have. I do not think art must carry a message, but the pieces I remember usually do. I believe public funding is justified because the market only rewards what is already popular.',
    keyVocab: ['aesthetic', 'provocative', 'interpretation', 'patronage', 'expression'],
  },
  {
    id: 'future', name: 'The Future', emoji: '🔮', color: '#4DA6FF', level: 'advanced',
    blurb: 'Predictions you would bet on.',
    starter: 'What will everyday life look like in thirty years?',
    followUps: [
      'Are you optimistic about the future?',
      'Which technology will disappoint us?',
      'What will definitely not change?',
    ],
    sampleAnswer:
      'I expect work to become more asynchronous and cities to become slightly quieter as electric vehicles replace combustion engines. The technology that will disappoint us is probably the metaverse, which solves a problem nobody has. What will not change is that people want to be known by a small group.',
    keyVocab: ['speculate', 'inevitable', 'disruptive', 'obsolete', 'prediction'],
  },
  {
    id: 'values', name: 'Values & Beliefs', emoji: '🧭', color: '#F5A524', level: 'advanced',
    blurb: 'What you actually think is right.',
    starter: 'What is a belief you hold that most people around you do not?',
    followUps: [
      'Where did that belief come from?',
      'Has a strong opinion of yours ever changed?',
      'What do you want to be remembered for?',
    ],
    sampleAnswer:
      'I believe that most arguments about laziness are really arguments about rest, which is not a popular view in a competitive environment. It came from watching a colleague collapse after two years of overwork. I would like to be remembered as someone who was easy to tell the truth to.',
    keyVocab: ['conviction', 'integrity', 'open-minded', 'principled', 'perspective'],
  },
  {
    id: 'difficult-topics', name: 'Difficult Topics', emoji: '🔥', color: '#F4526B', level: 'advanced',
    blurb: 'Practise disagreeing politely.',
    starter: 'Should the voting age be lowered to sixteen?',
    followUps: [
      'What is the strongest argument against your view?',
      'How would you respond to someone who completely disagrees?',
      'Where would you compromise?',
    ],
    sampleAnswer:
      'I would support it, mainly because sixteen-year-olds already pay tax and can work full time. The strongest argument against is that political judgement develops with experience, which I take seriously. I would compromise on making it optional with a civics requirement.',
    keyVocab: ['concede', 'counter-argument', 'compromise', 'consensus', 'civic duty'],
  },
  {
    id: 'small-talk', name: 'Small Talk', emoji: '☕', color: '#2EE6A8', level: 'beginner',
    blurb: 'The five-minute conversation that opens doors.',
    starter: 'So, how has your week been?',
    followUps: [
      'Doing anything interesting this weekend?',
      'Have you watched anything good lately?',
      'How do you usually spend a day off?',
    ],
    sampleAnswer:
      'It has been busy but fine — mostly deadlines. I am looking forward to the weekend because I have tickets to a match. I have been reading a slow novel that I keep putting down, which is probably a sign I should choose another one.',
    keyVocab: ['catch up', 'keen on', 'looking forward to', 'by and large', 'no complaints'],
  },
];

/**
 * Scenario-based practice: structured role-plays with a clear goal, so the coach
 * can judge whether the learner actually achieved something.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: 'sc-job-interview',
    name: 'Job Interview',
    emoji: '🤝',
    blurb: 'A hiring manager asks about your experience.',
    setting: 'Second-round interview for a role you really want.',
    goal: 'Answer three questions with specific, quantified examples.',
    openingLine: 'Thanks for coming in. Could you start by walking me through your background?',
    beats: [
      { role: 'coach', text: 'Thanks for coming in. Could you start by walking me through your background?' },
      { role: 'user', text: '', hint: 'Cover what you do now, one achievement with a number, and why this role.' },
      { role: 'coach', text: 'Good. Tell me about a time something went wrong on your watch.' },
      { role: 'user', text: '', hint: 'Situation → what you did → what changed. Own the mistake, then show the fix.' },
      { role: 'coach', text: 'And where do you want to be in three years?' },
      { role: 'user', text: '', hint: 'Be specific but flexible. Connect it to this company.' },
      { role: 'coach', text: 'Do you have any questions for me?' },
      { role: 'user', text: '', hint: 'Ask about the team, the first six months, or what success looks like.' },
    ],
    keyPhrases: ['In my current role…', 'The measurable result was…', 'What I learned was…', 'I would approach it by…'],
    difficulty: 2,
  },
  {
    id: 'sc-client-meeting',
    name: 'Client Meeting',
    emoji: '📊',
    blurb: 'A client is unhappy with a delay.',
    setting: 'The project is two weeks late and the client has called.',
    goal: 'Acknowledge the problem, explain without excusing, propose a plan.',
    openingLine: 'I have to be honest — we were promised this two weeks ago. What happened?',
    beats: [
      { role: 'coach', text: 'I have to be honest — we were promised this two weeks ago. What happened?' },
      { role: 'user', text: '', hint: 'Acknowledge it directly first. Do not open with a reason.' },
      { role: 'coach', text: 'I understand, but what does this cost us?' },
      { role: 'user', text: '', hint: 'Name the concrete impact, then give a revised date you can actually meet.' },
      { role: 'coach', text: 'Why should I believe the new date?' },
      { role: 'user', text: '', hint: 'Point to the specific change that makes it different this time.' },
      { role: 'coach', text: 'Alright. What do you need from me?' },
      { role: 'user', text: '', hint: 'Ask for one concrete thing, then confirm next steps.' },
    ],
    keyPhrases: ['You are right to be concerned…', 'The concrete impact is…', 'Here is what has changed…', 'What I need from you is…'],
    difficulty: 3,
  },
  {
    id: 'sc-airport',
    name: 'At the Airport',
    emoji: '🛫',
    blurb: 'Your connection is missed and your bag is elsewhere.',
    setting: 'Check-in desk, 40 minutes before departure.',
    goal: 'Explain the situation clearly and get rebooked.',
    openingLine: 'Good morning — passport and booking reference, please.',
    beats: [
      { role: 'coach', text: 'Good morning — passport and booking reference, please.' },
      { role: 'user', text: '', hint: 'Give the reference, then explain that your incoming flight was delayed.' },
      { role: 'coach', text: 'I am sorry, that flight has closed. What would you like to do?' },
      { role: 'user', text: '', hint: 'Ask for the next available option and whether meals or a hotel are covered.' },
      { role: 'coach', text: 'There is a seat tomorrow at six. Can I also help with anything else?' },
      { role: 'user', text: '', hint: 'Ask about your baggage and how it will reach you.' },
    ],
    keyPhrases: ['My connecting flight was delayed…', 'Could you put me on the next available…', 'Is accommodation covered…', 'Where will my luggage be sent…'],
    difficulty: 1,
  },
  {
    id: 'sc-doctor',
    name: 'At the Doctor',
    emoji: '🩺',
    blurb: 'Describe symptoms accurately.',
    setting: 'A ten-minute appointment.',
    goal: 'Describe the symptom, duration and severity precisely.',
    openingLine: 'What seems to be the problem?',
    beats: [
      { role: 'coach', text: 'What seems to be the problem?' },
      { role: 'user', text: '', hint: 'Symptom + how long + how bad, on a scale of ten.' },
      { role: 'coach', text: 'Is it constant or does it come and go?' },
      { role: 'user', text: '', hint: 'Be specific about timing and what makes it worse.' },
      { role: 'coach', text: 'Are you taking any medication?' },
      { role: 'user', text: '', hint: 'Mention anything, including over-the-counter and supplements.' },
    ],
    keyPhrases: ['It started about…', 'It is worse when…', 'On a scale of one to ten…', 'I have been taking…'],
    difficulty: 1,
  },
  {
    id: 'sc-salary-negotiation',
    name: 'Salary Negotiation',
    emoji: '💵',
    blurb: 'Ask for a raise without damaging the relationship.',
    setting: 'Annual review with your manager.',
    goal: 'Make the case with evidence and handle a refusal.',
    openingLine: 'So — you mentioned you wanted to talk about compensation.',
    beats: [
      { role: 'coach', text: 'So — you mentioned you wanted to talk about compensation.' },
      { role: 'user', text: '', hint: 'Lead with the value you delivered, with numbers. Then state the ask.' },
      { role: 'coach', text: 'That is more than we budgeted for this year.' },
      { role: 'user', text: '', hint: 'Do not withdraw the number. Ask what would need to be true.' },
      { role: 'coach', text: 'What would you accept?' },
      { role: 'user', text: '', hint: 'Trade on timing or non-cash items rather than dropping the figure immediately.' },
    ],
    keyPhrases: ['Over the last year I delivered…', 'Based on market data for this scope…', 'What would need to be true…', 'If not now, can we agree a date to revisit?'],
    difficulty: 3,
  },
  {
    id: 'sc-presentation',
    name: 'Present an Idea',
    emoji: '🎤',
    blurb: 'Pitch something in ninety seconds.',
    setting: 'A team meeting; you have the floor.',
    goal: 'Structure a clear pitch: problem → proposal → proof → ask.',
    openingLine: 'You have about ninety seconds. What is the idea?',
    beats: [
      { role: 'coach', text: 'You have about ninety seconds. What is the idea?' },
      { role: 'user', text: '', hint: 'State the problem in one sentence, then the proposal in one sentence.' },
      { role: 'coach', text: 'Why would that work here?' },
      { role: 'user', text: '', hint: 'Give one piece of evidence or a small test you could run.' },
      { role: 'coach', text: 'What do you need from us?' },
      { role: 'user', text: '', hint: 'One clear ask with a date.' },
    ],
    keyPhrases: ['The problem is…', 'What I propose is…', 'The evidence for that is…', 'What I am asking for is…'],
    difficulty: 2,
  },
  {
    id: 'sc-complaint',
    name: 'Resolve a Complaint',
    emoji: '🛎️',
    blurb: 'You are the manager; an angry customer is at the desk.',
    setting: 'A hotel front desk, busy lobby.',
    goal: 'De-escalate, take responsibility, offer a remedy.',
    openingLine: 'This is unacceptable. I have been waiting forty minutes and nobody has told me anything.',
    beats: [
      { role: 'coach', text: 'This is unacceptable. I have been waiting forty minutes and nobody has told me anything.' },
      { role: 'user', text: '', hint: 'Agree that it is unacceptable. Do not explain yet.' },
      { role: 'coach', text: 'I have a meeting in an hour.' },
      { role: 'user', text: '', hint: 'Give a specific time commitment you can meet.' },
      { role: 'coach', text: 'And what happens if it slips again?' },
      { role: 'user', text: '', hint: 'Offer a concrete remedy and your own name as the contact.' },
    ],
    keyPhrases: ['You are right, that is not acceptable…', 'Here is what I am going to do…', 'If that does not happen, then…', 'My name is — come directly to me.'],
    difficulty: 3,
  },
  {
    id: 'sc-university-interview',
    name: 'University Interview',
    emoji: '🏛️',
    blurb: 'Why this course, and why you.',
    setting: 'Admissions interview, fifteen minutes.',
    goal: 'Show genuine academic interest, not just ambition.',
    openingLine: 'Why do you want to study this subject?',
    beats: [
      { role: 'coach', text: 'Why do you want to study this subject?' },
      { role: 'user', text: '', hint: 'A specific moment or problem that pulled you in.' },
      { role: 'coach', text: 'What have you read or done outside the syllabus?' },
      { role: 'user', text: '', hint: 'One book, project or course — and what it changed in your thinking.' },
      { role: 'coach', text: 'What would you like to do with the degree?' },
      { role: 'user', text: '', hint: 'Be honest about uncertainty; examiners prefer curiosity to a fake plan.' },
    ],
    keyPhrases: ['What first drew me was…', 'I read… and it changed my view because…', 'I am not certain yet, but I am interested in…'],
    difficulty: 2,
  },
];

export function getTheme(id: string): CoachTheme | undefined {
  return THEMES.find((t) => t.id === id);
}

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
