import { chromium } from 'playwright';
const B = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true, args: ['--headless=new'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const p = await ctx.newPage();

// Seed a guest profile with section levels so plan/diagnostic show real data
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

// 1. Diagnostic — provisional screening (fresh)
await p.goto(B + '/diagnostic', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'screenshots/round5-diagnostic.png' });

// 2. Lesson player — L1 in the explain phase
await p.goto(B + '/lesson?id=L1', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'screenshots/round5-lesson-explain.png' });
// advance to a task phase
await p.getByRole('button', { name: /Start|Continue|Next|Begin/i }).first().click().catch(() => {});
await p.waitForTimeout(1200);
await p.screenshot({ path: 'screenshots/round5-lesson-task.png' });

// 3. Studio — content workflow
await p.goto(B + '/studio', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'screenshots/round5-studio.png' });

// 4. Learn hub — adaptive weekly plan preview
await p.goto(B + '/learn', { waitUntil: 'load' });
await p.waitForTimeout(1500);
const planText = await p.evaluate(() => document.body.innerText);
console.log('PLAN PREVIEW VISIBLE:', /Today|This week|reschedul/i.test(planText));
await p.screenshot({ path: 'screenshots/round5-learn-plan.png', fullPage: false });

console.log('DONE');
await browser.close();
