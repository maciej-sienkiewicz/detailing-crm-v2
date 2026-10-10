// Ukryj ze statystyk: wykup auta po leasingu zawyża koszty miesiąca (Statystyki → Koszta),
// w Finansach faktura dostaje „Ukryj ze statystyk” i znaczek „Ukryta”, koszty wracają do normy.
import { BASE, beat, click, moveTo, release, showCursorAt, wait } from './lib.mjs';
import { seedStudio, insertLeaseBuyout } from './seed.mjs';
import { TITLE_HOLD, go, up } from './common.mjs';

export default {
    async prepare({ page, studioId }) {
        const out = await seedStudio(page, BASE, studioId, { team: false });
        insertLeaseBuyout(studioId, out.costs.buyer);
        await page.request.post(`${BASE}/api/v1/cost-categories/auto-rules/apply`, { data: {} });
        await go(page, '/finance?tab=expenses', 'Dokumenty kosztowe');   // rozgrzewka
        await go(page, '/statistics/costs', 'Struktura kosztów wg kategorii');
        await showCursorAt(page, 1000, 600);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        await beat(page, rec, 'zawyzone', up(page.getByText('Przegląd kosztów').first(), 1));
        await moveTo(page, page.getByText('Łączny koszt brutto').first(), 900, { dy: 30 });
        await wait(page, 4600);
        release();
        await click(page, page.getByRole('link', { name: 'Finanse' }).first(), { ms: 900, settle: 1200 });
        await click(page, page.getByRole('button', { name: 'Dokumenty kosztowe' }).first(), { ms: 800, settle: 1400 });
        const row = page.locator('tr', { has: page.getByText('AL/2026/WYKUP/0012') }).first();
        await row.waitFor({ timeout: 15000 });
        await beat(page, rec, 'wykup', row);
        await moveTo(page, row.getByText('AL/2026/WYKUP/0012'), 800, { dx: 140 });
        await wait(page, 3800);
        await click(page, row.getByTitle('Ukryj ze statystyk'), { ms: 900, settle: 1500 });
        await page.getByRole('button', { name: 'Ukryte', exact: true }).first().click().catch(() => {});
        await wait(page, 1200);
        const hidden = page.locator('tr', { has: page.getByText('AL/2026/WYKUP/0012') }).first();
        await beat(page, rec, 'ukryta', hidden);
        await wait(page, 4800);
        release();
        await click(page, page.getByRole('link', { name: 'Statystyki' }).first(), { ms: 900, settle: 1200 });
        await click(page, page.getByRole('link', { name: /Koszta/ }).first(), { ms: 800, settle: 1800 });
        await beat(page, rec, 'po', up(page.getByText('Przegląd kosztów').first(), 1));
        await moveTo(page, page.getByText('Łączny koszt brutto').first(), 900, { dy: 30 });
        await wait(page, 5200);
    },
};
