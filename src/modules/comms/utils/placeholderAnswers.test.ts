import { describe, expect, it } from 'vitest';
import { placeholderAnswers, remembersPlaceholder } from './placeholderAnswers';

// Szkic dla CarsLab, 29.10.2026: klient pyta o mycie auta z powłoką ceramiczną.
const draft =
    'Dzień dobry,\n\nchętnie umyjemy Golfa. [jak dbamy o powłokę ceramiczną przy myciu] W tym samym terminie odkurzymy wnętrze.\n\n' +
    'Możemy przyjąć auto [proponowany termin]. Jeśli ten dzień nie pasuje, prosimy o inny.\n\nPozdrawiamy';
const placeholders = ['[jak dbamy o powłokę ceramiczną przy myciu]', '[proponowany termin]'];

describe('co pracownik wpisał w miejsce znaczników', () => {
    it('odpowiedź o studiu zostaje zapamiętana, termin nie', () => {
        const sent = draft
            .replace('[jak dbamy o powłokę ceramiczną przy myciu]', 'Auta z powłoką myjemy szamponem o neutralnym pH, metodą dwóch wiader.')
            .replace('[proponowany termin]', 'w czwartek 30.10');

        expect(placeholderAnswers(draft, sent, placeholders)).toEqual([
            {
                topic: 'jak dbamy o powłokę ceramiczną przy myciu',
                answer: 'Auta z powłoką myjemy szamponem o neutralnym pH, metodą dwóch wiader.',
            },
        ]);
    });

    it('przepisane zdanie wokół znacznika - nie zgadujemy, nic nie zapamiętujemy', () => {
        const sent = 'Dzień dobry, myjemy bezpiecznie, zapraszamy w czwartek. Pozdrawiamy';
        expect(placeholderAnswers(draft, sent, placeholders)).toEqual([]);
    });

    it('znaczniki jednej rozmowy nie trafiają do wiedzy studia', () => {
        expect(remembersPlaceholder('[proponowany termin]')).toBe(false);
        expect(remembersPlaceholder('[cena po oględzinach]')).toBe(false);
        expect(remembersPlaceholder('[numer rejestracyjny]')).toBe(false);
        expect(remembersPlaceholder('[jak dbamy o powłokę ceramiczną przy myciu]')).toBe(true);
    });

    it('znacznik pozostawiony albo z nowym znacznikiem w środku nie jest odpowiedzią', () => {
        const sent = draft.replace('[jak dbamy o powłokę ceramiczną przy myciu]', 'Myjemy [jakim szamponem].');
        expect(placeholderAnswers(draft, sent, ['[jak dbamy o powłokę ceramiczną przy myciu]'])).toEqual([]);
    });
});
