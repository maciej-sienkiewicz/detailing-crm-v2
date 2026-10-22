// src/core/publicPaths.ts
//
// Strony aplikacji, które działają bez sesji: logowanie i rejestracja, dokumenty prawne
// oraz strony otwierane z linku z tokenem (zdjęcia, głos, kontakty i skan produktu z telefonu,
// karta wizyty klienta, podpis zdalny). Na nich 401 jest normalnym stanem, a nie wygasłą sesją.
// Każdą nową gołą trasę z routera dopisz tutaj - pilnuje tego publicPaths.test.ts.
import { LEGAL_DOCUMENTS, legalPath } from '@/modules/legal/documents';
import { isRolePreviewShellPath } from '@/modules/role-preview/entryCode';

const PUBLIC_PATHS = [
    '/login', '/signup', '/forgot-password', '/reset-password', '/confirm-password',
    '/m/upload', '/m/voice', '/m/contacts', '/m/scan',
    // Regulamin, polityka itd. - linkowane z Google, Mety i Przelewy24, czytane bez konta.
    ...LEGAL_DOCUMENTS.map(doc => legalPath(doc.slug)),
];

export function isPublicAppPath(pathname: string): boolean {
    return PUBLIC_PATHS.includes(pathname)
        // The role preview window handles an ended preview itself; /login there leads nowhere.
        || isRolePreviewShellPath(pathname)
        || pathname.startsWith('/vc/')
        || pathname.startsWith('/sign/')
        || pathname.startsWith('/m/sig/');
}
