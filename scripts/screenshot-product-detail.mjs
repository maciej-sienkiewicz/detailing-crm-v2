// scripts/screenshot-product-detail.mjs
// Zrzuty ekranu karty produktu z DZIAŁAJĄCEJ aplikacji.
//
// Backend jest osobnym serwisem i nie stoi w tym środowisku, więc żądania /api
// są przechwytywane i obsługiwane danymi ustalonymi tutaj. To nie jest test -
// to sposób, żeby zobaczyć własny widok zamiast zgadywać, jak wygląda.
//
// Uruchomienie:  node scripts/screenshot-product-detail.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = process.env.SHOT_DIR ?? 'screenshots/product-detail';
const ID = '8f01d20d-6549-4707-be3e-b2638349b5bd';

const iso = (d) => new Date(d).toISOString();

const PRODUCT = {
    id: ID,
    gtin: '5901234123457',
    name: 'Ceramic Coating 9H Pro',
    brand: 'GlossLab',
    unitOfMeasure: 'ML',
    packageSizeValue: '50',
    packageSizeUnit: 'ML',
    packageHeightMm: 120, packageWidthMm: 40, packageDepthMm: 40,
    description: 'Dwuskładnikowa powłoka ceramiczna do lakieru, utwardzana na sucho.',
    imageFileId: null,
    provenance: { source: 'AI', verificationLevel: 'AI_SUGGESTED', confidence: 0.82 },
    isPrivate: false,
    internalName: 'Powłoka 9H (butelka 50 ml)',
    internalNote: null,
    isFavourite: false,
    isHidden: false,
    price: { unitPriceNet: 24390, unitPriceGross: 30000, priceEnteredAs: 'GROSS', vatRate: 23 },
    rating: { rating: 4, justification: null, ratedByName: 'Michał Kowal', ratedAt: iso('2026-08-20') },
    noteCount: 2,
    isEditableInPlace: true,
    createdAt: iso('2026-02-01'),
    updatedAt: iso('2026-09-10'),
};

const NOTES = [
    { id: 'n1', content: 'Schnie wolniej niż deklaruje producent - zostawiać na noc.',
      authorName: 'Michał Kowal', visitId: null, createdAt: iso('2026-08-21'), updatedAt: iso('2026-08-21') },
    { id: 'n2', content: 'Jedna butelka starcza na dwa auta klasy kombi.',
      authorName: 'Anna Zielińska', visitId: null, createdAt: iso('2026-09-02'), updatedAt: iso('2026-09-02') },
];

const json = (route, body) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

export async function stub(context) {
    // Predykat, nie wzorzec glob: „**/api/**" łapało też pliki ŹRÓDŁOWE serwowane
    // przez Vite i podawało je jako JSON, przez co aplikacja się nie ładowała.
    await context.route((url) => url.pathname.startsWith('/api/'), async (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname.replace(/^\/api/, '');

        if (path === '/v1/auth/me') {
            return json(route, {
                success: true,
                user: {
                    userId: 'u1', studioId: 's1', email: 'kontakt@studioblysk.pl',
                    firstName: 'Michał', lastName: 'Kowal', role: 'OWNER',
                    subscriptionStatus: 'ACTIVE', trialDaysRemaining: 0,
                    permissions: null, trackWorkTime: false, idleTimeoutSeconds: 0,
                },
            });
        }
        // Bramka abonamentu stoi przed całą aplikacją - bez niej widok się nie renderuje.
        if (path === '/v1/subscription/status') {
            return json(route, {
                status: 'ACTIVE', isAccessible: true, daysRemaining: 30,
                subscriptionEndsAt: iso(Date.now() + 30 * 86_400_000),
                trialEndsAt: null, trialUsed: true,
            });
        }
        if (path === '/v1/subscription/my-plan') {
            return json(route, {
                billingStatus: 'ACTIVE',
                plan: { key: 'FULL', name: 'Pełny', monthlyPriceGrossCents: 29900 },
                activeAddOns: [], pendingDowngrade: null,
                periodEndsAt: iso(Date.now() + 30 * 86_400_000),
                trialEndsAt: null, daysRemaining: 30,
                monthlyCostCents: 29900, nextRenewalCostCents: 29900,
            });
        }
        // Bramka modułu (ModuleGate) czyta katalog dodatków i robi na nim
        // `.find` - pusty obiekt z domyślnej gałęzi wywracał cały widok.
        if (path === '/v1/subscription/add-ons') return json(route, []);
        if (path === '/v1/me/entitlements') {
            // `features` to MAPA klucz -> status, nie tablica: ModuleGate czyta
            // `features.PRODUCTS.enabled` i bez tego zasłania widok paywallem.
            return json(route, {
                features: { PRODUCTS: { enabled: true, missingFeatures: [], upsell: null } },
                capabilities: {},
                addOns: [],
                billingStatus: 'ACTIVE',
            });
        }
        if (path === `/v1/products/${ID}/notes`) return json(route, NOTES);
        if (path.startsWith(`/v1/products/${ID}/visits`)) {
            return json(route, { items: [], total: 0, page: 0, pageSize: 20 });
        }
        if (path === `/v1/products/${ID}`) return json(route, PRODUCT);
        // Wszystko, czego widok nie potrzebuje - pusto, byle nie 404 z toastem.
        return json(route, {});
    });
}

const SHOTS = [
    { name: '01-desktop', viewport: { width: 1440, height: 1000 } },
    { name: '02-tablet', viewport: { width: 1024, height: 900 } },
    { name: '03-telefon', viewport: { width: 390, height: 844 } },
    { name: '04-telefon-maly', viewport: { width: 320, height: 720 } },
];

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());

if (isMain) await (async () => {
    mkdirSync(OUT, { recursive: true });
    // Chromium jest w obrazie, ale w innej wersji niż oczekuje pakiet playwright -
    // wskazujemy binarkę wprost, zamiast dociągać drugą kopię przeglądarki.
    const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    });

    for (const shot of SHOTS) {
        const context = await browser.newContext({
            viewport: shot.viewport,
            deviceScaleFactor: 2,
            locale: 'pl-PL',
            hasTouch: shot.viewport.width < 768,
            isMobile: shot.viewport.width < 768,
        });
        await stub(context);
        const page = await context.newPage();
        page.on('console', (m) => { if (m.type() === 'error') console.log(`  [console] ${m.text().slice(0, 200)}`); });
        await page.goto(`${BASE}/products/${ID}`, { waitUntil: 'networkidle' });
        await page.waitForSelector(process.env.SHOT_WAIT ?? 'text=Zgłoś nieprawidłowość', { timeout: 20_000 });
        await page.waitForTimeout(700);
        await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: false });
        console.log(`\u2713 ${shot.name}`);
        await context.close();
    }

    await browser.close();
})();
