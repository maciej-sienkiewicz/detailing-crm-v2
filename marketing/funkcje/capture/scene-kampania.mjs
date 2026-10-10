// Kampania automatyczna „180 dni po powłoce ceramicznej”: Kampanie → Nowa kampania →
// Automatyczna → warunek (usługa, dni, godzina) → odbiorcy policzeni z historii wizyt →
// treść ze zmiennymi → aktywacja. Odbiorcy to klienci po powłoce sprzed pół roku
// (seedCoatingCustomers) ze zgodą marketingową.
import { BASE, beat, click, moveTo, release, showCursorAt, type, wait } from './lib.mjs';
import { enableSmsAutomation, seedCoatingCustomers, seedStudio } from './seed.mjs';
import { TITLE_HOLD, go } from './common.mjs';

const TEXT = 'Cześć {{imie}}! Pół roku temu nałożyliśmy powłokę ceramiczną na Twój {{marka}}. Zapraszamy na przegląd powłoki: 22 100 20 30';

export default {
    async prepare({ page, studioId }) {
        await seedStudio(page, BASE, studioId, { costs: false, team: false, history: true });
        seedCoatingCustomers(studioId);
        await enableSmsAutomation(page, BASE, studioId);
        await go(page, '/campaigns', 'Nowa kampania');
        await showCursorAt(page, 1000, 500);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        await click(page, page.getByRole('button', { name: 'Nowa kampania' }), { ms: 900, settle: 1000 });
        const auto = page.getByText('Kampania automatyczna', { exact: true });
        await beat(page, rec, 'rodzaj', auto.locator('xpath=ancestor::*[2]'));
        await moveTo(page, auto, 800);
        await wait(page, 3200);
        await click(page, auto, { ms: 500, settle: 1200, end: true });

        await click(page, page.getByPlaceholder('Nazwa kampanii…'), { ms: 700, settle: 200 });
        await type(page, 'Serwis powłoki ceramicznej', 45);
        const warunek = page.getByText('WARUNEK WYSYŁKI', { exact: true }).or(page.getByText('Warunek wysyłki', { exact: true })).first();
        await beat(page, rec, 'warunek', warunek.locator('xpath=ancestor::*[1]'));
        await click(page, page.getByRole('button', { name: 'Wybierz usługi' }), { ms: 800, settle: 700 });
        await click(page, page.getByText('Powłoka ceramiczna IGL Eclipse', { exact: true }).last(), { ms: 800, settle: 600 });
        await page.keyboard.press('Escape');
        await wait(page, 400);
        await click(page, page.getByLabel('Liczba dni od wykonania usługi'), { ms: 700, settle: 200 });
        await page.keyboard.press('Control+A');
        await type(page, '180', 120);
        await page.waitForLoadState('networkidle');
        await wait(page, 1800);
        const odbiorcy = page.getByText(/dostanie wiadomość/).first();
        await beat(page, rec, 'odbiorcy', odbiorcy.locator('xpath=ancestor::*[2]'));
        await moveTo(page, page.getByText('Krzysztof Nowicki').first(), 900);
        await wait(page, 4200);
        await click(page, page.getByRole('button', { name: 'Dalej', exact: true }), { ms: 800, settle: 1100, end: true });

        const area = page.locator('textarea').first();
        await beat(page, rec, 'tresc', area.locator('xpath=ancestor::*[3]'));
        await click(page, area, { ms: 700, settle: 200 });
        await type(page, TEXT, 34);
        await wait(page, 700);
        await beat(page, rec, 'podglad', page.getByText('podgląd z przykładowymi danymi').first().locator('xpath=ancestor::*[2]'));
        await wait(page, 4000);
        await click(page, page.getByRole('button', { name: 'Dalej', exact: true }), { ms: 800, settle: 1100, end: true });

        await beat(page, rec, 'podsumowanie', page.getByText('180 dni po:', { exact: false }).first().locator('xpath=ancestor::*[3]'));
        await wait(page, 4000);
        await click(page, page.getByRole('button', { name: 'Aktywuj kampanię' }), { ms: 800, settle: 2000, end: true });
        await beat(page, rec, 'dziala', page.getByText('Kiedy wychodzi', { exact: true }).first().locator('xpath=ancestor::*[1]'));
        await moveTo(page, page.getByText('Otrzyma').first(), 800);
        await wait(page, 4200);
    },
};
