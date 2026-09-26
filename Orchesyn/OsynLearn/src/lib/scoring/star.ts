/**
 * STAR structure detector — pure, explainable heuristics.
 * Looks for the four narrative beats interviewers actually score.
 */

export interface StarSignals {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
  /** 0-4 */
  score: number;
  missing: string[];
}

const MARKERS: { key: 'situation' | 'task' | 'action' | 'result'; re: RegExp; label: string }[] = [
  { key: 'situation', label: 'Situation (set the scene: when/where)', re: /\b(when|while|during|at my|in my (previous|last|first)|one time|last (year|month|summer)|in (20\d\d|my role|my team|a project))\b/i },
  { key: 'task', label: 'Task (what you had to do)', re: /\b(my (task|job|responsibility|goal|role)|i (had|needed) to|we (had|needed) to|i was (asked|told) to)\b/i },
  { key: 'action', label: 'Action (what YOU did — "I", not "we")', re: /\b(so i|i (decided|built|created|organised|organized|led|wrote|designed|called|talked|set up|proposed|analysed|analyzed|scheduled|fixed|made)|first i|then i|my idea)\b/i },
  { key: 'result', label: 'Result (outcome, ideally a number)', re: /\b(as a result|in the end|the outcome|we (increased|saved|reduced|improved|won|grew)|it (worked|paid off)|\d+(\.\d+)?\s*(%|percent)|half|double|on time|ahead of)\b/i },
];

export function starSignals(text: string): StarSignals {
  const found = MARKERS.filter((m) => m.re.test(text)).map((m) => m.key);
  const missing = MARKERS.filter((m) => !found.includes(m.key)).map((m) => m.label);
  return {
    situation: found.includes('situation'),
    task: found.includes('task'),
    action: found.includes('action'),
    result: found.includes('result'),
    score: found.length,
    missing,
  };
}
