import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
for (const n of ['protokol_przyjecia_pojazdu', 'protokol_wydania_pojazdu', 'zgody_marketingowe', 'oswiadczenie_rodo']) {
  await page.goto('file://' + process.cwd() + '/tpl/' + n + '.html'); await page.waitForTimeout(800);
  await page.screenshot({ path: `shots/tpl/${n}.png` });
  console.log(n, await page.evaluate(() => [document.title, document.body.scrollHeight]));
}
await browser.close();
