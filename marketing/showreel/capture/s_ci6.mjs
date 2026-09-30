import { open } from './lib.mjs';
import { execSync } from 'child_process';
import { chromium } from 'playwright-core';
const { browser, page } = await open({ w: 1600, h: 1000 });
const J = { type: 'jpeg', quality: 93 };
let n = 0; const S = async (tag) => page.shot(`ci/${String(n++).padStart(3, '0')}_${tag}`, J);
const sql = q => execSync(`psql -h localhost -U postgres detailing_crm -At -c "${q}"`).toString().trim();
await page.go('/reservations/46b72064-02c0-489c-bd47-5f93d176b5dc/checkin'); await page.getByText('Dalej').first().waitFor(); await page.waitForTimeout(800);
await S('step1');
const km = page.getByPlaceholder('np. 45230'); await km.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
await km.click(); for (const ch of '12780') { await page.keyboard.type(ch); await page.waitForTimeout(60); }
await S('km');
await page.getByRole('button', { name: /Dalej/ }).click(); await page.waitForTimeout(1500);
await S('step2');
await page.locator('input[type=file]').first().setInputFiles(['a/p911garage.jpg', 'a/gt3.jpg', 'a/wheel.jpg', 'a/p911dark.jpg']);
await page.waitForTimeout(6000);
await page.getByText('Przesłane zdjęcia').first().scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
await S('photos');
await page.evaluate(() => { const sw = document.querySelector('input[role=switch][aria-label="Rozwiń"]'); sw.scrollIntoView({ block: 'center' }); sw.click(); }); await page.waitForTimeout(1500);
await page.locator('select').first().selectOption({ label: 'Coupe' }); await page.waitForTimeout(1000);
const img = page.locator('main img').last(); await img.scrollIntoViewIfNeeded(); await page.mouse.wheel(0, 120); await page.waitForTimeout(500);
await S('schema');
const dmg = [[.82, .22, 'Odprysk na przednim zderzaku'], [.27, .47, 'Odpryski na masce'], [.66, .58, 'Rysa na tylnym zderzaku']];
for (const [fx, fy, txt] of dmg) {
  const ib = await img.boundingBox();
  await page.mouse.click(ib.x + ib.width * fx, ib.y + ib.height * fy); await page.waitForTimeout(700);
  await S('dmg_pt');
  const inp = page.getByPlaceholder(/Opis uszkodzenia/).last();
  await inp.fill(txt); await page.waitForTimeout(300);
}
await img.scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
await S('dmg_done');
await page.getByPlaceholder(/Opis uszkodzenia/).last().scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
await S('dmg_list');
await page.getByRole('button', { name: /Utwórz wizytę/ }).click(); await page.waitForTimeout(3000);
await S('modal');
const dlg = page.getByRole('dialog');
const clickAtt = async (label) => { const t = dlg.getByText(label, { exact: true }).first(); const bb = await t.boundingBox(); await page.mouse.click(bb.x + 20, bb.y + bb.height / 2); await page.waitForTimeout(1500); };
await dlg.getByText('Zaznacz wszystkie').click(); await page.waitForTimeout(1200); await S('att_photos');
await dlg.getByText('Model uszkodzeń pojazdu', { exact: true }).scrollIntoViewIfNeeded(); await page.waitForTimeout(500); await S('att_damage');
console.log('att state', await page.evaluate(() => [...document.querySelectorAll('[role=dialog] input[type=checkbox]')].map(c => c.checked)));
const smsRow = dlg.getByText('Wyślij SMS z linkiem do Karty Wizyty'); const sb = await smsRow.boundingBox();
await page.mouse.click(1321 / 1.25, sb.y + 8); await page.waitForTimeout(400); await S('sms_on');
console.log(await dlg.innerText());
// przyciski ikon w wierszach dokumentów
const iconInfo = await page.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].map((b, i) => ({ i, t: (b.innerText || '').trim(), a: b.getAttribute('aria-label') || b.title || '', dis: b.disabled, r: b.getBoundingClientRect().toJSON() })).filter(x => !x.t && x.r.width > 0));
console.log(JSON.stringify(iconInfo.map(x => [x.a, x.dis, Math.round(x.r.x), Math.round(x.r.y)])));
const rowsTxt = await page.evaluate(() => [...document.querySelectorAll('[role=dialog] *')].filter(e => /^(Protokół przyjęcia pojazdu|Zgoda na kontakt marketingowy)$/.test(e.textContent.trim()) && e.children.length === 0).map(e => [e.textContent.trim(), Math.round(e.getBoundingClientRect().y)]));
console.log(JSON.stringify(rowsTxt));
// podgląd protokołu: pierwszy przycisk ikony w wierszu protokołu
const protoY = rowsTxt.find(r => r[0] === 'Protokół przyjęcia pojazdu' && r[1] < 520)[1];
const rowBtns = iconInfo.filter(x => Math.abs(x.r.y + x.r.height / 2 - protoY - 8) < 26).sort((p, q) => p.r.x - q.r.x);
console.log('rowBtns', rowBtns.map(x => x.a));
await page.mouse.click(rowBtns[0].r.x + 10, rowBtns[0].r.y + 10); await page.waitForTimeout(4000);
await S('preview');
await page.keyboard.press('Escape'); await page.waitForTimeout(800);
if (!(await page.getByText('Powiadomienia dla klienta', { exact: false }).count())) console.log('modal closed?');
await S('after_preview');
// prośba o podpis
const phoneBtn = rowBtns.find(x => /telefon/i.test(x.a)) || rowBtns[2];
await page.mouse.click(phoneBtn.r.x + 10, phoneBtn.r.y + 10); await page.waitForTimeout(2500);
await S('sign_request');
console.log('after request:', (await page.evaluate(() => [...document.querySelectorAll('[role=dialog]')].map(d => d.innerText).join('\n--\n'))).slice(0, 1500));
const token = sql("select link_token from signature_requests where link_token is not null order by created_at desc limit 1");
console.log('TOKEN', token);
// tablet: prawdziwa strona podpisu
const tb = await browser.newContext({ viewport: { width: 834, height: 1194 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'pl-PL' });
const tp = await tb.newPage();
let tn = 0; const TS = async (tag) => { await tp.screenshot({ path: `shots/sign/${String(tn++).padStart(3, '0')}_${tag}.jpg`, type: 'jpeg', quality: 93 }); console.log('tshot', tag); };
await tp.goto('http://localhost:5173/sign/' + token, { waitUntil: 'networkidle' });
await tp.waitForFunction(() => !document.body.innerText.includes('Ładowanie dokumentu'), null, { timeout: 30000 }).catch(() => console.log('pdf wait timeout'));
await tp.waitForTimeout(2500);
await tp.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if (cs.position === 'fixed') { const r = el.getBoundingClientRect(); if (r.width < 90 && r.height < 90) el.style.display = 'none'; } } });
await TS('top');
await tp.mouse.wheel(0, 500); await tp.waitForTimeout(800); await TS('doc');
const decl = tp.locator('input[type=checkbox]').first(); await decl.scrollIntoViewIfNeeded(); await tp.waitForTimeout(500);
await TS('decl');
await decl.check(); await tp.waitForTimeout(400); await TS('decl_checked');
const canvas = tp.locator('canvas').last(); await canvas.scrollIntoViewIfNeeded(); await tp.waitForTimeout(400);
const cb = await canvas.boundingBox(); console.log('canvas', cb);
const pts = []; // podpis „P. Wiśniewski”: pętla P, fala, zawijas, podkreślenie
const path = [[.18,.78],[.17,.5],[.2,.22],[.26,.16],[.31,.24],[.28,.38],[.2,.45],[.24,.46],[.3,.5],[.33,.66],[.36,.6],[.39,.44],[.42,.62],[.45,.46],[.48,.63],[.51,.45],[.54,.62],[.57,.3],[.6,.2],[.61,.35],[.59,.6],[.62,.66],[.66,.5],[.7,.62],[.74,.44],[.78,.6],[.82,.48]];
const tail = [[.2,.86],[.45,.82],[.7,.8],[.84,.76]];
const cr = (arr, steps = 10) => { const out = []; const P = [arr[0], ...arr, arr[arr.length - 1]]; for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < steps; k++) { const t = k / steps, t2 = t * t, t3 = t2 * t; const f = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); out.push([f(P[i-1][0], P[i][0], P[i+1][0], P[i+2][0]), f(P[i-1][1], P[i][1], P[i+1][1], P[i+2][1])]); } out.push(arr[arr.length - 1]); return out; };
const seg = async (arr, every) => { const pts2 = cr(arr); await tp.mouse.move(cb.x + cb.width * pts2[0][0], cb.y + cb.height * pts2[0][1]); await tp.mouse.down(); for (let i = 1; i < pts2.length; i++) { await tp.mouse.move(cb.x + cb.width * pts2[i][0], cb.y + cb.height * pts2[i][1]); if (i % every === 0) await TS('sig'); } await tp.mouse.up(); };
await seg(path, 14); await seg(tail, 15); await TS('sig_done');
await tp.getByRole('button', { name: /Podpisz dokument/ }).click(); await tp.waitForTimeout(4000);
await TS('signed');
await tb.close();
await page.waitForTimeout(4000);
await S('signed_in_modal');
console.log('modal now:', (await page.evaluate(() => [...document.querySelectorAll('[role=dialog]')].map(d => d.innerText).join('\n--\n'))).slice(0, 900));
if (process.argv[2] === 'confirm') {
  await page.getByRole('button', { name: 'Zatwierdź i rozpocznij wizytę' }).click(); await page.waitForTimeout(4000);
  await S('visit');
  console.log('URL', page.url());
}
await browser.close();
