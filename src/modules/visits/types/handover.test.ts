import { describe, expect, it } from 'vitest';
import { restoreDraft, servicesFingerprint, type HandoverDraft, type HandoverState } from './handover';

const state = (overrides: Partial<HandoverState> = {}): HandoverState => ({
    paymentMethod: 'CARD',
    documentType: 'INVOICE',
    buyer: { nip: '', name: 'Jan Kowalski', addressLine1: '', addressLine2: '', email: '' },
    items: [{ name: 'Mycie', net: '', gross: '0.00', mode: 'GROSS', vatRate: '23' }],
    splitRemainder: false,
    remainderMethod: 'CASH',
    exemptionBasis: '',
    protocolSigned: false,
    sendToKsef: null,
    ...overrides,
});

const draft = (d: HandoverDraft): string => JSON.stringify(d);

describe('servicesFingerprint', () => {
    const grossOf = (service: { id: string }) => ({ a: 0, b: 120_000 })[service.id as 'a' | 'b'] ?? 0;

    it('zmienia się po dopisaniu usługi do wizyty', () => {
        const before = servicesFingerprint([{ id: 'a', serviceName: 'Mycie' }], grossOf);
        const after = servicesFingerprint(
            [{ id: 'a', serviceName: 'Mycie' }, { id: 'b', serviceName: 'Powłoka' }],
            grossOf
        );
        expect(after).not.toBe(before);
    });

    it('zmienia się po zmianie ceny usługi', () => {
        const before = servicesFingerprint([{ id: 'a', serviceName: 'Mycie' }], () => 0);
        const after = servicesFingerprint([{ id: 'a', serviceName: 'Mycie' }], () => 120_000);
        expect(after).not.toBe(before);
    });
});

describe('restoreDraft', () => {
    it('bez draftu zwraca stan świeży', () => {
        const fresh = state();
        expect(restoreDraft(fresh, null, 'fp')).toBe(fresh);
    });

    it('odtwarza draft w całości, gdy usługi się nie zmieniły', () => {
        const saved = state({ splitRemainder: true, protocolSigned: true });
        const restored = restoreDraft(state(), draft({ servicesFingerprint: 'fp', state: saved }), 'fp');
        expect(restored.splitRemainder).toBe(true);
        expect(restored.protocolSigned).toBe(true);
    });

    it('po dopisaniu usługi porzuca pozycje z draftu i bierze te z aktualnej wizyty', () => {
        // Dokładnie zgłoszony błąd: draft zapisany przy jednej usłudze za 0 zł
        // wracał po dopisaniu usługi za 1200 zł i przykrywał aktualne pozycje.
        const stale = state({
            items: [{ name: 'Mycie', net: '', gross: '0.00', mode: 'GROSS', vatRate: '23' }],
            splitRemainder: true,
        });
        const fresh = state({
            items: [
                { name: 'Mycie', net: '', gross: '0.00', mode: 'GROSS', vatRate: '23' },
                { name: 'Powłoka', net: '', gross: '1200.00', mode: 'GROSS', vatRate: '23' },
            ],
        });

        const restored = restoreDraft(fresh, draft({ servicesFingerprint: 'stary', state: stale }), 'nowy');

        expect(restored.items).toEqual(fresh.items);
        expect(restored.splitRemainder).toBe(false);
    });

    it('po zmianie usług zachowuje dane nabywcy i wybory dotyczące zapłaty', () => {
        const stale = state({
            buyer: { nip: '5213017228', name: 'Firma', addressLine1: 'ul. Polerska 7', addressLine2: '00-001 Warszawa', email: '' },
            paymentMethod: 'TRANSFER',
            sendToKsef: false,
        });

        const restored = restoreDraft(state(), draft({ servicesFingerprint: 'stary', state: stale }), 'nowy');

        expect(restored.buyer.name).toBe('Firma');
        expect(restored.paymentMethod).toBe('TRANSFER');
        expect(restored.sendToKsef).toBe(false);
    });

    it('uszkodzony draft nie blokuje wydania', () => {
        const fresh = state();
        expect(restoreDraft(fresh, '{nie-json', 'fp')).toBe(fresh);
        expect(restoreDraft(fresh, JSON.stringify({ foo: 1 }), 'fp')).toBe(fresh);
    });
});
