// Podgląd szablonu w Ustawieniach komunikacji: fragment w [...] działa jak na serwerze
// (MessageTemplateRenderer) - znika, gdy zmienna w środku jest pusta.
import { describe, expect, it } from 'vitest';
import { resolveTemplate } from './template';

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
