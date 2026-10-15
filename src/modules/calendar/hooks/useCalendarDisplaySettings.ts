import { useLocalStorage } from '@/common/hooks';

/**
 * Ustawienia wyglądu kalendarza (siatka miesiąca i lista na telefonie) - świadomie
 * PER URZĄDZENIE (localStorage), nie per konto. Ten sam człowiek pracuje inaczej na 13-calowym laptopie w recepcji niż
 * na dużym monitorze na warsztacie, a wybór dotyczy tego, ile się mieści na
 * ekranie, nie tego, kim jest.
 *
 * v1 w kluczu na wypadek, gdyby kształt ustawień się zmienił: wtedy nowy klucz
 * porzuca stare wpisy zamiast próbować je migrować. Dopisanie pola nie zmienia
 * kształtu - brakujące pole w starym wpisie dostaje wartość domyślną przy odczycie.
 */
const STORAGE_KEY = 'calendar-display-v1';

export interface CalendarDisplaySettings {
    /** Soboty i niedziele jako kolumny siatki miesiąca. */
    showWeekends: boolean;
    /** Końcówka poprzedniego i początek następnego miesiąca w siatce. */
    showAdjacentMonthDays: boolean;
    /** Nazwy usług po prawej stronie karty na liście (bez cen). */
    showAgendaServices: boolean;
}

/**
 * Domyślnie siatka wygląda dokładnie tak, jak do tej pory - nikomu nic nie znika
 * po wdrożeniu. Usługi na liście są domyślnie włączone: zajmują puste dotąd miejsce
 * po prawej stronie karty, niczego nie przesuwają, a kto woli czystszą listę,
 * wyłącza je w ustawieniach.
 */
export const DEFAULT_DISPLAY_SETTINGS: CalendarDisplaySettings = {
    showWeekends: true,
    showAdjacentMonthDays: true,
    showAgendaServices: true,
};

/** localStorage może zawierać cokolwiek - także wpis z innej wersji aplikacji. */
const asBool = (raw: unknown, fallback: boolean): boolean =>
    typeof raw === 'boolean' ? raw : fallback;

export function useCalendarDisplaySettings() {
    const [stored, setStored] = useLocalStorage<CalendarDisplaySettings>(
        STORAGE_KEY,
        DEFAULT_DISPLAY_SETTINGS,
    );

    // Walidacja przy odczycie, tak samo jak w useCalendarFilters.
    const settings: CalendarDisplaySettings = {
        showWeekends: asBool(stored?.showWeekends, DEFAULT_DISPLAY_SETTINGS.showWeekends),
        showAdjacentMonthDays: asBool(
            stored?.showAdjacentMonthDays,
            DEFAULT_DISPLAY_SETTINGS.showAdjacentMonthDays,
        ),
        showAgendaServices: asBool(
            stored?.showAgendaServices,
            DEFAULT_DISPLAY_SETTINGS.showAgendaServices,
        ),
    };

    /* Osobno dla każdego widoku: kropka przy zębatce mówi „TEN widok nie wygląda
       domyślnie", więc zmiana na liście nie może zapalać jej nad siatką miesiąca. */
    const isMonthDefault =
        settings.showWeekends === DEFAULT_DISPLAY_SETTINGS.showWeekends &&
        settings.showAdjacentMonthDays === DEFAULT_DISPLAY_SETTINGS.showAdjacentMonthDays;
    const isAgendaDefault =
        settings.showAgendaServices === DEFAULT_DISPLAY_SETTINGS.showAgendaServices;

    /* Zapisujemy zwalidowany obiekt, a nie `prev` ze storage - inaczej
       uszkodzony wpis przeżyłby każdą kolejną zmianę ustawienia. */
    const setShowWeekends = (showWeekends: boolean) =>
        setStored({ ...settings, showWeekends });

    const setShowAdjacentMonthDays = (showAdjacentMonthDays: boolean) =>
        setStored({ ...settings, showAdjacentMonthDays });

    const setShowAgendaServices = (showAgendaServices: boolean) =>
        setStored({ ...settings, showAgendaServices });

    const reset = () => setStored(DEFAULT_DISPLAY_SETTINGS);

    return {
        ...settings,
        isMonthDefault,
        isAgendaDefault,
        setShowWeekends,
        setShowAdjacentMonthDays,
        setShowAgendaServices,
        reset,
    };
}
