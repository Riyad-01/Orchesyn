import { chromium } from 'playwright';
const B = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true, args: ['--headless=new'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const p = await ctx.newPage();
await p.goto(B + '/', { waitUntil: 'load' });
await p.waitForTimeout(2000);
await p.evaluate(() => {
  localStorage.setItem('stim:profile:guest', JSON.stringify({
    id: 'guest', userId: 'guest', name: 'Nadia', avatarColor: '#7c5cff',
    level: 'B1', goal: 'ielts', accentTarget: 'neutral',
    dailyGoalMin: 15, availableMinPerDay: 25,
    ieltsModule: 'academic', targetOverall: 7,
    targetSections: { listening: 7, reading: 7, writing: 6.5, speaking: 6.5 },
    sectionLevels: { listening: 72, reading: 65, writing: 48, speaking: 58 },
    uiLanguage: 'en', plan: 'free',
    createdAt: new Date().toISOString(), onboardingCompleted: true,
  }));
});

// Adaptive plan card on Learn
await p.goto(B + '/learn', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.getByText('This week · adaptive plan').scrollIntoViewIfNeeded().catch(() => {});
await p.waitForTimeout(400);
await p.screenshot({ path: 'screenshots/round5-plan-card.png' });

// Lesson: advance explain → worked → guided task
await p.goto(B + '/lesson?id=L1', { waitUntil: 'load' });
await p.waitForTimeout(1200);
await p.getByText('Show me an example').click().catch(() => {});
await p.waitForTimeout(700);
// worked phase → guided phase button
const btns = await p.locator('button').allInnerTexts();
console.log('WORKED PHASE BUTTONS:', JSON.stringify(btns));
for (const label of [/try one myself/i, /your turn/i, /guided/i, /start practice/i, /continue/i, /next/i]) {
  if (await p.getByRole('button', { name: label }).first().isVisible().catch(() => false)) {
    await p.getByRole('button', { name: label }).first().click();
    break;
  }
}
await p.waitForTimeout(900);
await p.screenshot({ path: 'screenshots/round5-lesson-guided.png' });
console.log('DONE');
await browser.close();
