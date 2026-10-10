// Finał filmu: Tablica prawdziwego CRM na trzech urządzeniach (zrzuty, nie nagranie).
//   node shots-final.mjs  → ../rec/final/{laptop,tablet,telefon}.png
import { mkdirSync } from 'node:fs';
import { BASE, newContext, openDemo, wait } from './lib.mjs';
import { seedStudio } from './seed.mjs';

const OUT = new URL('../rec/final/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const demo = await openDemo({ width: 1440, height: 900, dpr: 1.5 });
try {
    await seedStudio(demo.page, BASE, demo.studioId, { costs: true, team: true, history: true });
    const cookies = await demo.ctx.cookies();
    const shots = [['laptop', 1440, 900], ['tablet', 820, 1180], ['telefon', 390, 844]];
    for (const [name, width, height] of shots) {
        const ctx = name === 'laptop' ? demo.ctx : await newContext(demo.browser, { width, height, dpr: 2 });
        if (name !== 'laptop') await ctx.addCookies(cookies);
        const page = name === 'laptop' ? demo.page : await ctx.newPage();
        await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
        await page.getByText('Najbliższe wizyty').first().waitFor({ timeout: 30000 });
        await wait(page, 2500);
        await page.screenshot({ path: `${OUT}${name}.png` });
        console.log(name, 'ok');
    }
} finally {
    await demo.browser.close();
}
