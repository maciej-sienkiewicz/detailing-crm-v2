import { describe, expect, it } from 'vitest';
import { firstSubmitErrorKey, submitErrorMessage } from './submitErrors';

// Zgłoszenie: „Nie można zapisać wizyty. Sprawdź zaznaczone pola formularza" - bez
// śladu w logach, bo walidacja działa w przeglądarce. Dymek ma mówić, czego brakuje.
describe('submitErrorMessage - dymek przy nieudanym zapisie wizyty', () => {
    it('mówi, czego brakuje, zamiast odsyłać do zaznaczonych pól', () => {
        expect(submitErrorMessage({ servicePrices: 'Podaj cenę: Powłoka ceramiczna' }))
            .toBe('Podaj cenę: Powłoka ceramiczna.');
    });

    it('pokazuje pierwszy błąd w kolejności pól i liczy pozostałe', () => {
        const errors = {
            color: 'Wybierz kolor rezerwacji albo dodaj nowy',
            startDateTime: 'Podaj datę rozpoczęcia',
            services: 'Dodaj przynajmniej jedną usługę',
        };
        expect(firstSubmitErrorKey(errors)).toBe('startDateTime');
        expect(submitErrorMessage(errors)).toBe('Podaj datę rozpoczęcia. Poza tym do poprawy: 2 pola.');
    });

    it('odmienia liczbę pól', () => {
        const many = (n: number) => Object.fromEntries(
            ['startDateTime', 'endDateTime', 'customer', 'services', 'servicePrices', 'color'].slice(0, n + 1).map(k => [k, 'Błąd']),
        );
        expect(submitErrorMessage(many(1))).toMatch(/1 pole\.$/);
        expect(submitErrorMessage(many(4))).toMatch(/4 pola\.$/);
        expect(submitErrorMessage(many(5))).toMatch(/5 pól\.$/);
    });

    it('bez błędów zostaje dawny komunikat', () => {
        expect(submitErrorMessage({})).toBe('Sprawdź zaznaczone pola formularza.');
    });
});
