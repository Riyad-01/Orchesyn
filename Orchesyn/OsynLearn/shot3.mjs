import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--headless=new'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' });
const p = await ctx.newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'load' });
await p.waitForTimeout(2500);
await p.fill('input', 'Riya').catch(() => {});
for (let i = 0; i < 5; i++) { await p.getByRole('button', { name: /Continue|Finish|Start/i }).first().click().catch(() => {}); await p.waitForTimeout(400); }
// settings with clear-history
await p.goto('http://localhost:3000/settings/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.getByText('Clear practice history').scrollIntoViewIfNeeded().catch(() => {});
await p.waitForTimeout(400);
await p.screenshot({ path: 'screenshots/mobile-settings-clear.png' });
// typed session -> report with examiner plan
await p.goto('http://localhost:3000/impromptu/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.locator('div.grid > button').first().click().catch(() => {});
await p.waitForTimeout(1200);
await p.getByText('No mic? Type it instead').click().catch(() => {});
await p.waitForTimeout(500);
await p.locator('textarea').fill('I think the Brooklyn Bridge is one of the most famous bridge in the world because it was build many years ago and it still standing today which impress me a lot. I visit it last year with my family and we take many photos there.');
await p.getByText('Analyse my answer').click();
await p.waitForURL(/report/, { timeout: 60000 }).catch(() => {});
await p.waitForTimeout(2500);
await p.getByText("Examiner's improvement plan").scrollIntoViewIfNeeded().catch(() => {});
await p.waitForTimeout(400);
await p.screenshot({ path: 'screenshots/mobile-report-llm.png' });
const txt = await p.evaluate(() => document.body.innerText);
console.log('HAS EXAMINER CARD:', /Examiner's improvement plan/.test(txt));
console.log('HAS GRAMMAR FIX:', /went|built|impresses|bridges/i.test(txt));
await browser.close();
