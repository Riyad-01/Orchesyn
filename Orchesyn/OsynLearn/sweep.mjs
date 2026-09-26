import { chromium } from 'playwright';

const BASE = process.env.BASE ?? 'https://osynedu-live.surge.sh';
const browser = await chromium.launch({ headless: true, args: ['--headless=new'] });
const ctx = await browser.newContext();
const p = await ctx.newPage();
const problems = [];
let pageErrs = [];
p.on('pageerror', (e) => pageErrs.push('PAGEERROR ' + e.message.slice(0, 180)));
p.on('console', (m) => {
  if (m.type() === 'error') pageErrs.push('CONSOLE ' + m.text().slice(0, 160));
});

const flush = (label) => {
  if (pageErrs.length) problems.push(`${label}: ${pageErrs.join(' | ')}`);
  pageErrs = [];
};

// onboarding
await p.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
await p.waitForTimeout(3000);
await p.fill('input', 'Sweep');
for (let i = 0; i < 9; i++) {
  await p.getByRole('button', { name: /Continue|Finish|Start/i }).first().click().catch(() => {});
  await p.waitForTimeout(500);
}
flush('onboarding');

const routes = ['/home/', '/learn/', '/practise/', '/mocks/', '/progress/', '/diagnostic/', '/lesson/?id=L1', '/studio/', '/eval/', '/teacher/', '/admin/', '/impromptu/', '/coach/', '/ai/', '/ielts/', '/ielts/mock/mock-1/', '/ielts/listening/', '/ielts/reading/', '/ielts/writing/', '/ielts/study/', '/toefl/', '/toefl/speaking/', '/interview/', '/roadmap/', '/insights/', '/history/', '/mistakes/', '/lab/', '/settings/', '/pricing/', '/login/', '/onboarding/'];
for (const r of routes) {
  await p.goto(BASE + r, { waitUntil: 'load', timeout: 45000 });
  await p.waitForTimeout(2500);
  const t = await p.evaluate(() => document.body.innerText);
  if (/Application error/.test(t)) problems.push(`${r}: APPLICATION ERROR`);
  if (/could not be found/.test(t)) problems.push(`${r}: 404`);
  if (t.replace(/\s+/g, '').length < 40) problems.push(`${r}: near-empty page`);
  const overflow = await p.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  if (overflow > 2) problems.push(`${r}: horizontal overflow ${overflow}px`);
  flush(r);
}

// flow: typed session end-to-end
await p.goto(BASE + '/impromptu/', { waitUntil: 'load' });
await p.waitForTimeout(2500);
try {
  await p.locator('div.grid > button').first().waitFor({ timeout: 10000 });
  await p.locator('div.grid > button').first().click();
  await p.waitForTimeout(1200);
  await p.getByText('No mic? Type it instead').waitFor({ timeout: 15000 });
  await p.getByText('No mic? Type it instead').click();
  await p.waitForTimeout(800);
  await p.fill('textarea', 'Yesterday I go to market with my friend and we was seeing many nice things um basically it was a very good day you know and I am feeling happy.');
  await p.getByRole('button', { name: /Analyse my answer/i }).click();
  await p.waitForTimeout(7000);
  const rep = await p.evaluate(() => document.body.innerText);
  if (!/One fix today/.test(rep)) problems.push('typed-flow: report missing takeaway, url=' + p.url());
  if (!/grammar/i.test(rep)) problems.push('typed-flow: no grammar section');
} catch (e) {
  problems.push('typed-flow: ' + e.message.slice(0, 120));
}
flush('typed-flow');

// flow: coach starts a theme
await p.goto(BASE + '/coach/', { waitUntil: 'load' });
await p.waitForTimeout(2500);
try {
  await p.locator('button.card').first().waitFor({ timeout: 10000 });
  await p.locator('button.card').first().click();
  await p.waitForTimeout(4000);
} catch (e) {
  problems.push('coach: ' + e.message.slice(0, 120));
}
flush('coach');

// flow: AI answers
await p.goto(BASE + '/ai/', { waitUntil: 'load' });
await p.waitForTimeout(2500);
await p.locator('textarea, input[type=text]').last().fill('One tip for fluency, one sentence.');
await p.keyboard.press('Enter');
await p.waitForTimeout(9000);
const ai = await p.evaluate(() => document.body.innerText);
if (!/gpt-oss-120b/.test(ai)) problems.push('ai: LLM not answering');
flush('ai');

// ---------- mobile emulation: nav labels, language row, no page errors ----------
{
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  });
  const m = await mctx.newPage();
  let mErrs = [];
  m.on('pageerror', (e) => mErrs.push('PAGEERROR ' + e.message.slice(0, 180)));
  m.on('console', (msg) => {
    if (msg.type() === 'error') mErrs.push('CONSOLE ' + msg.text().slice(0, 160));
  });
  const mflush = (label) => {
    if (mErrs.length) problems.push(`mobile ${label}: ${mErrs.join(' | ')}`);
    mErrs = [];
  };

  await m.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
  await m.waitForTimeout(2500);
  await m.fill('input', 'MobileSweep').catch(() => {});
  for (let i = 0; i < 9; i++) {
    await m.getByRole('button', { name: /Continue|Finish|Start/i }).first().click().catch(() => {});
    await m.waitForTimeout(400);
  }
  mflush('onboarding');

  await m.goto(BASE + '/impromptu/', { waitUntil: 'load', timeout: 45000 });
  await m.waitForTimeout(2000);
  // bottom bar only (the desktop sidebar <nav> is display:none on mobile but still exposes textContent)
  const navText = await m.evaluate(() => {
    const nav = document.querySelector('nav.fixed');
    if (!nav) return '';
    return Array.from(nav.querySelectorAll('span, a'))
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => el.textContent ?? '')
      .join('\n');
  });
  for (const dest of ['Today', 'Learn', 'Practise', 'Mocks', 'Progress', 'More']) {
    if (!new RegExp(dest, 'i').test(navText)) problems.push(`mobile nav: "${dest}" missing from bottom bar`);
  }
  // History lives one tap deep in the More sheet now
  await m.locator('nav.fixed button').last().click().catch(() => {});
  await m.waitForTimeout(600);
  const sheetTxt = await m.evaluate(() => document.body.innerText);
  if (!/history/i.test(sheetTxt)) problems.push('More sheet: History entry missing');
  await m.keyboard.press('Escape').catch(() => {});
  mflush('impromptu nav');

  await m.goto(BASE + '/settings/', { waitUntil: 'load', timeout: 45000 });
  await m.waitForTimeout(1500);
  const setTxt = await m.evaluate(() => document.body.innerText);
  if (!/Speaking language/i.test(setTxt)) problems.push('mobile settings: practice-language row missing');
  mflush('settings');

  // mobile QA: no horizontal scrolling on the key screens
  // fresh context (session page state can skew measurements) + innerWidth cross-check
  const mo = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });
  const mp = await mo.newPage();
  for (const r of ['/home/', '/impromptu/', '/ielts/listening/', '/ielts/reading/', '/ielts/writing/', '/toefl/', '/report/?id=missing', '/history/']) {
    await mp.goto(BASE + r, { waitUntil: 'load', timeout: 45000 });
    await mp.waitForTimeout(1200);
    const ov = await mp.evaluate(() => {
      const de = document.documentElement;
      const delta = de.scrollWidth - de.clientWidth;
      if (delta <= 2) return 0;
      const wide = [];
      for (const el of de.querySelectorAll('body *')) {
        const b = el.getBoundingClientRect();
        if (b.width > de.clientWidth + 2) wide.push(`${el.tagName}.${(el.className || '').toString().slice(0, 40)} w=${Math.round(b.width)}`);
      }
      return { delta, cw: de.clientWidth, iw: window.innerWidth, wide: wide.slice(0, 5) };
    });
    if (ov && ov !== 0) {
      problems.push(
        `mobile ${r}: horizontal overflow ${typeof ov === 'object' ? `${ov.delta}px cw=${ov.cw} iw=${ov.iw} ${JSON.stringify(ov.wide)}` : `${ov}px`}`,
      );
    }
  }
  mflush('mobile overflow');

  await mctx.close();
}

console.log(problems.length ? 'PROBLEMS:\n' + problems.join('\n') : 'SWEEP CLEAN');
await browser.close();
