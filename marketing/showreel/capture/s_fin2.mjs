import { open } from './lib.mjs';
const { browser, page } = await open({ w: 1600, h: 1000 });
await page.go('/finance'); await page.shot('finance2', { type: 'jpeg', quality: 93 });
await page.go('/settings?tab=documents'); await page.shot('docs2', { type: 'jpeg', quality: 93 });
await browser.close();
