// Role i uprawnienia: Ustawienia → Role i uprawnienia → „Edytuj rolę: Detailer”:
// grupy uprawnień z licznikiem, odznaczenie cen usług, zamknięte Finanse, zapis.
import { BASE, beat, click, moveTo, release, showCursorAt, wait } from './lib.mjs';
import { seedStudio } from './seed.mjs';
import { TITLE_HOLD, go, up, panel } from './common.mjs';

export default {
    async prepare({ page, studioId }) {
        await seedStudio(page, BASE, studioId, { costs: false, history: false });
        await go(page, '/settings?tab=roles', 'Role i uprawnienia');
        await page.getByRole('button', { name: 'Edytuj rolę: Detailer' }).first().waitFor({ timeout: 20000 });
        await showCursorAt(page, 1000, 600);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        await beat(page, rec, 'role', up(page.getByRole('button', { name: 'Edytuj rolę: Detailer' }).first(), 3));
        await moveTo(page, page.getByText('Używa 2 pracowników').first(), 900);
        await wait(page, 3800);
        await click(page, page.getByRole('button', { name: 'Edytuj rolę: Detailer' }).first(), { ms: 900, settle: 1200 });
        const d = page;   // okno edycji roli nie ma roli `dialog`
        const ceny = d.getByRole('checkbox', { name: /Podgląd cen usług w wizycie/ });
        await ceny.scrollIntoViewIfNeeded();
        await wait(page, 600);
        await beat(page, rec, 'uprawnienia', up(d.getByRole('checkbox', { name: /Wszystkie uprawnienia: Wizyty i kalendarz/ }), 1));
        await wait(page, 3600);
        await click(page, ceny, { ms: 900, settle: 900 });
        const fin = d.getByRole('checkbox', { name: /Wszystkie uprawnienia: Finanse/ });
        await fin.scrollIntoViewIfNeeded();
        await wait(page, 700);
        await beat(page, rec, 'finanse', up(fin, 1));
        await moveTo(page, fin, 800, { dx: 120 });
        await wait(page, 4200);
        await click(page, d.getByRole('button', { name: 'Zapisz rolę' }), { ms: 900, settle: 1600, end: true });
        await beat(page, rec, 'zapisana', up(page.getByRole('button', { name: 'Edytuj rolę: Detailer' }).first(), 3));
        await wait(page, 4200);
    },
};
