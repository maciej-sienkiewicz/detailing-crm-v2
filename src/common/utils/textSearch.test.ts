import { describe, expect, it } from 'vitest';
import { foldText, matchesSearch } from './textSearch';

// Zgłoszenie z produkcji: „Andrzej" i „nowak" znajdowały klienta, „Andrzej Nowak" - nie.
describe('matchesSearch', () => {
    const customer = (q: string) =>
        matchesSearch(q, ['Andrzej', 'Nowak', 'andrzej@example.pl'], ['+48 600 100 200']);

    it('imię i nazwisko w jednej frazie, w dowolnej kolejności', () => {
        expect(customer('Andrzej Nowak')).toBe(true);
        expect(customer('nowak andrzej')).toBe(true);
        expect(customer('  andrz   NOW ')).toBe(true);
    });

    it('każde słowo musi trafić', () => {
        expect(customer('Andrzej Kowalski')).toBe(false);
    });

    it('pusta fraza pasuje do wszystkiego', () => {
        expect(customer('')).toBe(true);
        expect(customer('   ')).toBe(true);
    });

    it('telefon niezależnie od spacji, myślników i prefiksu', () => {
        expect(customer('600100200')).toBe(true);
        expect(customer('600 100 200')).toBe(true);
        expect(customer('+48 600-100-200')).toBe(true);
        expect(matchesSearch('+48 600 100 200', [], ['600100200'])).toBe(true);
        expect(customer('Nowak 600100')).toBe(true);
        expect(customer('Nowak 700100')).toBe(false);
    });

    it('polskie znaki', () => {
        expect(matchesSearch('lukasz zolkiewski', ['Łukasz Żółkiewski'])).toBe(true);
        expect(foldText('ŻÓŁĆ')).toBe('zolc');
    });

    it('marka z modelem i tablica ze spacją lub bez', () => {
        const car = (q: string) => matchesSearch(q, ['BMW', 'X5', 'WA 12345', 'Jan Kowalski']);
        expect(car('BMW X5')).toBe(true);
        expect(car('kowalski bmw')).toBe(true);
        expect(car('WA12345')).toBe(true);
        expect(car('wa 12345')).toBe(true);
        expect(car('BMW X3')).toBe(false);
    });
});
