import type { MessageKey } from './types';

/**
 * Ready-to-send SMS texts, one situation at a time.
 *
 * A message rule ships disabled with an empty body, which is the trap the whole
 * activation flow exists to close: nothing warns you, the send just never happens.
 * These let a studio switch a message on by picking a text instead of writing one,
 * and every token here is on the message's allowed list — see MESSAGES in catalog.ts.
 */
export const STARTER_SMS: Partial<Record<MessageKey, string[]>> = {
    preVisit: [
        'Cześć {{imie}}! Przypominamy o wizycie {{data}} o {{godzina}}. Do zobaczenia!',
        'Dzień dobry, {{imie}}. Czekamy na Ciebie {{data}} o {{godzina}}. W razie zmian prosimy o kontakt.',
    ],
    bookingConfirmation: [
        'Cześć {{imie}}! Termin potwierdzony: {{data}} o {{godzina}}. Do zobaczenia!',
        'Dziękujemy za rezerwację, {{imie}}. Widzimy się {{data}} o {{godzina}}.',
    ],
    visitReadyForPickup: [
        'Cześć {{imie}}! Twoje {{pojazd}} jest gotowe do odbioru. Zapraszamy!',
        'Dzień dobry, {{imie}}. {{pojazd}} ({{rejestracja}}) czeka na odbiór. Zapraszamy w godzinach otwarcia.',
    ],
    postVisit: [
        'Dziękujemy za wizytę, {{imie}}! Mamy nadzieję, że efekt się podoba.',
        'Cześć {{imie}}! Dziękujemy za zaufanie. W razie pytań jesteśmy do dyspozycji.',
    ],
    delayedReminder: [
        'Cześć {{imie}}! Minęło trochę czasu od ostatniej wizyty. Zapraszamy ponownie!',
        'Dzień dobry, {{imie}}. Czas na odświeżenie powłoki? Chętnie zaproponujemy termin.',
    ],
};
