import { chromium } from 'playwright';
const B = 'http://localhost:3000';
const browser = await chromium.launch({ headless: true, args: ['--headless=new'] });
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
await p.goto(B + '/', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.evaluate(() => localStorage.setItem('stim:profile:guest', JSON.stringify({ id:'guest',userId:'guest',name:'Nadia',avatarColor:'#7c5cff',level:'B1',goal:'ielts',accentTarget:'neutral',dailyGoalMin:15,availableMinPerDay:25,ieltsModule:'academic',uiLanguage:'en',plan:'free',createdAt:new Date().toISOString(),onboardingCompleted:true })));

// pricing + sandbox checkout flow
await p.goto(B + '/pricing', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.getByText('BDT ৳ (Bangladesh)').click().catch(() => {});
await p.waitForTimeout(300);
await p.screenshot({ path: 'screenshots/round7-pricing-bdt.png' });
const btns = p.getByRole('button', { name: /Checkout · sandbox/ });
await btns.first().click().catch(() => {});
await p.waitForTimeout(800);
await p.getByRole('button', { name: /provider: succeeded/ }).click().catch(() => {});
await p.waitForTimeout(800);
const t = await p.evaluate(() => document.body.innerText);
console.log('ENTITLEMENTS ACTIVE SHOWN:', /active/.test(t) && /teacher tools/.test(t));
await p.screenshot({ path: 'screenshots/round7-pricing-entitled.png' });

// teacher workspace: invite + demo learner + override
await p.goto(B + '/teacher', { waitUntil: 'load' });
await p.waitForTimeout(1800);
await p.getByRole('button', { name: /Create invite code/ }).click().catch(() => {});
await p.waitForTimeout(600);
await p.getByRole('button', { name: /join \+ submit as demo learner/ }).click().catch(() => {});
await p.waitForTimeout(1200);
const tt = await p.evaluate(() => document.body.innerText);
console.log('CLASS ROW SHOWN:', /learner-demo/.test(tt));
await p.locator('button:has-text("learner-demo")').first().click().catch(() => {});
await p.waitForTimeout(400);
await p.locator('textarea').fill('Add specific figures for every year, and link paragraphs with clearer signposting.').catch(() => {});
await p.getByRole('button', { name: /Save override/ }).click().catch(() => {});
await p.waitForTimeout(800);
const tt2 = await p.evaluate(() => document.body.innerText);
console.log('AUDIT TRAIL SHOWN:', /Audit trail/.test(tt2) && /overrode feedback/.test(tt2));
await p.screenshot({ path: 'screenshots/round7-teacher.png' });

// admin
await p.goto(B + '/admin', { waitUntil: 'load' });
await p.waitForTimeout(1500);
const at = await p.evaluate(() => document.body.innerText);
console.log('ADMIN OVERVIEW SHOWN:', /Billing visibility/.test(at) && /Organisations/.test(at));
await p.screenshot({ path: 'screenshots/round7-admin.png' });

// settings privacy center
await p.goto(B + '/settings', { waitUntil: 'load' });
await p.waitForTimeout(1500);
await p.getByText('Privacy & data').scrollIntoViewIfNeeded().catch(() => {});
await p.waitForTimeout(400);
const st = await p.evaluate(() => document.body.innerText);
console.log('PRIVACY MAP SHOWN:', /Who receives what/.test(st) && /recording/.test(st));
await p.screenshot({ path: 'screenshots/round7-privacy.png' });
console.log('DONE');
await browser.close();
