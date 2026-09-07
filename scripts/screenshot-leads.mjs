// scripts/screenshot-leads.mjs
// Zrzuty ekranu widoku „Zapytania" z DZIAŁAJĄCEJ aplikacji.
//
// Backend jest osobnym serwisem i nie stoi w tym środowisku, więc żądania /api
// są przechwytywane i obsługiwane danymi ustalonymi tutaj. To nie jest test -
// to sposób, żeby zobaczyć własny widok zamiast zgadywać, jak wygląda.
//
// Uruchomienie:  node scripts/screenshot-leads.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = 'screenshots';

const hoursAgo = (h) => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d) => hoursAgo(d * 24);

const lead = (over) => ({
    id: over.id,
    source: 'EMAIL',
    status: 'IN_PROGRESS',
    contactIdentifier: 'klient@example.com',
    customerName: null,
    initialMessage: null,
    estimatedValue: 0,
    requiresVerification: false,
    customerId: null,
    appointmentId: null,
    visitId: null,
    assignedUserId: null,
    assignedUserName: null,
    threadId: 'thread-1',
    tags: [],
    tagLabels: [],
    vehicleBrand: null,
    vehicleModel: null,
    vehicleDetectionStatus: 'DONE',
    lostReasonCode: null,
    lostReasonLabel: null,
    lostReason: null,
    services: [],
    replyState: 'AWAITING_OUR_REPLY',
    waitingSince: hoursAgo(2),
    lastInboundAt: hoursAgo(2),
    lastOutboundAt: null,
    firstResponseAt: null,
    closedAt: null,
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(2),
    ...over,
});

const OPEN = [
    lead({
        id: 'l1', customerName: 'Marek Kowalczyk', contactIdentifier: 'm.kowalczyk@wp.pl',
        vehicleBrand: 'Porsche', vehicleModel: 'Cayenne', estimatedValue: 984000,
        tags: ['cer', 'kor'], tagLabels: ['Powłoka ceramiczna', 'Korekta lakieru'],
        waitingSince: daysAgo(6), lastInboundAt: daysAgo(6), lastOutboundAt: daysAgo(8),
        firstResponseAt: daysAgo(8), createdAt: daysAgo(10),
    }),
    lead({
        id: 'l2', customerName: 'Tomasz Wiśniewski', contactIdentifier: 't.wisniewski@gmail.com',
        vehicleBrand: 'BMW', vehicleModel: 'X5', estimatedValue: 420000,
        tags: ['kor'], tagLabels: ['Korekta lakieru', 'Powłoka ceramiczna'],
        waitingSince: daysAgo(2), lastInboundAt: daysAgo(2), createdAt: daysAgo(4),
    }),
    // Lead telefoniczny: bez wątku, więc backend przysyła NO_CONVERSATION.
    // Dotąd taki lead nie pojawiał się w żadnym mechanizmie pilności.
    lead({
        id: 'l3', status: 'NEW', source: 'PHONE', customerName: 'Anna Nowak',
        contactIdentifier: '602 145 880', threadId: null, replyState: 'NO_CONVERSATION',
        waitingSince: null, lastInboundAt: null, tags: ['wnt'], tagLabels: ['Detailing wnętrza'],
        createdAt: daysAgo(1),
    }),
    lead({
        id: 'l4', customerName: 'Katarzyna Dąbrowska', contactIdentifier: 'k.dabrowska@onet.pl',
        vehicleBrand: 'Mercedes-Benz', vehicleModel: 'GLC', estimatedValue: 920000,
        tags: ['ppf'], tagLabels: ['Folia ochronna PPF'],
        waitingSince: hoursAgo(5), lastInboundAt: hoursAgo(5), createdAt: hoursAgo(5),
    }),
    lead({
        id: 'l5', source: 'FORM', customerName: 'Piotr Zieliński', contactIdentifier: 'p.zielinski@wp.pl',
        vehicleBrand: 'Volkswagen', vehicleModel: 'Golf', estimatedValue: 38000,
        tags: ['myc'], tagLabels: ['Mycie i pielęgnacja'],
        waitingSince: hoursAgo(3), lastInboundAt: hoursAgo(3), createdAt: hoursAgo(3),
    }),
    // Piłka u klienta - normalny rytm.
    lead({
        id: 'l6', customerName: 'Robert Mazur', contactIdentifier: 'r.mazur@gmail.com',
        vehicleBrand: 'Audi', vehicleModel: 'A6', estimatedValue: 870000,
        tags: ['ppf'], tagLabels: ['Folia ochronna PPF'], replyState: 'AWAITING_CLIENT_REPLY',
        waitingSince: daysAgo(2), lastOutboundAt: daysAgo(2), firstResponseAt: daysAgo(2),
        createdAt: daysAgo(5),
    }),
    // Cisza klienta - powyżej progu.
    lead({
        id: 'l7', customerName: 'Jacek Ostrowski', contactIdentifier: 'j.ostrowski@wp.pl',
        vehicleBrand: 'Toyota', vehicleModel: 'RAV4', estimatedValue: 640000,
        tags: ['cer'], tagLabels: ['Powłoka ceramiczna'], replyState: 'AWAITING_CLIENT_REPLY',
        waitingSince: daysAgo(11), lastOutboundAt: daysAgo(11), firstResponseAt: daysAgo(11),
        createdAt: daysAgo(14),
    }),
    lead({
        id: 'l8', status: 'CONFIRMED', customerName: 'Sebastian Król',
        contactIdentifier: 's.krol@gmail.com', vehicleBrand: 'Ford', vehicleModel: 'Mustang',
        estimatedValue: 540000, appointmentId: 'appt-1', tags: ['kor'], tagLabels: ['Korekta lakieru'],
        replyState: 'AWAITING_CLIENT_REPLY', waitingSince: daysAgo(1), lastOutboundAt: daysAgo(1),
        firstResponseAt: daysAgo(1), createdAt: daysAgo(3),
    }),
];

const CLOSED = [
    lead({
        id: 'c1', status: 'COMPLETED', customerName: 'Rafał Górski',
        contactIdentifier: 'r.gorski@wp.pl', vehicleBrand: 'Porsche', vehicleModel: 'Panamera',
        estimatedValue: 1140000, tags: ['cer'], tagLabels: ['Powłoka ceramiczna 9H'],
        closedAt: daysAgo(2), createdAt: daysAgo(20), replyState: 'NO_CONVERSATION', waitingSince: null,
    }),
    lead({
        id: 'c2', status: 'LOST', customerName: 'Dorota Adamczyk',
        contactIdentifier: 'd.adamczyk@onet.pl', vehicleBrand: 'Land Rover', vehicleModel: 'Evoque',
        estimatedValue: 790000, tags: ['ppf'], tagLabels: ['Folia ochronna PPF'],
        lostReasonCode: 'TOO_EXPENSIVE', lostReasonLabel: 'Za drogo',
        closedAt: daysAgo(3), createdAt: daysAgo(18), replyState: 'NO_CONVERSATION', waitingSince: null,
    }),
    lead({
        id: 'c3', status: 'COMPLETED', customerName: 'Marcin Sikora',
        contactIdentifier: 'm.sikora@gmail.com', vehicleBrand: 'Toyota', vehicleModel: 'Corolla',
        estimatedValue: 34000, tags: ['myc'], tagLabels: ['Mycie i pielęgnacja'],
        closedAt: daysAgo(4), createdAt: daysAgo(12), replyState: 'NO_CONVERSATION', waitingSince: null,
    }),
    lead({
        id: 'c4', status: 'LOST', customerName: 'Łukasz Baran',
        contactIdentifier: 'l.baran@wp.pl', vehicleBrand: 'BMW', vehicleModel: 'M4',
        estimatedValue: 860000, tags: ['kor'], tagLabels: ['Korekta lakieru', 'Powłoka ceramiczna'],
        lostReasonCode: 'NO_REPLY', lostReasonLabel: 'Nikt nie odpisał',
        closedAt: daysAgo(6), createdAt: daysAgo(25), replyState: 'NO_CONVERSATION', waitingSince: null,
    }),
    lead({
        id: 'c5', status: 'NO_SHOW', customerName: 'Kamil Wrona',
        contactIdentifier: 'k.wrona@gmail.com', vehicleBrand: 'Audi', vehicleModel: 'RS6',
        estimatedValue: 520000, tags: ['wnt'], tagLabels: ['Detailing wnętrza'],
        closedAt: daysAgo(8), createdAt: daysAgo(22), replyState: 'NO_CONVERSATION', waitingSince: null,
    }),
];

const page1 = (items) => ({ items, total: items.length, page: 0, pageSize: 100 });

const TIMELINE = [
    { id: 't1', kind: 'INBOUND_MESSAGE', at: daysAgo(10), actorName: 'Marek Kowalczyk',
      toStatus: null, fromStatus: null, lostReasonLabel: null, subject: 'Powłoka ceramiczna Cayenne',
      body: 'Dzień dobry, interesuje mnie powłoka ceramiczna na Cayenne’a rocznik 2021. Auto po dwóch sezonach, lakier ma sporo mikrorys.', note: null },
    { id: 't2', kind: 'CALLBACK', at: daysAgo(9), actorName: 'Michał',
      toStatus: null, fromStatus: null, lostReasonLabel: null, subject: null,
      body: null, note: 'Dzwonił, prosił o wycenę mailem' },
    { id: 't3', kind: 'OUTBOUND_MESSAGE', at: daysAgo(8), actorName: 'Michał',
      toStatus: null, fromStatus: null, lostReasonLabel: null, subject: 'Re: Powłoka ceramiczna Cayenne',
      body: 'W załączeniu wycena na powłokę ceramiczną 5Y i korektę dwuetapową.', note: null },
    { id: 't4', kind: 'INBOUND_MESSAGE', at: daysAgo(6), actorName: 'Marek Kowalczyk',
      toStatus: null, fromStatus: null, lostReasonLabel: null, subject: 'Re: Powłoka ceramiczna Cayenne',
      body: 'Czy cena obejmuje też felgi? I czy da się to zrobić w ciągu tygodnia?', note: null },
];

const DETAIL = {
    ...OPEN[0],
    services: [
        { id: 's1', serviceId: 'svc1', name: 'Powłoka ceramiczna 5Y', priceGross: 680000,
          priceNet: 552846, vatRate: 23, note: null, quantity: 1, totalGross: 680000,
          status: 'ACCEPTED', source: 'MANUAL', priceSource: 'CATALOG' },
        { id: 's2', serviceId: 'svc2', name: 'Korekta lakieru 2-etapowa', priceGross: 304000,
          priceNet: 247154, vatRate: 23, note: null, quantity: 1, totalGross: 304000,
          status: 'ACCEPTED', source: 'MANUAL', priceSource: 'HISTORY' },
    ],
};

const json = (route, body) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

/** Eksportowany, żeby dało się podpiąć te same dane pod doraźną sondę w przeglądarce. */
export async function stub(context) {
    // Predykat, nie wzorzec glob: „**/api/**" łapało też pliki ŹRÓDŁOWE serwowane
    // przez Vite (/src/modules/comms/api/leadsApi.ts) i podawało je jako JSON,
    // przez co aplikacja w ogóle się nie ładowała.
    await context.route(
        (url) => url.pathname.startsWith('/api/'),
        async (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname.replace(/^\/api/, '');
        const status = url.searchParams.get('status');

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
                status: 'ACTIVE',
                isAccessible: true,
                daysRemaining: 30,
                subscriptionEndsAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
                trialEndsAt: null,
                trialUsed: true,
            });
        }
        if (path === '/v1/subscription/my-plan') {
            return json(route, {
                billingStatus: 'ACTIVE',
                plan: { key: 'FULL', name: 'Pełny', monthlyPriceGrossCents: 29900 },
                activeAddOns: [],
                pendingDowngrade: null,
                periodEndsAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
                trialEndsAt: null,
                daysRemaining: 30,
                monthlyCostCents: 29900,
                nextRenewalCostCents: 29900,
            });
        }
        if (path === '/v1/me/entitlements') {
            return json(route, { features: [], addOns: [], billingStatus: 'ACTIVE' });
        }
        if (path === '/v1/leads' && status) {
            const open = OPEN.filter((l) => l.status === status);
            const closed = CLOSED.filter((l) => l.status === status);
            return json(route, page1(open.length ? open : closed));
        }
        if (path === '/v1/leads') return json(route, page1(OPEN));
        if (path === '/v1/leads/dictionaries') {
            return json(route, {
                tags: [
                    { code: 'cer', label: 'Powłoka ceramiczna' },
                    { code: 'ppf', label: 'Folia ochronna PPF' },
                    { code: 'kor', label: 'Korekta lakieru' },
                    { code: 'myc', label: 'Mycie i pielęgnacja' },
                    { code: 'wnt', label: 'Detailing wnętrza' },
                ],
                lostReasons: [
                    { code: 'TOO_EXPENSIVE', label: 'Za drogo' },
                    { code: 'NO_REPLY', label: 'Nikt nie odpisał' },
                ],
            });
        }
        if (path === '/v1/company/lead-alert-config') {
            return json(route, {
                leadStagnantOurThresholdHours: 48,
                leadStagnantClientThresholdHours: 72,
            });
        }
        if (path.endsWith('/timeline')) return json(route, TIMELINE);
        if (path.match(/^\/v1\/leads\/[^/]+$/)) return json(route, DETAIL);
        if (path.endsWith('/notes')) return json(route, []);
        if (path.endsWith('/similar-visits')) {
            return json(route, { items: [], indexedVisits: 0, emptyReason: null });
        }
        if (path === '/v1/leads/attention-count') return json(route, { count: 5 });
        if (path === '/v1/comms/accounts') {
            return json(route, [{
                id: 'a1', emailAddress: 'kontakt@studioblysk.pl', status: 'ACTIVE',
                lastError: null, lastSyncAt: hoursAgo(1), initialSyncInProgress: false,
                syncTotal: null, syncProcessed: null,
            }]);
        }
        if (path.startsWith('/v1/comms/contact-card')) {
            return json(route, {
                email: 'm.kowalczyk@wp.pl',
                customer: {
                    id: 'cust-1', fullName: 'Marek Kowalczyk', phone: '601 448 210',
                    completedVisitCount: 4, totalSpentGross: 1840000,
                    lastVisitAt: new Date('2026-03-14T10:00:00Z').toISOString(),
                },
                vehicles: [], recentVisits: [],
                risk: { abandonedBookings: 0, abandonedLeads: 0 },
            });
        }
        // Wszystko, czego widok nie potrzebuje - pusto, byle nie 404 z toastem.
        return json(route, {});
        }
    );
}

const SHOTS = [
    { name: '01-desktop-twoj-ruch', viewport: { width: 1440, height: 900 }, path: '/leads' },
    { name: '02-desktop-u-klienta', viewport: { width: 1440, height: 900 }, path: '/leads',
      click: /U klienta/ },
    { name: '03-desktop-archiwum', viewport: { width: 1440, height: 900 }, path: '/leads',
      click: /Zamknięte/ },
    { name: '04-desktop-modal', viewport: { width: 1440, height: 900 }, path: '/leads?lead=l1',
      waitFor: 'text=Historia' },
    { name: '05-telefon-twoj-ruch', viewport: { width: 390, height: 844 }, path: '/leads' },
    { name: '06-telefon-modal', viewport: { width: 390, height: 844 }, path: '/leads?lead=l1',
      waitFor: 'text=Historia' },
    { name: '07-tablet-twoj-ruch', viewport: { width: 1024, height: 768 }, path: '/leads' },
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
        });
        await stub(context);
        const page = await context.newPage();
        page.on('console', (msg) => {
            if (msg.type() === 'error') console.log(`  [console] ${msg.text().slice(0, 200)}`);
        });
        await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' });
        // Widok jest lazy-loadowany i czeka na trzy zapytania statusowe - bez
        // twardego oczekiwania na treść zrzut łapie pusty kontener.
        await page.waitForSelector(shot.waitFor ?? 'text=Zapytania', { timeout: 20_000 });
        await page.waitForTimeout(1200);
        if (shot.click) {
            await page.getByRole('tab', { name: shot.click }).click();
            await page.waitForTimeout(900);
        }
        await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: false });
        console.log(`✓ ${shot.name}`);
        await context.close();
    }

    await browser.close();
})();
