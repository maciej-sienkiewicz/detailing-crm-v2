import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Jeden prefiks API (audyt HTTP, P2-16): każde wywołanie `apiClient` idzie pod `/api/v1`.
 * Backend trzyma stare adresy bez wersji tylko jako aliasy na okres przejściowy, więc
 * nowe wywołanie spod `/visits`, `/checkin` czy `/public/...` zadziała dziś i zepsuje się
 * po ich usunięciu - ten test łapie je od razu.
 */

const SRC = fileURLToPath(new URL('..', import.meta.url));

const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [path] : [];
    });

/** Pierwszy argument `apiClient.get(...)` itd., gdy jest napisem albo szablonem. */
const CALL = /\bapiClient\s*\.\s*(?:get|post|put|patch|delete|head|request)\s*(?:<(?:[^<>]|<[^<>]*>)*>)?\s*\(\s*([`'"])(.*?)\1/gs;
/** Stałe z adresem bazowym (`const BASE_PATH = '/v1/visits'`) w plikach wołających API. */
const BASE_CONST = /\bconst\s+(\w*(?:BASE|PATH)\w*)\s*=\s*([`'"])(\/[^`'"]*)\2/g;
/** `vinApiAt('/v1/vin')` - zestaw endpointów składany z adresu bazowego. */
const BASE_ARGUMENT = /\bvinApiAt\(\s*([`'"])(.*?)\1/g;

const unversioned = (url: string) => url.startsWith('/') && !url.startsWith('/v1/');

const findViolations = () => {
    const violations: string[] = [];
    let calls = 0;
    for (const file of sourceFiles(SRC)) {
        const source = readFileSync(file, 'utf8');
        if (!source.includes('apiClient') && !source.includes('vinApiAt(')) continue;
        const where = relative(SRC, file);
        for (const [, , url] of source.matchAll(CALL)) {
            calls += 1;
            if (unversioned(url)) violations.push(`${where}: ${url}`);
        }
        for (const [, name, , url] of source.matchAll(BASE_CONST)) {
            if (unversioned(url)) violations.push(`${where}: ${name} = ${url}`);
        }
        for (const [, , url] of source.matchAll(BASE_ARGUMENT)) {
            if (unversioned(url)) violations.push(`${where}: vinApiAt(${url})`);
        }
    }
    return { violations, calls };
};

describe('prefiks API', () => {
    it('każde wywołanie apiClient zaczyna się od /v1/', () => {
        const { violations, calls } = findViolations();
        // Skaner, który nic nie znalazł, przepuściłby wszystko.
        expect(calls).toBeGreaterThan(500);
        expect(violations).toEqual([]);
    });
});
