// src/core/legacyUrls.ts
//
// Stare adresy aplikacji → nowe (audyt HTTP, P2-21). Trasy i parametry paska adresu są
// po angielsku, ale linki z wysłanych już pushy i e-maili, zakładki przeglądarki i powroty
// z logowania Facebook/Google niosą jeszcze polskie nazwy: `/zapytania`, `?widok=moj`,
// `/calendar/rezerwacja/:id`. Adres tłumaczy się raz, przy wejściu, zanim wyrenderuje
// się ekran (LegacyUrlRedirect w routerze) - widoki znają już tylko nowe nazwy.
//
// Tabele zostają, dopóki mogą przyjść stare linki: push i e-mail z linkiem żyją długo.

interface ParamRules {
    /** Stara nazwa → nowa. Nowa nazwa podana wprost wygrywa ze starą. */
    names?: Record<string, string>;
    /** Wartości parametru (pod nową nazwą): stara → nowa. */
    values?: Record<string, Record<string, string>>;
}

/** Stare ścieżki → nowe. */
const PATHS: ReadonlyArray<readonly [RegExp, (match: RegExpMatchArray) => string]> = [
    [/^\/zapytania\/?$/, () => '/inbox'],
    [/^\/calendar\/rezerwacja\/([^/]+)\/?$/, match => `/calendar/appointments/${match[1]}`],
    [/^\/finance\/?$/, () => '/finances'],
];

/** Wynik powrotu z logowania Facebook i Google (`?connection=`, `?google=`). */
const OAUTH_RESULT = { blad: 'error', wybierz: 'choose' };

/** Parametry tras po nowej ścieżce. */
const PARAMS: Record<string, ParamRules> = {
    '/instagram': {
        names: { widok: 'view', pokaz: 'show', okres: 'period', rok: 'year', polaczenie: 'connection', powod: 'reason' },
        values: {
            view: { przeglad: 'overview', moj: 'mine', konkurencja: 'competition', inspiracje: 'inspiration' },
            show: { profile: 'profiles', reklamy: 'ads', okolica: 'area' },
            connection: OAUTH_RESULT,
            google: OAUTH_RESULT,
            reason: {
                wygaslo: 'expired',
                anulowano: 'cancelled',
                blad: 'error',
                'brak-konta': 'no-account',
                'brak-wizytowki': 'no-listing',
                'brak-zgody': 'no-consent',
            },
        },
    },
    '/inbox': {
        names: { uklad: 'layout' },
        values: { view: { sprawy: 'cases', poczta: 'mail', wyslane: 'sent' }, layout: { tablica: 'board' } },
    },
    '/statistics/reports': {
        names: { okres: 'period', porownanie: 'compare' },
        values: {
            period: { tydzien: 'week', '2-tygodnie': 'two-weeks', miesiac: 'month' },
            compare: { poprzedni: 'previous', mediana: 'median' },
        },
    },
    '/scheduled-communication': { names: { kanal: 'channel' } },
};

/**
 * Push „Dostępny nowy raport" prowadził do `/statistics?raport=WEEK&od=…` i otwierał okno
 * „Raport PDF" w nagłówku Statystyk. Okna już nie ma - raport jest na zakładce „Raporty",
 * więc stary link przenosi tam, od razu na tę długość okresu.
 */
const REPORT_PERIOD: Record<string, string> = { WEEK: 'week', TWO_WEEKS: 'two-weeks', MONTH: 'month' };

const legacyReportLink = (pathname: string, params: URLSearchParams): string | null => {
    if (pathname !== '/statistics' || !params.has('raport')) return null;
    const period = REPORT_PERIOD[params.get('raport') ?? ''];
    return period ? `/statistics/reports?period=${period}` : '/statistics/reports';
};

const translatePath = (pathname: string): string => {
    for (const [pattern, target] of PATHS) {
        const match = pathname.match(pattern);
        if (match) return target(match);
    }
    return pathname;
};

const translateParams = (params: URLSearchParams, rules: ParamRules): URLSearchParams => {
    const next = new URLSearchParams();
    for (const [name, value] of params) {
        const renamed = rules.names?.[name];
        if (renamed && params.has(renamed)) continue;
        const key = renamed ?? name;
        next.append(key, rules.values?.[key]?.[value] ?? value);
    }
    return next;
};

/** Stare nazwy parametrów - kod aplikacji nie może ich już czytać ani zapisywać (pilnuje tego test). */
export const LEGACY_PARAM_NAMES: readonly string[] = [
    ...new Set([...Object.values(PARAMS).flatMap(rules => Object.keys(rules.names ?? {})), 'raport', 'od']),
];

/**
 * Nowy adres (ścieżka z query stringiem) dla starego albo `null`, gdy adres jest aktualny.
 * Fragment (`#…`) zostaje po stronie wołającego - tłumaczenie go nie dotyka.
 */
export function translateLegacyUrl(pathname: string, search: string): string | null {
    const params = new URLSearchParams(search);
    const report = legacyReportLink(pathname, params);
    if (report) return report;
    const path = translatePath(pathname);
    const rules = PARAMS[path];
    const query = (rules ? translateParams(params, rules) : params).toString();
    const current = params.toString();
    if (path === pathname && query === current) return null;
    return query ? `${path}?${query}` : path;
}
