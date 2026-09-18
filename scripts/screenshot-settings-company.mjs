// scripts/screenshot-settings-company.mjs
// Zrzuty ekranu sekcji „Dane firmy" w Ustawieniach, z DZIAŁAJĄCEJ aplikacji.
//
// Backend jest osobnym serwisem i nie stoi w tym środowisku, więc żądania /api
// są przechwytywane i obsługiwane danymi ustalonymi tutaj. To nie jest test -
// to sposób, żeby zobaczyć własny widok zamiast zgadywać, jak wygląda.
//
// Uruchomienie:  node scripts/screenshot-settings-company.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = process.env.SHOT_DIR ?? 'screenshots/settings-company';

const iso = (d) => new Date(d).toISOString();

// Logo wstawione jako data URI: sekcja rysuje podglądy tylko wtedy, gdy
// `logoUrl` faktycznie się wczyta, więc bez obrazka nie byłoby czego oglądać.
const LOGO = 'data:image/svg+xml;base64,' + Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120">
        <rect width="240" height="120" fill="none"/>
        <circle cx="52" cy="60" r="30" fill="#0ea5e9"/>
        <text x="96" y="74" font-family="Inter,Arial" font-size="38" font-weight="700" fill="#0f172a">BLYSK</text>
    </svg>`
).toString('base64');

const COMPANY = {
    id: 'comp-1',
    name: 'Studio Detailingu Błysk',
    taxId: '6751234567',
    regon: '123456785',
    street: 'ul. Wielicka 42',
    postalCode: '30-552',
    city: 'Kraków',
    phone: '601 220 940',
    email: 'kontakt@studioblysk.pl',
    website: 'https://studioblysk.pl',
    bankAccount: 'PL61109010140000071219812874',
    logoUrl: LOGO,
    logoNeedsLightPlate: false,
    logoAspectRatio: 2,
    emailAlias: null,
    updatedAt: iso('2026-09-01'),
};

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
        if (path === '/v1/me/entitlements') {
            return json(route, { features: [], addOns: [], billingStatus: 'ACTIVE' });
        }
        if (path === '/v1/company') return json(route, COMPANY);
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
        await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
        await page.waitForSelector(process.env.SHOT_WAIT ?? 'text=Nazwa firmy', { timeout: 20_000 });
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: false });
        console.log(`\u2713 ${shot.name}`);
        await context.close();
    }

    await browser.close();
})();
