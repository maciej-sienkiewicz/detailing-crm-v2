import type { BrowserContext, Route } from '@playwright/test';

/**
 * Backend jest osobnym serwisem i nie stoi w środowisku CI, więc widok szczegółów
 * wizyty dostaje dane z tego pliku. Wzorzec przeniesiony ze `scripts/screenshot-*.mjs`:
 * przechwytujemy `/api/**` PREDYKATEM, nie globem - „**\/api\/**" łapało także pliki
 * ŹRÓDŁOWE serwowane przez Vite (`/src/modules/visits/api/visitApi.ts`) i podawało je
 * jako JSON, przez co aplikacja w ogóle się nie ładowała.
 */

/** Identyfikator wizyty użyty w teście RWD - musi zgadzać się z URL-em w spec-u. */
export const VISIT_ID = 'mock-uuid-123';

const iso = (daysFromNow: number) =>
    new Date(Date.now() + daysFromNow * 86_400_000).toISOString();

/*
 * Dane celowo „niewygodne": długa nazwa usługi, długi tytuł wizyty i marka, której
 * logo jest szerokie. Nagłówek łamał się właśnie na takich wartościach, a nie na
 * krótkich przykładach.
 */
const VISIT = {
    id: VISIT_ID,
    visitNumber: 'VIS-2026-00231',
    title: 'Kompleksowa korekta lakieru z powłoką ceramiczną 9H',
    status: 'IN_PROGRESS',
    scheduledDate: iso(-2),
    estimatedCompletionDate: iso(1),
    vehicle: {
        id: 'veh-1',
        licensePlate: 'WX 1234A',
        brand: 'Mercedes-Benz',
        model: 'GLE 400 d 4MATIC Coupé',
        yearOfProduction: 2023,
        color: 'Obsidianschwarz',
    },
    customer: {
        id: 'cust-1',
        firstName: 'Arkadiusz',
        lastName: 'Wróbel-Zielonka',
        email: 'a.wrobel@example.com',
        phone: '+48 601 200 300',
        stats: {
            totalVisits: 3,
            totalSpent: { netAmount: 1500000, grossAmount: 1845000, currency: 'PLN' },
            vehiclesCount: 1,
        },
    },
    /*
     * Kwoty zgodne z regułą „brutto, które ktoś ustalił, JEST brutto" (CLAUDE.md §1):
     * `finalPriceGross` to dokładne brutto podane przez człowieka, a nie wynik
     * mnożenia netta - stub nie może uczyć widoku złych danych.
     */
    services: [
        {
            id: 'sl-1', serviceId: 'srv-1',
            serviceName: 'Korekta lakieru dwuetapowa - całe nadwozie',
            basePriceNet: 154472, vatRate: 23, requireManualPrice: false,
            adjustment: { type: 'FIXED_NET', value: 0 }, note: '',
            finalPriceNet: 154472, finalPriceGross: 190000, status: 'CONFIRMED',
        },
        {
            id: 'sl-2', serviceId: 'srv-2',
            serviceName: 'Powłoka ceramiczna 9H',
            basePriceNet: 120000, vatRate: 23, requireManualPrice: false,
            adjustment: { type: 'FIXED_NET', value: 0 }, note: '',
            finalPriceNet: 120000, finalPriceGross: 147600, status: 'CONFIRMED',
        },
    ],
    totalCost: { netAmount: 274472, grossAmount: 337600, currency: 'PLN' },
    mileageAtArrival: 42_150,
    keysHandedOver: true,
    documentsHandedOver: true,
    technicalNotes: 'Lakier po dwóch sezonach, sporo mikrorys na masce i klapie bagażnika.',
    colorId: 'graphite',
    acceptedByName: 'Michał Kowalczyk-Wiśniewski',
    settlement: null,
    createdAt: iso(-5),
    updatedAt: iso(-1),
};

const USER = {
    userId: 'u1', studioId: 's1', email: 'kontakt@studioblysk.pl',
    firstName: 'Michał', lastName: 'Kowal', role: 'OWNER',
    subscriptionStatus: 'ACTIVE', trialDaysRemaining: 0,
    permissions: null, trackWorkTime: false, idleTimeoutSeconds: 0,
};

const json = (route: Route, body: unknown) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

/**
 * Nadpisania wizyty na potrzeby pojedynczego testu. Status i rozliczenie
 * decydują o tym, KTÓRE przyciski stoją w szynie akcji nagłówka - a to one
 * rozpychały nagłówek, więc test musi umieć poprosić o ten najszerszy wariant
 * („Wystaw fakturę konsumencką").
 */
export interface VisitOverrides {
    status?: string;
    settlement?: { documentType: 'INVOICE' | 'RECEIPT' | 'OTHER' | null; revenueInvoiceId: string | null } | null;
}

export async function stubVisitDetailApi(
    context: BrowserContext,
    overrides: VisitOverrides = {},
): Promise<void> {
    const visit = { ...VISIT, ...overrides };
    await context.route(
        (url) => url.pathname.startsWith('/api/'),
        async (route) => {
            const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');

            if (path === '/v1/auth/me') return json(route, { success: true, user: USER });

            // Bramka abonamentu stoi przed całą aplikacją - bez niej widok się nie renderuje.
            if (path === '/v1/subscription/status') {
                return json(route, {
                    status: 'ACTIVE', isAccessible: true, daysRemaining: 30,
                    subscriptionEndsAt: iso(30), trialEndsAt: null, trialUsed: true,
                });
            }
            if (path === '/v1/subscription/my-plan') {
                return json(route, {
                    billingStatus: 'ACTIVE',
                    plan: { key: 'FULL', name: 'Pełny', monthlyPriceGrossCents: 29900 },
                    activeAddOns: [], pendingDowngrade: null,
                    periodEndsAt: iso(30), trialEndsAt: null, daysRemaining: 30,
                    monthlyCostCents: 29900, nextRenewalCostCents: 29900,
                });
            }
            if (path === '/v1/me/entitlements') {
                return json(route, { features: [], addOns: [], billingStatus: 'ACTIVE' });
            }

            // `visitApi` woła `/visits/...` (bez `/v1`), reszta modułów `/v1/...` -
            // prefiks jest więc opcjonalny w dopasowaniu.
            if (path === `/visits/${VISIT_ID}`) return json(route, { visit });
            if (path === `/visits/${VISIT_ID}/documents`) return json(route, []);
            if (path === `/visits/${VISIT_ID}/photos`) return json(route, { photos: [] });
            if (path === `/visits/${VISIT_ID}/damage-map`) {
                return json(route, { visitId: VISIT_ID, damageMap: null, updatedAt: null });
            }
            /*
             * Endpointy listowe MUSZĄ oddać tablicę. Zwrócenie `{}` z catch-alla
             * wywracało cały widok na `reminders.find is not a function` - test
             * mierzyłby wtedy ekran błędu, nie nagłówek wizyty.
             */
            if (path.endsWith('/comments')) return json(route, []);
            if (path.endsWith('/communication')) return json(route, { visitId: VISIT_ID, entries: [] });
            if (path.endsWith('/sms-reminder')) return json(route, []);
            if (path.endsWith('/products')) return json(route, []);
            if (path.endsWith('/technical-note/history')) return json(route, { entries: [] });
            if (path.startsWith('/v1/audit/feed')) {
                return json(route, { items: [], total: 0, page: 0, pageSize: 20 });
            }
            if (path === '/v1/audit/filters') return json(route, { actors: [], types: [] });

            // Reszta: pusto, byle nie 404 z toastem na pół ekranu.
            return json(route, {});
        },
    );
}
