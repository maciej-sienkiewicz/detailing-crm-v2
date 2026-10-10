// Wspólne kroki scen samouczka.
import { BASE, wait } from './lib.mjs';

/** Pierwsze 4,5 s nagrania stoi w małym oknie obok tytułu sceny — tu nic się nie dzieje. */
export const TITLE_HOLD = 4600;

export const up = (loc, n) => loc.locator(`xpath=ancestor::*[${n}]`);

export async function go(page, path, readyText) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    if (readyText) await page.getByText(readyText).first().waitFor({ timeout: 30000 });
    await wait(page, 1200);
}

export async function scrollToText(page, text, offset = 90) {
    await page.evaluate(([t, off]) => {
        const el = [...document.querySelectorAll('*')].find((n) => n.childElementCount === 0 && n.textContent.trim() === t);
        if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' });
    }, [text, offset]);
    await wait(page, 1100);
}

export async function scrollTop(page) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await wait(page, 1000);
}

/** Zakres dat Statystyk: przycisk z bieżącym zakresem → pozycja z listy. */
export async function statsRange(page, label) {
    await page.getByRole('button', { name: /Ostatnie|Bieżący|Ostatni/ }).first().click();
    await wait(page, 300);
    await page.getByRole('button', { name: new RegExp(label) }).first().click();
    await page.waitForLoadState('networkidle');
    await wait(page, 1500);
}

/** Panel okna modalnego po jego tytule (rola `dialog` bywa całym przyciemnionym tłem). */
export async function panel(page, title, minW = 400, minH = 200) {
    await page.getByText(title, { exact: true }).first().evaluate((el, [minW, minH]) => {
        document.querySelectorAll('[data-modal-panel]').forEach((n) => n.removeAttribute('data-modal-panel'));
        let n = el;
        while (n.parentElement && n.getBoundingClientRect().width < minW) n = n.parentElement;
        while (n.parentElement && n.getBoundingClientRect().height < minH) n = n.parentElement;
        n.setAttribute('data-modal-panel', '');
    }, [minW, minH]);
    return page.locator('[data-modal-panel]');
}
