// src/modules/bays/types.ts
//
// Stanowiska to warstwa OBOK wizyty, nie jej część: wizyta nie ma żadnego pola
// o stanowisku, a ten moduł tylko na nią wskazuje (visitId / appointmentId).
// Dzięki temu wyłączenie funkcji niczego w wizycie nie zmienia, a wycofanie to
// usunięcie tego folderu i kilku wpięć oznaczonych `bays`.
//
// Trzy rodzaje danych i każdy ma jedno źródło:
//   plan   - BayBooking: które auto, na którym stanowisku, w których połówkach dnia;
//   fakty  - BayStint: wjazd i zjazd z godziną i osobami, wpisywane kliknięciem;
//   stan   - NIGDZIE nie zapisywany, liczony z faktów (boardState.ts), więc nie może
//            rozjechać się z historią.

import type { StudioHours } from './utils/slots';

export type BayKind = 'LIFT' | 'BOOTH' | 'WASH' | 'WORK_AREA';

export interface Bay {
    id: string;
    name: string;
    kind: BayKind;
    /** Ile aut mieści naraz. Podnośnik 1, myjnia bywa 2 - nałożenie w granicach pojemności nie jest konfliktem. */
    capacity: number;
    /**
     * Na ile okienek dzielić dzień tego stanowiska w planie. Myjnia drobniej (mycie
     * trwa godzinę-dwie), podnośnik grubiej (praca zajmuje pół dnia i więcej) - plan
     * przyciąga się do okienek, więc przeciąganie trafia tam, gdzie trzeba.
     */
    slotsPerDay: number;
    /**
     * Osoba, która zwykle tu pracuje. Tylko PODPOWIEDŹ przy wjeździe - ludzi przypisuje
     * się do odcinka pracy, nie do miejsca (mechanik chodzi między podnośnikami).
     */
    defaultPersonId: string | null;
    active: boolean;
}

export interface BayPerson {
    id: string;
    name: string;
    initials: string;
}

/**
 * Dlaczego auto zjechało. `DONE` kończy odcinek; pozostałe zostawiają wizytę w toku,
 * a auto trafia na plac (część, decyzja klienta) albo zostaje (przerwa).
 */
/** `FINISHED` - cała praca przy aucie skończona („Gotowe do wydania"), `DONE` - tylko na tym stanowisku. */
export type StintEndReason = 'DONE' | 'FINISHED' | 'WAITING_PART' | 'WAITING_CUSTOMER' | 'MOVED';

/** HANDED_OVER - wydane: znika z tablicy, ale jego odcinki zostają w historii tygodnia. */
export type CarStage = 'BOOKED' | 'IN_SHOP' | 'READY' | 'HANDED_OVER';

/**
 * Auto widziane oczami hali. W prawdziwym API to odczyt wizyty (albo rezerwacji, zanim
 * auto przyjechało) - moduł niczego tu nie zapisuje, tylko czyta.
 */
export interface BayCar {
    id: string;
    visitId: string | null;
    appointmentId: string | null;
    /** Null, gdy auto nie ma tablicy - wtedy nie piszemy zastępczego „bez tablicy”, tylko pomijamy tablicę. */
    licensePlate: string | null;
    vehicleName: string;
    jobTitle: string;
    stage: CarStage;
    /** Przyjęcie auta (`scheduledDate` wizyty). */
    arrivedAt: string | null;
    /** Obiecany odbiór (`estimatedCompletionDate`) - plan stanowisk nie powinien go przekraczać. */
    promisedAt: string | null;
    /** Gotowe do wydania od - tylko przy `READY`. */
    readyAt: string | null;
    /** Auto stoi na placu i na coś czeka; null - po prostu czeka na stanowisko. */
    waiting: { reason: Exclude<StintEndReason, 'DONE' | 'FINISHED' | 'MOVED'>; note: string } | null;
    /**
     * Hala zamknęła pracę „Gotowe do wydania", a wizyta czeka, aż kierownik oznaczy ją
     * jako gotową i powiadomi klienta. Auto nie czeka na stanowisko. Brak pola - serwer
     * sprzed tej zmiany.
     */
    workDone?: boolean;
}

/** Plan: przedział czasu przyciągnięty do okienek stanowiska (ISO). */
export interface BayBooking {
    id: string;
    bayId: string;
    carId: string;
    start: string;
    end: string;
}

export interface BayStint {
    id: string;
    bayId: string;
    carId: string;
    startedAt: string;
    endedAt: string | null;
    endReason: StintEndReason | null;
    personIds: string[];
    /**
     * Czas technologiczny (schnięcie, utwardzanie): stanowisko zajęte, nikt nie pracuje.
     * Po tej godzinie tablica mówi, że auto czeka na dalszą pracę - stanowiska NIE
     * zwalnia, bo auto fizycznie dalej stoi w kabinie.
     */
    curingUntil: string | null;
}

/** Godziny hali (StudioHours) wyznaczają oś planu i licznik czasu pracy. */
export interface BaysSettings extends StudioHours {
    /** Studio korzysta ze stanowisk (Ustawienia → Stanowiska). */
    enabled: boolean;
    /**
     * Czy zapisywać, kto pracuje przy aucie. Domyślnie NIE: małe studio nie dzieli
     * pracy na osoby, a pytanie „kto?" przy każdym wjeździe to klik, z którego nic
     * nie wynika. Włączają je firmy, które liczą czas pracy ludzi.
     */
    trackPeople: boolean;
}

export interface BaysSnapshot {
    settings: BaysSettings;
    bays: Bay[];
    people: BayPerson[];
    cars: BayCar[];
    bookings: BayBooking[];
    stints: BayStint[];
}
