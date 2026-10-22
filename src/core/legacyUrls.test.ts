import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LEGACY_PARAM_NAMES, translateLegacyUrl } from './legacyUrls';

/**
 * Trasy i parametry aplikacji po angielsku (audyt HTTP, P2-21), a stare linki działają:
 * wysłane już pushe i e-maile, zakładki przeglądarki i powroty z logowania Facebook/Google
 * niosą polskie nazwy, więc tłumaczy je `translateLegacyUrl` przy wejściu na stronę.
 */
const go = (url: string) => {
    const [path, query = ''] = url.split('?');
    return translateLegacyUrl(path, query ? `?${query}` : '');
};

describe('stare linki prowadzą tam, gdzie obiecywały', () => {
    it.each([
        // Push „Nowa rezerwacja" (PushMessages)
        ['/calendar/rezerwacja/a-1?start=2026-10-01T08:00:00Z', '/calendar/appointments/a-1?start=2026-10-01T08%3A00%3A00Z'],
        // Push o reklamach i okolicy, podpowiedź na Tablicy
        ['/instagram?widok=konkurencja&pokaz=reklamy', '/instagram?view=competition&show=ads'],
        ['/instagram?widok=konkurencja&pokaz=okolica', '/instagram?view=competition&show=area'],
        // Powrót z logowania Facebook i Google
        ['/instagram?widok=moj&polaczenie=ok', '/instagram?view=mine&connection=ok'],
        ['/instagram?widok=moj&polaczenie=blad&powod=brak-konta', '/instagram?view=mine&connection=error&reason=no-account'],
        ['/instagram?widok=moj&google=wybierz', '/instagram?view=mine&google=choose'],
        ['/instagram?widok=moj&google=blad&powod=brak-zgody', '/instagram?view=mine&google=error&reason=no-consent'],
        // Push z raportem właściciela (OwnerReportScheduler) - z okna „Raport PDF” na zakładkę Raporty
        ['/statistics?raport=WEEK&od=2026-10-12', '/statistics/reports?period=week'],
        ['/statistics?raport=TWO_WEEKS&od=2026-10-05', '/statistics/reports?period=two-weeks'],
        ['/statistics?raport=YEAR', '/statistics/reports'],
        // …i po zmianie na zakładkę Raporty, przed przejściem na angielskie parametry
        ['/statistics/reports?okres=tydzien', '/statistics/reports?period=week'],
        // Zakładki przeglądarki
        ['/statistics/reports?okres=miesiac&porownanie=mediana', '/statistics/reports?period=month&compare=median'],
        ['/zapytania', '/inbox'],
        ['/zapytania?view=poczta&thread=t1', '/inbox?view=mail&thread=t1'],
        ['/zapytania?uklad=tablica&lead=L1', '/inbox?layout=board&lead=L1'],
        ['/zapytania?view=wyslane', '/inbox?view=sent'],
        ['/finance', '/finances'],
        ['/finance?tab=cash', '/finances?tab=cash'],
        ['/scheduled-communication?kanal=email', '/scheduled-communication?channel=email'],
    ])('%s → %s', (legacy, current) => {
        expect(go(legacy)).toBe(current);
    });

    it('nowa nazwa podana wprost wygrywa ze starą', () => {
        expect(go('/instagram?view=overview&widok=konkurencja')).toBe('/instagram?view=overview');
    });

    it('dawne zakładki modułu zostawia dla resolveLegacyUrl (bez zgadywania tutaj)', () => {
        expect(go('/instagram?widok=tydzien')).toBe('/instagram?view=tydzien');
    });

    it.each([
        '/inbox', '/inbox?view=mail&thread=t1', '/calendar/appointments/a-1', '/finances?tab=cash',
        '/instagram?view=competition&show=ads', '/statistics/reports?period=week', '/calendar', '/',
        // Te same nazwy na innych trasach nic nie znaczą - zostają.
        '/settings?tab=mobile-devices&view=notifications', '/worktime?period=2026-10',
    ])('aktualny adres zostaje bez zmian: %s', current => {
        expect(go(current)).toBeNull();
    });
});

const SRC = fileURLToPath(new URL('..', import.meta.url));
const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [path] : [];
    });

describe('aplikacja zna już tylko nowe nazwy', () => {
    const OLD_ROUTES = ['/zapytania', '/calendar/rezerwacja', "'/finance'", '"/finance"', "'/podglad'"];
    /** Tu stare nazwy są celowo: tabele tłumaczenia i dawna ścieżka okna podglądu. */
    const TRANSLATORS = ['core/legacyUrls.ts', 'modules/role-preview/entryCode.ts'];
    const paramAccess = new RegExp(
        String.raw`\.(?:get|set|has|delete|append)\(\s*'(${LEGACY_PARAM_NAMES.join('|')})'`
        + String.raw`|[?&](${LEGACY_PARAM_NAMES.join('|')})=`,
    );

    it('żaden plik nie czyta starych parametrów ani nie linkuje do starych tras', () => {
        expect(LEGACY_PARAM_NAMES.length).toBeGreaterThan(8);
        const violations: string[] = [];
        for (const file of sourceFiles(SRC)) {
            const where = relative(SRC, file);
            if (TRANSLATORS.includes(where)) continue;
            const source = readFileSync(file, 'utf8');
            const param = source.match(paramAccess);
            if (param) violations.push(`${where}: parametr ${param[1] ?? param[2]}`);
            const route = OLD_ROUTES.find(old => source.includes(old));
            if (route) violations.push(`${where}: trasa ${route}`);
        }
        expect(violations).toEqual([]);
    });
});
