import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ACCOUNT_STATUS_LABEL, accountStatusOf, invitationSummary } from './accountStatus';
import type { EmployeeAccountInfo } from '../types';

// Godziny w zdaniu o zaproszeniu są czasem polskim, tak jak widzi je zarządzający.
const originalTz = process.env.TZ;
beforeAll(() => { process.env.TZ = 'Europe/Warsaw'; });
afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
});

const account = (overrides: Partial<EmployeeAccountInfo> = {}): EmployeeAccountInfo => ({
    userId: 'user-1',
    roleId: null,
    isActive: true,
    email: 'anna.nowak@example.com',
    invitationPending: true,
    invitationSentAt: '2026-09-21T12:05:00Z',
    invitationExpiresAt: '2026-09-23T12:05:00Z',
    ...overrides,
});

describe('accountStatusOf - plakietka konta na karcie pracownika', () => {
    it('konto z niewykorzystanym zaproszeniem czeka na aktywację, choć nie jest zablokowane', () => {
        expect(accountStatusOf(account())).toBe('pending');
        expect(ACCOUNT_STATUS_LABEL[accountStatusOf(account())]).toBe('Czeka na aktywację');
    });

    it('„Konto aktywne" dopiero, gdy pracownik aktywował konto', () => {
        expect(accountStatusOf(account({ invitationPending: false }))).toBe('active');
    });

    it('blokada wygrywa z zaproszeniem - zablokowany i tak się nie zaloguje', () => {
        expect(accountStatusOf(account({ isActive: false }))).toBe('blocked');
        expect(accountStatusOf(account({ isActive: false, invitationPending: false }))).toBe('blocked');
    });

    it('pracownik bez konta', () => {
        expect(accountStatusOf(null)).toBe('none');
    });

    it('odpowiedź bez informacji o zaproszeniu traktuje konto jak dotąd - jako aktywne', () => {
        expect(accountStatusOf(account({ invitationPending: undefined }))).toBe('active');
    });
});

describe('invitationSummary - co się stało z zaproszeniem', () => {
    const beforeExpiry = new Date('2026-09-22T08:00:00Z');

    it('link działa: kiedy i dokąd poszło zaproszenie oraz do kiedy można z niego skorzystać', () => {
        expect(invitationSummary(account(), beforeExpiry)).toBe(
            'Zaproszenie wysłane 21.09.2026, 14:05 na anna.nowak@example.com. Link działa do 23.09.2026, 14:05.',
        );
    });

    it('link wygasł - zdanie mówi, że trzeba wysłać nowy', () => {
        expect(invitationSummary(account(), new Date('2026-09-23T12:05:00Z'))).toBe(
            'Zaproszenie wysłane 21.09.2026, 14:05 na anna.nowak@example.com. Link wygasł 23.09.2026, 14:05 - wyślij nowy.',
        );
    });

    it('wysyłka przy zakładaniu konta się nie udała', () => {
        expect(invitationSummary(account({ invitationSentAt: null, invitationExpiresAt: null }), beforeExpiry)).toBe(
            'Nie udało się wysłać zaproszenia na anna.nowak@example.com. Wyślij je ponownie.',
        );
    });
});
