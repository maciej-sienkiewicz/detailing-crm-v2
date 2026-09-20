import { describe, expect, it } from 'vitest';
import { hasMaskedPii, isPiiMasked, joinPiiName, mergeMaskedPii, PII_MASK } from './piiAccess';

interface Row {
    id: string;
    customerName: string | null;
    contactIdentifier: string;
    status: string;
}

const FIELDS = ['customerName', 'contactIdentifier'] as const;

const row = (over: Partial<Row> = {}): Row => ({
    id: 'lead-1',
    customerName: 'Marek Nowak',
    contactIdentifier: 'marek@example.com',
    status: 'NEW',
    ...over,
});

/*
 * Zgłoszenie: „czasami po wykonaniu jakiejś operacji dane klienta zamieniają się
 * na gwiazdki". Rozgłoszenie WebSocketu niesie dane osobowe zamaskowane, bo topic
 * jest wspólny dla całego studia - a odbiorca, który MA prawo do danych, dostawał
 * przez to rekord uboższy niż ten, który już miał, i nadpisywał nim swój.
 */
describe('scalanie rekordu z rozgłoszenia', () => {
    it('maska nie nadpisuje nazwiska, które już znamy', () => {
        const merged = mergeMaskedPii(
            row(),
            row({ customerName: PII_MASK, contactIdentifier: PII_MASK, status: 'IN_PROGRESS' }),
            FIELDS
        );

        expect(merged.customerName).toBe('Marek Nowak');
        expect(merged.contactIdentifier).toBe('marek@example.com');
        // Pola spoza listy osobowej przyjmują nową wartość - po to przyszło zdarzenie.
        expect(merged.status).toBe('IN_PROGRESS');
    });

    it('prawdziwa nowa wartość nadpisuje starą', () => {
        const merged = mergeMaskedPii(row(), row({ customerName: 'Marek Nowak-Kowalski' }), FIELDS);

        expect(merged.customerName).toBe('Marek Nowak-Kowalski');
    });

    it('bez poprzedniego rekordu nie ma czego zachować', () => {
        const incoming = row({ customerName: PII_MASK });

        expect(mergeMaskedPii(undefined, incoming, FIELDS)).toBe(incoming);
    });

    it('gdy poprzednia wartość też była maską, nie udajemy, że coś wiemy', () => {
        const merged = mergeMaskedPii(
            row({ customerName: PII_MASK }),
            row({ customerName: PII_MASK }),
            FIELDS
        );

        expect(merged.customerName).toBe(PII_MASK);
    });

    it('nic do scalenia = ten sam obiekt, bez zbędnego renderu', () => {
        const previous = row();
        const incoming = row({ status: 'CONFIRMED' });

        expect(mergeMaskedPii(previous, incoming, FIELDS)).toBe(incoming);
    });

    it('null w poprzednim rekordzie nie zastępuje maski', () => {
        const merged = mergeMaskedPii(
            row({ customerName: null }),
            row({ customerName: PII_MASK }),
            FIELDS
        );

        expect(merged.customerName).toBe(PII_MASK);
    });
});

describe('wykrywanie maski', () => {
    it('rozpoznaje rekord, w którym cokolwiek osobowego przyjechało zamaskowane', () => {
        expect(hasMaskedPii(row(), FIELDS)).toBe(false);
        expect(hasMaskedPii(row({ contactIdentifier: PII_MASK }), FIELDS)).toBe(true);
    });

    it('sama wartość: maska to dokładnie sentinel serwera', () => {
        expect(isPiiMasked(PII_MASK)).toBe(true);
        expect(isPiiMasked('**')).toBe(false);
        expect(isPiiMasked(null)).toBe(false);
    });

    it('złożone nazwisko z jedną częścią zamaskowaną jest zamaskowane w całości', () => {
        expect(joinPiiName('Marek', PII_MASK)).toBe(PII_MASK);
        expect(joinPiiName('Marek', 'Nowak')).toBe('Marek Nowak');
        expect(joinPiiName(null, undefined)).toBeNull();
    });
});
