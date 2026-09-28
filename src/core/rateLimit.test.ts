import { beforeEach, describe, expect, it } from 'vitest';
import { isRateLimited, rateLimitRetryAfterMs, resetRateLimitAnnouncements, shouldAnnounceRateLimit } from './rateLimit';

const tooMany = (retryAfter?: string) => ({ response: { status: 429, headers: retryAfter ? { 'retry-after': retryAfter } : {} } });

describe('rateLimit', () => {
    beforeEach(() => resetRateLimitAnnouncements());

    it('rozpoznaje 429 i czyta Retry-After, bez niego czeka okno limitu', () => {
        expect(isRateLimited(tooMany())).toBe(true);
        expect(isRateLimited({ response: { status: 500 } })).toBe(false);
        expect(rateLimitRetryAfterMs(tooMany('17'))).toBe(17_000);
        expect(rateLimitRetryAfterMs(tooMany())).toBe(60_000);
    });

    it('pięć odrzuconych list naraz to jeden komunikat, kolejny dopiero po oknie', () => {
        const now = 1_000_000;
        const shown = [0, 1, 2, 3, 4].map(i => shouldAnnounceRateLimit(tooMany('20'), now + i));

        expect(shown).toEqual([true, false, false, false, false]);
        expect(shouldAnnounceRateLimit(tooMany('20'), now + 20_001)).toBe(true);
    });
});
