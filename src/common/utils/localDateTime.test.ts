import { describe, it, expect } from 'vitest';
import { localDateTimeToInstant, instantToLocalDateTime } from './localDateTime';

describe('localDateTimeToInstant', () => {
    it('zamienia czas ścienny z pickera na instant', () => {
        const iso = localDateTimeToInstant('2026-09-23T20:15');
        // Ta sama chwila, niezależnie od strefy, w której leci test.
        expect(iso).toBe(new Date(2026, 8, 23, 20, 15).toISOString());
    });

    it('przepuszcza instant bez przesuwania go', () => {
        expect(localDateTimeToInstant('2026-09-23T18:15:00.000Z'))
            .toBe('2026-09-23T18:15:00.000Z');
    });

    it('pustą wartość traktuje jak brak terminu', () => {
        expect(localDateTimeToInstant('')).toBeNull();
        expect(localDateTimeToInstant(null)).toBeNull();
        expect(localDateTimeToInstant(undefined)).toBeNull();
    });

    it('nie wysyła śmieci do backendu', () => {
        expect(localDateTimeToInstant('kiedyś')).toBeNull();
    });
});

describe('instantToLocalDateTime', () => {
    it('pokazuje instant jako czas ścienny przeglądarki', () => {
        const instant = new Date(2026, 8, 23, 20, 15).toISOString();
        expect(instantToLocalDateTime(instant)).toBe('2026-09-23T20:15');
    });

    it('obcina sekundy, których picker nie obsługuje', () => {
        const instant = new Date(2026, 8, 23, 20, 15, 42).toISOString();
        expect(instantToLocalDateTime(instant)).toBe('2026-09-23T20:15');
    });

    it('jest idempotentna dla czasu ściennego', () => {
        expect(instantToLocalDateTime('2026-09-23T20:15')).toBe('2026-09-23T20:15');
    });

    it('pustą wartość traktuje jak brak terminu', () => {
        expect(instantToLocalDateTime(null)).toBeNull();
        expect(instantToLocalDateTime('')).toBeNull();
        expect(instantToLocalDateTime('kiedyś')).toBeNull();
    });
});

describe('round-trip', () => {
    it('picker -> API -> picker zwraca tę samą godzinę', () => {
        const local = '2026-09-23T20:15';
        expect(instantToLocalDateTime(localDateTimeToInstant(local))).toBe(local);
    });

    it('działa też przez zmianę czasu na zimowy', () => {
        const local = '2026-10-25T02:30';
        expect(instantToLocalDateTime(localDateTimeToInstant(local))).toBe(local);
    });
});
