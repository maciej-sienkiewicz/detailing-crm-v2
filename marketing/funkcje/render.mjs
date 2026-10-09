// Render samouczka klatka po klatce: Chromium (playwright-core) → JPEG → ffmpeg (libx264).
//
//   node render.mjs audit                         czytelność napisów (kod wyjścia 1, gdy coś za krótko)
//   node render.mjs timeline                      czasy scen w filmie → timeline.md (pod nagranie lektora)
//   node render.mjs stills <sceny|all> t1,t2,…    podgląd klatek do ./stills
//   node render.mjs video <plik.mp4> [--scene a,b] [--fps 60] [--jobs 4] [--crf 16]
//   node render.mjs clips [--fps 60] [--jobs 4]   każda scena renderowana osobno → ./out/NN_id.mp4
//   node render.mjs cut <film.mp4>                 klipy scen wycięte z gotowego filmu → ./out/klipy/NN_id.mp4
//   node render.mjs napisy                        napisy z czasami → napisy.md (ściąga pod nagranie lektora)
//
// Zmienne: PLAYWRIGHT_CORE (ścieżka do pakietu, gdy nie ma go w node_modules),
//          CHROME (domyślnie Chromium z /opt/pw-browsers), FFMPEG (domyślnie „ffmpeg”).
import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');                // serwujemy marketing/, bo zasoby są w ../showreel/a
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ? pathToFileURL(path.join(process.env.PLAYWRIGHT_CORE, 'index.mjs')).href : 'playwright-core');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

const args = process.argv.slice(2);
const mode = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };

// statyczny serwer na losowym porcie
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/funkcje/index.html`;

async function open(browser, scene) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('pageerror:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
  await page.goto(`${BASE}?render=1${scene ? '&scene=' + scene : ''}`, { waitUntil: 'load' });
  await page.evaluate(() => window.ready);
  return page;
}
const launch = () => chromium.launch({ executablePath: CHROME, args: ['--force-color-profile=srgb', '--hide-scrollbars', '--disable-gpu-vsync', '--font-render-hinting=none'] });

async function renderRange(scene, fps, n0, n1, out, crf, tag) {
  const browser = await launch();
  const page = await open(browser, scene);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let n = n0; n < n1; n++) {
    await page.evaluate(t => window.seek(t), n / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((n - n0) % 300 === 0) console.log(`${tag} klatka ${n - n0}/${n1 - n0}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await browser.close();
}

async function video(out, scene, fps, jobs, crf) {
  const b = await launch(); const p = await open(b, scene);
  const dur = await p.evaluate(() => window.duration); await b.close();
  const N = Math.round(dur * fps), per = Math.ceil(N / jobs);
  const tmp = fs.mkdtempSync(path.join(path.dirname(path.resolve(out)), '.parts-'));
  const parts = [];
  await Promise.all(Array.from({ length: jobs }, (_, j) => {
    const n0 = j * per, n1 = Math.min(N, n0 + per);
    if (n0 >= n1) return null;
    const f = path.join(tmp, `p${j}.mp4`); parts.push([j, f]);
    return renderRange(scene, fps, n0, n1, f, crf, `[${path.basename(out)} ${j + 1}/${jobs}]`);
  }));
  parts.sort((a, b) => a[0] - b[0]);
  fs.writeFileSync(path.join(tmp, 'list.txt'), parts.map(([, f]) => `file '${f}'`).join('\n'));
  await new Promise(r => spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', '-movflags', '+faststart', out], { stdio: 'inherit' }).on('close', r));
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('gotowe:', out, dur.toFixed(2) + ' s');
}

const fmtT = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const browser0 = ['audit', 'timeline', 'stills', 'napisy', 'cut'].includes(mode) ? await launch() : null;
if (mode === 'audit') {
  const page = await open(browser0);
  const rows = await page.evaluate(() => window.audit());
  const bad = rows.filter(r => !r.ok);
  for (const r of rows) console.log(`${r.ok ? '  ok ' : ' ZA KRÓTKO'}  ${r.scene.padEnd(10)} ${String(r.have).padStart(5)} s / ${String(r.need).padStart(5)} s  ${r.text.slice(0, 70)}`);
  console.log(`\n${rows.length} napisów, za krótko: ${bad.length}`);
  process.exitCode = bad.length ? 1 : 0;
} else if (mode === 'timeline') {
  const page = await open(browser0);
  const tlist = await page.evaluate(() => window.timeline);
  const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  const md = ['| # | Scena | Start | Koniec | Długość |', '|---|---|---|---|---|', ...tlist.map((e, i) => `| ${String(i + 1).padStart(2, '0')} | ${e.title} (\`${e.id}\`) | ${fmt(e.start)} | ${fmt(e.start + e.dur)} | ${e.dur.toFixed(1)} s |`)].join('\n');
  fs.writeFileSync(path.join(HERE, 'timeline.md'), md + '\n');
  console.log(md);
} else if (mode === 'stills') {
  const scene = args[1] === 'all' ? null : args[1];
  const page = await open(browser0, scene);
  fs.mkdirSync(path.join(HERE, 'stills'), { recursive: true });
  for (const t of args[2].split(',').map(Number)) {
    await page.evaluate(t => window.seek(t), t);
    await page.screenshot({ path: path.join(HERE, 'stills', `${scene || 'film'}_${t.toFixed(2).padStart(6, '0')}.jpg`), type: 'jpeg', quality: 85 });
  }
} else if (mode === 'napisy') {
  const page = await open(browser0);
  const [rows, tlist] = await page.evaluate(() => [window.audit(), window.timeline]);
  const out = ['# Napisy na ekranie', '', 'Czasy w filmie `detailboost_funkcje.mp4` (od – do: tekst stoi w pełni widoczny). Lektor powinien mówić o tym samym w tym oknie czasu.', ''];
  for (const e of tlist) {
    out.push(`## ${e.title} — ${fmtT(e.start)}–${fmtT(e.start + e.dur)}`, '');
    for (const r of rows.filter(r => r.scene === e.id)) out.push(`- ${fmtT(r.at)}–${fmtT(r.until)}  ${r.text}`);
    out.push('');
  }
  fs.writeFileSync(path.join(HERE, 'napisy.md'), out.join('\n'));
  console.log('napisy.md:', rows.length, 'napisów');
} else if (mode === 'cut') {
  const page = await open(browser0);
  const tlist = await page.evaluate(() => window.timeline);
  const dir = path.join(HERE, 'out', 'klipy'); fs.mkdirSync(dir, { recursive: true });
  for (const [i, e] of tlist.entries()) {
    const f = path.join(dir, `${String(i + 1).padStart(2, '0')}_${e.id}.mp4`);
    await new Promise(r => spawn(FFMPEG, ['-y', '-loglevel', 'error', '-ss', String(e.start), '-i', args[1], '-t', String(e.dur), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f], { stdio: 'inherit' }).on('close', r));
    console.log(f);
  }
} else if (mode === 'video') {
  await video(args[1], opt('scene', null), +opt('fps', 60), +opt('jobs', 4), +opt('crf', 16));
} else if (mode === 'clips') {
  const b = await launch(); const p = await open(b);
  const tlist = await p.evaluate(() => window.timeline); await b.close();
  fs.mkdirSync(path.join(HERE, 'out'), { recursive: true });
  const only = opt('only', null)?.split(',');
  for (const [i, e] of tlist.entries()) {
    if (only && !only.includes(e.id)) continue;
    await video(path.join(HERE, 'out', `${String(i + 1).padStart(2, '0')}_${e.id}.mp4`), e.id, +opt('fps', 60), +opt('jobs', 4), +opt('crf', 16));
  }
} else {
  console.log('tryby: audit | timeline | stills | video | clips');
}
if (browser0) await browser0.close();
server.close();
