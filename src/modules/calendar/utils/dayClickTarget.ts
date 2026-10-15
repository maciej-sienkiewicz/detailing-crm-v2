/**
 * Co otworzyć po kliknięciu w dzień siatki miesiąca: listę wydarzeń dnia ALBO okno
 * szybkiej rezerwacji - nigdy obu naraz.
 *
 * Zgłoszenie: na komputerze klik w dzień z kilkoma wydarzeniami otwierał okno szybkiej
 * rezerwacji, a pod nim listę wydarzeń. FullCalendar przy kliknięciu myszą wywołuje
 * i `select`, i `dateClick`; pierwszy otwierał okno, drugi (dzień przepełniony) listę.
 * Osłona „to klik myszą, pomiń" w `dateClick` patrzyła na `pointerType`, którego
 * FullCalendar w zdarzeniu myszy nie podaje - więc nie działała nigdy. Teraz oba
 * wywołania pytają o to samo i dostają tę samą odpowiedź.
 *
 * Reguła: gdy część wydarzeń dnia schowała się pod „jeszcze N", użytkownik najpierw
 * musi zobaczyć, co już stoi w tym dniu - lista (z „Dodaj" w stopce). Gdy wszystkie
 * wydarzenia widać w komórce, od razu okno szybkiej rezerwacji.
 */
export type DayClickTarget = 'dayList' | 'quickEvent';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DayClickInput {
    viewType: string;
    start: Date;
    end: Date;
    allDay: boolean;
    /** Czy w komórce dnia jest „jeszcze N" (część wydarzeń nie mieści się w komórce). */
    hasHiddenEvents: boolean;
}

export const resolveDayClickTarget = ({ viewType, start, end, allDay, hasHiddenEvents }: DayClickInput): DayClickTarget => {
    // Zaznaczenie kilku dni (przeciągnięcie) to zawsze zakładanie rezerwacji na ten zakres.
    const singleDay = allDay && end.getTime() - start.getTime() <= DAY_MS + 60 * 60 * 1000;
    if (viewType === 'dayGridMonth' && singleDay && hasHiddenEvents) return 'dayList';
    return 'quickEvent';
};

/** Komórka dnia w siatce miesiąca ma link „jeszcze N" / „+N". */
export const dayCellHasHiddenEvents = (root: ParentNode | null | undefined, isoDate: string): boolean =>
    !!root?.querySelector(`.fc-daygrid-day[data-date="${isoDate}"] .fc-daygrid-more-link`);
