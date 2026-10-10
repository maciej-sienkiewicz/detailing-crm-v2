// Nagranie jednej sceny samouczka w prawdziwym CRM:
//   konto demo → przygotowanie (poza nagraniem) → nagranie → ../rec/<scena>/f/*.jpg + meta.json
//
//   node run.mjs grupy
//
// meta.json: klatki z czasem od początku przebiegu (Chrome wysyła klatkę tylko przy
// zmianie obrazu, więc klatka trwa do następnej) i znaczniki kroków z obszarem kadru
// w % — z nich film bierze podpisy, złotą ramkę i przybliżenie kamery.
import { mkdirSync, writeFileSync } from 'node:fs';
import { openDemo } from './lib.mjs';
import { startRecording } from './recorder.mjs';

const name = process.argv[2];
const scene = (await import(`./scene-${name}.mjs`)).default;
const OUT = new URL(`../rec/${name}/`, import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const demo = await openDemo(scene.viewport ?? { width: 1440, height: 900, dpr: 1.5 });
try {
    // prepare może zwrócić kartę, od której zaczyna się nagranie (np. telefon pracownika
    // w osobnym kontekście), i dodatkowe rzeczy dla play.
    const prep = (await scene.prepare(demo)) ?? {};
    const start = prep.start ?? demo.page;
    const device = prep.device ?? scene.device;
    if (device) start.__device = device;
    const rec = await startRecording(start, `${OUT}f`, { device: device ?? 'screen' });
    try {
        await scene.play({ ...demo, ...prep, rec });
    } catch (e) {
        // Po awarii: ostatni krok i zrzuty wszystkich kart - inaczej zostaje sam „Timeout”.
        console.error(`[${name}] błąd po kroku „${rec.marks.at(-1)?.id ?? '(przed pierwszym)'}”: ${e.message.split('\n')[0]}`);
        for (const [i, p] of demo.browser.contexts().flatMap((c) => c.pages()).entries()) await p.screenshot({ path: `${OUT}blad-${i}.png` }).catch(() => {});
        throw e;
    }
    const res = await rec.stop();
    const vp = demo.page.viewportSize();   // kadr filmu = ekran właściciela (urządzenia składa recorder)
    writeFileSync(`${OUT}meta.json`, JSON.stringify({ name, vp, dur: +res.end.toFixed(3), frames: res.frames, marks: rec.marks }, null, 1));
    console.log(`[${name}] klatek: ${res.count}, ${res.end.toFixed(1)} s, kroków: ${rec.marks.length}`);
} finally {
    await demo.browser.close();
}
