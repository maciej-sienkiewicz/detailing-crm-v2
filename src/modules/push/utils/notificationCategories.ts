// src/modules/push/utils/notificationCategories.ts
//
// Nazwy i grupy rodzajów powiadomień na ekranie „który telefon dostaje co"
// (backend: PushNotificationCategory). Tekst mieszka tutaj, bo to ustawienie, a nie
// treść powiadomienia - ta jest po stronie serwera (PushMessages).

import type { PushCategorySetting, PushNotificationCategory } from '../types';

export interface CategoryCopy {
    label: string;
    hint: string;
}

/** Kolejność i grupy ekranu. Kategoria spoza listy (nowszy backend) trafia na koniec. */
export const GROUPS: { title: string; categories: PushNotificationCategory[] }[] = [
    { title: 'Leady', categories: ['NEW_LEADS', 'LEADS_WAITING'] },
    { title: 'Kalendarz i wizyty', categories: ['RESERVATIONS', 'CHECKINS'] },
    { title: 'Pieniądze', categories: ['EARNINGS', 'REPORTS'] },
    { title: 'Zespół', categories: ['LEAVE_REQUESTS', 'WORKTIME_CARDS', 'MY_MATTERS'] },
    { title: 'Marketing', categories: ['COMPETITION'] },
    { title: 'Telefon', categories: ['CLICK_TO_CALL'] },
];

export const CATEGORY_COPY: Record<string, CategoryCopy> = {
    NEW_LEADS: {
        label: 'Nowy lead',
        hint: 'Zapytanie z formularza, poczty albo telefonu, także dodane ręcznie.',
    },
    LEADS_WAITING: {
        label: 'Klient czeka na odpowiedź',
        hint: 'Przypomnienia, gdy nikt nie odpisał, i poranne podsumowanie czekających zapytań.',
    },
    RESERVATIONS: {
        label: 'Nowa rezerwacja',
        hint: 'Ktoś inny zapisał wizytę w kalendarzu.',
    },
    CHECKINS: {
        label: 'Przyjęcie pojazdu',
        hint: 'Protokół przyjęcia podpisany, auto jest w studiu.',
    },
    EARNINGS: {
        label: 'Przychód z wydanego auta',
        hint: 'Kwota wizyty w chwili, gdy auto wraca do klienta.',
    },
    REPORTS: {
        label: 'Nowy raport',
        hint: 'Gdy domknie się okres raportu. Jak często, ustawia każdy sam w „Powiadomienie o nowym raporcie".',
    },
    COMPETITION: {
        label: 'Reklamy konkurencji',
        hint: 'Nowe kampanie firm w obserwowanej okolicy.',
    },
    LEAVE_REQUESTS: {
        label: 'Wniosek urlopowy do rozpatrzenia',
        hint: 'Pracownik złożył wniosek i czeka na decyzję.',
    },
    WORKTIME_CARDS: {
        label: 'Karta czasu pracy do zatwierdzenia',
        hint: 'Pracownik złożył kartę za miesiąc.',
    },
    MY_MATTERS: {
        label: 'Własne urlopy i karty pracy',
        hint: 'Decyzja we własnym wniosku, zwrot albo zatwierdzenie karty, przypomnienie o karcie.',
    },
    CLICK_TO_CALL: {
        label: 'Dzwonienie z komputera',
        hint: 'Numer kliknięty w CRM na komputerze wybiera się na tym telefonie.',
    },
};

export const copyOf = (category: string): CategoryCopy => CATEGORY_COPY[category] ?? { label: category, hint: '' };

/** „Wszystkie", „Żadne" albo „3 z 7" - liczone tylko po tym, co ta osoba może dostać. */
export const summaryOf = (categories: PushCategorySetting[]): string => {
    const available = categories.filter(c => c.available);
    const on = available.filter(c => c.enabled).length;
    if (available.length === 0) return 'Brak powiadomień dla tej roli';
    if (on === available.length) return 'Wszystkie powiadomienia';
    if (on === 0) return 'Wszystkie wyłączone';
    return `${on} z ${available.length} rodzajów`;
};

