// Grupy usług: struktura przychodów wg kategorii, kategoria po kliknięciu (ile zleceń,
// za ile), usługi grupy z liczbą zleceń i przychodem. Okres: ostatnie 12 miesięcy.
import { BASE, beat, click, moveTo, release, showCursorAt, wait } from './lib.mjs';
import { seedStudio } from './seed.mjs';
import { TITLE_HOLD, go, scrollToText, scrollTop, statsRange, up } from './common.mjs';

export default {
    async prepare({ page, studioId }) {
        await seedStudio(page, BASE, studioId, { team: false });
        await go(page, '/statistics', 'Struktura przychodów wg kategorii');
        await statsRange(page, 'Ostatnie 12 miesięcy');
        await showCursorAt(page, 1000, 560);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        const donut = up(page.getByText('Struktura przychodów wg kategorii').first(), 1);
        await beat(page, rec, 'struktura', donut);
        await moveTo(page, page.getByRole('button', { name: /Pielęgnacja lakieru/ }).first(), 900, { dx: 40 });
        await wait(page, 4200);

        release();
        await scrollToText(page, 'Podział według kategorii', 20);
        await beat(page, rec, 'uslugi', up(page.getByText('Usługa', { exact: true }).first(), 3));
        await moveTo(page, page.getByText('Zlecenia', { exact: true }).first(), 800, { dy: 40 });
        await wait(page, 4800);

        release();
        await scrollTop(page);
        await click(page, page.getByRole('button', { name: /Pielęgnacja lakieru/ }).first(), { ms: 900, settle: 1400 });
        await beat(page, rec, 'grupa', up(page.getByText('Łączny przychód brutto').first(), 3));
        await moveTo(page, page.getByText('Liczba zleceń').first(), 800, { dy: 30 });
        await wait(page, 5000);

        release();
        await scrollToText(page, 'Podział według kategorii', 20);
        await beat(page, rec, 'uslugi-grupy', up(page.getByText('Usługa', { exact: true }).first(), 3));
        await moveTo(page, page.getByText('Powłoka ceramiczna IGL Eclipse').first(), 900, { dx: 260 });
        await wait(page, 5200);
    },
};
