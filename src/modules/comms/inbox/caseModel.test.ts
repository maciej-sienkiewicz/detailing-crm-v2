import { describe, expect, it } from 'vitest';
import type { Lead, LeadServiceItem } from '../types';
import { describeLeadUrgency } from '../utils/leadUrgency';
import { caseNextStep, caseSentence, caseStatusChip, clientLine, formatAmount, rowAge } from './caseModel';

const NOW = Date.UTC(2026, 9, 8, 12);
const H = 3_600_000;
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const service = (gross: number): LeadServiceItem => ({
    id: `s-${gross}`, serviceId: null, name: 'Usługa', priceGross: gross, priceNet: null, vatRate: 23, note: null,
    quantity: 1, totalGross: gross, status: 'ACCEPTED', source: 'MANUAL', priceSource: 'MANUAL',
} as LeadServiceItem);

const lead = (extra: Partial<Lead> = {}): Lead => ({
    id: 'l1', source: 'EMAIL', status: 'NEW', contactIdentifier: 'jan@wp.pl', customerName: 'Jan', initialMessage: null,
    estimatedValue: 0, requiresVerification: false, customerId: null, appointmentId: null, visitId: null,
    assignedUserId: null, assignedUserName: null, threadId: 't1', tags: [], tagLabels: [], vehicleBrand: 'BMW', vehicleModel: 'X5',
    vehicleDetectionStatus: 'DONE', lostReasonCode: null, lostReasonLabel: null, lostReason: null, services: [],
    replyState: 'AWAITING_OUR_REPLY', waitingSince: ago(2 * H), lastInboundAt: ago(2 * H), lastOutboundAt: null,
    firstResponseAt: null, closedAt: null, owedSince: null, owedNote: null, createdAt: ago(3 * H), updatedAt: ago(2 * H),
    ...extra,
} as Lead);

const urgencyOf = (l: Lead) => describeLeadUrgency(l, undefined, NOW);
const replied = { lastOutboundAt: ago(70 * H), firstResponseAt: ago(70 * H), status: 'IN_PROGRESS' as const };

describe('rowAge', () => {
    it('minuty, godziny do dwóch dób, potem dni', () => {
        expect(rowAge(5 * 60_000)).toBe('5 min');
        expect(rowAge(27 * H)).toBe('27 godz.');
        expect(rowAge(3 * 24 * H)).toBe('3 dni');
    });
});

describe('formatAmount - kwota z serwera bez zaokrąglania', () => {
    it('chowa zerowe grosze, ale nie gubi wpisanego grosza', () => {
        expect(formatAmount(420000)).toBe('4 200 zł');
        // CLAUDE.md §1: 1899,99 zł to nie 1900 zł - zaokrąglenie do złotówek zmieniłoby cenę.
        expect(formatAmount(189999)).toBe('1 899,99 zł');
        expect(formatAmount(190000)).toBe('1 900 zł');
    });
});

describe('zdanie i krok następny sprawy', () => {
    it('nowe zapytanie: „Nowe zapytanie", krok - odpowiedź (z wyceną: „Wyślij wycenę")', () => {
        const l = lead({ services: [service(780000)], estimatedValue: 780000 });
        expect(caseSentence(l, urgencyOf(l))).toEqual({ text: 'Nowe zapytanie', hot: false });
        expect(caseStatusChip(l).label).toBe('Nowe zapytanie');
        expect(caseNextStep(l, urgencyOf(l))).toMatchObject({ kind: 'REPLY', title: 'Wyślij wycenę' });
    });

    it('klient odpisał na wysłaną wycenę: zdanie w kolorze, krok - umówienie wizyty', () => {
        const l = lead({ ...replied, services: [service(420000)], estimatedValue: 420000 });
        expect(caseSentence(l, urgencyOf(l))).toEqual({ text: 'Odpisał na wycenę', hot: true });
        expect(caseStatusChip(l)).toEqual({ label: 'Wycena wysłana', tone: 'accent' });
        expect(caseNextStep(l, urgencyOf(l))).toMatchObject({ kind: 'BOOK', hint: 'Klient dostanie potwierdzenie' });
    });

    it('zapytanie z telefonu bez maila: krok - zadzwoń', () => {
        const l = lead({ source: 'PHONE', contactIdentifier: '600 100 200', threadId: null });
        expect(caseNextStep(l, urgencyOf(l))).toMatchObject({ kind: 'CALL', href: 'tel:600100200' });
    });

    it('termin w kalendarzu: krok - zobacz termin', () => {
        const l = lead({ ...replied, appointmentId: 'a1' });
        expect(caseNextStep(l, urgencyOf(l)).kind).toBe('APPOINTMENT');
    });
});

describe('clientLine', () => {
    it('stały klient z liczbą wizyt, a bez kartoteki - nowy klient', () => {
        expect(clientLine({ email: 'a', customer: { id: 'c', fullName: 'Jan', phone: null, completedVisitCount: 3, totalSpentGross: 0, lastVisitAt: null }, vehicles: [], recentVisits: [], risk: { abandonedBookings: 0, abandonedLeads: 0 } }))
            .toBe('Stały klient, 3 wizyty');
        expect(clientLine(null)).toBe('Nowy klient');
    });
});
