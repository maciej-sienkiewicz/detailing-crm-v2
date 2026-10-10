// Urlop: pracownik składa wniosek ze swojego telefonu (Urlop → kreator w 4 krokach,
// podpis palcem), właściciel przy biurku rozpatruje go w Pracownicy → Wnioski urlopowe
// (decyzja + podpis), urlop wpada do kalendarza nieobecności, a telefon pracownika
// pokazuje decyzję.
import { BASE, beat, click, drawSignature, moveTo, newContext, release, showCursorAt, type, wait } from './lib.mjs';
import { loginEmployee, seedStudio } from './seed.mjs';
import { TITLE_HOLD, go, panel } from './common.mjs';

const MAREK = 'marek.zajac@studio-polysk.pl';

export default {
    async prepare({ page, browser, studioId }) {
        await seedStudio(page, BASE, studioId, { costs: false, history: false });
        // Właściciel czeka na zakładce wniosków (rozgrzana poza nagraniem).
        await go(page, '/employees/leave-requests', 'Nieobecności');
        await showCursorAt(page, 900, 300);
        const phoneCtx = await newContext(browser, { width: 390, height: 844, dpr: 1.5 });
        await loginEmployee(phoneCtx, BASE, studioId, MAREK);
        const phone = await phoneCtx.newPage();
        await phone.goto(`${BASE}/me/leave`, { waitUntil: 'networkidle' });
        await phone.getByText('Złóż wniosek o urlop').waitFor({ timeout: 20000 });
        await wait(phone, 1200);
        await showCursorAt(phone, 280, 600);
        return { start: phone, device: 'phone', phone };
    },
    async play({ page, phone, rec }) {
        await wait(phone, TITLE_HOLD);
        // a) Pracownik na telefonie.
        await beat(phone, rec, 'telefon', phone.getByText('dni wykorzystanych w 2026').locator('xpath=ancestor::*[2]'));
        await wait(phone, 2600);
        await click(phone, phone.getByText('Złóż wniosek o urlop'), { ms: 800, settle: 900, end: true });
        const rodzaj = phone.getByText('Wypoczynkowy', { exact: true });
        await beat(phone, rec, 'rodzaj', rodzaj.locator('xpath=ancestor::*[3]'));
        await wait(phone, 1800);
        await click(phone, rodzaj, { ms: 700, settle: 500 });
        await click(phone, phone.getByRole('button', { name: /^Dalej/ }), { ms: 700, settle: 900, end: true });

        await click(phone, phone.getByRole('button', { name: 'Od Pierwszy dzień' }), { ms: 700, settle: 700 });
        await beat(phone, rec, 'termin', phone.getByRole('button', { name: 'Następny miesiąc' }).locator('xpath=ancestor::*[3]'));
        await click(phone, phone.getByRole('button', { name: '26', exact: true }), { ms: 800, settle: 500 });
        await click(phone, phone.getByRole('button', { name: '30', exact: true }).last(), { ms: 700, settle: 700 });
        await wait(phone, 1200);
        await click(phone, phone.getByRole('button', { name: 'Gotowe' }), { ms: 600, settle: 500, end: true });
        await click(phone, phone.locator('textarea'), { ms: 600, settle: 200 });
        await type(phone, 'Wyjazd rodzinny', 60);
        await wait(phone, 500);
        await click(phone, phone.getByRole('button', { name: /^Dalej/ }), { ms: 700, settle: 900 });

        await beat(phone, rec, 'sprawdz', phone.getByText('Prosisz o urlop wypoczynkowy').locator('xpath=ancestor::*[1]'));
        await wait(phone, 3800);
        await click(phone, phone.getByRole('button', { name: /Wszystko się zgadza/ }), { ms: 700, settle: 900, end: true });
        await beat(phone, rec, 'podpis', phone.getByText('Podpisz wniosek', { exact: true }).locator('xpath=ancestor::*[1]'));
        await click(phone, phone.getByText('Znam treść wniosku i podpisuję go.'), { ms: 700, settle: 300 });
        await drawSignature(phone, await phone.getByLabel('Pole podpisu').boundingBox());
        await wait(phone, 600);
        await click(phone, phone.getByRole('button', { name: /Podpisz i wyślij/ }), { ms: 700, settle: 300, end: true });
        await phone.getByText('Oczekuje', { exact: true }).first().waitFor({ timeout: 20000 });
        await wait(phone, 900);
        const wniosek = phone.getByText('26.10–30.10.2026').first().locator('xpath=ancestor::*[2]');
        await beat(phone, rec, 'wyslany', wniosek);
        await wait(phone, 3200);

        // b) Właściciel przy biurku: wniosek już czeka.
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByRole('button', { name: /Otwórz wniosek: Marek/ }).waitFor({ timeout: 20000 });
        await wait(page, 800);
        await rec.switchTo(page, 0.25);
        await wait(page, 500);
        await beat(page, rec, 'czeka', page.getByRole('button', { name: /Otwórz wniosek: Marek/ }));
        await wait(page, 2600);
        await click(page, page.getByRole('button', { name: /Otwórz wniosek: Marek/ }), { ms: 800, settle: 1200, end: true });
        const okno = await panel(page, 'Kto jeszcze jest wtedy nieobecny', 500, 500);
        await beat(page, rec, 'wniosek', okno);
        await moveTo(page, page.getByText('Kto jeszcze jest wtedy nieobecny'), 800);
        await wait(page, 3800);
        await click(page, page.getByRole('button', { name: /Przejdź do decyzji/ }), { ms: 800, settle: 900 });
        const zatwierdz = page.getByText('Zatwierdź', { exact: true });
        await beat(page, rec, 'decyzja', zatwierdz.locator('xpath=ancestor::*[3]'));
        await click(page, zatwierdz, { ms: 800, settle: 600 });
        await wait(page, 1600);
        await click(page, page.getByRole('button', { name: /^Dalej/ }), { ms: 700, settle: 900, end: true });
        await beat(page, rec, 'podpis-szefa', page.getByText('Podpisz zatwierdzenie', { exact: true }).first().locator('xpath=ancestor::*[1]'));
        await drawSignature(page, await page.getByLabel('Pole podpisu').boundingBox());
        await wait(page, 500);
        await click(page, page.getByRole('button', { name: /Podpisz zatwierdzenie/ }), { ms: 800, settle: 300, end: true });
        await page.getByText('Wniosek zatwierdzony').first().waitFor({ timeout: 20000 });
        await wait(page, 700);
        await beat(page, rec, 'kalendarz', page.getByText('Październik 2026').locator('xpath=ancestor::*[2]'));
        await moveTo(page, page.locator('text=Marek Zając >> visible=true').last(), 900, { dx: 900 });
        await wait(page, 4200);

        // c) Telefon pracownika: decyzja.
        release();
        await phone.reload({ waitUntil: 'networkidle' });
        await phone.getByText('26.10–30.10.2026').first().waitFor({ timeout: 20000 });
        await wait(phone, 800);
        await rec.switchTo(phone, 0.25, { device: 'phone' });
        await wait(phone, 500);
        await beat(phone, rec, 'decyzja-tel', phone.getByText('26.10–30.10.2026').first().locator('xpath=ancestor::*[2]'));
        await wait(phone, 4200);
    },
};
