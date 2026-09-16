import { useLocalStorage } from '@/common/hooks';

/**
 * Ustawienia siatki miesiąca - świadomie PER URZĄDZENIE (localStorage), nie per
 * konto. Ten sam człowiek pracuje inaczej na 13-calowym laptopie w recepcji niż
 * na dużym monitorze na warsztacie, a wybór dotyczy tego, ile się mieści na
 * ekranie, nie tego, kim jest.
 *
 * v1 w kluczu na wypadek, gdyby kształt ustawień się zmienił: wtedy nowy klucz
 * porzuca stare wpisy zamiast próbować je migrować.
 */
const STORAGE_KEY = 'calendar-display-v1';

export interface CalendarDisplaySettings {
    /** Soboty i niedziele jako kolumny siatki miesiąca. */
    showWeekends: boolean;
    /** Końcówka poprzedniego i początek następnego miesiąca w siatce. */
    showAdjacentMonthDays: boolean;
}

/**
 * Domyślnie dokładnie tak, jak kalendarz wyglądał do tej pory. Nikomu nic nie
 * znika po wdrożeniu - zmiana układu jest świadomą decyzją użytkownika.
 */
export const DEFAULT_DISPLAY_SETTINGS: CalendarDisplaySettings = {
    showWeekends: true,
    showAdjacentMonthDays: true,
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
    };

    const isDefault =
        settings.showWeekends === DEFAULT_DISPLAY_SETTINGS.showWeekends &&
        settings.showAdjacentMonthDays === DEFAULT_DISPLAY_SETTINGS.showAdjacentMonthDays;

    /* Zapisujemy zwalidowany obiekt, a nie `prev` ze storage - inaczej
       uszkodzony wpis przeżyłby każdą kolejną zmianę ustawienia. */
    const setShowWeekends = (showWeekends: boolean) =>
        setStored({ ...settings, showWeekends });

    const setShowAdjacentMonthDays = (showAdjacentMonthDays: boolean) =>
        setStored({ ...settings, showAdjacentMonthDays });

    const reset = () => setStored(DEFAULT_DISPLAY_SETTINGS);

    return { ...settings, isDefault, setShowWeekends, setShowAdjacentMonthDays, reset };
}
