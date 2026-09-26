import { chromium } from 'playwright';
const B = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true, args: ['--headless=new'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const p = await ctx.newPage();
await p.goto(B + '/', { waitUntil: 'load' });
await p.waitForTimeout(1800);
await p.evaluate(() => localStorage.setItem('stim:profile:guest', JSON.stringify({
  id: 'guest', userId: 'guest', name: 'Nadia', avatarColor: '#7c5cff',
  level: 'B1', goal: 'ielts', accentTarget: 'neutral', dailyGoalMin: 15, availableMinPerDay: 25,
  ieltsModule: 'academic', targetOverall: 7,
  targetSections: { listening: 7, reading: 7, writing: 6.5, speaking: 6.5 },
  sectionLevels: { listening: 72, reading: 65, writing: 48, speaking: 58 },
  uiLanguage: 'en', plan: 'free', createdAt: new Date().toISOString(), onboardingCompleted: true,
})));
await p.goto(B + '/learn', { waitUntil: 'load' });
await p.waitForTimeout(1200);
await p.evaluate(() => { const el = [...document.querySelectorAll('p')].find(x => x.textContent.includes('adaptive plan')); el?.scrollIntoView({ block: 'start' }); });
await p.waitForTimeout(400);
await p.screenshot({ path: 'screenshots/round5-plan-card.png' });
await p.goto(B + '/lesson?id=L1', { waitUntil: 'load' });
await p.waitForTimeout(1000);
await p.getByText('Show me an example').click();
await p.waitForTimeout(500);
await p.getByText('Try one with hints').click();
await p.waitForTimeout(800);
await p.screenshot({ path: 'screenshots/round5-lesson-guided.png' });
console.log('DONE');
await browser.close();
