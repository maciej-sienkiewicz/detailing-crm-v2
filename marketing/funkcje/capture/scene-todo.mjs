// Listy „Do zrobienia”: Tablica → Dodaj → notatka widoczna tylko dla wybranej osoby,
// potem odhaczenie wykonanego zadania (zostaje na liście z datą przejścia do archiwum).
import { BASE, beat, click, moveTo, release, showCursorAt, type, wait } from './lib.mjs';
import { seedStudio } from './seed.mjs';
import { TITLE_HOLD, go, panel } from './common.mjs';

const todo = (page) => page.getByText('Do zrobienia', { exact: true }).first().locator('xpath=ancestor::*[3]');

export default {
    async prepare({ page, studioId }) {
        await seedStudio(page, BASE, studioId, { costs: false, history: false });
        await go(page, '/', 'Do zrobienia');
        await page.evaluate(() => window.scrollTo(0, 330));
        await wait(page, 800);
        await showCursorAt(page, 900, 500);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        await beat(page, rec, 'lista', todo(page));
        await moveTo(page, page.getByText('Grafik na listopad').first(), 900);
        await wait(page, 3600);

        await click(page, page.getByRole('button', { name: 'Dodaj', exact: true }).first(), { ms: 900, settle: 900, end: true });
        const okno = await panel(page, 'Nowa notatka', 420, 300);
        await beat(page, rec, 'notatka', okno);
        await click(page, page.getByPlaceholder('np. Zadzwoń do klienta'), { ms: 800, settle: 200 });
        await type(page, 'Umyć i odkurzyć Camry przed wydaniem', 45);
        await click(page, page.getByPlaceholder('np. Pilne, termin do piątku'), { ms: 700, settle: 200 });
        await type(page, 'Odbiór jutro o 9:00', 45);
        await wait(page, 900);
        await click(page, page.getByRole('button', { name: 'Osoby', exact: true }), { ms: 800, settle: 700 });
        const marek = page.getByText('Marek Zając', { exact: true }).last();
        await beat(page, rec, 'osoby', marek.locator('xpath=ancestor::*[2]'));
        await click(page, marek, { ms: 800, settle: 600 });
        await wait(page, 3600);
        await click(page, page.getByRole('button', { name: 'Dodaj notatkę' }), { ms: 800, settle: 1500, end: true });

        const nowa = page.getByText('Umyć i odkurzyć Camry przed wydaniem').first();
        await beat(page, rec, 'dodana', nowa.locator('xpath=ancestor::*[2]'));
        await moveTo(page, nowa, 800, { dx: 60 });
        await wait(page, 3800);

        release();
        const rozliczone = page.getByText('Kupić ręczniki z mikrofibry 40×40').first().locator('xpath=ancestor::*[2]');
        await click(page, rozliczone.locator('button[title="Oznacz jako wykonane"]'), { ms: 900, settle: 1100 });
        await beat(page, rec, 'wykonane', rozliczone);
        await moveTo(page, rozliczone.getByText(/Do archiwum/), 800);
        await wait(page, 4400);
    },
};
