// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { signatureHtmlToText, signatureTextToHtml } from './signatureText';

/**
 * Zgłoszenie z produkcji: stopka „Mikolaj Błaszczak / CarsLab" po zapisie wracała
 * do edytora jako nazwisko, pusta linia i wcięty „CarsLab". Serwer wypisywał HTML
 * z wcięciami, a odczyt brał je za treść.
 */
describe('stopka: tekst ↔ HTML', () => {
    it('dwie linie zapisują się jako jeden znacznik przejścia', () => {
        expect(signatureTextToHtml('Mikolaj Błaszczak\nCarsLab'))
            .toBe('<div>Mikolaj Błaszczak<br>CarsLab</div>');
    });

    it('podróż w obie strony nie zmienia tekstu', () => {
        const text = 'Mikolaj Błaszczak\nCarsLab';
        expect(signatureHtmlToText(signatureTextToHtml(text))).toBe(text);
    });

    it('HTML z wcięciami (stopki zapisane przed naprawą) czyta się poprawnie', () => {
        const prettyPrinted = '<div>\n Mikolaj Błaszczak<br>\n CarsLab\n</div>';

        expect(signatureHtmlToText(prettyPrinted)).toBe('Mikolaj Błaszczak\nCarsLab');
    });

    it('pusta linia wpisana przez człowieka zostaje', () => {
        expect(signatureHtmlToText('<div>Mikolaj<br><br>CarsLab</div>'))
            .toBe('Mikolaj\n\nCarsLab');
    });

    it('trzy i więcej pustych linii z rzędu to już ślad po formatowaniu', () => {
        expect(signatureHtmlToText('<div>A<br><br><br><br>B</div>')).toBe('A\n\nB');
    });

    it('bloki zamiast <br> też dają linie, bez pustki na krańcach', () => {
        expect(signatureHtmlToText('<div><div>Mikolaj</div><div>CarsLab</div></div>'))
            .toBe('Mikolaj\nCarsLab');
    });

    it('odstęp w środku linii zostaje nietknięty', () => {
        expect(signatureHtmlToText('<div>tel. 600 100 200</div>')).toBe('tel. 600 100 200');
    });

    it('znaki specjalne wracają jako znaki, nie encje', () => {
        const text = 'Jan "Ząbek" <szef>\nStudio & Detailing';
        expect(signatureHtmlToText(signatureTextToHtml(text))).toBe(text);
    });

    it('brak stopki to pusty tekst, nie wywrotka', () => {
        expect(signatureHtmlToText(null)).toBe('');
        expect(signatureHtmlToText('')).toBe('');
    });
});
