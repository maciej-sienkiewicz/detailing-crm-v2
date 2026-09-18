// scripts/check-employee-back-link.mjs
// Sprawdza, DOKĄD prowadzi strzałka powrotu „Pracownicy" na karcie pracownika.
//
// Powstał, bo strzałka kierowała pod `/team` - drugą, równoległą listę
// pracowników - zamiast tam, skąd naprawdę się na tę kartę wchodzi, czyli do
// Ustawień. Sam zrzut ekranu tego nie łapie: różnicę widać dopiero po kliknięciu.
//
// Uruchomienie:  node scripts/check-employee-back-link.mjs [baseUrl]
import { chromium } from 'playwright';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const ID = '2c9054cc-e560-455c-9129-1ff63af850fe';
const EXPECTED = '/settings?tab=team&view=employees';

const iso = (d) => new Date(d).toISOString();

const EMPLOYEE = {
    id: ID,
    userId: 'u2',
    firstName: 'Anna',
    lastName: 'Zielińska',
    fullName: 'Anna Zielińska',
    phone: '601 220 940',
    email: 'anna.zielinska@studioblysk.pl',
    account: null,
    createdAt: iso('2026-01-15'),
    updatedAt: iso('2026-09-01'),
    position: 'Detailer',
    hireDate: '2026-01-15',
    status: 'ACTIVE',
};

const json = (route, body) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

async function stub(context) {
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
        // Zakładki karty pracownika czytają te ścieżki jako LISTY i wołają na
        // nich `.filter` - domyślny pusty obiekt wywracał cały widok.
        if (/^\/v1\/employees\/[^/]+\/(leaves|contracts|documents|bonuses)$/.test(path)) {
            return json(route, []);
        }
        // Ewidencja czasu pracy - też lista.
        if (/^\/v1\/worktime\/team\/[^/]+\/periods$/.test(path)) return json(route, []);
        if (path === `/v1/employees/${ID}`) return json(route, EMPLOYEE);
        if (path === '/v1/employees') return json(route, { items: [], total: 0, page: 1, limit: 20 });
        // Ustawienia, na które wracamy: bez tego lądujemy na granicy błędu
        // zamiast na liście - a sprawdzamy właśnie, DOKĄD się wraca.
        if (path === '/v1/roles') return json(route, []);
        if (path === '/v1/roles/permissions') return json(route, []);
        return json(route, {});
    });
}

const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});

let failed = false;

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, locale: 'pl-PL' });
    await stub(context);
    const page = await context.newPage();
    page.on('console', (m) => { if (m.type() === 'error') console.log(`  [console] ${m.text().slice(0,200)}`); });

    await page.goto(`${BASE}/team/${ID}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Anna Zielińska', { timeout: 20_000 });

    await page.getByText('Pracownicy', { exact: true }).first().click();
    await page.waitForTimeout(600);

    const got = page.url().replace(BASE, '');
    const urlOk = got === EXPECTED;

    // Sam adres nie wystarcza: sprawdzamy, że to naprawdę zakładka „Pracownicy
    // i role" w Ustawieniach, a nie granica błędu pod właściwym URL-em.
    const landed = await page.getByText('Pracownicy i role').first()
        .isVisible({ timeout: 5_000 }).catch(() => false);

    const ok = urlOk && landed;
    if (!ok) failed = true;
    console.log(`${ok ? '\u2713' : '\u2717'} ${viewport.width}px  ->  ${got}${landed ? '' : '  (strona się nie wyrenderowała)'}`);
    if (!urlOk) console.log(`   oczekiwano: ${EXPECTED}`);

    await context.close();
}

// Trasa listy ma już nie istnieć: /team wpada w 404 aplikacji, nie w widok.
{
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pl-PL' });
    await stub(context);
    const page = await context.newPage();
    await page.goto(`${BASE}/team`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const body = (await page.textContent('body')) ?? '';
    // Stara lista miała własny nagłówek „Pracownicy" z przyciskiem dodawania.
    const stillThere = /Dodaj pracownika/i.test(body);
    if (stillThere) { failed = true; console.log('\u2717 /team nadal renderuje starą listę'); }
    else console.log('\u2713 /team nie renderuje już listy pracowników');
    await context.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
