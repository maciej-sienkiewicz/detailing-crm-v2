import { describe, expect, it } from 'vitest';
import { describeVisitCardAlreadySent } from './visitCardAlreadySent';

const link = (over: Partial<{ lastSmsSentAt: string | null; lastEmailSentAt: string | null }>) => ({
    token: 't', path: '/vc/t', url: 'https://x/vc/t', lastSmsSentAt: null, lastEmailSentAt: null, ...over,
});

describe('describeVisitCardAlreadySent', () => {
    it('nothing sent yet → no notice', () => {
        expect(describeVisitCardAlreadySent(null)).toBeNull();
        expect(describeVisitCardAlreadySent(undefined)).toBeNull();
        expect(describeVisitCardAlreadySent(link({}))).toBeNull();
    });

    it('sent by SMS → notice names the channel and the moment', () => {
        const r = describeVisitCardAlreadySent(link({ lastSmsSentAt: '2026-09-03T10:15:00Z' }));
        expect(r?.sentAt).toBe('2026-09-03T10:15:00Z');
        expect(r?.text).toContain('SMS-em');
        expect(r?.text).toContain('Kartę Rezerwacji');
        expect(r?.text).not.toContain('e-mailem');
    });

    it('sent on both channels → both named, latest wins as sentAt', () => {
        const r = describeVisitCardAlreadySent(link({ lastSmsSentAt: '2026-09-01T10:00:00Z', lastEmailSentAt: '2026-09-02T10:00:00Z' }));
        expect(r?.sentAt).toBe('2026-09-02T10:00:00Z');
        expect(r?.text).toContain('SMS-em');
        expect(r?.text).toContain('e-mailem');
        expect(r?.text).toContain('oraz');
    });
});
