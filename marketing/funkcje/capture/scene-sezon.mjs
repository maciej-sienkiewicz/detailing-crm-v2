// Sezonowość: wykres „Przychody i wizyty” z ostatnich 3 miesięcy (tygodniowo), potem
// zakres 12 miesięcy — CRM sam grupuje miesięcznie i widać szczyt sezonu. Najechanie
// na słupki pokazuje kwotę i liczbę wizyt miesiąca.
import { BASE, beat, click, moveTo, release, showCursorAt, wait } from './lib.mjs';
import { seedStudio } from './seed.mjs';
import { TITLE_HOLD, go, up } from './common.mjs';

const chart = (page) => up(page.getByText('Przychody i wizyty').first(), 2);

/** Najechanie na słupek miesiąca (0 = najstarszy) — Recharts pokazuje wtedy kwotę i liczbę wizyt. */
async function hoverMonth(page, index) {
    await moveTo(page, page.locator('.recharts-bar-rectangle').nth(index), 900);
}

export default {
    async prepare({ page, studioId }) {
        await seedStudio(page, BASE, studioId, { team: false });
        await go(page, '/statistics', 'Przychody i wizyty');
        await showCursorAt(page, 1000, 600);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        await beat(page, rec, 'tygodnie', chart(page));
        await wait(page, 3600);
        release();
        await click(page, page.getByRole('button', { name: /Ostatnie 3 miesiące/ }).first(), { ms: 900, settle: 500 });
        await beat(page, rec, 'zakres', null);
        await click(page, page.getByRole('button', { name: /Ostatnie 12 miesięcy/ }).first(), { ms: 800, settle: 1800, end: true });
        await beat(page, rec, 'rok', chart(page));
        await wait(page, 3000);
        await hoverMonth(page, 7);   // maj 2026
        await beat(page, rec, 'szczyt', chart(page));
        await wait(page, 4800);
        await hoverMonth(page, 3);   // styczeń 2026
        await beat(page, rec, 'dolek', chart(page));
        await wait(page, 4800);
    },
};
