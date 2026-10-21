import { test, expect, type Page } from '@playwright/test';
import { stubAppApi, type ApiCall, type AppApiOptions } from './fixtures/appApi';

/**
 * Strażnik ruchu sieciowego i konsoli.
 *
 * Audyt komunikacji z API (październik 2026) znalazł zapytania z zamkniętych okien,
 * te same dane pobierane kilka razy, przewidywalne 402/403 i wpisy w konsoli. Ten plik
 * pilnuje, żeby po poprawkach nie wróciły z następnym PR-em:
 *  - konsola przeglądarki zostaje pusta (żadnego error, warning ani nieobsłużonego wyjątku),
 *  - główne trasy mieszczą się w budżecie zapytań do API,
 *  - studio bez modułów i rola bez uprawnienia nie pytają o to, czego serwer im odmówi.
 *
 * Testy biegną na serwerze deweloperskim z React.StrictMode, który uruchamia efekty
 * dwa razy - dlatego `/auth/me` liczymy osobno (na produkcji idzie raz).
 */

test.use({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });

/** Wpisy, które pochodzą od narzędzi, a nie od aplikacji. */
const TOOLING_NOISE = [/^\[vite\]/, /Service Worker registration blocked by Playwright/];

/**
 * Budżet zapytań do API przy zimnym wejściu (bez `/auth/me`, które StrictMode dubluje).
 * Obniżaj go razem z poprawkami - nigdy nie podnoś, żeby przepchnąć zmianę.
 */
const COLD_LOAD_BUDGET = {
    '/dashboard': 15,
    '/calendar': 14,
} as const;

const watchConsole = (page: Page) => {
    const problems: string[] = [];
    page.on('console', message => {
        if (message.type() !== 'error' && message.type() !== 'warning') return;
        if (TOOLING_NOISE.some(pattern => pattern.test(message.text()))) return;
        problems.push(`${message.type()}: ${message.text().slice(0, 300)}`);
    });
    page.on('pageerror', error => problems.push(`pageerror: ${String(error).slice(0, 300)}`));
    return problems;
};

const withoutAuthCheck = (calls: ApiCall[]) => calls.filter(call => call.path !== '/v1/auth/me');
const describe = (calls: ApiCall[]) => calls.map(call => `${call.method} ${call.path}${call.search}`);

/** Czeka, aż aplikacja przestanie pytać serwer (cisza w sieci przez pół sekundy). */
const settle = async (page: Page, calls: ApiCall[]) => {
    let seen = -1;
    while (seen !== calls.length) {
        seen = calls.length;
        await page.waitForTimeout(500);
    }
};

const open = async (page: Page, path: string, options: AppApiOptions = {}) => {
    const api = await stubAppApi(page.context(), options);
    const problems = watchConsole(page);
    await page.goto(path);
    await expect(page.locator('#root')).not.toBeEmpty();
    await settle(page, api.calls);
    return { api, problems };
};

for (const [path, budget] of Object.entries(COLD_LOAD_BUDGET)) {
    test(`${path}: czysta konsola i zapytania w budżecie (${budget})`, async ({ page }) => {
        const { api, problems } = await open(page, path);

        expect(problems).toEqual([]);
        expect([...api.unstubbed], 'nowe zapytanie bez odpowiedzi w fixtures/appApi.ts').toEqual([]);
        const calls = withoutAuthCheck(api.calls);
        expect(calls.length, describe(calls).join('\n')).toBeLessThanOrEqual(budget);
    });
}

test('powrót na kalendarz pyta tylko o jego dane, nie o konfigurację i katalogi', async ({ page }) => {
    const { api, problems } = await open(page, '/calendar');

    await page.locator('a[href="/settings"]').first().click();
    await expect(page).toHaveURL(/\/settings$/);
    await settle(page, api.calls);
    const beforeReturn = api.calls.length;

    await page.locator('a[href="/calendar"]').first().click();
    await expect(page).toHaveURL(/\/calendar$/);
    await settle(page, api.calls);

    expect(problems).toEqual([]);
    const onReturn = api.calls.slice(beforeReturn);
    // Wizyty i rezerwacje to dane operacyjne - te mają się odświeżyć, reszta jest w cache.
    expect(onReturn.some(call => call.path === '/v1/calendar/events')).toBe(true);
    expect(describe(onReturn.filter(call => !/^\/v1\/calendar\//.test(call.path)))).toEqual([]);
});

test('studio bez modułów nie pyta o to, czego serwer mu odmówi (402)', async ({ page }) => {
    const gated = [
        /^\/v1\/sms-campaigns\/automation$/, /^\/v1\/email-campaigns\/automation$/,
        /^\/v1\/sms-credits\//, /^\/v1\/finance\//, /^\/v1\/ksef\//,
    ];
    const visited: ApiCall[] = [];
    const problems: string[] = [];
    for (const path of ['/calendar', '/dashboard', '/finance']) {
        const opened = await open(page, path, { modules: 'none' });
        visited.push(...opened.api.calls);
        problems.push(...opened.problems);
        await page.context().unrouteAll({ behavior: 'ignoreErrors' });
    }

    expect(problems).toEqual([]);
    expect(describe(visited.filter(call => gated.some(pattern => pattern.test(call.path))))).toEqual([]);
});

test('rola bez VISITS_VIEW nie pyta pulpitu o dane wizyt (403)', async ({ page }) => {
    const { api, problems } = await open(page, '/dashboard', { permissions: ['TASKS_VIEW'] });

    expect(problems).toEqual([]);
    const forbidden = api.calls.filter(call => /^\/v1\/dashboard\//.test(call.path) || call.path === '/v1/calendar/events');
    expect(describe(forbidden)).toEqual([]);
});
