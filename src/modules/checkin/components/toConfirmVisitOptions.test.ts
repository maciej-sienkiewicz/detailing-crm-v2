// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { defaultNotificationOptions, toConfirmVisitOptions } from './NotificationSection';

/**
 * Karta Wizyty jest wysyłana przez backend w żądaniu potwierdzenia — i tylko tam.
 * Te testy pilnują, że decyzja z przełącznika trafia do tego żądania, bo brak flagi
 * oznacza po stronie serwera „nie wysyłaj", a drugie, osobne wywołanie dublowało SMS.
 */
describe('toConfirmVisitOptions', () => {
    it('przekazuje sendVisitCard, gdy przełącznik jest włączony', () => {
        const opts = defaultNotificationOptions(true, false, false, false, true);
        expect(toConfirmVisitOptions(opts).sendVisitCard).toBe(true);
    });

    it('pomija sendVisitCard, gdy przełącznik jest wyłączony (backend traktuje brak jak false)', () => {
        const opts = defaultNotificationOptions(true, false, false, false, false);
        expect(toConfirmVisitOptions(opts).sendVisitCard).toBeUndefined();
    });

    it('karta i mail powitalny są niezależne', () => {
        const opts = { ...defaultNotificationOptions(true, true, false, false, false), sendVisitCard: true };
        const out = toConfirmVisitOptions(opts);
        expect(out.sendEmail).toBe(true);
        expect(out.sendVisitCard).toBe(true);
        expect(out.emailOptions?.attachProtocol).toBe(true);
    });
});
