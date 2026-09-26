import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--headless=new'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36' });
const p = await ctx.newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'load' });
await p.waitForTimeout(2500);
await p.fill('input', 'Riya').catch(() => {});
for (let i = 0; i < 5; i++) { await p.getByRole('button', { name: /Continue|Finish|Start/i }).first().click().catch(() => {}); await p.waitForTimeout(400); }
await p.goto('http://localhost:3000/toefl/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'screenshots/mobile-toefl.png' });
await browser.close();
console.log('ok');
