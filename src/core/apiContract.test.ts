import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Kontrakt adresów API po audycie HTTP (P2-16, P2-17). Backend trzyma stare formy już tylko
 * jako aliasy na okres przejściowy, więc wywołanie ze starą formą zadziała dziś i zepsuje się
 * po ich usunięciu - ten test łapie je od razu:
 *  - każde wywołanie `apiClient` idzie pod `/api/v1`,
 *  - zmiana stanu to POST na akcji (`/archive`, `/restore`, `/cancel`, `/complete`…),
 *    zmiana statusu to PATCH,
 *  - żadnej ze starych ścieżek z listy [LEGACY_PATHS],
 *  - zakres dat to `from`/`to` (nie `dateFrom`, `startDate`…), fraza to `search`,
 *  - lista to `Page<T>` z `@/core/page` (P2-18) - żaden typ nie trzyma już dawnych kształtów
 *    stron (`pagination`, `itemsPerPage`, `nextBefore`, springowe `totalElements`),
 *  - błąd to `ApiProblem` z `@/core/problem` (P2-19) - ekran nie czyta ciała błędu sam
 *    i nie rzutuje go na własny kształt, tylko pyta `problemDetail`, `problemCode`…
 */

const SRC = fileURLToPath(new URL('..', import.meta.url));

const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [path] : [];
    });

/** Metoda i pierwszy argument `apiClient.get(...)` itd., gdy jest napisem albo szablonem. */
const CALL = /\bapiClient\s*\.\s*(get|post|put|patch|delete|head|request)\s*(?:<(?:[^<>]|<[^<>]*>)*>)?\s*\(\s*([`'"])(.*?)\2/gs;
/** Stałe z adresem bazowym (`const BASE_PATH = '/v1/visits'`) w plikach wołających API. */
const BASE_CONST = /\bconst\s+(\w*(?:BASE|PATH)\w*)\s*=\s*([`'"])(\/[^`'"]*)\2/g;
/** `vinApiAt('/v1/vin')` - zestaw endpointów składany z adresu bazowego. */
const BASE_ARGUMENT = /\bvinApiAt\(\s*([`'"])(.*?)\1/g;

const ACTION = /\/(archive|restore|exclude|cancel|complete|reopen|done|read)$/;
const WRITES_OTHER_THAN_POST = ['put', 'patch', 'delete'];

/** Stare formy z okresu przejściowego - backend usunie je w kolejnym wydaniu. */
const LEGACY_PATHS: RegExp[] = [
    /\/v1\/my\//, /\/v1\/profile\//, /\/my-status$/, /\/pin\/set$/, /\/my-plan$/, /\/roles\/assign\//,
    /\/mark-read$/, /\/events-custom/, /reservation-to-visit/, /reservation-summary/, /\/archived$/,
    /\/document-url$/, /\/pdf$/, /\/(packages\/)?update$/, /\/attendance-sheet(\/|$)/, /\/signature-request$/,
    /\/services\/$/, /\/protocols\/generate/, /\/visits\/deleted/, /\/sms-reminder(\/|$)/,
];

/** Nazwy parametrów zastąpione przez `from`/`to` i `search`. */
const LEGACY_PARAMS = ['dateFrom', 'dateTo', 'startDate', 'endDate'];
/** Tu `startDate`/`endDate` to daty samego urlopu (pola wniosku), a nie filtr zakresu. */
const DATE_FIELDS_NOT_RANGES = ['modules/employees/api/leaveRequestsApi.ts'];
/** `params.append('dateFrom', …)`, `params.set('query', …)`, `params.dateFrom = …`. */
const PARAM_WRITE = /\b(?:append|set)\(\s*['"](\w+)['"]|\bparams\.(\w+)\s*=/g;
/** Klucze obiektu `params: { … }` przekazanego do apiClient. */
const PARAMS_OBJECT = /\bparams:\s*\{([^{}]*)\}/g;

/** Pola dawnych kształtów stron w deklaracjach typów i obiektach. */
const OLD_PAGE_FIELD = /^\s+(itemsPerPage|nextBefore|totalElements)\??:/m;
/** `pagination` wolno tylko jako właściwość komponentu typu `PageMeta`. */
const OLD_PAGINATION = /^\s+pagination\??:[ \t]*(?!PageMeta\b)\S/gm;

/** Jedyne miejsca, które czytają surowe ciało błędu. */
const ERROR_BODY_READERS = [
    'core/problem.ts',
    // Błąd żądania o `responseType: 'blob'` przychodzi jako Blob - tu jest parsowany i oddany parserowi.
    'common/utils/blobFile.ts',
];
/** `error.response?.data`, `(err as …)?.response?.data` - odczyt ciała błędu z pominięciem parsera. */
const RAW_ERROR_BODY = /\.response\??\.data\b/;
/** Własny kształt błędu: `(error as { response?: … })` albo `AxiosError<{ message?: string }>`. */
const AD_HOC_ERROR_SHAPE = /as\s+\{\s*response\?:|AxiosError<\s*\{/;
/** Kopie parsera błędu sprzed P2-19. */
const LOCAL_ERROR_HELPER = /\b(?:const|function)\s+(apiErrorMessage|apiErrorStatus|apiErrorCode)\b/;

const scanErrors = () => {
    const violations: string[] = [];
    for (const file of sourceFiles(SRC)) {
        const where = relative(SRC, file);
        if (ERROR_BODY_READERS.includes(where)) continue;
        const source = readFileSync(file, 'utf8');
        if (RAW_ERROR_BODY.test(source)) violations.push(`${where}: ciało błędu czytane z pominięciem @/core/problem`);
        if (AD_HOC_ERROR_SHAPE.test(source)) violations.push(`${where}: własny kształt błędu - użyj ApiProblem`);
        const helper = source.match(LOCAL_ERROR_HELPER);
        if (helper) violations.push(`${where}: ${helper[1]} - to już jest w @/core/problem`);
    }
    return violations;
};

const scan = () => {
    const violations: string[] = [];
    let calls = 0;
    for (const file of sourceFiles(SRC)) {
        const source = readFileSync(file, 'utf8');
        const where = relative(SRC, file);
        if (!where.startsWith('common/i18n/')) {
            const field = source.match(OLD_PAGE_FIELD);
            if (field) violations.push(`${where}: pole ${field[1]} - lista to Page<T>`);
            if (OLD_PAGINATION.test(source)) violations.push(`${where}: pole pagination - lista to Page<T>`);
            OLD_PAGINATION.lastIndex = 0;
        }
        if (!source.includes('apiClient') && !source.includes('vinApiAt(')) continue;
        const isApiModule = /\/api\//.test(file);
        for (const [, method, , url] of source.matchAll(CALL)) {
            calls += 1;
            const path = url.split('?')[0];
            if (url.startsWith('/') && !url.startsWith('/v1/')) violations.push(`${where}: ${url} - poza /v1/`);
            // GET …/archive to lista archiwum (rzeczownik), a nie akcja.
            if (ACTION.test(path) && WRITES_OTHER_THAN_POST.includes(method)) {
                violations.push(`${where}: ${method.toUpperCase()} ${url} - akcja to POST`);
            }
            if (path.endsWith('/status') && method === 'put') violations.push(`${where}: PUT ${url} - status to PATCH`);
            if (url.includes('?query=') || url.includes('&query=')) violations.push(`${where}: ${url} - fraza to search`);
            const legacy = LEGACY_PATHS.find(pattern => pattern.test(path));
            if (legacy) violations.push(`${where}: ${url} - stara ścieżka (${legacy})`);
        }
        for (const [, name, , url] of source.matchAll(BASE_CONST)) {
            if (!url.startsWith('/v1/')) violations.push(`${where}: ${name} = ${url} - poza /v1/`);
            const legacy = LEGACY_PATHS.find(pattern => pattern.test(url));
            if (legacy) violations.push(`${where}: ${name} = ${url} - stara ścieżka (${legacy})`);
        }
        for (const [, , url] of source.matchAll(BASE_ARGUMENT)) {
            if (!url.startsWith('/v1/')) violations.push(`${where}: vinApiAt(${url}) - poza /v1/`);
        }
        if (!isApiModule || DATE_FIELDS_NOT_RANGES.includes(where)) continue;
        for (const [, appended, assigned] of source.matchAll(PARAM_WRITE)) {
            const name = appended ?? assigned;
            if (LEGACY_PARAMS.includes(name) || name === 'query') violations.push(`${where}: parametr ${name}`);
        }
        for (const [, body] of source.matchAll(PARAMS_OBJECT)) {
            const keys = body.split(',').map(part => part.split(':')[0].trim()).filter(Boolean);
            keys.filter(key => LEGACY_PARAMS.includes(key)).forEach(key => violations.push(`${where}: parametr ${key}`));
        }
    }
    return { violations, calls };
};

describe('kontrakt API', () => {
    it('każde wywołanie apiClient trzyma się konwencji adresów i parametrów', () => {
        const { violations, calls } = scan();
        // Skaner, który nic nie znalazł, przepuściłby wszystko.
        expect(calls).toBeGreaterThan(500);
        expect(violations).toEqual([]);
    });

    it('błąd API czyta się jednym typem - ApiProblem z @/core/problem', () => {
        expect(scanErrors()).toEqual([]);
    });
});
