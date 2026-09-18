// scripts/screenshot-batch-orders.mjs
// Zrzuty ekranu widoku „Zlecenia zbiorcze" z DZIAŁAJĄCEJ aplikacji.
//
// Backend jest osobnym serwisem i nie stoi w tym środowisku, więc żądania /api
// są przechwytywane i obsługiwane danymi ustalonymi tutaj. To nie jest test -
// to sposób, żeby zobaczyć własny widok zamiast zgadywać, jak wygląda.
//
// Uruchomienie:  node scripts/screenshot-batch-orders.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = process.env.SHOT_DIR ?? 'screenshots/batch-orders';

const iso = (d) => new Date(d).toISOString();
const day = (n) => `2026-09-${String(n).padStart(2, '0')}`;

const contractor = (over) => ({
    id: over.id,
    name: over.name,
    taxId: '1234563218',
    address: 'ul. Przemysłowa 14, 31-200 Kraków',
    contactPersonName: 'Anna Zielińska',
    email: 'flota@example.com',
    phone: '601 220 940',
    notes: null,
    isActive: true,
    entryCount: 12,
    createdAt: iso('2026-01-10'),
    updatedAt: iso('2026-09-01'),
    ...over,
});

// Trzy kontrahenci, nie jeden: reguła „jedno wypełnienie na okno" łamie się
// dopiero na liście, więc zrzut z jedną kartą nic by nie pokazał.
const CONTRACTORS = [
    contractor({ id: 'c1', name: 'AutoFlota Kraków Sp. z o.o.' }),
    contractor({ id: 'c2', name: 'Leasing Premium S.A.', taxId: '9876543210',
        contactPersonName: 'Marek Bąk', phone: '502 118 330' }),
    contractor({ id: 'c3', name: 'Dealer Motors Południe', taxId: '5554443332',
        contactPersonName: 'Katarzyna Woś', phone: '693 004 221' }),
];

const svc = (name, net, gross) => ({ name, netAmountCents: net, grossAmountCents: gross, vatRate: 23 });

const entry = (over) => ({
    id: over.id,
    serviceDate: over.serviceDate,
    vehicleMake: over.vehicleMake,
    vehicleModel: over.vehicleModel,
    vehicleLicensePlate: over.vehicleLicensePlate,
    vehicleVin: null,
    services: over.services,
    netAmountCents: over.services.reduce((a, s) => a + s.netAmountCents, 0),
    grossAmountCents: over.services.reduce((a, s) => a + s.grossAmountCents, 0),
    notes: over.notes ?? null,
    isClosed: over.isClosed ?? false,
    createdAt: iso(over.serviceDate),
    updatedAt: iso(over.serviceDate),
    ...over,
});

const ENTRIES = {
    c1: [
        entry({ id: 'e1', serviceDate: day(3), vehicleMake: 'BMW', vehicleModel: 'X5',
            vehicleLicensePlate: 'KR 4821A', services: [svc('Mycie zewnętrzne premium', 12195, 15000),
            svc('Czyszczenie wnętrza', 20325, 25000)], notes: 'Auto po zwrocie z najmu' }),
        entry({ id: 'e2', serviceDate: day(7), vehicleMake: 'Audi', vehicleModel: 'A6',
            vehicleLicensePlate: 'KR 9012B', services: [svc('Korekta jednoetapowa', 154472, 190000)] }),
        entry({ id: 'e3', serviceDate: day(11), vehicleMake: 'Mercedes-Benz', vehicleModel: 'Sprinter',
            vehicleLicensePlate: 'KR 5510C', services: [svc('Mycie zewnętrzne premium', 12195, 15000)],
            isClosed: true }),
        entry({ id: 'e4', serviceDate: day(15), vehicleMake: 'Volkswagen', vehicleModel: 'Passat',
            vehicleLicensePlate: 'KR 7733D', services: [svc('Pranie tapicerki', 32520, 40000),
            svc('Mycie zewnętrzne premium', 12195, 15000)] }),
    ],
    c2: [
        entry({ id: 'e5', serviceDate: day(5), vehicleMake: 'Toyota', vehicleModel: 'RAV4',
            vehicleLicensePlate: 'KR 1122E', services: [svc('Powłoka kwartalna', 81301, 100000)] }),
        entry({ id: 'e6', serviceDate: day(12), vehicleMake: 'Skoda', vehicleModel: 'Octavia',
            vehicleLicensePlate: 'KR 3344F', services: [svc('Mycie zewnętrzne premium', 12195, 15000)] }),
    ],
    c3: [
        entry({ id: 'e7', serviceDate: day(9), vehicleMake: 'Porsche', vehicleModel: 'Macan',
            vehicleLicensePlate: 'KR 8899G', services: [svc('Detailing przedsprzedażowy', 243902, 300000)] }),
    ],
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
        if (path === '/batch-orders/contractors') {
            return json(route, { contractors: CONTRACTORS });
        }
        const entriesMatch = path.match(/^\/batch-orders\/contractors\/([^/]+)\/entries$/);
        if (entriesMatch) {
            const id = entriesMatch[1];
            const all = ENTRIES[id] ?? [];
            const includeSettled = url.searchParams.get('includeSettled') === 'true';
            const entries = includeSettled ? all : all.filter((e) => !e.isClosed);
            return json(route, {
                contractor: CONTRACTORS.find((c) => c.id === id),
                entries,
                settledCount: all.filter((e) => e.isClosed).length,
                summary: {
                    totalNetCents: entries.reduce((a, e) => a + e.netAmountCents, 0),
                    totalGrossCents: entries.reduce((a, e) => a + e.grossAmountCents, 0),
                    entryCount: entries.length,
                },
            });
        }
        if (path.endsWith('/close-history')) return json(route, { records: [] });
        if (path.endsWith('/photos')) return json(route, { photos: [] });
        if (path === '/batch-orders/services') return json(route, { services: [] });
        // Wszystko, czego widok nie potrzebuje - pusto, byle nie 404 z toastem.
        return json(route, {});
    });
}

const SHOTS = [
    { name: '01-desktop', viewport: { width: 1440, height: 1000 } },
    { name: '02-laptop', viewport: { width: 1280, height: 900 } },
    { name: '03-tablet', viewport: { width: 1024, height: 900 } },
    { name: '04-telefon', viewport: { width: 390, height: 844 } },
    { name: '05-telefon-maly', viewport: { width: 320, height: 720 } },
    { name: '06-telefon-wiecej', viewport: { width: 390, height: 844 }, more: true },
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
        await page.goto(`${BASE}/batch-orders`, { waitUntil: 'networkidle' });
        await page.waitForSelector('text=AutoFlota', { timeout: 20_000 });
        await page.waitForTimeout(900);
        if (shot.more) {
            await page.getByTitle('Więcej opcji').first().click();
            await page.waitForTimeout(400);
        }
        await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: false });
        console.log(`✓ ${shot.name}`);
        await context.close();
    }

    await browser.close();
})();
