// src/core/sessionUser.ts
//
// Która osoba jest pokazana w TEJ karcie - dla serwera, przy każdej zmianie danych.
//
// Ciasteczko sesji jest wspólne dla wszystkich kart. Gdy w jednej karcie ktoś przełączy
// się PIN-em albo zaloguje hasłem na inne konto, karta obok pokazuje dalej poprzednią
// osobę, a jej zapis szedł na konto nowej - tak właściciel nadpisał pracownikowi stopkę
// e-mail (zgłoszenie 03.11.2026). Sygnał między kartami (sessionLock.ts) nie zawsze
// dochodzi: localStorage bywa zablokowany, a uśpiona karta odbiera go z opóźnieniem.
// Dlatego każdy zapis niesie identyfikator pokazanej osoby, a serwer odrzuca go (409),
// gdy w sesji jest już ktoś inny. Odczytów nie oznaczamy: niczego nie zmieniają.

import { isProblem } from './problem';

export const EXPECTED_USER_HEADER = 'X-Expected-User';
export const SESSION_USER_CHANGED = 'SESSION_USER_CHANGED';
/** Zdarzenie okna: serwer odrzucił zapis, bo w sesji jest inna osoba (wysyła je apiClient). */
export const SESSION_USER_CHANGED_EVENT = 'auth:session-user-changed';

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

let shownUserId: string | null = null;

/** Ustawia AuthContext przy każdej zmianie osoby - przed renderem, który ją pokaże. */
export const setShownUser = (userId: string | null) => {
    shownUserId = userId;
};

/** Nagłówek dla żądania albo `undefined`, gdy nie trzeba go wysyłać. */
export const expectedUserFor = (method: string | undefined): string | undefined =>
    shownUserId && MUTATING_METHODS.has((method ?? 'get').toLowerCase()) ? shownUserId : undefined;

export const isSessionUserChanged = (error: unknown): boolean => isProblem(error, SESSION_USER_CHANGED);
