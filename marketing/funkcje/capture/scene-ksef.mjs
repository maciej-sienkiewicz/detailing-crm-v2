// Faktury kosztowe z KSeF: lista dokumentów kosztowych, synchronizacja dokłada nowe
// faktury (wpisujemy je tam, gdzie zapisuje je pobranie z KSeF, i stosujemy reguły
// kategorii jak FetchKsefInvoicesHandler), potem „Oznacz jako opłaconą”.
import { BASE, beat, click, moveTo, release, showCursorAt, wait } from './lib.mjs';
import { seedStudio, insertIncomingInvoices } from './seed.mjs';
import { TITLE_HOLD, go, up } from './common.mjs';

export default {
    async prepare({ page, studioId }) {
        const out = await seedStudio(page, BASE, studioId, { team: false });
        this.studio = studioId; this.buyer = out.costs.buyer;
        await go(page, '/finance?tab=expenses', 'Dokumenty kosztowe');
        await page.getByTitle('Bieżący miesiąc').first().click();
        await page.getByRole('button', { name: /^Ostatni miesiąc/ }).first().click();
        await page.waitForLoadState('networkidle');
        await wait(page, 1500);
        await showCursorAt(page, 1000, 640);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        await beat(page, rec, 'lista', up(page.locator('table').first(), 1));
        await moveTo(page, page.getByText('KSeF', { exact: true }).nth(1), 900);
        await wait(page, 4200);
        release();
        insertIncomingInvoices(this.studio, this.buyer);
        await page.request.post(`${BASE}/api/v1/cost-categories/auto-rules/apply`, { data: {} });
        await click(page, page.getByTitle('Odśwież').first(), { ms: 900, settle: 1500 });
        const row = page.locator('tr', { has: page.getByText('FV/2026/10/01318') }).first();
        await row.waitFor({ timeout: 15000 });
        await beat(page, rec, 'nowe', row);
        await moveTo(page, row.getByText('FV/2026/10/01318'), 800, { dx: 120 });
        await wait(page, 4600);
        await click(page, row.getByTitle('Oznacz jako opłaconą'), { ms: 900, settle: 1500 });
        await beat(page, rec, 'oplacona', row);
        await wait(page, 4800);
    },
};
