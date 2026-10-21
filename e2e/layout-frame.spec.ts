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
