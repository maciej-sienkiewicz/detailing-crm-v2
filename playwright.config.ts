import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * Testy E2E (RWD) - osobne od vitesta.
 *
 * Vitest renderuje komponenty w jsdom, który NIE LICZY UKŁADU: każdy
 * `getBoundingClientRect()` zwraca tam same zera. Błąd, przez który powstał ten
 * plik - nagłówek wizyty łamiący tytuł po jednej literze na pionową kolumnę -
 * jest wyłącznie efektem liczenia flexboxa, więc w jsdom nie da się go zobaczyć
 * ANI w żaden sposób złapać. Stąd prawdziwa przeglądarka.
 *
 * Uruchomienie:  npm run test:e2e
 */

/*
 * Obraz CI niesie własnego Chromiuma (PLAYWRIGHT_BROWSERS_PATH), zwykle w innej
 * rewizji niż oczekuje zainstalowany pakiet playwright. Wskazujemy binarkę
 * wprost - dokładnie tak, jak robią to skrypty w `scripts/screenshot-*.mjs` -
 * zamiast dociągać drugą kopię przeglądarki. Gdy jej nie ma, zostawiamy pole
 * puste i Playwright użyje swojej własnej.
 */
const IMAGE_CHROMIUM = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const executablePath = existsSync(IMAGE_CHROMIUM) ? IMAGE_CHROMIUM : undefined;

const PORT = Number(process.env.E2E_PORT ?? 5173);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
    testDir: './e2e',
    // Układ mierzymy na konkretnej szerokości okna; równoległe wątki tylko
    // spowalniają start Vite, nie przyspieszają pomiaru.
    fullyParallel: false,
    workers: process.env.CI ? 1 : undefined,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['list']] : [['list']],
    timeout: 60_000,
    expect: { timeout: 10_000 },

    use: {
        baseURL,
        locale: 'pl-PL',
        timezoneId: 'Europe/Warsaw',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        launchOptions: { executablePath },
    },

    projects: [
        // Viewport ustawia każdy blok testów osobno (`test.use`), bo to właśnie
        // szerokość okna jest tu przedmiotem badania.
        { name: 'chromium' },
    ],

    webServer: {
        command: `npm run dev -- --host 127.0.0.1 --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
    },
});
