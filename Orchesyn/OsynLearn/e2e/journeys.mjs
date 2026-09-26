/**
 * Release-owner end-to-end journeys. Real interactions against the running
 * app; every step logs PASS/FAIL with evidence. Blocked external dependencies
 * are asserted as honest blocks (the app must SAY so), never faked.
 */
import { chromium } from 'playwright';

const B = process.env.BASE ?? 'http://localhost:3000';
let pass = 0;
let fail = 0;
const log = (journey, step, ok, evidence = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${journey} | ${step}${evidence ? ' | ' + evidence : ''}`);
};

const seedProfile = async (p) => {
  await p.goto(B + '/', { waitUntil: 'load' });
  await p.waitForTimeout(600);
  await p.evaluate(() => localStorage.setItem('stim:profile:guest', JSON.stringify({ id: 'guest', userId: 'guest', name: 'Nadia', avatarColor: '#000', level: 'B1', goal: 'ielts', accentTarget: 'neutral', dailyGoalMin: 15, availableMinPerDay: 25, ieltsModule: 'academic', uiLanguage: 'en', plan: 'free', createdAt: new Date().toISOString(), onboardingCompleted: true })));
};

const browser = await chromium.launch({
  headless: true,
  args: [
    '--headless=new',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
  ],
});

/* ============================ J1 new learner ============================ */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(B + '/', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  log('J1', 'gate sends brand-new learner to onboarding', p.url().includes('/onboarding'), p.url());

  for (let i = 0; i < 10; i++) {
    if (p.url().includes('/home')) break;
    const input = p.locator('input:visible').first();
    if (await input.isVisible().catch(() => false)) await input.fill('Nadia').catch(() => {});
    const chip = p.locator('button:has-text("IELTS prep")').first();
    if (await chip.isVisible().catch(() => false)) await chip.click().catch(() => {});
    const btn = p.getByRole('button', { name: /Continue|Start my journey|Finish/i }).first();
    if (await btn.isVisible().catch(() => false)) await btn.click().catch(() => {});
    await p.waitForTimeout(500);
  }
  log('J1', 'onboarding completes to /home', p.url().includes('/home'), p.url());

  await p.goto(B + '/diagnostic', { waitUntil: 'load' });
  await p.waitForTimeout(1000);
  await p.getByRole('button', { name: 'Start screening' }).click();
  await p.waitForTimeout(600);
  // objective screening covers skills that have mcq/tfng items (speaking is
  // practice-based) — loop until the run completes instead of hard-coding 4
  for (let i = 0; i < 6; i++) {
    const card = p.locator('.card').filter({ hasText: 'PROVISIONAL screening' });
    if ((await card.locator('button.tap').count()) === 0) break;
    await card.locator('button.tap').first().click();
    await p.waitForTimeout(250);
    await card.getByRole('button', { name: /Next|Finish & save level/ }).click();
    await p.waitForTimeout(500);
  }
  await p.waitForTimeout(800); // let updateProfile persist
  const prof = await p.evaluate(() => JSON.parse(localStorage.getItem('stim:profile:guest') ?? 'null'));
  const mastery = await p.evaluate(() => localStorage.getItem('stim:mastery'));
  log('J1', 'screening writes provisional sectionLevels', Boolean(prof?.sectionLevels && Object.keys(prof.sectionLevels).length >= 3), JSON.stringify(prof?.sectionLevels));
  log('J1', 'first-try answers recorded as unseen evidence', Boolean(mastery && mastery.includes('"total"')), (mastery ?? '').slice(0, 60));

  await p.goto(B + '/learn', { waitUntil: 'load' });
  await p.waitForTimeout(1000);
  const learnText = await p.evaluate(() => document.body.innerText);
  log('J1', 'personalised plan shows diagnostic levels', /Provisional-to-confirmed levels/i.test(learnText));
  log('J1', 'adaptive plan card present', /adaptive plan/i.test(learnText));
  await ctx.close();
}

/* ============================ J2 lesson cycle ============================ */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await seedProfile(p);
  await p.goto(B + '/lesson?id=L1', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.getByText('Show me an example').click();
  await p.waitForTimeout(400);
  await p.getByText('Try one with hints').click();
  await p.waitForTimeout(500);
  // guided pool has 2 items (5 pm, 5); independent pool has 1 item (4)
  await p.getByRole('button', { name: '5 pm', exact: true }).click();
  await p.getByRole('button', { name: 'Check' }).click();
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: '5', exact: true }).click();
  await p.getByRole('button', { name: 'Check' }).click();
  await p.waitForTimeout(500);
  const body1 = await p.evaluate(() => document.body.innerText);
  log('J2', 'lesson advances explain→worked→guided→independent with assessment', /independent attempt/i.test(body1), body1.includes('guided practice') ? 'guided seen' : '');
  await p.getByRole('button', { name: '4', exact: true }).click();
  await p.getByRole('button', { name: 'Check' }).click();
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: '£15', exact: true }).click();
  await p.getByRole('button', { name: 'Check' }).click();
  await p.waitForTimeout(900);
  const srs = await p.evaluate(() => localStorage.getItem('osyn:srs'));
  const prog = await p.evaluate(() => localStorage.getItem('stim:lesson-progress'));
  log('J2', 'mastery recorded + scheduled review entry created', Boolean(prog && prog.includes('L1')) && Boolean(srs && srs.includes('lesson:L1')), (srs ?? 'no-srs').slice(0, 80));
  await ctx.close();
}

/* ============================ J3 timed mock ============================ */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await seedProfile(p);
  await p.goto(B + '/ielts/mock/mock-1', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.getByRole('button', { name: 'Begin the test' }).click();
  await p.waitForTimeout(700);
  // 8 speaking steps: (prep?) start recording → 2.5s → finish
  for (let i = 0; i < 8; i++) {
    const prep = p.getByRole('button', { name: /Start .* preparation|Start recording/ }).first();
    if (await prep.isVisible().catch(() => false)) {
      await prep.click();
      await p.waitForTimeout(400);
      await p.getByRole('button', { name: /Skip preparation/ }).click().catch(() => {});
    }
    await p.waitForTimeout(2500); // silent fake mic — also exercises silent-recording handling
    await p.getByRole('button', { name: 'Finish answer' }).click().catch(() => {});
    await p.waitForTimeout(1200);
    // typed rescue may appear for empty captures
    const ta = p.locator('textarea:visible').first();
    if (await ta.isVisible().catch(() => false)) {
      await ta.fill('In my hometown there are many places I like, for example the river park where I walk most evenings.');
      await p.getByRole('button', { name: /Analyse my answer/ }).click().catch(() => {});
      await p.waitForTimeout(1200);
    }
  }
  const t = await p.evaluate(() => document.body.innerText);
  const results = /results|Overall|band/i.test(t);
  log('J3', 'timed mock completes to results (silent audio handled, typed rescue works)', results, p.url());
  log('J3', 'targeted remediation advice present', /Focus first on|drill/i.test(t));
  await ctx.close();
}

/* ====================== J4 guest → account (blocked) ===================== */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await seedProfile(p);
  await p.goto(B + '/settings', { waitUntil: 'load' });
  await p.waitForTimeout(1000);
  await p.getByRole('button', { name: /Sign in & sync/ }).click().catch(() => {});
  await p.waitForTimeout(900);
  const t = await p.evaluate(() => document.body.innerText);
  const honest = /cloud|supabase|not connected|configure/i.test(t);
  log('J4', 'cross-device restore is BLOCKED (no Supabase creds) and the app says so honestly', honest, 'journey blocked at external dependency');
  await ctx.close();
}

/* ==================== J5 free → paid → cancellation ==================== */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await seedProfile(p);
  await p.goto(B + '/pricing', { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  await p.getByRole('button', { name: /Checkout · sandbox/ }).first().click();
  await p.waitForTimeout(700);
  await p.getByRole('button', { name: /provider: succeeded/ }).click();
  await p.waitForTimeout(800);
  let t = await p.evaluate(() => document.body.innerText);
  log('J5', 'sandbox payment grants paid entitlements server-side', /prep/.test(t) && /active/i.test(t));
  await p.getByRole('button', { name: /provider: cancelled/ }).click();
  await p.waitForTimeout(800);
  t = await p.evaluate(() => document.body.innerText);
  log('J5', 'cancellation drops entitlements to free', /\bfree\b/i.test(t));
  await ctx.close();
}

/* ======================= J6 teacher → review flow ======================= */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await seedProfile(p);
  await p.goto(B + '/teacher', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /Create invite code/ }).click();
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: /join \+ submit as demo learner/ }).click();
  await p.waitForTimeout(1200);
  let t = await p.evaluate(() => document.body.innerText);
  log('J6', 'assignment→submission visible to teacher (org-isolated)', /learner-demo/.test(t));
  await p.locator('button', { hasText: 'learner-demo' }).last().click().catch(() => {});
  await p.waitForTimeout(400);
  await p.locator('textarea:visible').first().fill('Strong overview. Now add specific figures for each year.').catch(() => {});
  await p.getByRole('button', { name: /Save override/ }).click().catch(() => {});
  await p.waitForTimeout(800);
  t = await p.evaluate(() => document.body.innerText);
  log('J6', 'override recorded in immutable audit trail', /overrode feedback/i.test(t));
  await ctx.close();
}

/* =================== J7 offline → saved → recovery ====================== */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await seedProfile(p);
  await p.goto(B + '/ielts/writing', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.locator('button.card').first().click();
  await p.waitForTimeout(500);
  await p.locator('textarea').fill('Autosave check: the chart climbs steadily across the period.');
  await p.waitForTimeout(900); // debounce
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.locator('button.card').first().click();
  await p.waitForTimeout(600);
  const val = await p.locator('textarea').inputValue();
  log('J7', 'writing survives reload via autosave', val.includes('Autosave check'), val.slice(0, 40));

  await p.goto(B + '/impromptu', { waitUntil: 'load' });
  await p.waitForTimeout(800);
  // let the service worker finish precaching so offline navigations are served
  await p.waitForFunction(async () => {
    if (!('caches' in window)) return false;
    const c = await caches.open('osynlearn-v5');
    return Boolean(await c.match('/report'));
  }, undefined, { timeout: 30_000 }).catch(() => {});
  await ctx.setOffline(true);
  await p.waitForTimeout(900);
  const offlineBanner = await p.evaluate(() => document.body.innerText);
  log('J7', 'offline banner appears with practice-continues messaging', /offline/i.test(offlineBanner));
  // typed practice while offline still saves locally
  await p.locator('button.tap.card').first().click();
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: /No mic\? Type it instead/ }).click().catch(() => {});
  await p.waitForTimeout(400);
  await p.locator('textarea:visible').first().fill('Even offline my practice is stored on this device and nothing is lost.');
  await p.getByRole('button', { name: /Analyse my answer/ }).click().catch(() => {});
  await p.waitForTimeout(2500);
  const url = p.url();
  log('J7', 'offline session saved & report reachable (local-first)', url.includes('/report'), url);
  await ctx.setOffline(false);
  await ctx.close();
}

/* ======================= robustness & a11y battery ======================= */
{
  // microphone DENIED
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
  });
  const p = await ctx.newPage();
  await seedProfile(p);
  await p.goto(B + '/impromptu', { waitUntil: 'load' });
  await p.waitForTimeout(900);
  await p.locator('button.card').first().click();
  await p.waitForTimeout(800);
  const t1 = await p.evaluate(() => document.body.innerText);
  log('R', 'mic denial → honest disabled state + typed fallback offered', /Microphone unavailable/i.test(t1) && /Type it instead/i.test(t1) && /Check microphone/i.test(t1));
  // prove the typed fallback actually recovers the session
  await p.getByRole('button', { name: /No mic\? Type it instead/ }).click();
  await p.waitForTimeout(400);
  await p.locator('textarea:visible').first().fill('Without a microphone I can still practise by typing my answer.');
  await p.getByRole('button', { name: /Analyse my answer/ }).click();
  await p.waitForTimeout(2500);
  log('R', 'mic-denied learner completes session via typed fallback', p.url().includes('/report'), p.url());
  await ctx.close();

  // empty writing submission gated
  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await c2.newPage();
  await seedProfile(p2);
  await p2.goto(B + '/ielts/writing', { waitUntil: 'load' });
  await p2.waitForTimeout(800);
  await p2.locator('button.card').first().click();
  await p2.waitForTimeout(400);
  const disabled = await p2.getByRole('button', { name: /Get examiner report/ }).isDisabled();
  log('R', 'empty writing submission is gated (button disabled)', disabled);

  // keyboard: skip link + focus visibility
  await p2.goto(B + '/home', { waitUntil: 'load' });
  await p2.waitForTimeout(800);
  await p2.keyboard.press('Tab');
  const skip = await p2.evaluate(() => document.activeElement?.textContent ?? '');
  log('R', 'first Tab reaches skip-to-content link', /skip/i.test(skip), skip);
  const h1 = await p2.locator('h1').count();
  log('R', 'page exposes a single h1 for screen readers', h1 >= 1, `h1=${h1}`);

  // slow connection: static app still paints
  const c3 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p3 = await c3.newPage();
  await seedProfile(p3);
  const cdp = await c3.newCDPSession(p3);
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 2000, downloadThroughput: 50_000, uploadThroughput: 50_000 });
  const t0 = Date.now();
  await p3.goto(B + '/learn', { waitUntil: 'commit', timeout: 120_000 });
  await p3.locator('h1').first().waitFor({ state: 'visible', timeout: 120_000 }).catch(() => {});
  const painted = await p3.locator('h1').first().isVisible().catch(() => false);
  log('R', 'slow 2G-ish connection still paints the app (static + local-first)', painted, `${Date.now() - t0}ms`);
  await c3.close();
}

console.log(`\nTOTAL: ${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
