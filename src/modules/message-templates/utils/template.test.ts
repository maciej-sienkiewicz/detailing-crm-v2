// Podgląd szablonu w Ustawieniach komunikacji: fragment w [...] działa jak na serwerze
// (MessageTemplateRenderer) - znika, gdy zmienna w środku jest pusta.
import { describe, expect, it } from 'vitest';
import { previewSegments, resolveTemplate } from './template';

describe('resolveTemplate - fragmenty opcjonalne', () => {
    const template = '[Dodano: {{dodane}}.] [Usunięto: {{usuniete}}.] Razem {{nowa_cena}}[, dopłata {{roznica}}].';

    it('fragment z pustą zmienną znika, reszta traci nawiasy', () => {
        // W przykładowych danych nic nie usunięto.
        expect(resolveTemplate(template, true)).toBe('Dodano: Powłoka ceramiczna. Razem 3 690,00 zł, dopłata 2 490,00 zł.');
    });

    it('nawiasy bez zmiennej to zwykły tekst studia', () => {
        expect(resolveTemplate('[Promocja] {{nowa_cena}}', true)).toBe('[Promocja] 3 690,00 zł');
    });

    it('bez fragmentów opcjonalnych (pozostałe wiadomości) nawiasy zostają, jak są', () => {
        expect(resolveTemplate('[{{imie}}]')).toBe('[Jan]');
    });
});

describe('previewSegments - podgląd z podświetlonymi wartościami', () => {
    const join = (template: string, optional = false) => previewSegments(template, optional).map(s => s.text).join('');

    it.each([
        ['Cześć {{imie}}! Termin: {{data}} o {{godzina}}.', false],
        ['{{imie}}', false],
        ['Bez zmiennych', false],
        ['[{{imie}}] {{nieznana}} koniec', false],
        ['', false],
        ['[Dodano: {{dodane}}.] [Usunięto: {{usuniete}}.] Razem {{nowa_cena}}[, dopłata {{roznica}}].', true],
        ['  [Usunięto: {{usuniete}}.]  {{imie}}  ', true],
        ['{{usuniete}} {{imie}}', true],
        ['[Promocja] {{nowa_cena}}', true],
    ])('sklejone kawałki to dokładnie resolveTemplate: %s', (template, optional) => {
        expect(join(template, optional)).toBe(resolveTemplate(template, optional));
    });

    it('wartości zmiennych są oznaczone, tekst studia nie', () => {
        expect(previewSegments('Cześć {{imie}}! Do zobaczenia {{data}}.')).toEqual([
            { text: 'Cześć ', filled: false },
            { text: 'Jan', filled: true },
            { text: '! Do zobaczenia ', filled: false },
            { text: '15.06.2026', filled: true },
            { text: '.', filled: false },
        ]);
    });

    it('nieznana zmienna zostaje widoczna jako tekst, a nie jako wstawiona wartość', () => {
        expect(previewSegments('{{nieznana}}')).toEqual([{ text: '{{nieznana}}', filled: false }]);
    });
});
