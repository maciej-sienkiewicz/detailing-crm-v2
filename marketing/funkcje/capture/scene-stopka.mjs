// Stopka maila: Zapytania → Ustawienia skrzynki → „Stopka maila”: motyw „Firmowa z logo”,
// dane, kolor, logo studia i podgląd na żywo; zapis.
// Konto właściciela w demo nazywa się „Demo User” z numerem +48000000000 - stopka bierze
// dane z konta, więc w przygotowaniu dostaje imię i kontakt jak w prawdziwym studiu.
import { BASE, beat, click, moveTo, release, showCursorAt, type, wait } from './lib.mjs';
import { seedStudio } from './seed.mjs';
import { sql, q } from './db.mjs';
import { TITLE_HOLD, go, panel } from './common.mjs';

const LOGO = new URL('./fixtures/studio-polysk-logo.png', import.meta.url).pathname;

async function field(page, id, text) {
    await click(page, page.locator(`#${id}`), { ms: 650, settle: 150 });
    await page.keyboard.press('Control+A');
    await type(page, text, 40);
    await wait(page, 300);
}

export default {
    async prepare({ page, studioId }) {
        await seedStudio(page, BASE, studioId, { costs: false, team: false, history: false });
        sql(`update users set email = id || '@poprzednie-nagranie.invalid' where email='adam.lis@studiopolysk.pl'`);
        sql(`update users set first_name='Adam', last_name='Lis', email='adam.lis@studiopolysk.pl', phone_number='+48 600 120 340'
             where studio_id=${q(studioId)} and is_owner`);
        await go(page, '/zapytania', 'Czeka na nas');
        await showCursorAt(page, 1000, 520);
    },
    async play({ page, rec }) {
        await wait(page, TITLE_HOLD);
        await click(page, page.getByRole('button', { name: 'Ustawienia skrzynki' }), { ms: 900, settle: 700 });
        await click(page, page.getByText('Stopka maila', { exact: true }), { ms: 700, settle: 1400 });
        await beat(page, rec, 'motywy', page.getByText('Wybierz motyw', { exact: true }).locator('xpath=ancestor::*[2]'));
        await moveTo(page, page.getByText('Ze zdjęciem', { exact: true }), 800);
        await wait(page, 1600);
        await click(page, page.getByText('Firmowa z logo', { exact: true }), { ms: 800, settle: 1600 });
        await wait(page, 1400);
        await click(page, page.getByRole('button', { name: 'Dalej' }).last(), { ms: 800, settle: 800, end: true });

        await beat(page, rec, 'dane', await panel(page, 'Twoja stopka e-mail', 900, 500));
        await field(page, 'signature-position', 'Właściciel');
        await field(page, 'signature-website', 'www.studiopolysk.pl');
        await wait(page, 1200);
        await click(page, page.getByRole('button', { name: 'Dalej' }).last(), { ms: 800, settle: 800 });

        await beat(page, rec, 'styl', page.getByRole('button', { name: 'Kolor #0a66c2' }).locator('xpath=ancestor::*[3]'));
        await click(page, page.getByRole('button', { name: 'Kolor #edbb00' }), { ms: 800, settle: 900 });
        await click(page, page.getByRole('button', { name: 'Georgia', exact: true }), { ms: 800, settle: 900 });
        await wait(page, 1600);
        await click(page, page.getByRole('button', { name: 'Dalej' }).last(), { ms: 800, settle: 800, end: true });

        await page.locator('input[type=file]').first().setInputFiles(LOGO);
        await page.getByText('Szare pole to miejsce na logo').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
        await wait(page, 1200);
        await beat(page, rec, 'podglad', page.getByText('Podgląd na żywo', { exact: true }).locator('xpath=ancestor::*[2]'));
        await moveTo(page, page.getByText('Pozdrawiam,').first(), 900, { dy: 120 });
        await wait(page, 4600);
        await click(page, page.getByRole('button', { name: 'Zapisz stopkę' }), { ms: 800, settle: 1600, end: true });
        release();
        await click(page, page.getByText('Tesla Model 3').first(), { ms: 800, settle: 1200 });
        await click(page, page.getByRole('button', { name: 'Odpisz' }).first().or(page.getByRole('textbox', { name: /Napisz odpowiedź/ })).first(), { ms: 800, settle: 1400 });
        await beat(page, rec, 'w-mailu', page.locator('[contenteditable=true]').first().locator('xpath=ancestor::*[2]'));
        await wait(page, 4000);
    },
};
