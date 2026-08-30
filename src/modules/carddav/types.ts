// src/modules/carddav/types.ts

/** Jedno skonfigurowane konto CardDAV = jeden telefon z kontaktami studia. */
export interface CarddavAccountDto {
    accountId: string;
    deviceName: string;
    createdAt: string;
    /** Ostatnie zapytanie synchronizacji z telefonu; null = profil jeszcze nie zainstalowany. */
    lastSyncAt: string | null;
}

/**
 * Jednorazowy link instalacyjny. Backend serwuje pod nim PODPISANY profil
 * .mobileconfig (Content-Type: application/x-apple-aspen-config) z payloadem
 * com.apple.carddav.account: adres serwera, login i hasło aplikacyjne
 * wygenerowane dla tego jednego telefonu. Token w URL zastępuje ciasteczko
 * sesji, bo profil bywa pobierany inną przeglądarką (skan QR → Safari)
 * niż ta, w której zalogowany jest użytkownik.
 */
export interface CarddavProvisioningDto {
    provisioningId: string;
    installUrl: string;
    expiresAt: string;
}
