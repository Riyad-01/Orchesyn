import { chromium } from 'playwright';
const B = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true, args: ['--headless=new'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const p = await ctx.newPage();
await p.goto(B + '/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.evaluate(() => localStorage.setItem('stim:profile:guest', JSON.stringify({
  id: 'guest', userId: 'guest', name: 'Nadia', avatarColor: '#7c5cff', level: 'B1', goal: 'ielts',
  accentTarget: 'neutral', dailyGoalMin: 15, availableMinPerDay: 25, ieltsModule: 'academic',
  targetOverall: 7, targetSections: {}, sectionLevels: { listening: 72, reading: 65, writing: 48, speaking: 58 },
  uiLanguage: 'en', plan: 'free', createdAt: new Date().toISOString(), onboardingCompleted: true,
})));
await p.goto(B + '/settings', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.getByText('AI Tutor engine').scrollIntoViewIfNeeded().catch(() => {});
const sel = p.locator('select:has(option[value="freellm"])').first();
const opts = await sel.locator('option').allInnerTexts();
console.log('OPTIONS:', JSON.stringify(opts));
await sel.selectOption('freellm');
await p.waitForTimeout(500);
const gwLabel = await p.getByText('Your gateway base URL').isVisible().catch(() => false);
console.log('GATEWAY FIELD VISIBLE:', gwLabel);
console.log('FREENOTE:', await p.getByText(/Self-host the free gateway/).isVisible().catch(() => false));
await p.locator('input[placeholder*="freellmapi"]').fill('https://mygw.example.com');
await p.getByRole('button', { name: 'Save engine' }).click();
await p.waitForTimeout(600);
const saved = await p.evaluate(() => localStorage.getItem('stim:ai'));
console.log('SAVED:', saved);
await p.screenshot({ path: 'screenshots/round5-ai-engine-freellm.png' });
console.log('DONE');
await browser.close();
