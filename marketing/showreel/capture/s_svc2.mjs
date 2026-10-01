import { open } from './lib.mjs';
const { browser, page } = await open({ w: 1366, h: 1024 });
const J = { type: 'jpeg', quality: 93 };
await page.go('/settings');
await page.getByText('Cennik usług').first().click();
await page.waitForTimeout(1500);
await page.shot('svc/00_list', J);
const row = page.locator('tr, [role=row], div').filter({ hasText: /^Powłoka ceramiczna IGL Eclipse/ }).last();
// kebab w wierszu IGL: szukamy przycisku najbliżej w pionie
const t = await page.locator('text=Powłoka ceramiczna IGL Eclipse').first().boundingBox();
const btns = await page.locator('button').all();
let best, bd = 1e9;
for (const b of btns) { const bb = await b.boundingBox(); if (!bb || bb.x < 1200) continue; const d = Math.abs(bb.y + bb.height/2 - (t.y + 20)); if (d < bd) { bd = d; best = b; } }
await best.click(); await page.waitForTimeout(600);
await page.shot('svc/01_menu', J);
const items = await page.evaluate(() => [...document.querySelectorAll('[role=menuitem], [role=menu] button, button')].map(b => b.innerText.trim()).filter(x => x && x.length < 40));
console.log(items.slice(-12));
await page.getByText(/^Edytuj/).first().click(); await page.waitForTimeout(900);
await page.shot('svc/02_modal', J);
const gross = page.getByPlaceholder('np. 615,00');
await gross.click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); await page.waitForTimeout(200);
await page.shot('svc/03_clear', J);
let i = 4;
for (const ch of '2490') { await page.keyboard.type(ch); await page.waitForTimeout(250); await page.shot('svc/0' + (i++) + '_type', J); }
await page.keyboard.press('Tab'); await page.waitForTimeout(300);
await page.shot('svc/08_blur', J);
await page.locator('button[type=submit]').click(); await page.waitForTimeout(1200);
await page.shot('svc/09_saved', J);
await browser.close();
