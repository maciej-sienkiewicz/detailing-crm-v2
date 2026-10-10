// Dokumenty spoza KSeF: „Dodaj dokument kosztowy” → Paragon → czego dotyczy, sprzedawca,
// kwota brutto z paragonu (netto liczy formularz), zapis — paragon stoi na liście obok faktur z KSeF.
import { BASE, beat, click, moveTo, release, showCursorAt, type, wait } from './lib.mjs';
import { seedStudio } from './seed.mjs';
import { TITLE_HOLD, go, up, panel } from './common.mjs';

export default {
    async prepare({ page, studioId }) {
        await seedStudio(page, BASE, studioId, { team: false });
        await go(page, '/finance?tab=expenses', 'Dokumenty kosztowe');
        await showCursorAt(page, 1000, 640);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        await click(page, page.getByTitle('Dodaj dokument kosztowy').first(), { ms: 900, settle: 900 });
        const d = page.getByRole('dialog').first();
        await beat(page, rec, 'okno', await panel(page, 'Dodaj dokument kosztowy'));
        await wait(page, 2600);
        await click(page, d.getByRole('button', { name: 'Paragon', exact: true }), { ms: 800, settle: 600 });
        await click(page, d.getByPlaceholder('np. paliwo, drobne zakupy'), { ms: 700, settle: 200 });
        await type(page, 'Mikrofibry i pady polerskie', 45);
        await click(page, d.locator('input').nth(2), { ms: 700, settle: 200 });
        await type(page, 'PAR 118/10/2026', 45);
        await click(page, d.locator('input[placeholder="0.00"]').nth(1), { ms: 800, settle: 200 });
        await type(page, '1230', 120);
        await wait(page, 600);
        await beat(page, rec, 'kwota', up(d.getByText('Kwota brutto').first(), 2));
        await moveTo(page, d.locator('input[placeholder="0.00"]').nth(0), 800);
        await wait(page, 4200);
        release();
        await click(page, d.getByRole('button', { name: 'Sprzedawca', exact: true }), { ms: 800, settle: 500 });
        await click(page, d.getByPlaceholder('Firma Sp. z o.o.'), { ms: 700, settle: 200 });
        await type(page, 'Sklep Detailingowy Pro', 45);
        await wait(page, 500);
        await click(page, d.getByRole('button', { name: 'Zapisz dokument' }), { ms: 900, settle: 1800, end: true });
        const row = page.locator('tr', { has: page.getByText('Sklep Detailingowy Pro') }).first();
        await row.waitFor({ timeout: 15000 });
        await beat(page, rec, 'zapisany', row);
        await moveTo(page, row, 800, { dx: 200 });
        await wait(page, 5200);
    },
};
