import { describe, expect, it } from 'vitest';
import type { CommMessage, LeadBooking } from '../types';
import { bookingGone, bookingMoment, bookingSmsLine, confirmationDraft } from './bookingNote';
import { withEvents } from './messageFormat';

// Zgłoszenie z produkcji: klient z formularza poprosił o rezerwację 2 listopada, termin
// był w kalendarzu, a po czterech dniach napisał, że nie dostał odpowiedzi.
const booking = (patch: Partial<LeadBooking> = {}): LeadBooking => ({
    appointmentId: 'a1',
    bookedAt: new Date(2026, 9, 18, 12, 30).toISOString(),
    bookedByName: 'Jakub Bartłomiejczak',
    start: new Date(2026, 10, 2, 9, 0).toISOString(),
    end: new Date(2026, 10, 2, 13, 0).toISOString(),
    allDay: false,
    status: 'CREATED',
    services: ['Czyszczenie pojazdu: pakiet Optimum'],
    confirmationSms: { status: 'SENT', at: new Date(2026, 9, 18, 12, 31).toISOString(), reason: null },
    ...patch,
});

describe('pasek rezerwacji', () => {
    it('termin z dniem tygodnia', () => {
        expect(bookingMoment(booking())).toBe('poniedziałek, 2 listopada, 09:00');
    });

    it('SMS: wysłany zielono, brak albo błąd bursztynowo z powodem', () => {
        expect(bookingSmsLine(booking())).toEqual({ tone: 'ok', text: 'SMS z potwierdzeniem wysłany 18 października, 12:31' });
        expect(bookingSmsLine(booking({ confirmationSms: { status: 'NOT_SENT', at: null, reason: 'NO_PHONE' } })))
            .toEqual({ tone: 'warn', text: 'Bez SMS-a z potwierdzeniem: klient nie ma numeru telefonu' });
        expect(bookingSmsLine(booking({ confirmationSms: { status: 'NOT_SENT', at: null, reason: 'AUTOMATION_OFF' } })).text)
            .toBe('Bez SMS-a z potwierdzeniem: automatyczne potwierdzenia są wyłączone');
        expect(bookingSmsLine(booking({ confirmationSms: { status: 'FAILED', at: null, reason: 'Brak kredytów SMS' } })))
            .toEqual({ tone: 'warn', text: 'SMS z potwierdzeniem nie wyszedł: Brak kredytów SMS' });
        expect(bookingSmsLine(booking({ confirmationSms: { status: 'QUEUED', at: new Date(2026, 9, 19, 8, 0).toISOString(), reason: null } })).text)
            .toBe('SMS z potwierdzeniem wyjdzie 19 października, 08:00');
    });

    it('usunięta albo odwołana rezerwacja zostaje w historii', () => {
        expect(bookingGone(booking())).toBeNull();
        expect(bookingGone(booking({ status: 'DELETED' }))).toBe('Rezerwacja usunięta z kalendarza');
        expect(bookingGone(booking({ status: 'CANCELLED' }))).toBe('Rezerwacja odwołana');
    });

    it('szkic potwierdzenia z pełną datą, godziną i zakresem, bez podpisu', () => {
        expect(confirmationDraft(booking())).toBe([
            'Dzień dobry,',
            '',
            'potwierdzamy rezerwację terminu: poniedziałek, 2 listopada 2026, godz. 09:00.',
            'Zakres: Czyszczenie pojazdu: pakiet Optimum.',
            '',
            'Jeśli plany się zmienią, prosimy o wiadomość.',
            '',
            'Do zobaczenia!',
        ].join('\n'));
        expect(confirmationDraft(booking({ allDay: true, services: [], start: new Date(2026, 10, 2).toISOString() })))
            .toContain('terminu: poniedziałek, 2 listopada 2026.\n\nJeśli');
    });
});

describe('zdarzenia w rozmowie', () => {
    const message = (id: string, sentAt: string) => ({ id, sentAt }) as CommMessage;
    const event = (key: string, at: string) => ({ key, at, node: null });

    it('pasek wpada między wiadomości w chwili założenia, przy remisie pod wiadomością', () => {
        const merged = withEvents(
            [message('m1', '2026-10-14T08:34:00Z'), message('m2', '2026-10-17T22:23:00Z'), message('m3', '2026-10-18T10:34:00Z')],
            [event('booking', '2026-10-17T22:23:00Z')],
        );
        expect(merged.map((item) => ('node' in item ? item.key : item.id))).toEqual(['m1', 'm2', 'booking', 'm3']);
    });

    it('zdarzenie po ostatniej wiadomości na końcu, bez wiadomości nic', () => {
        expect(withEvents([message('m1', '2026-10-14T08:34:00Z')], [event('b', '2026-10-20T08:00:00Z')]).map((i) => ('node' in i ? i.key : i.id)))
            .toEqual(['m1', 'b']);
        expect(withEvents([], [event('b', '2026-10-20T08:00:00Z')])).toEqual([]);
    });
});
