// Stan kasy: saldo i historia operacji (wpłaty gotówką z wizyt trafiają tu same, jak przy
// wydaniu pojazdu — CreateFinancialDocumentHandler.recordCashMovement), potem ręczna wypłata.
import { BASE, beat, click, moveTo, release, showCursorAt, type, wait } from './lib.mjs';
import { seedStudio } from './seed.mjs';
import { TITLE_HOLD, go, up } from './common.mjs';

export default {
    async prepare({ page, studioId }) {
        await seedStudio(page, BASE, studioId, { team: false });
        await go(page, '/finance', 'Podsumowanie finansowe');
        await page.getByTitle('Bieżący miesiąc').first().click();
        await page.getByRole('button', { name: /^Ostatni miesiąc/ }).first().click();
        await page.getByRole('button', { name: 'Kasa', exact: true }).first().click();
        await page.waitForLoadState('networkidle');
        await wait(page, 1500);
        await page.getByText('Saldo kasy').first().scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy(0, -120));
        await wait(page, 500);
        await showCursorAt(page, 1000, 640);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        await beat(page, rec, 'saldo', up(page.getByText('Saldo kasy').first(), 2));
        await wait(page, 4600);
        await beat(page, rec, 'historia', up(page.getByText('Historia operacji').first(), 2));
        await moveTo(page, page.getByText(/Wizyta: /).first(), 900, { dx: 60 });
        await wait(page, 4800);
        release();
        await click(page, page.getByPlaceholder('0,00').first(), { ms: 900, settle: 200 });
        await type(page, '180', 140);
        await click(page, page.getByPlaceholder('Opis operacji (wymagany)').first(), { ms: 700, settle: 200 });
        await type(page, 'Zakup mikrofibr', 55);
        await wait(page, 300);
        await click(page, page.getByRole('button', { name: '− Wypłata' }).first(), { ms: 800, settle: 1600 });
        await beat(page, rec, 'wyplata', up(page.getByText('Historia operacji').first(), 2));
        await moveTo(page, page.getByText('Zakup mikrofibr').first(), 900, { dx: 60 });
        await wait(page, 5200);
    },
};
