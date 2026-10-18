import { test, expect, type Page } from '@playwright/test';
import { FIXED_NOW, stubInstagramApi } from './fixtures/instagram';

/**
 * Moduł Instagram na telefonie (360 i 411 px) i strażnik desktopu.
 *
 * Skąd ten plik: na komputerze moduł był dopracowany, a w aplikacji na telefonie
 * wyglądał „tandetnie". Audyt w emulatorze Androida znalazł rzeczy, których vitest
 * nie zobaczy, bo jsdom nie liczy układu:
 *   - czwarta zakładka (Inspiracje) stała za krawędzią ekranu, bez śladu, że pasek się przewija,
 *   - lista „W okolicy" zostawiała na nazwę firmy 46 px - „P", „S", „A…",
 *   - nazwa konta łamała się w pół słowa („@detailin / g_studio_ / mokotow"),
 *   - okno szczegółów reklamy przewijało się w bok przy 360 px,
 *   - generator był oknem z komputera z marginesami, a przyciski wyniku łamały się na dwie linie.
 * Te asercje mierzą PIKSELE w prawdziwej przeglądarce. Poprawki są wyłącznie poniżej
 * 768 px, więc ostatni blok pilnuje, żeby desktop dalej dostawał swój układ.
 *
 * Uruchomienie:  npm run test:e2e -- e2e/instagram-mobile.spec.ts
 */

const PHONES = [
    { name: 'wąski Android', width: 360, height: 758 },
    { name: 'Pixel', width: 411, height: 866 },
] as const;

/** Tolerancja subpikselowa: przeglądarka zaokrągla `getBoundingClientRect()`. */
const EPS = 1;

async function openModule(page: Page, query: string): Promise<void> {
    await page.clock.setFixedTime(FIXED_NOW);
    // Arkusz „Włącz powiadomienia" przy pierwszym wejściu zasłaniałby dół ekranu.
    await page.addInitScript(() => {
        try { localStorage.setItem('push-onboarding-snoozed-until', String(Date.now() + 14 * 864e5)); } catch { /* prywatne okno */ }
    });
    await page.goto(`/instagram?${query}`);
    await expect(page.getByRole('tablist', { name: 'Zakładki modułu Instagram' })).toBeVisible();
}

/** Czy stronę da się przesunąć w bok - to, co czuje kciuk, a nie same liczby szerokości. */
async function horizontalScroll(page: Page): Promise<number> {
    return page.evaluate(() => {
        window.scrollTo(10_000, window.scrollY);
        const x = window.scrollX;
        window.scrollTo(0, window.scrollY);
        return x;
    });
}

for (const phone of PHONES) {
    test.describe(`Instagram na telefonie - ${phone.name} (${phone.width}px)`, () => {
        test.use({ viewport: { width: phone.width, height: phone.height }, isMobile: true, hasTouch: true });

        test.beforeEach(async ({ context }) => {
            await stubInstagramApi(context);
        });

        test('nagłówek nazywa moduł, a wszystkie cztery zakładki mieszczą się na ekranie', async ({ page }) => {
            await openModule(page, 'widok=przeglad');

            await expect(page.getByText('Instagram', { exact: true }).first()).toBeVisible();
            const tabs = page.getByRole('tab');
            await expect(tabs).toHaveCount(4);
            for (const label of ['Przegląd', 'Konta', 'Konkurencja', 'Inspiracje']) {
                const box = await page.getByRole('tab', { name: label }).boundingBox();
                expect(box, `zakładka „${label}" nie ma wymiarów`).not.toBeNull();
                expect(box!.x, `zakładka „${label}" zaczyna się za lewą krawędzią`).toBeGreaterThanOrEqual(-EPS);
                expect(box!.x + box!.width, `zakładka „${label}" wychodzi za prawą krawędź`)
                    .toBeLessThanOrEqual(phone.width + EPS);
            }
        });

        test('po przewinięciu zakładki zostają u góry ekranu', async ({ page }) => {
            await openModule(page, 'widok=moj');
            await page.evaluate(() => window.scrollTo(0, 1600));

            const tablist = page.getByRole('tablist', { name: 'Zakładki modułu Instagram' });
            await expect.poll(async () => (await tablist.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0);
            const box = await tablist.boundingBox();
            expect(box!.y, 'pasek zakładek odjechał razem z treścią').toBeLessThan(12);
        });

        for (const query of [
            'widok=przeglad',
            'widok=moj',
            'widok=konkurencja&pokaz=profile&okres=90',
            'widok=konkurencja&pokaz=profile&okres=365',
            'widok=konkurencja&pokaz=reklamy',
            'widok=konkurencja&pokaz=okolica',
            'widok=inspiracje',
        ]) {
            test(`strony nie da się przewinąć w bok: ${query}`, async ({ page }) => {
                await openModule(page, query);
                await page.waitForLoadState('networkidle');
                expect(await horizontalScroll(page)).toBe(0);
            });
        }

        test('„W okolicy": nazwa każdej firmy jest czytelna, a nie ucięta do litery', async ({ page }) => {
            await openModule(page, 'widok=konkurencja&pokaz=okolica');

            for (const name of ['GlossWerk Warszawa', 'Perłowy Połysk – Studio Detailingu i Ochrony Lakieru Sp. z o.o.', 'Myjnia Ręczna Bąkowa 24h']) {
                const label = page.getByText(name, { exact: true }).first();
                await expect(label).toBeVisible();
                const fit = await label.evaluate(el => ({ width: el.getBoundingClientRect().width, clipped: el.scrollWidth > el.clientWidth + 1 }));
                // Przed poprawką: ok. 46 px przy 360 i ok. 100 px przy 411.
                expect(fit.width, `„${name}" dostaje za mało miejsca`).toBeGreaterThan(phone.width * 0.6);
                expect(fit.clipped, `„${name}" jest ucięta w poziomie`).toBe(false);
            }
        });

        test('nazwa konta Instagram nie łamie się w pół słowa', async ({ page }) => {
            await openModule(page, 'widok=moj');

            const handle = page.getByRole('heading', { name: '@detailing_studio_mokotow' });
            await expect(handle).toBeVisible();
            const lines = await handle.evaluate(el => {
                const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3;
                return Math.round(el.getBoundingClientRect().height / lineHeight);
            });
            expect(lines, 'uchwyt konta zajmuje więcej niż jedną linię').toBe(1);
        });

        test('szczegóły reklamy mieszczą się w szerokości ekranu', async ({ page }) => {
            await openModule(page, 'widok=konkurencja&pokaz=reklamy');
            await page.getByRole('button', { name: /PPF Full Front/ }).first().click();

            const dialog = page.getByRole('dialog');
            await expect(dialog).toBeVisible();
            const overflow = await dialog.evaluate(root => [root, ...root.querySelectorAll('*')]
                .filter(el => el.scrollWidth > el.clientWidth + 2 && /(auto|scroll)/.test(getComputedStyle(el).overflowX))
                .map(el => `${el.tagName} ${el.scrollWidth}/${el.clientWidth}`));
            expect(overflow, 'coś w oknie przewija się w bok').toEqual([]);

            const toggle = dialog.getByRole('button', { name: /Ukryj|Pokaż/ }).first();
            const box = await toggle.boundingBox();
            expect(box!.x + box!.width, 'przełącznik panelu wypada za krawędź').toBeLessThanOrEqual(phone.width + EPS);
        });

        test('generator zajmuje cały ekran, a przyciski wyniku mają po jednej linii', async ({ page }) => {
            await openModule(page, 'widok=przeglad');
            await page.getByRole('button', { name: 'Generuj', exact: true }).click();

            const dialog = page.getByRole('dialog', { name: 'Generator postów na Instagram' });
            await expect(dialog).toHaveAttribute('aria-modal', 'true');
            // Bez fokusu na starcie: klawiatura zasłaniała ponad 1/3 ekranu przed pierwszym spojrzeniem.
            expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('INPUT');

            await page.getByLabel(/Temat posta/).fill('Korekta lakieru i ceramika na Porsche 911');
            await dialog.getByRole('button', { name: /Generuj post/ }).click();
            const copy = dialog.getByRole('button', { name: /Kopiuj post/ });
            await expect(copy).toBeVisible({ timeout: 15_000 });

            for (const button of [copy, dialog.getByRole('button', { name: /Zmień opis/ })]) {
                const box = await button.boundingBox();
                expect(box!.height, 'napis przycisku złamał się na dwie linie').toBeLessThan(56);
            }
        });
    });
}

test.describe('Instagram na komputerze (1280px) - układ desktopowy bez zmian', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test.beforeEach(async ({ context }) => {
        await stubInstagramApi(context);
    });

    test('nagłówek z akcjami i zakładki z pełnymi nazwami', async ({ page }) => {
        await openModule(page, 'widok=przeglad');

        await expect(page.getByRole('heading', { name: 'Instagram' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Generuj post' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Moje konta' })).toBeVisible();
        // Mobilny przycisk „Generuj" i menu ⋯ istnieją tylko na telefonie.
        await expect(page.getByRole('button', { name: 'Więcej akcji' })).toHaveCount(0);
    });

    test('„W okolicy" zostaje tabelą z nagłówkami kolumn', async ({ page }) => {
        await openModule(page, 'widok=konkurencja&pokaz=okolica');

        await expect(page.getByText('Perłowy Połysk – Studio Detailingu i Ochrony Lakieru Sp. z o.o.', { exact: true }).first()).toBeVisible();
        await expect(page.getByRole('columnheader', { name: /Kampanie/i })).toBeVisible();
    });
});
