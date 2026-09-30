import { open } from './lib.mjs';
const SAVE = process.argv[2] === 'save';
const { browser, page } = await open({ w: 1600, h: 1000 });
const J = { type: 'jpeg', quality: 93 };
let n = 0; const S = async (tag) => page.shot(`cal2/${String(n++).padStart(3, '0')}_${tag}`, J);
await page.go('/calendar');
await S('calendar');
await page.getByRole('button', { name: /Rezerwacja/ }).first().click();
await page.waitForTimeout(900);
await S('modal');
await page.getByPlaceholder('Dodaj tytuł rezerwacji').click();
for (const ch of 'Pakiet ochronny Porsche 911') { await page.keyboard.type(ch); await page.waitForTimeout(40); await S('t'); }
const lab = await page.getByText('Wizyta całodniowa').boundingBox();
await page.mouse.click(lab.x - 40, lab.y + lab.height / 2); await page.waitForTimeout(400);
await S('allday_off');
await page.locator('button').filter({ hasText: /30\.09\.2026, / }).first().click(); await page.waitForTimeout(500);
await S('picker');
const dayBtn = async (txt, pick) => { const bs = await page.locator('button').filter({ hasText: new RegExp('^' + txt + '$') }).all(); const c = []; for (const b of bs) { const bb = await b.boundingBox(); if (bb && bb.y > 380 && bb.y < 700 && bb.x < 900) c.push([bb.y, b]); } c.sort((a, b) => a[0] - b[0]); return pick === 'last' ? c[c.length - 1][1] : c[0][1]; };
await (await dayBtn('2', 'last')).click(); await page.waitForTimeout(350);
await S('pick_start');
await (await dayBtn('3', 'first')).click(); await page.waitForTimeout(350);
await S('pick_end');
const readHour = async () => +(await page.evaluate(() => [...document.querySelectorAll('button')].find(b => /^D[Oo]/.test(b.innerText.trim()) || /^O[Dd]/.test(b.innerText.trim()))?.innerText));
const cur = async (which) => { const t = await page.evaluate(w => [...document.querySelectorAll('button')].map(b => b.innerText.replace(/\n/g, ' ')).find(s => s.startsWith(w)), which); return +t.match(/, (\d\d):/)[1]; };
let h = await cur('DO'); while (h > 16) { await page.getByRole('button', { name: 'Godzina do tyłu' }).click(); await page.waitForTimeout(40); h--; }
await page.getByRole('button', { name: ':00', exact: true }).click(); await page.waitForTimeout(200);
await S('end_time');
await page.getByRole('button', { name: /^Od / }).click(); await page.waitForTimeout(300);
h = await cur('OD'); while (h < 9) { await page.getByRole('button', { name: 'Godzina do przodu' }).click(); await page.waitForTimeout(40); h++; } while (h > 9) { await page.getByRole('button', { name: 'Godzina do tyłu' }).click(); await page.waitForTimeout(40); h--; }
await page.getByRole('button', { name: ':00', exact: true }).click(); await page.waitForTimeout(200);
await S('start_time');
console.log(await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => /^(OD|DO)/.test(b.innerText) && b.getBoundingClientRect().width > 0).map(b => b.innerText.replace(/\n/g, ' ')).join(' | ')));
await page.getByRole('button', { name: 'Gotowe' }).click(); await page.waitForTimeout(400);
await S('dates_done');
await page.getByPlaceholder('Kowalski').click();
for (const ch of 'Wiś') { await page.keyboard.type(ch); await page.waitForTimeout(350); await S('client_t'); }
await page.waitForTimeout(700); await S('client_list');
await page.getByText('Piotr Wiśniewski').first().click(); await page.waitForTimeout(1200);
await S('client_selected');
await page.getByText('Porsche 911 Carrera 4S').first().click(); await page.waitForTimeout(700);
await S('vehicle_selected');
for (const [q, name] of [['PPF', 'Oklejanie PPF – pełny przód'], ['IGL', 'Powłoka ceramiczna IGL Eclipse'], ['szyb', 'Impregnacja szyb nano']]) {
  const svc = page.getByPlaceholder('Dodaj usługę...');
  await svc.click(); await page.waitForTimeout(300);
  for (const ch of q) { await page.keyboard.type(ch); await page.waitForTimeout(200); await S('svc_t'); }
  await page.waitForTimeout(400);
  await page.getByText(name).last().click(); await page.waitForTimeout(600);
  await S('svc_selected');
}
const rem = page.getByText('Wyślij SMS przypominający przed wizytą');
await rem.click(); await page.waitForTimeout(400);
await S('sms_checked');
await page.getByText('Wyślij SMS z linkiem do Karty Wizyty').click(); await page.waitForTimeout(400);
await S('card_checked');
console.log(await page.evaluate(() => document.querySelector('[role=dialog], form')?.innerText.slice(0, 1600)));
if (SAVE) {
  await page.getByRole('button', { name: 'Zapisz wizytę' }).click(); await page.waitForTimeout(2500);
  await S('saved');
}
await browser.close();
