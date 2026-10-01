import { chromium } from 'playwright-core';
export const B = 'http://localhost:5173';
export async function open({ w = 1600, h = 1000, dpr = 2, mobile = false } = {}) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ storageState: 'state.json', viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, locale: 'pl-PL', timezoneId: 'Europe/Warsaw' });
  const page = await ctx.newPage();
  const hide = async () => page.addStyleTag({ content: `[data-hide-for-reel]{display:none!important}` }).catch(() => {});
  page.on('load', hide);
  page.shot = async (name, opts = {}) => {
    await page.evaluate(() => {
      // pływający przełącznik PIN w prawym dolnym rogu — nie należy do kadru
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed') { const r = el.getBoundingClientRect(); if (r.width < 90 && r.height < 90 && r.right > innerWidth - 120 && r.bottom > innerHeight - 120) el.style.display = 'none'; }
      }
    });
    await page.screenshot({ path: `shots/${name}.${opts.type === "jpeg" ? "jpg" : "png"}`, ...opts });
    console.log('shot', name);
  };
  page.go = async (p) => { await page.goto(B + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500); };
  return { browser, ctx, page };
}
