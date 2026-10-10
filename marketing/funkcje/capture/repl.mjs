// Stała sesja do poznawania ekranów przed napisaniem sceny (nie służy do nagrań).
// node repl.mjs &  → wykonuje kolejne pliki shots/repl/cmd-*.js jako ciało funkcji async
// (page, ctx, demo, lib, seed, db) i zapisuje wynik + zrzut ekranu obok.
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import * as lib from './lib.mjs';
import * as seed from './seed.mjs';
import * as db from './db.mjs';

const DIR = new URL('./shots/repl/', import.meta.url).pathname;
mkdirSync(DIR, { recursive: true });
const demo = await lib.openDemo({ width: 1440, height: 900, dpr: 1 });
const { page, ctx, studioId } = demo;
writeFileSync(`${DIR}studio.txt`, studioId);
console.log('studio', studioId);
const AsyncFn = Object.getPrototypeOf(async () => {}).constructor;
for (;;) {
  const cmds = readdirSync(DIR).filter((f) => /^cmd-.*\.js$/.test(f)).sort();
  for (const f of cmds) {
    const code = readFileSync(DIR + f, 'utf8');
    renameSync(DIR + f, DIR + f.replace(/^cmd-/, 'done-'));
    let out;
    try { out = await new AsyncFn('page', 'ctx', 'demo', 'lib', 'seed', 'db', 'BASE', code)(page, ctx, demo, lib, seed, db, lib.BASE); }
    catch (e) { out = 'BŁĄD: ' + e.message; }
    const name = f.replace(/^cmd-/, '').replace(/\.js$/, '');
    try { await page.screenshot({ path: `${DIR}${name}.png` }); } catch {}
    writeFileSync(`${DIR}${name}.txt`, typeof out === 'string' ? out : JSON.stringify(out, null, 1));
    console.log('wykonano', name);
  }
  await new Promise((r) => setTimeout(r, 300));
  if (existsSync(`${DIR}STOP`)) break;
}
await demo.browser.close();
