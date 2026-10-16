// Eksport gotowych arkuszy do aplikacji.
//
// Użycie:  node export.mjs <katalog public/assets frontu> <katalog images/vehicle backendu> <klucz> [...]
//
//   front:   <klucz>.webp  1536x1536 - edytor ma do 800 px szerokości CSS, więc na ekranie
//            o gęstości 2x potrzebuje ~1600 px, żeby kreska nie była rozmyta;
//   backend: <klucz>.png    768x768  - generator raportu PDF rysuje znaczniki o stałej
//            średnicy 30 px, dobranej do rysunków 768 px (tak jak przy samochodach).
//
// To ten sam rysunek w dwóch rozdzielczościach: punkty mapy są procentami obrazka.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const [frontDir, backDir, ...keys] = process.argv.slice(2);
if (!frontDir || !backDir || keys.length === 0) {
  console.error('usage: node export.mjs <frontAssetsDir> <backendVehicleDir> <key> [...]');
  process.exit(1);
}

// CHROMIUM_PATH: gdy zainstalowany Playwright nie ma swojej przeglądarki, a jakiś Chromium jest.
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();

for (const key of keys) {
  const svg = fs.readFileSync(path.join(ROOT, 'out', `${key}.svg`), 'utf8');
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  const webp = await page.evaluate(async ({ src, size }) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    return canvas.toDataURL('image/webp', 0.85);
  }, { src: dataUrl, size: 1536 });
  if (!webp.startsWith('data:image/webp')) throw new Error(`${key}: przeglądarka nie zakodowała WebP`);
  fs.writeFileSync(path.join(frontDir, `${key}.webp`), Buffer.from(webp.split(',')[1], 'base64'));

  await page.setViewportSize({ width: 768, height: 768 });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff">${svg}</body></html>`);
  await page.screenshot({ path: path.join(backDir, `${key}.png`), clip: { x: 0, y: 0, width: 768, height: 768 } });
  console.log(`${key}: ok`);
}

await browser.close();
