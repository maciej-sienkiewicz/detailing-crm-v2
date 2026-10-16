// src/modules/checkin/utils/checkinErrorMessage.ts
//
// Jedno zdanie po polsku na każdy błąd przyjęcia - w stopce kreatora, w oknie dokumentów
// i na ekranie wczytywania.
//
// Wcześniej stopka i okno brały w ostateczności `error.message`, czyli surowy tekst axiosa
// („Network Error", „Request failed with status code 500"). Sprzedawca przy ladzie,
// z klientem obok, nie wiedział z tego, czy przyjęcie się zapisało i co ma teraz zrobić.
// Dlatego każda gałąź mówi DWIE rzeczy: co się stało i co z danymi.
//
// Komunikat z backendu przechodzi wyłącznie przy 4xx - tam backend opisuje konkretny
// powód po polsku („Rezerwacja została już przyjęta"). Przy 5xx przysyła ogólnik
// („Wystąpił nieoczekiwany błąd…"), który nie mówi, czy cokolwiek się zapisało.

import { isAxiosError } from 'axios';

export interface CheckinErrorTexts {
    /** Brak odpowiedzi: zerwane połączenie, serwer nieosiągalny. */
    offline: string;
    /** 5xx: serwer odpowiedział, ale operacji nie wykonał. */
    server: string;
    /** Wszystko inne, także 4xx bez komunikatu. */
    fallback: string;
}

/** Zapis przyjęcia (utworzenie wizyty, poprawka usług szkicu) - stopka kreatora. */
export const SAVE_ERROR_TEXTS: CheckinErrorTexts = {
    offline: 'Brak połączenia z serwerem. Dane formularza są zachowane, spróbuj ponownie.',
    server: 'Serwer nie zapisał przyjęcia. Dane formularza są zachowane, spróbuj ponownie.',
    fallback: 'Nie udało się zapisać przyjęcia. Dane formularza są zachowane, spróbuj ponownie.',
};

/**
 * Poprawka usług szkicu („Wróć do formularza" → zapis). Szkic istnieje, ale backend nie robi
 * poprawki atomowo (usługi, potem usunięcie starych dokumentów, potem nowe), więc po błędzie
 * nie wolno obiecać, że na serwerze zostały poprzednie usługi.
 */
export const REVISE_ERROR_TEXTS: CheckinErrorTexts = {
    offline: 'Brak połączenia z serwerem. Zmiany usług mogły się nie zapisać.',
    server: 'Serwer nie dokończył zapisu usług.',
    fallback: 'Nie udało się zapisać zmian w usługach.',
};

/** Okno dokumentów: szkic wizyty już istnieje, więc nic z niego nie przepada. */
export const DOCUMENTS_ERROR_TEXTS: CheckinErrorTexts = {
    offline: 'Brak połączenia z serwerem. Przyjęcie jest zapisane, spróbuj ponownie.',
    server: 'Serwer nie wykonał tej operacji. Przyjęcie jest zapisane, spróbuj ponownie.',
    fallback: 'Coś poszło nie tak. Przyjęcie jest zapisane, spróbuj ponownie.',
};

/** Odczyt danych przed przyjęciem - jeszcze nic nie zostało zapisane. */
export const LOAD_ERROR_TEXTS: CheckinErrorTexts = {
    offline: 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.',
    server: 'Serwer nie odpowiedział poprawnie. Spróbuj ponownie za chwilę.',
    fallback: 'Nie udało się wczytać danych. Spróbuj ponownie.',
};

const statusOf = (error: unknown): number | undefined => {
    const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
    return typeof status === 'number' ? status : undefined;
};

const backendMessageOf = (error: unknown): string | undefined => {
    const message = (error as { response?: { data?: { message?: unknown } } } | null)?.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : undefined;
};

/**
 * Polski komunikat dla błędu wywołania API.
 *
 * Kolejność ma znaczenie: brak odpowiedzi sprawdzamy przed statusem, bo zerwane
 * połączenie nie ma statusu, a nie jest „innym błędem" - to najczęstszy przypadek
 * przy ladzie (Wi-Fi w warsztacie) i jedyny, w którym ponowienie zwykle pomaga od razu.
 */
export function checkinErrorMessage(error: unknown, texts: CheckinErrorTexts = SAVE_ERROR_TEXTS): string {
    const status = statusOf(error);

    if (status === undefined) {
        // Anulowane żądanie (ERR_CANCELED) to decyzja aplikacji, nie awaria sieci.
        const noResponse = isAxiosError(error) && error.code !== 'ERR_CANCELED';
        return noResponse ? texts.offline : texts.fallback;
    }
    if (status >= 500) return texts.server;
    if (status >= 400) return backendMessageOf(error) ?? texts.fallback;
    return texts.fallback;
}
