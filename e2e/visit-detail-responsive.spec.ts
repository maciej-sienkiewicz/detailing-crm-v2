import { test, expect, type Locator, type Page } from '@playwright/test';
import { stubVisitDetailApi, VISIT_ID } from './fixtures/visitDetail';

/**
 * RWD widoku „Szczegóły wizyty" (/visits/:id).
 *
 * Skąd ten plik: przy oknie ~800px szerokości (telefon w poziomie, okno obok
 * okna, tablet z rozwiniętym menu) nagłówek wizyty rozpadał się. Szyna akcji
 * („Door to door" + „Oznacz jako gotowe" + kebab, razem ~470px) miała
 * `flex-shrink: 0`, a blok z tytułem `flex: 1; min-width: 0` - czyli oddawał
 * szynie wszystko. Na tytuł zostawało kilkanaście pikseli i napis łamał się
 * PO JEDNEJ LITERZE w pionową kolumnę na pół ekranu.
 *
 * Objaw nie dawał się złapać w jsdom (vitest), bo tam nie ma liczenia układu -
 * `getBoundingClientRect()` zwraca same zera. Dlatego te asercje żyją tutaj,
 * w prawdziwej przeglądarce, i mierzą PIKSELE, nie DOM.
 */

const VIEWPORTS = [
    { name: 'Mobile',  width: 375,  height: 812  },  // iPhone X/12/13/14
    { name: 'Tablet',  width: 768,  height: 1024 },  // iPad
    { name: 'Desktop', width: 1280, height: 720  },
] as const;

/** Poniżej tej szerokości widok rozkłada się na zakładki sekcji. */
const MOBILE_NAV_MAX_WIDTH = 767;

/**
 * Sekcje, po które użytkownik wchodzi na ten ekran. `mobileTab` jest tu
 * konieczne: poniżej 768px nie leżą one obok siebie, tylko każda pod swoją
 * zakładką, więc nie da się ich sprawdzić jednym przebiegiem.
 */
const KEY_SECTIONS = [
    {
        name: 'podsumowanie wyceny',
        mobileTab: 'Usługi',
        locate: (page: Page) => page.getByText('Razem do zapłaty'),
    },
    {
        name: 'dane auta (stan przy przyjęciu)',
        mobileTab: 'Klient',
        locate: (page: Page) => page.getByRole('heading', { name: 'Stan przy przyjęciu' }),
    },
] as const;

/** Tolerancja subpikselowa: przeglądarka zaokrągla `getBoundingClientRect()`. */
const EPS = 1;

/**
 * Ile linii wolno zająć tytułowi wizyty. Tytuł z fixture'a („Kompleksowa
 * korekta lakieru z powłoką ceramiczną 9H", 50 znaków) mieści się w poprawnym
 * układzie w jednej lub dwóch liniach na każdym z badanych viewportów.
 */
const MAX_TITLE_LINES = 3;

async function openVisitDetail(page: Page): Promise<void> {
    await page.goto(`/visits/${VISIT_ID}`);
    /*
     * Czekamy na RAMĘ nagłówka i na wycenę - a nie na sam tytuł.
     * Tytuł zgnieciony do zera szerokości Playwright uznaje za „hidden", więc
     * gdyby to on był bramką gotowości, każda regresja układu kończyłaby się
     * przeterminowaniem oczekiwania zamiast asercją, która mówi, co jest nie tak.
     */
    await expect(page.locator('header').first()).toBeVisible();
    // Wycena przychodzi osobnym zapytaniem i jest ostatnim dużym blokiem strony;
    // dopiero gdy stoi, układ jest ten, o który chodzi w teście.
    await expect(page.getByText('Razem do zapłaty')).toBeVisible();
}

/**
 * Czy kolumna tytułu jest szersza od NAJDŁUŻSZEGO SŁOWA, które ma w sobie
 * zmieścić.
 *
 * To jest dokładny zapis usterki, a nie jej przybliżenie. `VisitTitle` ma
 * `word-break: break-word`, więc gdy kolumna zwęzi się poniżej najdłuższego
 * wyrazu, przeglądarka zaczyna łamać W ŚRODKU SŁOWA - i przy ~14px kolumny
 * robi z tytułu pionowy sznurek liter. Próg „procent szerokości nagłówka"
 * byłby zgadywaniem: zależy od tego, czy szyna akcji stoi obok, czy pod
 * spodem. Ten mierzy to, co faktycznie ma być prawdą na każdej szerokości.
 */
async function measureTitleFit(title: Locator) {
    return title.evaluate((el) => {
        const cs = getComputedStyle(el);
        const ctx = document.createElement('canvas').getContext('2d')!;
        ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`;

        // `measureText` nie zna `letter-spacing` (tytuł ma ujemny), więc
        // doliczamy je sami - inaczej pomiar byłby szerszy od rzeczywistości.
        const tracking = parseFloat(cs.letterSpacing) || 0;
        const widthOf = (word: string) => ctx.measureText(word).width + tracking * word.length;

        const words = (el.textContent ?? '').trim().split(/\s+/).filter(Boolean);
        const longestWord = words.reduce((a, b) => (widthOf(b) > widthOf(a) ? b : a), '');

        const box = el.getBoundingClientRect();
        const contentWidth = box.width
            - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
            - parseFloat(cs.borderLeftWidth) - parseFloat(cs.borderRightWidth);

        return {
            contentWidth,
            longestWord,
            longestWordWidth: widthOf(longestWord),
            lines: Math.round(box.height / (parseFloat(cs.lineHeight) || box.height)),
        };
    });
}

/**
 * Elementy wychodzące poza PRAWĄ krawędź okna.
 *
 * Dlaczego nie sam `scrollWidth`: kontener widoku ma `overflow-x: clip`, więc
 * treść szersza od okna nie robi paska przewijania - zostaje UCIĘTA. Sprawdzenie
 * paska jest więc konieczne, ale niewystarczające; dopiero obejście drzewa
 * pokazuje, że nic nie wyjechało poza ekran.
 *
 * Pomijamy wnętrza `<svg>` (dekoracyjne tło „plastra miodu" celowo jest większe
 * od okna i leży pod treścią) oraz elementy niewidoczne / o zerowej powierzchni.
 */
async function elementsPastRightEdge(page: Page) {
    return page.evaluate((eps) => {
        const viewportWidth = document.documentElement.clientWidth;
        const escapees: { tag: string; text: string; right: number; width: number }[] = [];

        for (const el of Array.from(document.body.querySelectorAll('*'))) {
            if (el instanceof SVGElement) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            const style = getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none') continue;
            if (rect.right > viewportWidth + eps) {
                escapees.push({
                    tag: el.tagName.toLowerCase(),
                    text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60),
                    right: Math.round(rect.right),
                    width: Math.round(rect.width),
                });
            }
        }
        return { viewportWidth, escapees };
    }, EPS);
}

for (const viewport of VIEWPORTS) {
    test.describe(`Szczegóły wizyty - ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
        test.use({ viewport: { width: viewport.width, height: viewport.height } });

        test.beforeEach(async ({ context }) => {
            await stubVisitDetailApi(context);
        });

        test('nie ma poziomego przewijania strony', async ({ page }) => {
            await openVisitDetail(page);

            const scroll = await page.evaluate(() => ({
                htmlScrollWidth:   document.documentElement.scrollWidth,
                htmlClientWidth:   document.documentElement.clientWidth,
                bodyScrollWidth:   document.body.scrollWidth,
                bodyClientWidth:   document.body.clientWidth,
                // Faktyczne przewinięcie: gdyby coś rozpychało stronę, da się
                // ją przesunąć w bok. To sprawdzian mocniejszy od samych liczb.
                scrolledBy: (() => {
                    window.scrollTo(10_000, 0);
                    const x = window.scrollX;
                    window.scrollTo(0, 0);
                    return x;
                })(),
            }));

            expect(scroll.htmlScrollWidth, 'html nie może być szersze od okna')
                .toBeLessThanOrEqual(scroll.htmlClientWidth + EPS);
            expect(scroll.bodyScrollWidth, 'body nie może być szersze od okna')
                .toBeLessThanOrEqual(scroll.bodyClientWidth + EPS);
            expect(scroll.scrolledBy, 'strony nie da się przewinąć w poziomie').toBe(0);
        });

        test('żaden element nie wychodzi poza prawą krawędź okna', async ({ page }) => {
            await openVisitDetail(page);

            const { viewportWidth, escapees } = await elementsPastRightEdge(page);
            expect(
                escapees,
                `poza okno (${viewportWidth}px) wyszło ${escapees.length} elementów: `
                + JSON.stringify(escapees.slice(0, 5)),
            ).toEqual([]);
        });

        test('nagłówek mieści tytuł, tożsamość pojazdu i akcje', async ({ page }) => {
            await openVisitDetail(page);

            const header = page.locator('header').first();
            const title = header.locator('h1');
            await expect(title).toBeVisible();

            // Sedno regresji: kolumna tytułu musi zmieścić najdłuższe słowo.
            const fit = await measureTitleFit(title);
            expect(
                Math.round(fit.contentWidth),
                `tytuł zgnieciony przez szynę akcji - „${fit.longestWord}" `
                + `potrzebuje ${Math.round(fit.longestWordWidth)}px`,
            ).toBeGreaterThanOrEqual(Math.round(fit.longestWordWidth));

            /*
             * Sprawdzian samego łamania słów jest konieczny, ale za słaby:
             * przy zepsutym układzie na tablecie tytuł jeszcze mieścił
             * najdłuższy wyraz, a i tak rozlewał się na cztery linie w wąskim
             * pasku obok szyny. Poprawny układ mieści ten sam tytuł w jednej
             * lub dwóch; MAX_TITLE_LINES zostawia zapas i nadal łapie tamten stan.
             */
            expect(
                fit.lines,
                'tytuł łamie się na zbyt wiele linii - kolumna jest za wąska',
            ).toBeLessThanOrEqual(MAX_TITLE_LINES);

            // Tożsamość pojazdu i akcje zostają w nagłówku, nie pod jego krawędzią.
            await expect(header.getByText('Mercedes-Benz', { exact: false })).toBeVisible();
            await expect(header.getByText('WX 1234A')).toBeVisible();
            await expect(header.getByRole('button', { name: /Oznacz jako gotowe/ })).toBeVisible();

            const inside = await header.evaluate((el) => {
                const box = el.getBoundingClientRect();
                return Array.from(el.querySelectorAll('*'))
                    .filter(child => !(child instanceof SVGElement))
                    .filter(child => {
                        const r = child.getBoundingClientRect();
                        return r.width > 0 && r.height > 0
                            && (r.right > box.right + 1 || r.left < box.left - 1);
                    })
                    .map(child => (child.textContent ?? '').trim().slice(0, 40));
            });
            expect(inside, 'treść wychodzi poza ramę nagłówka').toEqual([]);
        });

        test('kluczowe sekcje są widoczne i nieucięte', async ({ page }) => {
            await openVisitDetail(page);

            for (const section of KEY_SECTIONS) {
                /*
                 * Poniżej 768px widok rozkłada się na zakładki sekcji, a kolumna
                 * boczna (klient, stan pojazdu) chowa się za jedną z nich - taki
                 * jest projekt, nie usterka. Test otwiera więc właściwą zakładkę,
                 * zamiast udawać, że karty nie ma.
                 */
                if (viewport.width <= MOBILE_NAV_MAX_WIDTH) {
                    await page
                        .getByRole('navigation', { name: 'Nawigacja sekcji wizyty' })
                        .getByRole('button', { name: section.mobileTab })
                        .click();
                }

                const target = section.locate(page);
                await expect(target, `${section.name}: sekcja nie jest widoczna`).toBeVisible();
                await target.scrollIntoViewIfNeeded();

                const cut = await target.evaluate((el, eps) => {
                    const r = el.getBoundingClientRect();
                    return {
                        left: Math.round(r.left),
                        right: Math.round(r.right),
                        viewportWidth: document.documentElement.clientWidth,
                        overflowsRight: r.right > document.documentElement.clientWidth + eps,
                        overflowsLeft: r.left < -eps,
                    };
                }, EPS);

                expect(cut.overflowsRight, `${section.name} ucięta z prawej: ${JSON.stringify(cut)}`).toBe(false);
                expect(cut.overflowsLeft,  `${section.name} ucięta z lewej: ${JSON.stringify(cut)}`).toBe(false);
            }
        });
    });
}

/*
 * Najszersza możliwa szyna akcji. Wizyta zakończona paragonem pokazuje
 * „Wystaw fakturę konsumencką" - etykietę o połowę dłuższą od „Oznacz jako
 * gotowe", w przycisku z `white-space: nowrap`. To właśnie ten wariant
 * najmocniej napiera na tytuł, więc dostaje własny test, na najciaśniejszej
 * szerokości, przy której nagłówek stoi jeszcze w układzie poziomym.
 */
test.describe('Szczegóły wizyty - najdłuższa akcja w nagłówku (800x750)', () => {
    test.use({ viewport: { width: 800, height: 750 } });

    test('szyna akcji schodzi do własnego wiersza, zamiast zgniatać tytuł', async ({ page, context }) => {
        await stubVisitDetailApi(context, {
            status: 'COMPLETED',
            settlement: { documentType: 'RECEIPT', revenueInvoiceId: null },
        });
        await openVisitDetail(page);

        const header = page.locator('header').first();
        const title = header.locator('h1');
        const action = header.getByRole('button', { name: /Wystaw fakturę konsumencką/ });

        await expect(action).toBeVisible();

        const titleBox = (await title.boundingBox())!;
        const actionBox = (await action.boundingBox())!;

        const fit = await measureTitleFit(title);
        expect(
            Math.round(fit.contentWidth),
            `tytuł zgnieciony przez najdłuższy przycisk - „${fit.longestWord}" `
            + `potrzebuje ${Math.round(fit.longestWordWidth)}px`,
        ).toBeGreaterThanOrEqual(Math.round(fit.longestWordWidth));
        expect(fit.lines, 'tytuł łamie się na zbyt wiele linii').toBeLessThanOrEqual(MAX_TITLE_LINES);

        // Skoro oba elementy nie mieszczą się obok siebie, przycisk MUSI leżeć
        // pod tytułem - inaczej znaczy to, że znowu odebrał mu szerokość.
        expect(actionBox.y, 'szyna akcji nadal stoi obok tytułu')
            .toBeGreaterThanOrEqual(titleBox.y + titleBox.height);

        const { escapees } = await elementsPastRightEdge(page);
        expect(escapees).toEqual([]);
    });
});
