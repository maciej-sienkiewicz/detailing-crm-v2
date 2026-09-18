// scripts/screenshot-campaign-detail.mjs
// Zrzuty okna kampanii z DZIAŁAJĄCEJ aplikacji.
//
// Backend jest osobnym serwisem i nie stoi w tym środowisku, więc żądania /api
// są przechwytywane i obsługiwane danymi ustalonymi tutaj. To nie jest test -
// to sposób, żeby zobaczyć własny widok zamiast zgadywać, jak wygląda.
//
// Trzy stany, bo okno wygląda w nich zupełnie inaczej i projekt musi zdać
// egzamin w każdym: kampania ZAKOŃCZONA (są wyniki), ZAPLANOWANA (są prognozy,
// nie ma wyników) i AUTOMATYCZNA (jest warunek, wyniki lecą w nieskończoność).
//
// Uruchomienie:  node scripts/screenshot-campaign-detail.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = process.env.SHOT_DIR ?? 'screenshots/campaign-detail';
const ID = '9a25e87c-7093-4db4-9f5e-da22e9fd42ec';

const iso = (d) => new Date(d).toISOString();
const daysAgo = (n) => iso(Date.now() - n * 86_400_000);
const daysAhead = (n) => iso(Date.now() + n * 86_400_000);

const SERVICES = [
    { id: 'svc1', name: 'Powłoka ceramiczna 5Y' },
    { id: 'svc2', name: 'Korekta lakieru' },
    { id: 'svc3', name: 'Detailing wnętrza' },
];

const baseCampaign = {
    id: ID,
    name: 'Powrót po sezonie zimowym',
    kind: 'ONE_TIME',
    channel: 'SMS',
    status: 'COMPLETED',
    audience: {
        visitCountMin: 2, visitCountMax: null,
        lastVisitOlderThanDays: 180, lastVisitNewerThanDays: null,
        revenueTotalGrossMin: 150000, revenueTotalGrossMax: null,
        servicesUsedAnyOf: ['svc1', 'svc2'], servicesUsedNoneOf: [],
        serviceLastUsedOlderThanDays: null,
        vehicleBrands: [{ brand: 'BMW', model: null }, { brand: 'Audi', model: null }],
        vehicleYearMin: 2018, vehicleYearMax: null,
        customerType: 'INDIVIDUAL', customerCreatedAfter: null,
        includeUnnamedCustomers: false, includeCustomerIds: [], excludeCustomerIds: [],
    },
    smsTemplate: 'Cześć {imie}! Sezon zimowy za nami — czas odświeżyć lakier. Do końca marca korekta lakieru -15%. Umów się: 601 220 940. Studio Błysk',
    emailSubject: null,
    emailBody: null,
    scheduledAt: null,
    trigger: null,
    recipientsTotal: 184,
    recipientsSent: 171,
    recipientsFailed: 4,
    recipientsSkipped: 9,
    creditsSpent: 342,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(5),
    startedAt: daysAgo(5),
    completedAt: daysAgo(5),
};

const SCENARIOS = {
    completed: baseCampaign,
    scheduled: {
        ...baseCampaign,
        status: 'SCHEDULED',
        scheduledAt: daysAhead(3),
        recipientsTotal: 0, recipientsSent: 0, recipientsFailed: 0, recipientsSkipped: 0,
        creditsSpent: 0, startedAt: null, completedAt: null,
    },
    automatic: {
        ...baseCampaign,
        name: 'Przypomnienie o powłoce po roku',
        kind: 'AUTOMATIC',
        status: 'ACTIVE',
        trigger: { serviceIds: ['svc1'], afterDays: 365, sendTime: '10:00', onlyIfNoVisitSince: true },
        recipientsTotal: 46, recipientsSent: 41, recipientsFailed: 1, recipientsSkipped: 4,
        creditsSpent: 82, completedAt: null,
    },
};

const RECIPIENT_NAMES = [
    ['Marek', 'Kowalczyk', '601 448 210', 'SENT'],
    ['Tomasz', 'Wiśniewski', '602 145 880', 'SENT'],
    ['Anna', 'Nowak', '693 004 221', 'FAILED'],
    ['Katarzyna', 'Dąbrowska', '502 118 330', 'SENT'],
    ['Piotr', 'Zieliński', '605 992 140', 'SKIPPED_NO_CONSENT'],
    ['Robert', 'Mazur', '664 220 905', 'SENT'],
    ['Jacek', 'Ostrowski', '781 330 114', 'SENT'],
    ['Sebastian', 'Król', '512 887 003', 'SKIPPED_FREQUENCY_CAP'],
];

const recipients = RECIPIENT_NAMES.map(([first, last, phone, status], i) => ({
    id: `r${i}`,
    customerId: `c${i}`,
    channel: 'SMS',
    address: phone,
    firstName: first,
    lastName: last,
    status,
    errorMessage: status === 'FAILED' ? 'Numer nieosiągalny - abonent niedostępny' : null,
    scheduledFor: daysAgo(5),
    sentAt: status === 'SENT' ? daysAgo(5) : null,
}));

const audienceSample = RECIPIENT_NAMES.map(([first, last, phone], i) => ({
    customerId: `c${i}`,
    firstName: first, lastName: last, phone, email: null,
    vehicleBrand: ['BMW', 'Audi', 'BMW', 'Mercedes-Benz', 'Audi', 'BMW', 'Toyota', 'Audi'][i],
    vehicleModel: ['X5', 'A6', 'X3', 'GLC', 'Q5', 'M4', 'RAV4', 'A4'][i],
    lastVisitDate: daysAgo(190 + i * 7),
    lastServiceName: i % 2 ? 'Korekta lakieru' : 'Powłoka ceramiczna 5Y',
    eligibility: i === 4 ? 'NO_CONSENT' : i === 7 ? 'FREQUENCY_CAP' : 'ELIGIBLE',
}));

const json = (route, body) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

export async function stub(context, scenario = 'completed') {
    const campaign = SCENARIOS[scenario];
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
        // Bramka modułu (ModuleGate) czyta katalog dodatków i robi na nim `.find`;
        // `features` to MAPA klucz -> status, nie tablica. Pusty obiekt z domyślnej
        // gałęzi zasłaniał widok paywallem albo wywracał render.
        if (path === '/v1/subscription/add-ons') return json(route, []);
        if (path === '/v1/me/entitlements') {
            const on = { enabled: true, missingFeatures: [], upsell: null };
            const keys = ['CALENDAR', 'VISITS', 'CUSTOMERS', 'VEHICLES', 'DOCUMENTS', 'GALLERY',
                'AI_LEADS', 'INSTAGRAM_MONITORING', 'SMS_EMAIL', 'CAMPAIGNS', 'E_SIGNATURES',
                'FINANCE', 'STATISTICS', 'PRODUCTS'];
            return json(route, {
                features: Object.fromEntries(keys.map((k) => [k, on])),
                capabilities: {},
                addOns: [],
                billingStatus: 'ACTIVE',
            });
        }
        // Odbiorcy przychodzą jako goła TABLICA, nie stronicowana koperta.
        // Kampania jeszcze niewysłana NIE MA odbiorców - lista powstaje dopiero
        // w momencie wysyłki. Zwracanie ich tu robiłoby z okna zaplanowanej
        // kampanii obraz, którego w produkcji nigdy nie widać.
        if (path === `/v1/campaigns/${ID}/recipients`) {
            const sent = !['DRAFT', 'SCHEDULED'].includes(campaign.status);
            return json(route, sent ? recipients : []);
        }
        if (path === `/v1/campaigns/${ID}`) return json(route, campaign);
        if (path === '/v1/campaigns/audience/estimate') {
            return json(route, {
                matched: 197, optedOut: 6, noConsent: 3, noAddress: 2, frequencyCapped: 2,
                eligible: 184, excludedManually: 0,
                estimatedSmsSegments: 2, estimatedCredits: 368,
                sample: audienceSample, sampleOffset: 0, sampleTotal: audienceSample.length,
                projectionHorizonDays: campaign.kind === 'AUTOMATIC' ? 30 : null,
            });
        }
        if (path === '/v1/campaigns/stats') {
            return json(route, {
                active: 2, scheduled: 1, completedTotal: 14, completedLast30Days: 3,
                messagesSentLast30Days: 640, smsCreditsAvailable: 1250,
            });
        }
        if (path === '/v1/campaigns/settings') {
            return json(route, {
                quietHoursStart: '21:00', quietHoursEnd: '08:00', frequencyCapDays: 30,
                smsFooter: null, emailFooter: null,
            });
        }
        // Lista kampanii - też goła tablica.
        if (path === '/v1/campaigns') return json(route, [campaign]);
        if (path === '/v1/services') return json(route, SERVICES);
        if (path.startsWith('/v1/services')) return json(route, { items: SERVICES, total: SERVICES.length });
        // Wszystko, czego widok nie potrzebuje - pusto, byle nie 404 z toastem.
        return json(route, {});
    });
}

const SHOTS = [
    { name: '01-desktop-zakonczona', scenario: 'completed', viewport: { width: 1440, height: 1000 } },
    { name: '02-desktop-zaplanowana', scenario: 'scheduled', viewport: { width: 1440, height: 1000 } },
    { name: '03-desktop-automatyczna', scenario: 'automatic', viewport: { width: 1440, height: 1000 } },
    { name: '04-telefon-zakonczona', scenario: 'completed', viewport: { width: 390, height: 844 } },
    { name: '05-telefon-zaplanowana', scenario: 'scheduled', viewport: { width: 390, height: 844 } },
    // Dymek z numerem pod kursorem - inaczej nie da się sprawdzić, czy numer
    // jest nadal dostępny po zastąpieniu go nazwiskiem.
    { name: '06-desktop-dymek-numeru', scenario: 'completed', viewport: { width: 1440, height: 1000 },
      hoverName: 'Tomasz Wiśniewski' },
    // Kryteria odbiorców po rozwinięciu.
    { name: '07-desktop-kryteria-rozwiniete', scenario: 'completed', viewport: { width: 1440, height: 1000 },
      expandCriteria: true },
    // Filtr „tylko nieudane" - bez kliknięcia nie widać, czy działa.
    { name: '08-desktop-tylko-nieudane', scenario: 'completed', viewport: { width: 1440, height: 1000 },
      clickText: 'Tylko nieudane' },
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
        await stub(context, shot.scenario);
        const page = await context.newPage();
        page.on('console', (m) => { if (m.type() === 'error') console.log(`  [console] ${m.text().slice(0, 200)}`); });
        await page.goto(`${BASE}/campaigns?campaign=${ID}`, { waitUntil: 'networkidle' });
        await page.waitForSelector(process.env.SHOT_WAIT ?? 'text=Odbiorcy', { timeout: 20_000 });
        await page.waitForTimeout(1000);
        if (shot.expandCriteria) {
            await page.getByText('Kryteria odbiorców').first().click();
            await page.waitForTimeout(400);
        }
        if (shot.clickText) {
            const btn = page.getByText(shot.clickText).first();
            await btn.scrollIntoViewIfNeeded();
            await btn.click();
            await page.waitForTimeout(400);
            await btn.scrollIntoViewIfNeeded();
        }
        if (shot.hoverName) {
            const cell = page.getByText(shot.hoverName).first();
            await cell.scrollIntoViewIfNeeded();
            await cell.hover();
            await page.waitForTimeout(500);
        }
        await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: process.env.FULL === '1' });
        console.log(`\u2713 ${shot.name}`);
        await context.close();
    }

    await browser.close();
})();
