import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isPublicAppPath } from './publicPaths';
import { LEGAL_DOCUMENTS, legalPath } from '@/modules/legal/documents';

/**
 * Goła trasa routera (`lazyBare`: bez Layoutu i bez ProtectedRoute) to strona otwierana
 * z linku z tokenem albo ekran logowania. Jeśli nie ma jej na liście publicznych,
 * `/auth/me` zwraca na niej 401, a interceptor wyrzuca telefon klienta na /login.
 * Tak przestało działać skanowanie produktu telefonem (`/m/scan`).
 */

const ROUTER = readFileSync(new URL('./router.tsx', import.meta.url), 'utf8');

/** `path: '…'` tuż przed `...lazyBare(…)` w tym samym obiekcie trasy. */
const bareRoutes = [...ROUTER.matchAll(/path:\s*'([^']+)',\s*\.\.\.lazyBare\(([^\n]*)/g)]
    .map(([, path, target]) => ({ path, target }))
    // Stare adresy wewnątrz aplikacji tylko przekierowują i działają po zalogowaniu.
    .filter(route => !/Redirect\)/.test(route.target));

/** `/vc/:token` → `/vc/x`: przykładowy adres, jaki zobaczy przeglądarka. */
const sample = (path: string) => path.replace(/:[^/]+/g, 'x');

describe('isPublicAppPath', () => {
    it('obejmuje każdą gołą trasę routera', () => {
        expect(bareRoutes.length).toBeGreaterThanOrEqual(10);
        const notPublic = bareRoutes.map(route => route.path).filter(path => !isPublicAppPath(sample(path)));
        expect(notPublic).toEqual([]);
    });

    // Dokumenty prawne czyta ktoś bez konta (recenzent Google/Mety, przyszły klient).
    // 401 z /auth/me nie może go wtedy wyrzucać na /login.
    it.each(LEGAL_DOCUMENTS.map(doc => legalPath(doc.slug)))('dokument %s jest publiczny', path => {
        expect(isPublicAppPath(path)).toBe(true);
    });

    // Strony telefonu z kodu QR działają bez logowania. Wygasły kod skanera nie może
    // wyrzucać telefonu na ekran logowania do CRM-a.
    it.each(['/m/upload', '/m/scan', '/m/contacts', '/m/voice'])('strona telefonu %s jest publiczna', path => {
        expect(isPublicAppPath(path)).toBe(true);
    });

    it('nie obejmuje stron aplikacji', () => {
        expect(isPublicAppPath('/dashboard')).toBe(false);
        expect(isPublicAppPath('/customers')).toBe(false);
        expect(isPublicAppPath('/calendar')).toBe(false);
        expect(isPublicAppPath('/m')).toBe(false);
        expect(isPublicAppPath('/employees/x')).toBe(false);
    });
});
