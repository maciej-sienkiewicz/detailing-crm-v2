// Kontakt leada z Instagrama to login („@jan.kowalski") - wygląda jak adres, bo ma
// małpę. Zanim przyszły takie leady, „małpa w identyfikatorze" wystarczała do
// rozpoznania maila; teraz taki lead dostawałby kompozytor maila zaadresowany do loginu.
import { describe, expect, it } from 'vitest';
import { leadEmail } from './leadPrimaryAction';
import { leadSourceLabel } from './leadFormat';

describe('leadEmail', () => {
    it('zwraca adres leada mailowego i formularzowego', () => {
        expect(leadEmail({ source: 'EMAIL', contactIdentifier: ' jan@wp.pl ' })).toBe('jan@wp.pl');
        expect(leadEmail({ source: 'FORM', contactIdentifier: 'anna.nowak@firma.com.pl' })).toBe('anna.nowak@firma.com.pl');
    });

    it('login z Instagrama nie jest adresem', () => {
        expect(leadEmail({ source: 'INSTAGRAM', contactIdentifier: '@jan.k' })).toBeNull();
        expect(leadEmail({ source: 'INSTAGRAM', contactIdentifier: 'instagram:1784' })).toBeNull();
        // Nawet gdyby ktoś wpisał ręcznie leada z loginem w roli kontaktu.
        expect(leadEmail({ source: 'MANUAL', contactIdentifier: '@jan.k' })).toBeNull();
    });

    it('telefon i brak leada nie dają adresu', () => {
        expect(leadEmail({ source: 'PHONE', contactIdentifier: '+48 600 100 200' })).toBeNull();
        expect(leadEmail(null)).toBeNull();
    });
});

describe('leadSourceLabel', () => {
    it('nazywa kanały tak, jak widzi je właściciel', () => {
        expect(leadSourceLabel('INSTAGRAM')).toBe('Instagram');
        expect(leadSourceLabel('FORM')).toBe('Formularz na stronie');
    });

    it('nieznany kanał od serwera zostaje pod własną nazwą zamiast zniknąć', () => {
        expect(leadSourceLabel('WHATSAPP')).toBe('WHATSAPP');
    });
});
