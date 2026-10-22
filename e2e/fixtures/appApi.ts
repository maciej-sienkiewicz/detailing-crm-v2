import type { BrowserContext, Route } from '@playwright/test';

/**
 * Całe API aplikacji podstawione na potrzeby strażnika ruchu sieciowego
 * (`network-hygiene.spec.ts`). Backend nie stoi w CI, więc każda odpowiedź jest tutaj,
 * a każde żądanie `/api` trafia do `calls` - spec liczy je i sprawdza, czego wolno pytać.
 *
 * Gniazdo STOMP (SockJS pod `/ws-registry`) też jest udawane: bez tego brak backendu
 * dawał w konsoli błędy połączenia co 3 sekundy, a konsola ma tu być pusta.
 */

export interface ApiCall {
    method: string;
    path: string;
    search: string;
}

export interface AppApiOptions {
    /** `null` = właściciel (pełne uprawnienia); lista = kody uprawnień roli. */
    permissions?: string[] | null;
    /** Moduły studia: wszystkie albo żaden (pakiet bez dodatków). */
    modules?: 'all' | 'none';
}

export interface AppApi {
    calls: ApiCall[];
    /** Ścieżki bez własnej odpowiedzi w tym pliku - dostały `{}`. */
    unstubbed: Set<string>;
}

const iso = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 86_400_000).toISOString();

const FEATURES = [
    'CALENDAR', 'VISITS', 'CUSTOMERS', 'VEHICLES', 'DOCUMENTS', 'GALLERY', 'AI_LEADS',
    'INSTAGRAM_MONITORING', 'SMS_EMAIL', 'CAMPAIGNS', 'E_SIGNATURES', 'FINANCE', 'STATISTICS', 'PRODUCTS',
] as const;
const BASE_FEATURES = new Set(['CALENDAR', 'VISITS', 'CUSTOMERS', 'VEHICLES', 'DOCUMENTS', 'GALLERY']);

const CAPABILITIES = [
    'COMM_SEND_TRANSACTIONAL', 'COMM_SEND_CAMPAIGN', 'COMM_SMS_CREDITS', 'SIGNATURE_LOCAL',
    'SIGNATURE_REMOTE_REQUEST', 'FINANCE_ACCESS', 'FINANCE_INVOICE_ISSUE', 'FINANCE_KSEF',
    'AI_LEAD_ASSIST', 'INSTAGRAM_MONITOR', 'STATS_VIEW',
] as const;

const entitlements = (modules: 'all' | 'none') => ({
    plan: { key: modules === 'all' ? 'FULL' : 'BASIC', name: 'Pakiet', monthlyPriceGrossCents: 29900 },
    features: Object.fromEntries(FEATURES.map(key => [key, {
        enabled: modules === 'all' || BASE_FEATURES.has(key), source: 'PLAN', upsell: null,
    }])),
    capabilities: Object.fromEntries(CAPABILITIES.map(key => [key, {
        enabled: modules === 'all', displayName: key, missingFeatures: [], upsell: [],
    }])),
    activeAddOns: [],
});

const user = (permissions: string[] | null) => ({
    userId: 'u1', studioId: 's1', email: 'kontakt@studioblysk.pl', phoneNumber: '+48600000000',
    firstName: 'Michał', lastName: 'Kowal', role: permissions === null ? 'OWNER' : 'USER', roleName: null,
    subscriptionStatus: 'ACTIVE', daysRemaining: 30, subscriptionEndsAt: iso(30), trialEndsAt: null,
    permissions, trackWorkTime: false, idleTimeoutSeconds: 0, employeeId: null,
});

const json = (route: Route, body: unknown) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

/** Odpowiedzi według ścieżki (bez `/api`). Kolejność ma znaczenie: pierwsze trafienie wygrywa. */
const responses = (options: Required<AppApiOptions>): Array<[RegExp, unknown]> => [
    [/^\/v1\/auth\/me$/, { success: true, user: user(options.permissions) }],
    [/^\/v1\/subscription\/status$/, {
        status: 'ACTIVE', isAccessible: true, daysRemaining: 30, subscriptionEndsAt: iso(30),
        trialEndsAt: null, trialUsed: true,
    }],
    [/^\/v1\/me\/entitlements$/, entitlements(options.modules)],
    [/^\/v1\/subscription\/add-ons$/, []],
    [/^\/v1\/vehicle-metadata$/, []],
    [/^\/v1\/company$/, { name: 'Studio Błysk', nip: null, address: null, logoUrl: null }],

    // Powłoka: liczniki Sidebara - jedno zapytanie (dawniej pięć osobnych).
    [/^\/v1\/me\/badges$/, {
        leadsAttention: 0, unreadMail: 0, pendingLeaveRequests: 0, pendingWorkTimeCards: 0, pendingAttendanceSheets: 0,
    }],
    [/^\/v1\/comms\/threads$/, { items: [], page: { number: 1, size: 30, totalItems: 0, totalPages: 1 }, totalUnread: 0 }],
    [/^\/v1\/comms\/accounts$/, []],
    [/^\/v1\/me\/tasks\/summary$/, { total: 0, unread: 0 }],

    // Pulpit.
    [/^\/v1\/dashboard\/stats$/, {
        stats: {
            inProgress: 0, overdue: 0, readyForPickup: 0, incomingToday: 0, abandonedLast30Days: 0,
            inProgressDetails: [], readyForPickupDetails: [], incomingTodayDetails: [], abandonedDetails: [],
        },
        revenue: null, callActivity: null, recentCalls: [], googleReviews: null,
    }],
    [/^\/v1\/dashboard\/revenue-summary$/, {
        currentMonth: { grossAmount: 0, currency: 'PLN' }, previousMonth: { grossAmount: 0, currency: 'PLN' },
        deltaPercentage: 0, buckets: [],
    }],
    [/^\/v1\/dashboard\/appointment-summary$/, { currentMonth: { count: 0 }, previousMonth: { count: 0 }, deltaPercentage: 0, buckets: [] }],
    [/^\/v1\/dashboard\/hints$/, { hints: [] }],
    [/^\/v1\/tasks\/archive$/, { items: [], page: { number: 1, size: 20, totalItems: 0, totalPages: 1 } }],
    [/^\/v1\/tasks$/, []],

    // Kalendarz.
    [/^\/v1\/calendar\/events$/, { appointments: [], visits: [] }],
    [/^\/v1\/calendar\/custom-events$/, []],
    [/^\/v1\/calendar\/door-to-door$/, []],
    [/^\/v1\/employees\/leaves\/calendar$/, []],
    [/^\/v1\/appointment-colors$/, { items: [], page: { number: 1, size: 100, totalItems: 0, totalPages: 1 } }],
    [/^\/v1\/customers$/, { items: [], page: { number: 1, size: 50, totalItems: 0, totalPages: 1 } }],
    [/^\/v1\/services$/, { items: [], page: { number: 1, size: 500, totalItems: 0, totalPages: 1 } }],
    [/^\/v1\/settings\/visit-card$/, { enabled: false, sendByDefault: false }],
    [/^\/v1\/sms-campaigns\/automation$/, {}],
    [/^\/v1\/email-campaigns\/automation$/, {}],
];

export async function stubAppApi(context: BrowserContext, options: AppApiOptions = {}): Promise<AppApi> {
    const resolved: Required<AppApiOptions> = { permissions: options.permissions ?? null, modules: options.modules ?? 'all' };
    const table = responses(resolved);
    const api: AppApi = { calls: [], unstubbed: new Set() };

    // Predykat, nie glob: glob łapał też pliki źródłowe Vite z „/api/" w ścieżce.
    await context.route(url => url.pathname.startsWith('/api/'), async route => {
        const url = new URL(route.request().url());
        const path = url.pathname.replace(/^\/api/, '');
        api.calls.push({ method: route.request().method(), path, search: url.search });
        const hit = table.find(([pattern]) => pattern.test(path));
        if (hit) return json(route, hit[1]);
        api.unstubbed.add(`${route.request().method()} ${path}`);
        return json(route, {});
    });

    // SockJS najpierw pyta o /info, potem otwiera WebSocket - obie rzeczy udajemy.
    await context.route(url => url.pathname.startsWith('/ws-registry/') && url.pathname.endsWith('/info'), route =>
        json(route, { websocket: true, origins: ['*:*'], cookie_needed: true, entropy: 1 }));
    await context.routeWebSocket(/\/ws-registry\//, ws => {
        ws.send('o');
        ws.onMessage(message => {
            const frames = JSON.parse(String(message)) as string[];
            if (frames.some(frame => frame.startsWith('CONNECT'))) {
                ws.send(`a${JSON.stringify(['CONNECTED\nversion:1.2\nheart-beat:0,0\n\n\u0000'])}`);
            }
        });
    });

    return api;
}
