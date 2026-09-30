import { open } from './lib.mjs';
const { browser, page } = await open({ w: 1600, h: 1000 });
const J = { type: 'jpeg', quality: 93 };
await page.go('/visits/06fa7bfa-cf67-4dca-8f26-9f21bfd395cc'); await page.waitForTimeout(800);
await page.shot('fin/10_ready', J);
await page.getByRole('button', { name: /Wydaj pojazd/ }).click(); await page.waitForTimeout(1200);
await page.shot('fin/11_release1', J);
await page.getByRole('button', { name: /Przejdź do płatności/ }).click(); await page.waitForTimeout(1200);
await page.shot('fin/12_pay', J);
await page.getByRole('button', { name: /^Karta$/ }).click().catch(()=>{}); await page.waitForTimeout(300);
await page.getByRole('button', { name: /Faktura VAT/ }).click().catch(()=>{}); await page.waitForTimeout(800);
await page.shot('fin/13_pay_invoice', J);
console.log(await page.evaluate(() => [...document.querySelectorAll('[role=dialog]')].map(d=>d.innerText.slice(0,2500)).join('\n----\n')));
if (process.argv[2] === 'go') {
  const btn = page.getByRole('dialog').getByRole('button', { name: /Wydaj pojazd/ });
  await btn.hover(); await page.waitForTimeout(300); await page.shot('fin/14_hover', J);
  await btn.click(); await page.waitForTimeout(3500);
  await page.shot('fin/15_done', J);
  console.log('AFTER', await page.evaluate(() => document.body.innerText.slice(0, 600)));
}
await browser.close();
