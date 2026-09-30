import { open } from './lib.mjs';
const { browser, page } = await open({ w: 1600, h: 1000 });
await page.go('/statistics'); await page.waitForTimeout(3000);
await page.evaluate(() => {
  const hide = e => e && (e.style.visibility = 'hidden');
  document.querySelectorAll('.recharts-bar-rectangle, .recharts-line, .recharts-line-dots, .recharts-active-dot').forEach(hide);
  const donut = document.querySelector('svg[aria-label="Udział kategorii w przychodach"]'); donut.querySelectorAll('path, text').forEach(hide);
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length) continue;
    const t = el.textContent.replace(/\s+/g, ' ').trim(); const r = el.getBoundingClientRect();
    if (r.y < 700 && /^(34 367 zł|23|1494 zł|25 497,32 zł|4846,20 zł|4023,33 zł|74,2%|14,1%|11,7%)$/.test(t)) hide(el);
  }
});
await page.waitForTimeout(300);
await page.shot('stats_plate');
await browser.close();
