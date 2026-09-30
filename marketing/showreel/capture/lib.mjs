import { chromium } from 'playwright-core';
import { execSync } from 'child_process';
import fs from 'fs';
// Chromium nie ma tu wyjścia do internetu, a loga marek aplikacja bierze z jsDelivr —
// bez tego front pokazuje zastępczą ikonę. Pobieramy plik curlem (przez proxy) i podajemy.
export async function routeCdn(ctx) {
  await ctx.route('https://cdn.jsdelivr.net/**', async route => {
    const url = route.request().url();
    const f = 'cdn/' + url.split('/').pop().split('?')[0];
    if (!fs.existsSync(f)) { try { execSync(`curl -sSf -o ${f} '${url}'`); } catch { return route.fulfill({ status: 404, body: '' }); } }
    await route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=31536000' }, contentType: f.endsWith('.svg') ? 'image/svg+xml' : 'image/png', body: fs.readFileSync(f) });
  });
}
export const B = 'http://localhost:5173';
export async function open({ w = 1600, h = 1000, dpr = 2, mobile = false } = {}) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ storageState: 'state.json', viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, locale: 'pl-PL', timezoneId: 'Europe/Warsaw', serviceWorkers: 'block' });
  await routeCdn(ctx);
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
  page.go = async (p) => { await page.goto(B + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(3500); };
  return { browser, ctx, page };
}
