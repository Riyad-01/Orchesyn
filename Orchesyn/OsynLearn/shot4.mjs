import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--headless=new'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'load' });
await p.waitForTimeout(2500);
await p.fill('input', 'Riya').catch(() => {});
for (let i = 0; i < 5; i++) { await p.getByRole('button', { name: /Continue|Finish|Start/i }).first().click().catch(() => {}); await p.waitForTimeout(400); }
await p.goto('http://localhost:3000/impromptu/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.locator('div.grid > button').first().click().catch(() => {});
await p.waitForTimeout(1200);
await p.getByText('No mic? Type it instead').click().catch(() => {});
await p.waitForTimeout(500);
await p.locator('textarea').fill('I think the Brooklyn Bridge is one of the most famous bridge in the world because it was build many years ago and it still standing today which impress me a lot. I visit it last year with my family and we take many photos there.');
const t0 = Date.now();
await p.getByText('Analyse my answer').click();
await p.waitForURL(/report/, { timeout: 30000 });
console.log('REPORT PAINTED IN ms:', Date.now() - t0);
const early = await p.evaluate(() => document.body.innerText);
console.log('EARLY HAS EXAMINER:', /Examiner's improvement plan/.test(early));
await p.waitForTimeout(16000); // background upgrade window
const late = await p.evaluate(() => document.body.innerText);
console.log('LATE HAS EXAMINER:', /Examiner's improvement plan/.test(late));
await p.getByText("Examiner's improvement plan").scrollIntoViewIfNeeded().catch(() => {});
await p.screenshot({ path: 'screenshots/mobile-progressive.png' });
await browser.close();
