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
    { title: 'Kalendarz i wizyty', categories: ['RESERVATIONS', 'APPOINTMENT_REMINDERS', 'CHECKINS'] },
    { title: 'Przychody i raporty', categories: ['EARNINGS', 'REPORTS'] },
    { title: 'Zespół', categories: ['LEAVE_REQUESTS', 'WORKTIME_CARDS', 'MY_MATTERS'] },
    { title: 'Konkurencja', categories: ['COMPETITION'] },
    { title: 'Dzwonienie', categories: ['CLICK_TO_CALL'] },
];

/*
 * Etykieta mówi, CO przychodzi, opis - KIEDY. Pisane tak, jak właściciel studia
 * opowiedziałby to pracownikowi: „dostaniesz, gdy…", bez skrótów myślowych.
 * Bez form rodzajowych („dodajesz sam", „zarobiłeś") i bez głosu „my" - według
 * przewodnika „Styl tekstów w animacjach DetailBoost"; tabela pokazuje te opisy
 * każdemu w zespole.
 */
export const CATEGORY_COPY: Record<string, CategoryCopy> = {
    NEW_LEADS: {
        label: 'Nowe zapytanie',
        hint: 'Gdy klient napisze przez formularz lub e-mail, zadzwoni albo ktoś z zespołu doda zapytanie ręcznie.',
    },
    LEADS_WAITING: {
        label: 'Klient czeka na odpowiedź',
        hint: 'Gdy nikt z zespołu nie odpisał klientowi. Rano przychodzi też lista zapytań bez odpowiedzi.',
    },
    RESERVATIONS: {
        label: 'Nowa rezerwacja',
        hint: 'Gdy w kalendarzu pojawi się nowa rezerwacja. Za rezerwacje dodane przez Ciebie powiadomienie nie przychodzi.',
    },
    // „Rezerwacja", nie „wizyta": według słowniczka przewodnika wizyta zaczyna się od
    // przyjęcia auta, a przypomnienie przychodzi wcześniej.
    APPOINTMENT_REMINDERS: {
        label: 'Przypomnienie o rezerwacji',
        hint: 'Gdy zbliża się rezerwacja z kalendarza. Czas przypomnienia ustaw w sekcji „Przypomnienia i podsumowania”.',
    },
    CHECKINS: {
        label: 'Auto przyjęte do studia',
        hint: 'Gdy klient podpisze protokół przyjęcia i zostawi auto.',
    },
    EARNINGS: {
        label: 'Auto wydane klientowi',
        hint: 'Gdy klient odbierze auto. Powiadomienie podaje, ile studio zarobiło na tej wizycie.',
    },
    REPORTS: {
        label: 'Nowy raport',
        hint: 'Gdy raport za kolejny okres jest gotowy. Częstotliwość ustaw w sekcji „Przypomnienia i podsumowania”.',
    },
    COMPETITION: {
        label: 'Reklamy konkurencji',
        hint: 'Gdy studio z obserwowanej okolicy uruchomi nową kampanię reklamową.',
    },
    LEAVE_REQUESTS: {
        label: 'Wniosek urlopowy',
        hint: 'Gdy pracownik złoży wniosek o urlop i czeka na Twoją decyzję.',
    },
    WORKTIME_CARDS: {
        label: 'Karta czasu pracy',
        hint: 'Gdy pracownik złoży do zatwierdzenia kartę czasu pracy za miesiąc.',
    },
    MY_MATTERS: {
        label: 'Mój urlop i moja karta pracy',
        hint: 'Gdy ktoś rozpatrzy Twój wniosek urlopowy albo kartę pracy. Do tego przypomnienie, gdy karta nie jest uzupełniona.',
    },
    CLICK_TO_CALL: {
        label: 'Dzwonienie z komputera',
        hint: 'Gdy klikniesz numer klienta w CRM na komputerze. Powiadomienie ma przycisk „Zadzwoń”.',
    },
};

export const copyOf = (category: string): CategoryCopy => CATEGORY_COPY[category] ?? { label: category, hint: '' };

/** „Wszystkie", „Żadne" albo „3 z 7" - liczone tylko po tym, co ta osoba może dostać. */
export const summaryOf = (categories: PushCategorySetting[]): string => {
    const available = categories.filter(c => c.available);
    const on = available.filter(c => c.enabled).length;
    if (available.length === 0) return 'Brak powiadomień dla tej roli';
    if (on === available.length) return 'Wszystkie włączone';
    if (on === 0) return 'Wszystkie wyłączone';
    return `Włączone ${on} z ${available.length}`;
};

