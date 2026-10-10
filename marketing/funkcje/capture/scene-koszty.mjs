// Koszty i przychody: Finanse → podsumowanie (przychody, koszty, zysk netto, ostatni
// kwartał), potem Statystyki → Koszta: struktura kosztów wg kategorii i rozkład w czasie.
import { BASE, beat, click, moveTo, release, showCursorAt, wait } from './lib.mjs';
import { seedStudio } from './seed.mjs';
import { TITLE_HOLD, go, scrollToText, up } from './common.mjs';

export default {
    async prepare({ page, studioId }) {
        await seedStudio(page, BASE, studioId, { team: false });
        await go(page, '/statistics/costs', 'Struktura kosztów wg kategorii');   // rozgrzewka widoku
        await go(page, '/finance', 'Podsumowanie finansowe');
        await page.getByTitle('Bieżący miesiąc').first().click().catch(async () => page.getByRole('button', { name: /Bieżący miesiąc/ }).first().click());
        await page.getByRole('button', { name: /^Ostatni kwartał/ }).first().click();
        await page.waitForLoadState('networkidle');
        await wait(page, 1500);
        await showCursorAt(page, 1000, 600);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        const tiles = up(page.getByText('Podsumowanie finansowe').first(), 1);
        await beat(page, rec, 'podsumowanie', tiles);
        await moveTo(page, page.getByText('Przychody', { exact: true }).first(), 900, { dy: -30 });
        await wait(page, 2400);
        await moveTo(page, page.getByText('Zysk', { exact: true }).first(), 900, { dy: -30 });
        await wait(page, 2600);
        release();
        await click(page, page.getByRole('link', { name: 'Statystyki' }).first(), { ms: 900, settle: 1200 });
        await click(page, page.getByRole('link', { name: /Koszta/ }).first(), { ms: 800, settle: 1800 });
        await click(page, page.getByRole('button', { name: /Bieżący miesiąc/ }).first(), { ms: 800, settle: 400 });
        await click(page, page.getByRole('button', { name: /Ostatnie 12 miesięcy/ }).first(), { ms: 700, settle: 1800 });
        await beat(page, rec, 'struktura', up(page.getByText('Struktura kosztów wg kategorii').first(), 2));
        await wait(page, 4800);
        await beat(page, rec, 'czas', up(page.getByText('Rozkład kosztów w czasie').first(), 2));
        await wait(page, 4600);
        release();
        await scrollToText(page, 'Podział według kategorii', 20);
        await beat(page, rec, 'kategorie', up(page.getByText('Kategorie kosztów').first(), 3));
        await wait(page, 4800);
    },
};
