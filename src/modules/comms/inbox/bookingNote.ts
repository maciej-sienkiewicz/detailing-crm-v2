// src/modules/comms/inbox/bookingNote.ts
// Treść paska rezerwacji w rozmowie i szkic potwierdzenia dla klienta - czyste funkcje.
//
// Pasek powstał po sprawie z formularza: klient poprosił o rezerwację, studio założyło
// termin w kalendarzu, a po czterech dniach klient napisał znowu, że nie dostał
// odpowiedzi. Rezerwacja była tylko w kalendarzu - w rozmowie nie zostało po niej
// śladu, więc nikt czytający wątek nie widział, że klient o terminie nie wie.
import { formatClockTime } from '@/common/dateTime';
import { formatAppointmentMoment } from '../utils/leadFormat';
import type { LeadBooking } from '../types';

const WEEKDAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

/** „poniedziałek, 2 listopada, 9:00" - dzień tygodnia rozstrzyga pomyłki szybciej niż data. */
export const bookingMoment = (booking: Pick<LeadBooking, 'start'>): string =>
    `${WEEKDAYS[new Date(booking.start).getDay()]}, ${formatAppointmentMoment(booking.start)}`;

export type BookingTone = 'ok' | 'warn' | 'muted';

export interface BookingSmsLine {
    tone: BookingTone;
    text: string;
}

/**
 * Czy klient wie o terminie - zdanie o SMS-ie z potwierdzeniem.
 *
 * Bursztyn tam, gdzie klient najpewniej NIE wie (SMS nie wyszedł albo go nie było),
 * bo to jest sytuacja, po której klient pisze drugi raz. Zieleń tylko dla wysłanego.
 */
export const bookingSmsLine = (booking: LeadBooking): BookingSmsLine => {
    const sms = booking.confirmationSms;
    const at = sms.at ? formatAppointmentMoment(sms.at) : '';
    switch (sms.status) {
        case 'SENT':
            return { tone: 'ok', text: at ? `SMS z potwierdzeniem wysłany ${at}` : 'SMS z potwierdzeniem wysłany' };
        case 'QUEUED':
            return { tone: 'muted', text: at ? `SMS z potwierdzeniem wyjdzie ${at}` : 'SMS z potwierdzeniem czeka na wysyłkę' };
        case 'FAILED':
            return { tone: 'warn', text: sms.reason ? `SMS z potwierdzeniem nie wyszedł: ${sms.reason}` : 'SMS z potwierdzeniem nie wyszedł' };
        case 'CANCELLED':
            return { tone: 'warn', text: 'SMS z potwierdzeniem anulowany przed wysyłką' };
        default:
            return {
                tone: 'warn',
                text: sms.reason === 'NO_PHONE'
                    ? 'Bez SMS-a z potwierdzeniem: klient nie ma numeru telefonu'
                    : sms.reason === 'AUTOMATION_OFF'
                        ? 'Bez SMS-a z potwierdzeniem: automatyczne potwierdzenia są wyłączone'
                        : 'Bez SMS-a z potwierdzeniem: przy rezerwacji nie zaznaczono wysyłki',
            };
    }
};

/** Rezerwacja, której już nie ma - pasek zostaje w historii, ale nie proponuje potwierdzenia. */
export const bookingGone = (booking: LeadBooking): string | null =>
    booking.status === 'DELETED' ? 'Rezerwacja usunięta z kalendarza'
        : booking.status === 'CANCELLED' || booking.status === 'ABANDONED' ? 'Rezerwacja odwołana'
            : null;

/**
 * Szkic maila z potwierdzeniem. Rok jest tu pełny, inaczej niż w pasku: wiadomość
 * klient czyta i przechowuje, więc termin ma być jednoznaczny bez kontekstu.
 * Bez podpisu - kompozytor dokleja stopkę studia sam.
 */
export const confirmationDraft = (booking: LeadBooking): string => {
    const start = new Date(booking.start);
    const date = `${WEEKDAYS[start.getDay()]}, ${start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    const time = booking.allDay ? '' : formatClockTime(start);
    const when = time ? `${date}, godz. ${time}` : date;
    const scope = booking.services.length > 0 ? `\nZakres: ${booking.services.join(', ')}.` : '';
    return [
        'Dzień dobry,',
        '',
        `potwierdzamy rezerwację terminu: ${when}.${scope}`,
        '',
        'Jeśli plany się zmienią, prosimy o wiadomość.',
        '',
        'Do zobaczenia!',
    ].join('\n');
};
