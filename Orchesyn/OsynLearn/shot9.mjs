import { chromium } from 'playwright';
const B = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true, args: ['--headless=new'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const p = await ctx.newPage();
await p.goto(B + '/', { waitUntil: 'load' });
await p.waitForTimeout(1800);
await p.evaluate(() => localStorage.setItem('stim:profile:guest', JSON.stringify({
  id: 'guest', userId: 'guest', name: 'Nadia', avatarColor: '#7c5cff', level: 'B1', goal: 'ielts',
  accentTarget: 'neutral', dailyGoalMin: 15, availableMinPerDay: 25, ieltsModule: 'academic',
  targetOverall: 7, targetSections: { listening: 7, reading: 7, writing: 6.5, speaking: 6.5 },
  sectionLevels: { listening: 72, reading: 65, writing: 48, speaking: 58 },
  uiLanguage: 'en', plan: 'free', createdAt: new Date().toISOString(), onboardingCompleted: true,
})));

const ESSAY = 'There is considerable disagreement about whether governments should fund the arts. This essay will examine both perspectives before concluding that public funding remains essential, because culture is not a luxury but infrastructure. Firstly, state funding allows access for citizens of every income level, which matters where tickets are expensive. Secondly, private sponsorship tends to favour popular forms, leaving experimental work unsupported. However, critics argue that taxpayers should not subsidise niche exhibitions, and this concern deserves weight during hardship. In conclusion, while oversight is necessary, withdrawing public money would narrow culture to what is profitable.';

// writing journey with managed tier
await p.goto(B + '/ielts/writing', { waitUntil: 'load' });
await p.waitForTimeout(1200);
await p.getByText('Task 2 · essays').first().click().catch(() => {});
await p.waitForTimeout(400);
// open the first task 2 card
await p.locator('button.card').first().click();
await p.waitForTimeout(600);
await p.locator('textarea').fill(ESSAY);
await p.getByRole('button', { name: /Get examiner report/ }).click();
await p.waitForTimeout(2500);
const bodyText = await p.evaluate(() => document.body.innerText);
console.log('MANAGED TIER SHOWN:', bodyText.includes('Managed AI assessment'));
console.log('EVIDENCE SHOWN:', bodyText.includes('Examiner evidence'));
console.log('IMPROVEMENTS SHOWN:', bodyText.includes('Prioritised improvements'));
await p.screenshot({ path: 'screenshots/round6-writing-managed.png' });

// second, near-identical attempt → overlap honesty flag
await p.getByRole('button', { name: /Rewrite with this feedback/ }).click();
await p.waitForTimeout(400);
await p.locator('textarea').fill(ESSAY.replace('essential', 'vital'));
await p.getByRole('button', { name: /Get examiner report/ }).click();
await p.waitForTimeout(2500);
const bodyText2 = await p.evaluate(() => document.body.innerText);
console.log('OVERLAP FLAG SHOWN:', bodyText2.includes('overlaps') && bodyText2.includes('not new evidence'));
await p.screenshot({ path: 'screenshots/round6-writing-overlap.png' });

// eval page
await p.goto(B + '/eval', { waitUntil: 'load' });
await p.waitForTimeout(1500);
const evalText = await p.evaluate(() => document.body.innerText);
console.log('EVAL CHECKS BADGE:', /checks/.test(evalText));
console.log('LIMITATIONS SHOWN:', evalText.includes('Limitations'));
await p.screenshot({ path: 'screenshots/round6-eval.png' });
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(400);
await p.screenshot({ path: 'screenshots/round6-eval-limits.png' });

console.log('DONE');
await browser.close();
