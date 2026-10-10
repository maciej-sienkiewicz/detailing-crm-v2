// Filtr poczty: Zapytania → Poczta. Powiadomienia i newslettery zwinięte w jeden wiersz,
// zapytania oznaczone jako „Sprawa”. Menu skrzynki → „Odrzucone przez automat”: spam
// z formularza i jedno prawdziwe zapytanie odrzucone przez pomyłkę → „To jednak lead” →
// usługa z cennika → sprawa z wyceną. Skrzynka: seedMailbox + seedReturningCustomerLead.
import { BASE, beat, click, moveTo, release, showCursorAt, type, wait } from './lib.mjs';
import { seedMailbox, seedReturningCustomerLead, seedStudio } from './seed.mjs';
import { TITLE_HOLD, go, panel } from './common.mjs';

export default {
    async prepare({ page, studioId }) {
        await seedStudio(page, BASE, studioId, { costs: false, team: false, history: false });
        seedReturningCustomerLead(studioId);
        seedMailbox(studioId);
        await go(page, '/zapytania?view=poczta', 'Powiadomienia i reklamy');
        await showCursorAt(page, 1000, 520);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        const lista = page.getByText('Powiadomienia i reklamy').first().locator('xpath=ancestor::*[4]');
        await beat(page, rec, 'poczta', lista);
        await moveTo(page, page.getByText('Sprawa', { exact: true }).first(), 900);
        await wait(page, 2400);
        await moveTo(page, page.getByText('Powiadomienia i reklamy').first(), 800);
        await wait(page, 2600);
        await click(page, page.getByText('Powiadomienia i reklamy').first(), { ms: 500, settle: 1400 });
        await beat(page, rec, 'automaty', page.getByText('InPost').first().locator('xpath=ancestor::*[4]'));
        await wait(page, 3600);

        release();
        await click(page, page.getByRole('button', { name: 'Ustawienia skrzynki' }), { ms: 900, settle: 600 });
        await click(page, page.getByText('Odrzucone przez automat', { exact: true }), { ms: 700, settle: 1400 });
        await beat(page, rec, 'odrzucone', page.getByText('Pozycjonowanie strony').first().locator('xpath=ancestor::*[3]'));
        await moveTo(page, page.getByText('Pozycjonowanie strony').first(), 800);
        await wait(page, 3000);
        await click(page, page.getByText('Ceramika na Audi Q5').first(), { ms: 800, settle: 1500, end: true });
        const notice = page.getByText(/Automat uznał to zgłoszenie za spam/).first().locator('xpath=..');
        await beat(page, rec, 'pomylka', notice.locator('xpath=..'));
        await moveTo(page, page.getByText(/ile kosztuje powłoka ceramiczna/).first(), 900);
        await wait(page, 3800);
        await click(page, page.getByRole('button', { name: 'To jednak lead' }), { ms: 800, settle: 1100, end: true });
        await beat(page, rec, 'lead', await panel(page, 'Oznacz jako lead', 400, 250));
        await click(page, page.getByRole('button', { name: 'Dodaj usługi' }), { ms: 800, settle: 800 });
        await click(page, page.getByPlaceholder('Wpisz nazwę usługi, aby dodać...'), { ms: 600, settle: 200 });
        await type(page, 'Powłoka', 80);
        await wait(page, 900);
        await click(page, page.getByText('Powłoka ceramiczna IGL Eclipse').last(), { ms: 700, settle: 1200 });
        await wait(page, 1800);
        await click(page, page.getByRole('button', { name: 'Utwórz lead' }), { ms: 800, settle: 2000, end: true });
        await beat(page, rec, 'sprawa', page.getByText(/Wycena, jeszcze nie wysłana/).first().locator('xpath=ancestor::*[1]'));
        await moveTo(page, page.getByText(/Wycena, jeszcze nie wysłana/).first(), 800);
        await wait(page, 4200);
    },
};
