// src/core/queryStaleTime.ts

/**
 * Jak długo dane uchodzą za świeże (`staleTime` React Query), zanim ponowne zamontowanie
 * widoku zapyta serwer jeszcze raz.
 *
 * Domyślne 0 zostaje dla danych operacyjnych - wizyt, rezerwacji, list. Część zapisów
 * nie unieważnia list w innych widokach, więc ponowne wejście na stronę musi je odświeżyć.
 * Dłużej żyje tylko to, co zmienia się rzadko i ma własne odświeżanie przy zapisie
 * (`setQueryData` albo `invalidateQueries` w mutacji). Bez tego każda zmiana strony
 * pytała ponownie o konfigurację studia, uprawnienia do modułów i katalogi.
 */
export const STALE_TIME = {
    /** Konfiguracja studia: firma, numeracja, automatyzacje, role, zgody, szablony. */
    config: 10 * 60_000,
    /** Kupione moduły - zakup i zmiana pakietu unieważniają je same. */
    entitlements: 5 * 60_000,
    /** Katalogi: cennik, kolory rezerwacji, kategorie, tagi zdjęć. */
    catalog: 5 * 60_000,
    /** Oferta: plany i dodatki do kupienia. */
    offer: 60 * 60_000,
    /** Zestawienia na pulpicie (przychód, rezerwacje z 12 miesięcy). */
    summary: 2 * 60_000,
} as const;
