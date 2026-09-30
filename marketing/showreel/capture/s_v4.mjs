import { open } from './lib.mjs';
const { browser, page } = await open({ w: 1600, h: 1000 });
const J = { type: 'jpeg', quality: 93 };
let n = 0; const S = async (tag) => page.shot(`v4/${String(n++).padStart(3, '0')}_${tag}`, J);
const V = '/visits/961b7427-2b06-444f-ba30-0e49f5df1861';
await page.go(V);
await page.waitForFunction(() => [...document.images].some(i => i.alt === 'Porsche' && i.complete), null, { timeout: 15000 }).catch(() => console.log('logo timeout'));
await S('ready_page');
await page.getByRole('button', { name: /Wydaj pojazd/ }).click(); await page.waitForTimeout(1500); await S('release1');
await page.getByText('Pomiń podpis i przejdź do płatności').click(); await page.waitForTimeout(1200);
console.log(await page.evaluate(() => [...document.querySelectorAll('[role=dialog],[role=alertdialog]')].map(d => d.innerText.slice(0, 400)).join('\n--\n')));
const conf = page.getByRole('button', { name: /Pomiń podpis|Tak, pomiń|Pomiń/ });
if (await conf.count() > 0 && !(await page.getByText('Forma zapłaty').count())) { await conf.last().click(); await page.waitForTimeout(1200); }
await S('pay');
await page.getByRole('button', { name: /^Karta$/ }).click().catch(() => {}); await page.waitForTimeout(300);
await page.getByRole('button', { name: /Faktura VAT/ }).click().catch(() => {}); await page.waitForTimeout(1000);
await S('pay_invoice');
console.log(await page.evaluate(() => document.querySelector('[role=dialog]')?.innerText.slice(0, 1200)));
if (process.argv[2] === 'go') {
  const btn = page.getByRole('dialog').getByRole('button', { name: /Wydaj pojazd/ });
  await btn.hover(); await page.waitForTimeout(300); await S('hover');
  await btn.click(); await page.waitForTimeout(4000);
  await S('done_modal');
  await page.go(V);
  await page.waitForFunction(() => [...document.images].some(i => i.alt === 'Porsche' && i.complete), null, { timeout: 15000 }).catch(() => {});
  await S('visit_done');
}
await browser.close();
