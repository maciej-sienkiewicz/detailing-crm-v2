// Poczta i leady: Zapytania → Sprawy („Czeka na nas” z czasem oczekiwania) → mail stałego
// klienta (Porsche 911) z usługami podsuniętymi z cennika → akceptacja = wycena →
// „Napisz z AI” z ofertą → wysyłka z poczty CRM (lokalny SMTP) → sprawa „U klienta”.
//
// Szkic asystenta: lokalnie nie ma klucza OpenAI, więc odpowiedź POST …/reply-draft
// podstawiamy w przeglądarce (page.route) - w kształcie, który zwraca serwer (ReplyDraft),
// z kwotami wyceny leada. Reszta przepływu (wycena, okna, wysyłka) to prawdziwy CRM.
import { BASE, beat, click, moveTo, release, showCursorAt, wait } from './lib.mjs';
import { seedReturningCustomerLead, seedStudio } from './seed.mjs';
import { rows, q } from './db.mjs';
import { TITLE_HOLD, go, panel } from './common.mjs';

const LEAD = 'Porsche 911 Carrera 4S';
const zl = (cents) => (cents / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';

export default {
    async prepare({ page, studioId }) {
        await seedStudio(page, BASE, studioId, { costs: false, team: false, history: false });
        const lead = seedReturningCustomerLead(studioId);
        const items = rows(`select name, price_gross from lead_service_items where lead_id=${q(lead.leadId)} order by price_gross`);
        const total = items.reduce((s, [, g]) => s + Number(g), 0);
        const bodyText = [
            'Dzień dobry Panie Piotrze,',
            'dziękuję za wiadomość. 14–15 października mamy wolne stanowisko, auto przyjmiemy 14.10 o 9:00.',
            items.map(([name, g]) => `- ${name}: ${zl(Number(g))}`).join('\n'),
            `Łącznie ${zl(total)} brutto. Czy potwierdza Pan termin?`,
        ].join('\n\n');
        await page.route(/\/reply-draft$/, (route) => route.request().method() === 'POST'
            ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
                bodyText, useSentStyle: false, styleApplied: false, examples: [], placeholders: [], unverifiedAmounts: [], notice: null, offerIncluded: true }) })
            : route.continue());
        // Rozgrzewka: okno leada i edytor odpowiedzi to leniwe paczki.
        await go(page, '/zapytania', 'Czeka na nas');
        await page.getByText('Tesla Model 3').first().click();
        await wait(page, 1500);
        await go(page, '/zapytania', 'Czeka na nas');
        await page.getByText(LEAD).first().waitFor({ timeout: 20000 });
        await showCursorAt(page, 1000, 520);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        const lista = page.getByText('Czeka na nas').first().locator('xpath=..').locator('xpath=..');
        await beat(page, rec, 'sprawy', lista);
        await moveTo(page, page.getByText('14 dni').first(), 900);
        await wait(page, 3400);
        await click(page, page.getByText(LEAD).first(), { ms: 800, settle: 1400, end: true });

        await beat(page, rec, 'mail', page.getByText(/po zimie chciałbym/).first().locator('xpath=..'));
        await moveTo(page, page.getByText(/po zimie chciałbym/).first(), 800, { dx: 60 });
        await wait(page, 3600);
        await beat(page, rec, 'klient', page.getByText(/Stały klient/).first().locator('xpath=ancestor::*[2]'));
        await moveTo(page, page.getByText(/Stały klient/).first(), 800);
        await wait(page, 3000);
        await beat(page, rec, 'sugestie', page.getByText('Sugerowane usługi').first().locator('xpath=ancestor::*[2]'));
        await wait(page, 2400);
        await click(page, page.getByRole('button', { name: 'Akceptuj' }).first(), { ms: 800, settle: 900 });
        await click(page, page.getByRole('button', { name: 'Akceptuj' }).first(), { ms: 600, settle: 1100 });
        await beat(page, rec, 'wycena', page.getByText(/Wycena, jeszcze nie wysłana/).first().locator('xpath=ancestor::*[1]'));
        await wait(page, 3400);

        release();
        await click(page, page.getByRole('button', { name: 'Odpisz' }).first(), { ms: 800, settle: 1200 });
        await click(page, page.getByRole('button', { name: 'Napisz z AI' }), { ms: 800, settle: 900 });
        await beat(page, rec, 'ai', await panel(page, 'Dodać ofertę do odpowiedzi?', 400, 300));
        await click(page, page.getByText('Z ofertą', { exact: true }), { ms: 800, settle: 500 });
        await wait(page, 1200);
        await click(page, page.getByRole('button', { name: 'Dalej' }), { ms: 600, settle: 1100, end: true });
        await beat(page, rec, 'oferta', await panel(page, 'Oferta w odpowiedzi', 400, 300));
        await moveTo(page, page.getByText('razem brutto po rabatach').first(), 900);
        await wait(page, 3600);
        await click(page, page.getByRole('button', { name: 'Napisz szkic z ofertą' }), { ms: 800, settle: 1000, end: true });
        await click(page, page.getByText('Propozycja asystenta', { exact: true }), { ms: 800, settle: 600 });
        await click(page, page.getByRole('button', { name: 'Napisz szkic' }), { ms: 700, settle: 1600, end: true });
        const editor = page.locator('[contenteditable=true]').first();
        await beat(page, rec, 'szkic', editor.locator('xpath=ancestor::*[2]'));
        await moveTo(page, page.getByText(/Łącznie .* brutto/).first(), 900);
        await wait(page, 5200);
        await click(page, page.getByRole('button', { name: 'Wyślij', exact: true }), { ms: 800, settle: 2200, end: true });
        await page.getByText('U klienta').first().waitFor({ timeout: 20000 });
        await click(page, page.getByText(LEAD).first(), { ms: 900, settle: 1400 });
        await beat(page, rec, 'wyslane', page.getByText('U klienta').first().locator('xpath=..').locator('xpath=..'));
        await wait(page, 4000);
    },
};
