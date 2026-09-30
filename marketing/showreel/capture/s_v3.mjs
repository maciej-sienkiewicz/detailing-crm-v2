import { open } from './lib.mjs';
const { browser, page } = await open({ w: 1600, h: 1000 });
const J = { type: 'jpeg', quality: 93 };
let n = 0; const S = async (tag) => page.shot(`v3/${String(n++).padStart(3, '0')}_${tag}`, J);
const V = '/visits/961b7427-2b06-444f-ba30-0e49f5df1861';
await page.go(V);
for (const e of await page.locator('[aria-label^="Zrobione"]').all()) { if (await e.getAttribute('aria-pressed') === 'true' || (await page.getByText(/^Zrobione,/).count())) { await e.click(); await page.waitForTimeout(900); } }
await page.go(V);
await page.waitForFunction(() => [...document.images].some(i => i.alt === 'Porsche' && i.complete), null, { timeout: 15000 }).catch(() => console.log('logo timeout'));
await page.waitForTimeout(800);
console.log('done labels', await page.getByText(/^Zrobione,/).count());
await S('visit');
for (const e of await page.locator('[aria-label^="Zrobione"]').all()) { await e.hover(); await page.waitForTimeout(300); await S('hover'); await e.click(); await page.waitForTimeout(1200); await S('tick'); }
await page.mouse.move(10, 10); await page.waitForTimeout(400); await S('all_done');
if (process.argv[2] === 'release') {
  await page.getByRole('button', { name: /Oznacz jako gotowe/ }).click(); await page.waitForTimeout(1500); await S('ready_modal');
  await page.getByRole('button', { name: /Powiadom i oznacz jako gotowe|Oznacz jako gotowe/ }).last().click(); await page.waitForTimeout(2500);
  await page.go(V); await S('ready_page');
  await page.getByRole('button', { name: /Wydaj pojazd/ }).click(); await page.waitForTimeout(1500); await S('release1');
  console.log(await page.evaluate(() => document.querySelector('[role=dialog]')?.innerText.slice(0, 800)));
}
await browser.close();
