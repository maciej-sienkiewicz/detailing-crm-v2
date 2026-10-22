import { describe, expect, it } from 'vitest';
import { isPublicAppPath } from './publicPaths';
import { LEGAL_DOCUMENTS, legalPath } from '@/modules/legal/documents';

describe('isPublicAppPath', () => {
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

    it('strony aplikacji nie są publiczne', () => {
        expect(isPublicAppPath('/dashboard')).toBe(false);
        expect(isPublicAppPath('/customers')).toBe(false);
    });
});
