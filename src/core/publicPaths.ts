// src/core/publicPaths.ts
//
// Strony aplikacji, które działają bez sesji: logowanie i rejestracja oraz strony
// otwierane z linku z tokenem (zdjęcia i głos z telefonu, karta wizyty klienta,
// podpis zdalny). Na nich 401 jest normalnym stanem, a nie wygasłą sesją.
const PUBLIC_PATHS = [
    '/login', '/signup', '/forgot-password', '/reset-password', '/confirm-password',
    '/m/upload', '/m/voice', '/m/contacts',
];

export function isPublicAppPath(pathname: string): boolean {
    return PUBLIC_PATHS.includes(pathname)
        // The role preview window handles an ended preview itself; /login there leads nowhere.
        || pathname === '/podglad'
        || pathname.startsWith('/vc/')
        || pathname.startsWith('/sign/')
        || pathname.startsWith('/m/sig/');
}
