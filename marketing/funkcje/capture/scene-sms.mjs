// SMS po wizycie: Ustawienia → Wiadomości automatyczne → „Podziękowanie po wizycie”:
// włączenie, treść z prośbą o opinię i linkiem do wizytówki Google, zapis.
import { BASE, beat, click, moveTo, release, showCursorAt, type, wait } from './lib.mjs';
import { enableSmsAutomation, seedStudio } from './seed.mjs';
import { TITLE_HOLD, go, scrollToText } from './common.mjs';

const TEXT = 'Dziękujemy za wizytę, {{imie}}! Jeśli jesteś zadowolony, zostaw nam opinię: g.page/r/studio-polysk';

export default {
    async prepare({ page, studioId }) {
        await seedStudio(page, BASE, studioId, { costs: false, team: false, history: false });
        await enableSmsAutomation(page, BASE, studioId);
        await go(page, '/settings?tab=templates', 'Podziękowanie po wizycie');
        await scrollToText(page, 'Odbiór', 140);
        await showCursorAt(page, 1000, 500);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        const etap = page.getByText('Klient już odjechał').first();
        await beat(page, rec, 'etap', etap.locator('xpath=ancestor::*[3]'));
        await moveTo(page, page.getByText('Podziękowanie po wizycie', { exact: true }).first(), 900);
        await wait(page, 3400);
        await click(page, page.getByText('Podziękowanie po wizycie', { exact: true }).first(), { ms: 700, settle: 1100, end: true });

        const sw = page.getByLabel('Wysyłaj tę wiadomość');
        await beat(page, rec, 'wlacz', sw.locator('xpath=ancestor::*[2]'));
        await click(page, sw.locator('xpath=..'), { ms: 800, settle: 900 });
        await wait(page, 2200);

        const area = page.locator('textarea').last();
        await beat(page, rec, 'tresc', area.locator('xpath=ancestor::*[2]'));
        await click(page, area, { ms: 800, settle: 200 });
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await type(page, TEXT, 38);
        await wait(page, 600);
        await beat(page, rec, 'podglad', page.getByText('Podgląd', { exact: true }).last().locator('xpath=ancestor::*[1]'));
        await wait(page, 3800);
        // Edytor leży nad paskiem „Zapisz zmiany" (RuleDrawer, z-index 1200) - zapis po zamknięciu.
        await click(page, page.getByRole('dialog', { name: 'Podziękowanie po wizycie' }).getByRole('button', { name: 'Zamknij' }), { ms: 800, settle: 800, end: true });
        const zapisz = page.getByRole('button', { name: 'Zapisz zmiany' }).last();
        await beat(page, rec, 'zapisz', page.getByText(/Masz niezapisane zmiany/).first().locator('xpath=ancestor::*[1]'));
        await wait(page, 1800);
        await click(page, zapisz, { ms: 800, settle: 1500, end: true });
        await beat(page, rec, 'zapisane', page.getByText('Podziękowanie po wizycie', { exact: true }).first().locator('xpath=ancestor::*[2]'));
        await wait(page, 4000);
    },
};
