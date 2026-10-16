// Składa arkusz schematu pojazdu (768x768) z widoków narysowanych w milimetrach.
//
// Użycie:  node build.mjs <klucz> [<klucz> ...]
//   wejście:  models/<klucz>.svg   (fragment: grupy #side #sideR #sideL #front #rear #top, opcjonalnie <defs>)
//             Prawy bok = side0, sideR0, side, sideR (w tej kolejności, od spodu);
//             lewy bok  = odbicie side0, sideL0, side, sideL. Grupy *0 to warstwy spodnie
//             (np. tarcza hamulca i zębatka, które przykrywa wahacz z warstwy side).
//   wyjście:  out/<klucz>.svg  out/<klucz>.png (768)  out/<klucz>@2x.png (1536)
//
// Układ arkusza (rzut amerykański: widok końca pojazdu stoi po stronie tego końca):
//   [ prawy bok, przód w prawo ]  [ przód ]
//   [ widok z góry, przód w prawo ]
//   [ lewy bok, przód w lewo   ]  [ tył   ]
//
// Wszystkie widoki mają WSPÓLNĄ skalę, więc proporcje między nimi są prawdziwe,
// a widok z góry stoi dokładnie pod prawym bokiem (osie kół w jednej linii).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SIZE = 768;
const MARGIN_X = 26;
const MARGIN_Y = 22;
const GAP_X = 34;      // odstęp między bokiem a widokiem przodu/tyłu
const MIN_GAP_Y = 26;  // minimalny odstęp między rzędami
const OVERHANG = 22;   // o ile linia podłoża wystaje poza pojazd
const TICK = 14;       // o ile znacznik osi schodzi pod podłoże

// Grubości w pikselach arkusza 768 px; w grupach w mm dzielone przez skalę.
const STROKES = { x: 2.6, o: 2.0, d: 1.2, t: 0.8 };
const COLORS = { x: '#1c2026', o: '#1f2329', d: '#3d444d', t: '#8a919b' };

fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });

const keys = process.argv.slice(2);
if (keys.length === 0) {
  console.error('usage: node build.mjs <key> [...]');
  process.exit(1);
}

// CHROMIUM_PATH: gdy zainstalowany Playwright nie ma swojej przeglądarki, a jakiś Chromium jest.
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });

const styleFor = (s) => {
  const sw = (px) => (px / s).toFixed(3);
  return `
  .v :where(path,circle,ellipse,rect,line,polyline,polygon){fill:none;stroke:${COLORS.d};stroke-width:${sw(STROKES.d)};stroke-linejoin:round;stroke-linecap:round}
  .v .x{stroke:${COLORS.x};stroke-width:${sw(STROKES.x)}}
  .v .o{stroke:${COLORS.o};stroke-width:${sw(STROKES.o)}}
  .v .d{stroke:${COLORS.d};stroke-width:${sw(STROKES.d)}}
  .v .t{stroke:${COLORS.t};stroke-width:${sw(STROKES.t)}}
  .v .w{fill:#ffffff}
  .v .g{fill:#e8ebef}
  .v .l{fill:#f3f5f7}
  .v .k{fill:#2a2f36}
  .v .ns{stroke:none}
  .gl{stroke:#b9bfc7;stroke-width:1;fill:none}
  .ax{stroke:#c3c8cf;stroke-width:1;fill:none}`;
};

for (const key of keys) {
  const src = fs.readFileSync(path.join(ROOT, 'models', `${key}.svg`), 'utf8');

  await page.setContent(`<!doctype html><html><body style="margin:0">
    <svg id="m" xmlns="http://www.w3.org/2000/svg" width="4000" height="4000" viewBox="-2000 -2000 4000 4000">
      <style>${styleFor(0.2)}</style><g class="v">${src}</g></svg></body></html>`);

  const info = await page.evaluate(() => {
    const bb = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const b = el.getBBox();
      return { x: b.x, y: b.y, w: b.width, h: b.height };
    };
    const html = (id) => document.getElementById(id)?.innerHTML ?? '';
    const defs = [...document.querySelectorAll('#m > g > defs')].map((d) => d.outerHTML).join('\n');
    const side = document.getElementById('side');
    return {
      side: bb('side'), sideR: bb('sideR'), sideL: bb('sideL'),
      side0: bb('side0'), sideR0: bb('sideR0'), sideL0: bb('sideL0'),
      front: bb('front'), rear: bb('rear'), top: bb('top'),
      axles: side?.dataset.axles ?? '',
      html: {
        side: html('side'), sideR: html('sideR'), sideL: html('sideL'),
        side0: html('side0'), sideR0: html('sideR0'), sideL0: html('sideL0'),
        front: html('front'), rear: html('rear'), top: html('top'),
      },
      defs,
    };
  });

  for (const k of ['side', 'front', 'rear', 'top']) {
    if (!info[k]) throw new Error(`${key}: brak grupy #${k}`);
  }

  const union = (...boxes) => {
    const bs = boxes.filter(Boolean).filter((b) => b.w > 0 || b.h > 0);
    const x0 = Math.min(...bs.map((b) => b.x));
    const y0 = Math.min(...bs.map((b) => b.y));
    const x1 = Math.max(...bs.map((b) => b.x + b.w));
    const y1 = Math.max(...bs.map((b) => b.y + b.h));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  const sideR = union(info.side0, info.sideR0, info.side, info.sideR);
  const sideLraw = union(info.side0, info.sideL0, info.side, info.sideL);
  // Lewy bok to odbicie (side + sideL), przesunięte tak, by stał pod prawym bokiem
  // (ten sam środek). W ramie boku: x' = dL - x.
  const dL = (sideR.x + sideR.w / 2) + (sideLraw.x + sideLraw.w / 2);
  const sideL = { x: dL - (sideLraw.x + sideLraw.w), y: sideLraw.y, w: sideLraw.w, h: sideLraw.h };
  const sideX0 = Math.min(sideR.x, info.top.x, sideL.x);
  const sideX1 = Math.max(sideR.x + sideR.w, info.top.x + info.top.w, sideL.x + sideL.w);
  const colW = Math.max(info.front.w, info.rear.w);

  // Wysokości rzędów w mm (podłoże y = 0, wszystko ponad nim ma y < 0).
  const row1Up = Math.max(-sideR.y, -info.front.y);
  const row3Up = Math.max(-sideL.y, -info.rear.y);
  const row1Down = Math.max(0, sideR.y + sideR.h, info.front.y + info.front.h);
  const row3Down = Math.max(0, sideL.y + sideL.h, info.rear.y + info.rear.h);
  const topH = info.top.h;

  const sW = (SIZE - 2 * MARGIN_X - GAP_X - 2 * OVERHANG) / (sideX1 - sideX0 + colW);
  const usableH = SIZE - 2 * MARGIN_Y - 2 * MIN_GAP_Y - 2 * TICK;
  const sH = usableH / (row1Up + row1Down + topH + row3Up + row3Down);
  const s = Math.min(sW, sH);

  // Poziomo: blok [boki | kolumna przód/tył] wyśrodkowany.
  const blockW = (sideX1 - sideX0) * s + GAP_X + colW * s;
  const left = (SIZE - blockW) / 2;
  const tx = left - sideX0 * s;                 // przesunięcie dla widoków w ramie boku
  const colCx = left + (sideX1 - sideX0) * s + GAP_X + (colW * s) / 2;

  // Pionowo: rzędy rozłożone równo w pozostałym miejscu.
  const contentH = (row1Up + row1Down + topH + row3Up + row3Down) * s + 2 * TICK;
  const gapY = (SIZE - 2 * MARGIN_Y - contentH) / 2;
  const g1 = MARGIN_Y + row1Up * s;                         // podłoże rzędu 1
  const topCy = g1 + row1Down * s + TICK + gapY - info.top.y * s;
  const g3 = topCy + (info.top.y + info.top.h) * s + gapY + row3Up * s;

  const axles = info.axles
    .split(';').map((p) => p.trim()).filter(Boolean)
    .map((p) => p.split(',').map(Number));

  const f = (n) => n.toFixed(2);
  const guides = [];
  const overlay = [];
  // Linie podłoża boków.
  guides.push(`<line class="gl" x1="${f(tx + sideR.x * s - OVERHANG)}" y1="${f(g1)}" x2="${f(tx + (sideR.x + sideR.w) * s + OVERHANG)}" y2="${f(g1)}"/>`);
  guides.push(`<line class="gl" x1="${f(tx + sideL.x * s - OVERHANG)}" y1="${f(g3)}" x2="${f(tx + (sideL.x + sideL.w) * s + OVERHANG)}" y2="${f(g3)}"/>`);
  // Linie podłoża przodu i tyłu.
  for (const [box, g] of [[info.front, g1], [info.rear, g3]]) {
    const half = Math.max(-box.x, box.x + box.w) * s;
    guides.push(`<line class="gl" x1="${f(colCx - half - OVERHANG)}" y1="${f(g)}" x2="${f(colCx + half + OVERHANG)}" y2="${f(g)}"/>`);
    overlay.push(`<line class="ax" x1="${f(colCx)}" y1="${f(g + box.y * s - TICK)}" x2="${f(colCx)}" y2="${f(g + TICK)}"/>`);
  }
  // Osie kół na bokach.
  for (const [ax, ay] of axles) {
    overlay.push(`<line class="ax" x1="${f(tx + ax * s)}" y1="${f(g1 + ay * s)}" x2="${f(tx + ax * s)}" y2="${f(g1 + TICK)}"/>`);
    overlay.push(`<line class="ax" x1="${f(tx + (dL - ax) * s)}" y1="${f(g3 + ay * s)}" x2="${f(tx + (dL - ax) * s)}" y2="${f(g3 + TICK)}"/>`);
  }
  // Oś symetrii widoku z góry.
  overlay.push(`<line class="ax" x1="${f(tx + info.top.x * s - TICK)}" y1="${f(topCy)}" x2="${f(tx + (info.top.x + info.top.w) * s + TICK)}" y2="${f(topCy)}"/>`);

  const t = (x, y, sx = s) => `translate(${f(x)} ${f(y)}) scale(${sx.toFixed(5)} ${s.toFixed(5)})`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}">
<style>${styleFor(s)}
</style>
<rect width="${SIZE}" height="${SIZE}" fill="#ffffff"/>
<g class="guides">${guides.join('')}</g>
<g class="v">
${info.defs}
<g data-view="right" transform="${t(tx, g1)}">${info.html.side0}${info.html.sideR0}${info.html.side}${info.html.sideR}</g>
<g data-view="top" transform="${t(tx, topCy)}">${info.html.top}</g>
<g data-view="left" transform="${t(tx + dL * s, g3, -s)}">${info.html.side0}${info.html.sideL0}${info.html.side}${info.html.sideL}</g>
<g data-view="front" transform="${t(colCx, g1)}">${info.html.front}</g>
<g data-view="rear" transform="${t(colCx, g3)}">${info.html.rear}</g>
</g>
<g class="overlay">${overlay.join('')}</g>
</svg>
`;
  fs.writeFileSync(path.join(ROOT, 'out', `${key}.svg`), svg);

  for (const [scale, suffix] of [[1, ''], [2, '@2x']]) {
    await page.setViewportSize({ width: SIZE * scale, height: SIZE * scale });
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff">
      ${svg.replace(`width="${SIZE}" height="${SIZE}"`, `width="${SIZE * scale}" height="${SIZE * scale}"`)}</body></html>`);
    await page.screenshot({ path: path.join(ROOT, 'out', `${key}${suffix}.png`), clip: { x: 0, y: 0, width: SIZE * scale, height: SIZE * scale } });
  }
  // Powiększone wycinki poszczególnych widoków (z ostatniego renderu 2x) do oględzin.
  const views = {
    right: { x: tx + sideR.x * s, y: g1 + sideR.y * s, w: sideR.w * s, h: sideR.h * s },
    left: { x: tx + sideL.x * s, y: g3 + sideL.y * s, w: sideL.w * s, h: sideL.h * s },
    top: { x: tx + info.top.x * s, y: topCy + info.top.y * s, w: info.top.w * s, h: info.top.h * s },
    front: { x: colCx + info.front.x * s, y: g1 + info.front.y * s, w: info.front.w * s, h: info.front.h * s },
    rear: { x: colCx + info.rear.x * s, y: g3 + info.rear.y * s, w: info.rear.w * s, h: info.rear.h * s },
  };
  for (const [name, r] of Object.entries(views)) {
    const pad = 8;
    await page.screenshot({
      path: path.join(ROOT, 'out', `${key}-${name}.png`),
      clip: { x: (r.x - pad) * 2, y: (r.y - pad) * 2, width: (r.w + 2 * pad) * 2, height: (r.h + 2 * pad) * 2 },
    });
  }
  console.log(`${key}: scale=${s.toFixed(4)} px/mm (limited by ${sW < sH ? 'width' : 'height'})`);
}

await browser.close();
