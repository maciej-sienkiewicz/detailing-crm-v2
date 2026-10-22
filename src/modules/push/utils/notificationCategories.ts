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
    { title: 'Zapytania od klientów', categories: ['NEW_LEADS', 'LEADS_WAITING'] },
    { title: 'Kalendarz i wizyty', categories: ['RESERVATIONS', 'CHECKINS'] },
    { title: 'Przychody i raporty', categories: ['EARNINGS', 'REPORTS'] },
    { title: 'Zespół', categories: ['LEAVE_REQUESTS', 'WORKTIME_CARDS', 'MY_MATTERS'] },
    { title: 'Konkurencja', categories: ['COMPETITION'] },
    { title: 'Dzwonienie', categories: ['CLICK_TO_CALL'] },
];

/*
 * Etykieta mówi, CO przychodzi, opis - KIEDY. Pisane tak, jak właściciel studia
 * opowiedziałby to pracownikowi: „dostaniesz, gdy…", bez skrótów myślowych.
 */
export const CATEGORY_COPY: Record<string, CategoryCopy> = {
    NEW_LEADS: {
        label: 'Nowe zapytanie',
        hint: 'Gdy klient napisze przez formularz albo e-mail, zadzwoni, albo ktoś doda zapytanie ręcznie.',
    },
    LEADS_WAITING: {
        label: 'Klient czeka na odpowiedź',
        hint: 'Przypomnienie, gdy nikt jeszcze nie odpisał, a rano lista zapytań, które wciąż czekają.',
    },
    RESERVATIONS: {
        label: 'Nowa rezerwacja',
        hint: 'Gdy w kalendarzu pojawi się nowa wizyta. O tych, które dodajesz sam, nie powiadamiamy.',
    },
    CHECKINS: {
        label: 'Auto przyjęte do studia',
        hint: 'Gdy klient podpisze protokół przyjęcia i zostawi auto.',
    },
    EARNINGS: {
        label: 'Auto wydane klientowi',
        hint: 'Gdy klient odbierze auto. W powiadomieniu zobaczysz, ile zarobiłeś na tej wizycie.',
    },
    REPORTS: {
        label: 'Nowy raport',
        hint: 'Gdy gotowy jest raport za kolejny okres. Jak często, wybierasz niżej, w sekcji „Raporty i podsumowania”.',
    },
    COMPETITION: {
        label: 'Reklamy konkurencji',
        hint: 'Gdy firma z obserwowanej okolicy uruchomi nową kampanię reklamową.',
    },
    LEAVE_REQUESTS: {
        label: 'Wniosek urlopowy',
        hint: 'Gdy pracownik złoży wniosek o urlop i czeka na Twoją decyzję.',
    },
    WORKTIME_CARDS: {
        label: 'Karta czasu pracy',
        hint: 'Gdy pracownik złoży kartę za miesiąc do zatwierdzenia.',
    },
    MY_MATTERS: {
        label: 'Mój urlop i moja karta pracy',
        hint: 'Decyzja w Twoim wniosku urlopowym, zatwierdzenie albo zwrot Twojej karty i przypomnienie, żeby ją uzupełnić.',
    },
    CLICK_TO_CALL: {
        label: 'Dzwonienie z komputera',
        hint: 'Klikasz numer klienta w CRM na komputerze, a ten telefon od razu proponuje połączenie.',
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

