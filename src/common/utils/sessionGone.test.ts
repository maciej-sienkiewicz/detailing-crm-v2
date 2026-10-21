// Sesja z linku (skan, przyjęcie z telefonu), która wygasła albo zniknęła, kończy
// odpytywanie - dawniej 404/401 co kilka sekund aż do zamknięcia karty.
import { describe, expect, it } from 'vitest';
import { isSessionGone } from './sessionGone';

const failed = (status?: number) => ({ response: status === undefined ? undefined : { status } });

describe('isSessionGone', () => {
    it('401, 403, 404 i 410 kończą odpytywanie', () => {
        for (const status of [401, 403, 404, 410]) expect(isSessionGone(failed(status)), String(status)).toBe(true);
    });

    it('błąd sieci i 5xx - próbujemy dalej', () => {
        expect(isSessionGone(failed())).toBe(false);
        expect(isSessionGone(failed(502))).toBe(false);
        expect(isSessionGone(new Error('Network Error'))).toBe(false);
    });
});
