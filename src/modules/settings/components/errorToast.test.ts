// Własny dymek sekcji pokazujemy tylko wtedy, gdy globalny interceptor go nie pokazał.
import { describe, expect, it } from 'vitest';
import { toastedGlobally } from './errorToast';

const httpError = (status: number, skipErrorToast?: boolean) => ({
    response: { status, data: { detail: 'Powód z serwera' } },
    config: skipErrorToast === undefined ? {} : { skipErrorToast },
});

describe('toastedGlobally', () => {
    it('4xx pokazał interceptor', () => {
        expect(toastedGlobally(httpError(400))).toBe(true);
    });

    it('5xx i brak sieci interceptor przepuszcza bez słowa', () => {
        expect(toastedGlobally(httpError(500))).toBe(false);
        expect(toastedGlobally(new Error('offline'))).toBe(false);
    });

    // Bez tego warunku zapis z `skipErrorToast` kończył się ciszą: interceptor milczał,
    // a sekcja myślała, że dymek już był.
    it('żądanie z skipErrorToast nie dostało globalnego dymka nawet przy 4xx', () => {
        expect(toastedGlobally(httpError(400, true))).toBe(false);
    });
});
