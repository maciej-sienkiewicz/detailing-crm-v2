import { open } from './lib.mjs';
const { browser, page } = await open({ w: 1600, h: 1000 });
await page.go('/finance'); await page.waitForTimeout(1500);
await page.shot('finance_after');
await page.go('/dashboard'); await page.waitForTimeout(1500);
await page.shot('dashboard_after');
await page.go('/statistics'); await page.waitForTimeout(2500);
await page.shot('statistics_after');
await browser.close();
