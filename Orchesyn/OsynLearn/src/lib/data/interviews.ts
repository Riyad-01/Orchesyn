/** Live Interview tracks — a real interviewer asks, listens and debriefs. */

export interface InterviewQuestion {
  id: string;
  q: string;
  tip: string;
  seconds: number;
  star?: boolean; // behavioural → STAR debrief
}

export interface InterviewTrack {
  id: string;
  title: string;
  emoji: string;
  level: string;
  desc: string;
  minutes: number;
  questions: InterviewQuestion[];
}

export const INTERVIEW_TRACKS: InterviewTrack[] = [
  {
    id: 'hr',
    title: 'General & HR Screen',
    emoji: '🤝',
    level: 'Every job',
    desc: 'The classic first round: motivation, fit, and the questions every recruiter asks.',
    minutes: 12,
    questions: [
      { id: 'hr-1', q: 'Tell me about yourself.', tip: 'Present → past → future. 90 seconds, job-relevant only.', seconds: 90 },
      { id: 'hr-2', q: 'Why do you want to work here?', tip: 'Name one specific thing about the company, then connect it to your skills.', seconds: 60 },
      { id: 'hr-3', q: 'What is your greatest strength?', tip: 'One strength + one short proof story. Never a list.', seconds: 60, star: true },
      { id: 'hr-4', q: 'What is a weakness you are working on?', tip: 'Real but non-fatal weakness + the concrete steps you take.', seconds: 60 },
      { id: 'hr-5', q: 'Where do you see yourself in five years?', tip: 'Growth in this field, not this exact title. Show ambition with patience.', seconds: 60 },
      { id: 'hr-6', q: 'Do you have any questions for us?', tip: 'Ask about success metrics and team culture. Never "no".', seconds: 45 },
    ],
  },
  {
    id: 'star',
    title: 'Behavioural · STAR',
    emoji: '⭐',
    level: 'Mid / Senior',
    desc: 'Story-based questions. The system checks your Situation-Task-Action-Result structure live.',
    minutes: 14,
    questions: [
      { id: 'st-1', q: 'Tell me about a time you handled a difficult customer or stakeholder.', tip: 'S-T-A-R. Spend 60% on Action and Result.', seconds: 120, star: true },
      { id: 'st-2', q: 'Describe a time you failed. What did you do next?', tip: 'Own the failure in one sentence; spend the rest on the fix and the lesson.', seconds: 120, star: true },
      { id: 'st-3', q: 'Tell me about a time you led without authority.', tip: 'Show influence: listening, framing, small wins — not commands.', seconds: 120, star: true },
      { id: 'st-4', q: 'Give an example of a conflict inside your team. How did it end?', tip: 'Never badmouth. Show the bridge you built and the measurable outcome.', seconds: 120, star: true },
      { id: 'st-5', q: 'Tell me about a time you had to learn something fast.', tip: 'Name the method (courses, shadowing, building) and the deadline you beat.', seconds: 120, star: true },
      { id: 'st-6', q: 'Describe a decision you made with incomplete information.', tip: 'Show risk-sizing: what you knew, what you assumed, how you hedged.', seconds: 120, star: true },
    ],
  },
  {
    id: 'eng',
    title: 'English Job Interview',
    emoji: '🌍',
    level: 'Non-native speakers',
    desc: 'The same questions, graded for clarity, pace and confidence in English.',
    minutes: 12,
    questions: [
      { id: 'en-1', q: 'Please introduce yourself in English.', tip: 'Slow is smooth. Short sentences beat long risky ones.', seconds: 90 },
      { id: 'en-2', q: 'Why are you interested in this position?', tip: 'Prepare 5 key vocabulary words beforehand; use them naturally.', seconds: 60 },
      { id: 'en-3', q: 'Describe your typical day at work or study.', tip: 'Present simple + time connectors (first, then, by the end).', seconds: 60 },
      { id: 'en-4', q: 'What are you most proud of achieving?', tip: 'One achievement, one number, one feeling. Simple grammar, strong story.', seconds: 90, star: true },
      { id: 'en-5', q: 'How do you handle pressure or tight deadlines?', tip: 'Use a real example; "for example" is your best friend.', seconds: 60, star: true },
      { id: 'en-6', q: 'Why should we hire you?', tip: 'Match 2 of their requirements to 2 of your proofs. Close with energy.', seconds: 60 },
    ],
  },
  {
    id: 'curve',
    title: 'Curveballs & Pressure',
    emoji: '🎢',
    level: 'Stress test',
    desc: 'Unexpected and uncomfortable questions — train your poise before the real room does.',
    minutes: 10,
    questions: [
      { id: 'cv-1', q: 'Why is there a gap in your CV?', tip: 'Fact → growth → readiness. Ten honest seconds, no apology.', seconds: 60 },
      { id: 'cv-2', q: 'What would you do in your first 30 days here?', tip: 'Listen/learn first, one quick win, one bigger bet. Structure = calm.', seconds: 90 },
      { id: 'cv-3', q: 'Tell me about a time you disagreed with your manager.', tip: 'Disagree privately, commit publicly. Show data, not emotion.', seconds: 120, star: true },
      { id: 'cv-4', q: 'What salary do you expect?', tip: 'Give a researched range, then pivot to fit and growth.', seconds: 45 },
      { id: 'cv-5', q: 'If I asked your previous team to describe you in one word, what would it be?', tip: 'Pick one word, then prove it with a 20-second story.', seconds: 60, star: true },
    ],
  },
];

export function getTrack(id: string): InterviewTrack | undefined {
  return INTERVIEW_TRACKS.find((t) => t.id === id);
}
