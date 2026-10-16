// Zgłoszenie z lady: po „Wróć do formularza" zapis usług kończył się błędem serwera,
// a stopka pokazywała ogólnik albo surowy tekst axiosa. Sprzedawca nie wiedział, czy
// przyjęcie się zapisało ani co zrobić, a klient czekał. Każdy komunikat ma więc
// mówić po polsku, co się stało i że wpisane dane zostały.
import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import {
    checkinErrorMessage,
    DOCUMENTS_ERROR_TEXTS,
    LOAD_ERROR_TEXTS,
    SAVE_ERROR_TEXTS,
} from './checkinErrorMessage';

const withResponse = (status: number, data: unknown) => {
    const error = new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE');
    error.response = { status, data, statusText: '', headers: {}, config: { headers: new AxiosHeaders() } };
    return error;
};

describe('checkinErrorMessage', () => {
    it('brak odpowiedzi serwera: mówi o połączeniu i o zachowanych danych, nie „Network Error"', () => {
        const error = new AxiosError('Network Error', 'ERR_NETWORK');

        expect(checkinErrorMessage(error)).toBe(
            'Brak połączenia z serwerem. Dane formularza są zachowane, spróbuj ponownie.',
        );
    });

    it('5xx: nie przepuszcza ogólnika z backendu, tylko mówi, że przyjęcie się nie zapisało', () => {
        const error = withResponse(500, {
            message: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie lub skontaktuj się z pomocą techniczną.',
        });

        expect(checkinErrorMessage(error)).toBe(
            'Serwer nie zapisał przyjęcia. Dane formularza są zachowane, spróbuj ponownie.',
        );
    });

    it('4xx: pokazuje powód z backendu', () => {
        const error = withResponse(422, { message: 'Rezerwacja została już przyjęta.' });

        expect(checkinErrorMessage(error)).toBe('Rezerwacja została już przyjęta.');
    });

    it('4xx bez komunikatu i błąd spoza API: polski fallback zamiast angielskiego error.message', () => {
        expect(checkinErrorMessage(withResponse(400, {}))).toBe(SAVE_ERROR_TEXTS.fallback);
        expect(checkinErrorMessage(withResponse(404, { message: '   ' }))).toBe(SAVE_ERROR_TEXTS.fallback);
        expect(checkinErrorMessage(new Error('Cannot read properties of undefined'))).toBe(SAVE_ERROR_TEXTS.fallback);
        expect(checkinErrorMessage(undefined)).toBe(SAVE_ERROR_TEXTS.fallback);
    });

    it('anulowane żądanie to nie zerwane połączenie', () => {
        expect(checkinErrorMessage(new AxiosError('canceled', 'ERR_CANCELED'))).toBe(SAVE_ERROR_TEXTS.fallback);
    });

    it('inne konteksty dostają własne zdania dla tych samych przypadków', () => {
        expect(checkinErrorMessage(withResponse(503, {}), DOCUMENTS_ERROR_TEXTS)).toBe(DOCUMENTS_ERROR_TEXTS.server);
        expect(checkinErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'), LOAD_ERROR_TEXTS))
            .toBe(LOAD_ERROR_TEXTS.offline);
    });
});
