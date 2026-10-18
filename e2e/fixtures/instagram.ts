import { readFileSync } from 'node:fs';
import type { BrowserContext, Route } from '@playwright/test';

/**
 * Moduł Instagram bez backendu: logowanie, abonament z dodatkiem Instagram i odpowiedzi
 * API modułu dla dojrzałego studia („Detailing Studio Mokotów", połączony Instagram
 * i wizytówka Google, 5 konkurentów, 23 reklamodawców w okolicy).
 *
 * Dane są celowo trudne dla wąskiego ekranu: długie nazwy firm („AUTO-SPA PREMIUM
 * DETAILING & CAR WRAPPING CENTRUM OCHRONY LAKIERU"), uchwyty z podkreślnikami, zasięg
 * 1 248 300. Właśnie na nich telefon gubił nazwy firm i łamał nazwy kont w pół słowa.
 *
 * `instagram-full.json` to migawka odpowiedzi GET liczona na 17.10.2026, 12:00 -
 * test zamraża zegar na tej chwili, więc „3 dni temu" i bieżący tydzień zgadzają się z danymi.
 */
export const FIXED_NOW = new Date('2026-10-17T12:00:00+02:00');

const USER = {
    userId: 'u1', studioId: 's1', email: 'kontakt@studio-mokotow.pl',
    firstName: 'Michał', lastName: 'Kowal', role: 'OWNER',
    subscriptionStatus: 'ACTIVE', trialDaysRemaining: 0,
    permissions: null, trackWorkTime: false, idleTimeoutSeconds: 0,
};

const iso = (days: number) => new Date(FIXED_NOW.getTime() + days * 86_400_000).toISOString();

const json = (route: Route, body: unknown) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

/** Szary kwadrat w miejscu zdjęć realizacji - układ zależy od ramki, nie od treści zdjęcia. */
const PIXEL = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mOsrAcAAX0BB/MmIM0AAAAASUVORK5CYII=',
    'base64',
);

// Odczyt pliku zamiast importu JSON: tsconfig testów e2e nie ma `resolveJsonModule`.
const responses = JSON.parse(
    readFileSync(new URL('./instagram-full.json', import.meta.url), 'utf8'),
) as Record<string, unknown>;

export async function stubInstagramApi(context: BrowserContext): Promise<void> {
    await context.route(url => url.pathname.includes('/__mock/img/'), route =>
        route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));

    await context.route(
        // Predykat, nie glob: „**/api/**" łapało też pliki źródłowe Vite (/src/.../api/...).
        url => url.pathname.startsWith('/api/'),
        async route => {
            const url = new URL(route.request().url());
            const path = url.pathname.replace(/^\/api/, '');

            if (path === '/v1/auth/me') return json(route, { success: true, user: USER });
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
                    activeAddOns: ['INSTAGRAM_MONITORING'], pendingDowngrade: null,
                    periodEndsAt: iso(30), trialEndsAt: null, daysRemaining: 30,
                    monthlyCostCents: 29900, nextRenewalCostCents: 29900,
                });
            }
            // Moduł płatny: bez włączonego dodatku widok renderuje się jako rozmyta zapowiedź.
            if (path === '/v1/me/entitlements') {
                return json(route, {
                    plan: { key: 'FULL', name: 'Pełny', monthlyPriceGrossCents: 29900 },
                    features: { INSTAGRAM_MONITORING: { enabled: true, source: 'ADD_ON', upsell: null } },
                    capabilities: {},
                    activeAddOns: ['INSTAGRAM_MONITORING'],
                });
            }
            if (path.startsWith('/v1/me/notification-preferences')) return json(route, []);

            // Generator: migawka trzyma tylko odczyty, a wynik generowania to odpowiedź na POST.
            if (path === '/v1/instagram/ai/generate' && route.request().method() === 'POST') {
                return json(route, {
                    postId: 'e2e-post',
                    content: 'Porsche 911 Carrera 4S po naszej wizycie: głębia koloru, jakiej lakier nie miał nawet w salonie.\n\n'
                        + 'Zakres prac:\n– korekta lakieru dwuetapowa\n– powłoka ceramiczna 9H\n\n#detailing #porsche #ceramika',
                    iterations: 1,
                    verificationPassed: true,
                    failedRules: [],
                    failedRuleDetails: [],
                });
            }

            const exact = responses[`${path}${url.search}`];
            if (exact !== undefined) return json(route, exact);
            // Lista inspiracji i kalendarz pytają z filtrami - migawka trzyma odpowiedź domyślną.
            const byPath = Object.keys(responses).find(key => key.split('?')[0] === path);
            if (byPath) return json(route, responses[byPath]);

            // Reszta aplikacji (liczniki w menu, powiadomienia): pusto, byle nie 404 z toastem.
            if (/count$/i.test(path)) return json(route, { count: 0 });
            return json(route, /s$|list|notifications/.test(path) ? [] : {});
        },
    );
}
