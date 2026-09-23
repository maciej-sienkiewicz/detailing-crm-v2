import { describe, expect, it } from 'vitest';
import { generateEntryCode, isRolePreviewShellPath, previewWindowUrl, readEntryCodeFromHash } from './entryCode';

describe('kod wejścia do podglądu roli', () => {
    it('to 32 losowe bajty w base64url bez dopełnienia - 43 znaki, jak oczekuje serwer', () => {
        const code = generateEntryCode();

        expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(generateEntryCode()).not.toBe(code);
    });

    it('koduje bajty w alfabecie base64url (bez + i /)', () => {
        const allOnes = generateEntryCode(bytes => bytes.fill(0xff));

        expect(allOnes).toBe('_'.repeat(42) + '8');
    });

    it('jest czytany z części adresu po #, a każdy inny kształt jest odrzucany', () => {
        const code = generateEntryCode();

        expect(readEntryCodeFromHash(`#k=${code}`)).toBe(code);
        expect(readEntryCodeFromHash(`k=${code}`)).toBe(code);
        expect(readEntryCodeFromHash('')).toBeNull();
        expect(readEntryCodeFromHash('#k=krotki')).toBeNull();
        expect(readEntryCodeFromHash(`#k=${code.slice(1)}+`)).toBeNull();
        expect(readEntryCodeFromHash(`#x=${code}`)).toBeNull();
    });

    it('trafia do okna podglądu w części adresu, której przeglądarka nie wysyła serwerowi', () => {
        expect(previewWindowUrl('https://podglad.detailboost.pl/', 'KOD')).toBe('https://podglad.detailboost.pl/podglad#k=KOD');
        expect(previewWindowUrl('https://podglad.detailboost.pl', 'KOD')).toBe('https://podglad.detailboost.pl/podglad#k=KOD');
    });

    it('okno podglądu to tylko /podglad - aplikacja w ramce działa pod zwykłymi adresami', () => {
        expect(isRolePreviewShellPath('/podglad')).toBe(true);
        expect(isRolePreviewShellPath('/podglad/')).toBe(true);
        expect(isRolePreviewShellPath('/')).toBe(false);
        expect(isRolePreviewShellPath('/podglady')).toBe(false);
        expect(isRolePreviewShellPath('/settings/podglad')).toBe(false);
    });
});
