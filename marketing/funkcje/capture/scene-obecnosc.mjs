// Czas pracy i lista obecności: pracownik wpisuje godziny z telefonu (dzień → czas →
// Zapisz), właściciel zatwierdza kartę za wrzesień i generuje listę obecności (PDF).
// Godziny za sierpień i wrzesień oraz lista za sierpień są z seedTeam (prawdziwe API).
import { BASE, beat, click, moveTo, newContext, release, showCursorAt, type, wait } from './lib.mjs';
import { loginEmployee, seedStudio } from './seed.mjs';
import { TITLE_HOLD, go, panel } from './common.mjs';

const MAREK = 'marek.zajac@studio-polysk.pl';
const up = (loc, n) => loc.locator(`xpath=ancestor::*[${n}]`);

async function tab(page, name) {
    await click(page, page.getByRole('link', { name: new RegExp(`^${name}`) }).or(page.getByRole('tab', { name: new RegExp(`^${name}`) })).first(), { ms: 800, settle: 300 });
    await page.waitForLoadState('networkidle');
    await wait(page, 600);
}

async function hours(phone, rec, day, value, id) {
    await click(phone, phone.getByText(day, { exact: true }), { ms: 800, settle: 800 });
    const sheet = up(phone.getByText(/Czas pracy \(np\./), 2);
    if (id) await beat(phone, rec, id, sheet);
    await type(phone, value, 120);
    await wait(phone, 900);
    await click(phone, phone.getByRole('button', { name: 'Zapisz', exact: true }), { ms: 700, settle: 900, end: true });
}

export default {
    async prepare({ page, browser, studioId }) {
        await seedStudio(page, BASE, studioId, { costs: false, history: false });
        // Rozgrzewka widoków właściciela poza nagraniem (leniwe paczki, PDF).
        for (const path of ['/employees/attendance-sheets', '/employees/worktime']) await go(page, path);
        await page.getByText('Marek Zając').first().waitFor({ timeout: 20000 });
        await showCursorAt(page, 900, 300);
        const phoneCtx = await newContext(browser, { width: 390, height: 844, dpr: 1.5 });
        await loginEmployee(phoneCtx, BASE, studioId, MAREK);
        const phone = await phoneCtx.newPage();
        await phone.goto(`${BASE}/worktime`, { waitUntil: 'networkidle' });
        await phone.getByText('Standardowa dniówka').waitFor({ timeout: 20000 });
        await wait(phone, 1200);
        await showCursorAt(phone, 280, 600);
        return { start: phone, device: 'phone', phone };
    },
    async play({ page, phone, rec }) {
        await wait(phone, TITLE_HOLD);
        // a) Pracownik: godziny z telefonu.
        await beat(phone, rec, 'miesiac', up(phone.getByText(/normy/i).first(), 3));
        await moveTo(phone, phone.getByText(/Brak wpisu w/), 800);
        await wait(phone, 3400);
        release();
        await hours(phone, rec, '08.10', '8', 'dzien');
        await hours(phone, rec, '09.10', '9:30');
        await wait(phone, 600);
        await beat(phone, rec, 'wpisane', up(phone.getByText('09.10', { exact: true }), 2));
        await wait(phone, 3200);

        // b) Właściciel: karta za wrzesień.
        await rec.switchTo(page, 0.25);
        await wait(page, 400);
        const marek = page.getByText('Marek Zając').first();
        await beat(page, rec, 'karty', up(marek, 3));
        await moveTo(page, page.getByText('Do zatwierdzenia').last(), 800);
        await wait(page, 3000);
        await click(page, marek, { ms: 700, settle: 900, end: true });
        const approve = page.getByRole('button', { name: 'Zatwierdź kartę' });
        await approve.waitFor({ timeout: 15000 });
        await beat(page, rec, 'karta', await panel(page, 'Marek Zając', 400, 300));
        await wait(page, 3600);
        await click(page, approve, { ms: 800, settle: 300, end: true });
        await page.getByText('Karta zatwierdzona').first().waitFor({ timeout: 15000 });
        await page.keyboard.press('Escape').catch(() => {});
        await wait(page, 900);
        await beat(page, rec, 'zatwierdzona', up(page.getByText('Marek Zając').first(), 3));
        await moveTo(page, page.getByText('Marek Zając').first(), 700, { dx: 560 });
        await wait(page, 2800);

        // c) Lista obecności za wrzesień.
        release();
        await tab(page, 'Listy obecności');
        await click(page, page.getByRole('button', { name: 'Wygeneruj listę' }).first(), { ms: 800, settle: 600 });
        await page.locator('#attendance-month').selectOption({ label: 'Wrzesień' }).catch(() => page.locator('#attendance-month').selectOption({ label: 'wrzesień' }));
        await page.locator('#attendance-year').selectOption('2026');
        await beat(page, rec, 'lista', await panel(page, 'Wygeneruj listę obecności', 400, 300));
        await moveTo(page, page.getByText('Kto trafi na listę').first(), 700, { dy: 60 });
        await wait(page, 3400);
        await click(page, page.getByRole('dialog').getByRole('button', { name: /^Wygeneruj listę/ }).last(), { ms: 800, settle: 300, end: true });
        await page.getByText('Lista obecności wygenerowana').first().waitFor({ timeout: 30000 });
        await wait(page, 800);
        await click(page, page.getByRole('button', { name: 'Podgląd' }).first(), { ms: 800, settle: 300 });
        await page.locator('canvas, iframe, embed, object').first().waitFor({ timeout: 30000 });
        await wait(page, 1800);
        await beat(page, rec, 'pdf', await panel(page, 'Pobierz PDF', 400, 300));
        await wait(page, 4600);
    },
};
