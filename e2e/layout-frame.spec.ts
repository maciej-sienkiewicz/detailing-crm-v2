import { test, expect, type Page } from '@playwright/test';
import { stubVisitDetailApi, VISIT_ID } from './fixtures/visitDetail';

/**
 * Rama wokół treści (widgets/Layout/frame.ts) nie może jeździć.
 *
 * Skąd ten plik: na komputerze z gładzikiem dociągnięcie strony za górną krawędź
 * odbijało cały dokument - ciemna rama zjeżdżała w dół razem z treścią, a nad nią
 * wychodził biały pas (jasne tło body). Samego odbicia nie da się wywołać
 * syntetycznym przewijaniem, więc test pilnuje obu warunków, które je gaszą:
 * `overscroll-behavior-y: none` na html i tło html w kolorze ramy.
 */

/** FRAME_COLOR (#0f172a) w zapisie, który zwraca getComputedStyle. */
const FRAME_RGB = 'rgb(15, 23, 42)';

async function htmlViewportStyle(page: Page) {
    await page.goto(`/visits/${VISIT_ID}`);
    // Nagłówek wizyty stoi na każdej szerokości - znak, że Layout jest zamontowany.
    await expect(page.locator('header').first()).toBeVisible();
    return page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        return { overscrollY: cs.overscrollBehaviorY, background: cs.backgroundColor };
    });
}

test.describe('Rama na komputerze', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test.beforeEach(async ({ context }) => {
        await stubVisitDetailApi(context);
    });

    test('dokument nie odbija się za krawędzią, a szczelina ma kolor ramy', async ({ page }) => {
        const style = await htmlViewportStyle(page);
        expect(style.overscrollY).toBe('none');
        expect(style.background).toBe(FRAME_RGB);
    });
});

test.describe('Telefon (bez ramy)', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test.beforeEach(async ({ context }) => {
        await stubVisitDetailApi(context);
    });

    test('odbicie i „pociągnij, aby odświeżyć" zostają', async ({ page }) => {
        const style = await htmlViewportStyle(page);
        expect(style.overscrollY).toBe('auto');
        expect(style.background).not.toBe(FRAME_RGB);
    });
});

/**
 * Na każdej szerokości jest DOKŁADNIE JEDNA nawigacja: menu boczne albo dolny pasek.
 *
 * Skąd: na 768 px (iPad w pionie) reguły telefonu `max-width: 768px` i komputera
 * `min-width: 768px` działały naraz - menu boczne chowało się jak na telefonie, dolny
 * pasek jak na komputerze i aplikacja zostawała bez żadnej nawigacji (audyt RWD
 * 07.11.2026). Reguły telefonu idą teraz po `theme.below.md` (767.98 px).
 */
async function navigationState(page: Page) {
    await page.goto(`/visits/${VISIT_ID}`);
    await expect(page.locator('header').first()).toBeVisible();
    return page.evaluate(() => {
        const aside = document.querySelector('aside');
        const bar = document.querySelector('nav[aria-label="Nawigacja główna"]');
        const box = aside?.getBoundingClientRect();
        return {
            sidebar: !!box && box.width > 0 && box.left >= 0 && box.right <= window.innerWidth,
            bottomBar: !!bar && getComputedStyle(bar).display !== 'none',
        };
    });
}

for (const width of [767, 768, 1023, 1024]) {
    test.describe(`Nawigacja przy ${width} px`, () => {
        test.use({ viewport: { width, height: 1024 } });

        test.beforeEach(async ({ context }) => {
            await stubVisitDetailApi(context);
        });

        test('widać menu boczne albo dolny pasek, nigdy oba i nigdy żadnego', async ({ page }) => {
            const nav = await navigationState(page);
            expect(nav.sidebar !== nav.bottomBar, JSON.stringify(nav)).toBe(true);
            expect(nav.bottomBar).toBe(width < 768);
        });
    });
}
