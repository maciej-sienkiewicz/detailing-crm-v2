import { open } from './lib.mjs';
import fs from 'fs';
const { browser, page } = await open({ w: 1600, h: 1000 });
await page.go('/statistics'); await page.waitForTimeout(3000);
const geo = await page.evaluate(() => {
  const R = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
  const st = e => { const c = getComputedStyle(e); return { fs: c.fontSize, fw: c.fontWeight, color: c.color, ff: c.fontFamily, ls: c.letterSpacing, lh: c.lineHeight }; };
  const out = {};
  out.bars = [...document.querySelectorAll('.recharts-bar-rectangle path, .recharts-bar-rectangle rect')].map(p => ({ ...R(p), fill: p.getAttribute('fill'), d: p.getAttribute('d') }));
  const line = document.querySelector('.recharts-line-curve'); out.line = line && { d: line.getAttribute('d'), stroke: line.getAttribute('stroke'), sw: line.getAttribute('stroke-width'), svg: R(line.ownerSVGElement) };
  out.dots = [...document.querySelectorAll('.recharts-line-dots circle, .recharts-line-dot')].map(c => ({ cx: +c.getAttribute('cx'), cy: +c.getAttribute('cy'), r: +c.getAttribute('r'), fill: c.getAttribute('fill'), stroke: c.getAttribute('stroke'), sw: c.getAttribute('stroke-width') }));
  out.sectors = [...document.querySelectorAll('.recharts-pie-sector path')].map(p => ({ d: p.getAttribute('d'), fill: p.getAttribute('fill'), svg: R(p.ownerSVGElement), bb: R(p) }));
  out.chartSvg = line ? R(line.ownerSVGElement) : null;
  const texts = {};
  const want = ['34 367 zł', '23', '1494 zł', '74,2%', '14,1%', '11,7%', '25 497,32 zł', '4846,20 zł', '4023,33 zł'];
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length) continue;
    const t = el.textContent.trim();
    if (want.includes(t)) { (texts[t] ||= []).push({ ...R(el), ...st(el) }); }
  }
  out.texts = texts;
  return out;
});
fs.writeFileSync('stats_geo.json', JSON.stringify(geo, null, 1));
console.log(Object.keys(geo.texts).map(k => k + ':' + geo.texts[k].length).join(' '), 'bars', geo.bars.length, 'dots', geo.dots.length, 'sectors', geo.sectors.length);
console.log(JSON.stringify(geo.bars.slice(-3)), JSON.stringify(geo.chartSvg), JSON.stringify(geo.sectors.map(s=>s.bb)));
await browser.close();
