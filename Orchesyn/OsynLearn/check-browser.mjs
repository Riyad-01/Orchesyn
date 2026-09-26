import { chromium } from 'playwright';

const urls = process.argv.slice(2);
const browser = await chromium.launch({ channel: undefined });

async function probe(url, tag, { blockSW } = {}) {
  const ctx = await browser.newContext(
    blockSW ? { serviceWorkers: 'block' } : {},
  );
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 400)));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 300));
  });
  page.on('requestfailed', (r) =>
    errs.push('REQFAIL: ' + r.url().slice(-90) + ' ' + (r.failure()?.errorText || '')),
  );
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(6000);
    const t1 = ((await page.evaluate(() => document.body.innerText)) || '').replace(/\s+/g, ' ').slice(0, 160);
    // second navigation so the service worker (if registered) controls the page
    await page.goto(url.replace(/\/$/, '') + '/home/', { waitUntil: 'load', timeout: 45000 }).catch((e) => errs.push('NAV2: ' + e.message.slice(0, 120)));
    await page.waitForTimeout(6000);
    const t2 = ((await page.evaluate(() => document.body.innerText)) || '').replace(/\s+/g, ' ').slice(0, 160);
    await page.screenshot({ path: `/tmp/shot-${tag}.png` });
    console.log(`=== ${tag} ${url} ===`);
    console.log('LOAD1 innerText:', JSON.stringify(t1));
    console.log('LOAD2(/home/) innerText:', JSON.stringify(t2));
    console.log(errs.slice(0, 14).join('\n') || '(no errors)');
  } catch (e) {
    console.log('NAV FAIL', tag, e.message.slice(0, 160));
  }
  await ctx.close();
}

for (const url of urls) {
  await probe(url, 'sw-' + url.replace(/[^a-z0-9]/gi, '').slice(0, 14));
  await probe(url, 'nosw-' + url.replace(/[^a-z0-9]/gi, '').slice(0, 14), { blockSW: true });
}
await browser.close();
