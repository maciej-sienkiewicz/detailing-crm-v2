// src/modules/calendar/components/QuickEventModal/submitErrors.ts
//
// Dymek przy nieudanym zapisie wizyty z kalendarza.
//
// Kiedyś mówił tylko „Sprawdź zaznaczone pola formularza". Walidacja działa w
// przeglądarce - do serwera nic nie idzie, więc po zgłoszeniu „nie można zapisać
// wizyty" nie było żadnego logu, a czerwony opis przy polu (cena usługi, kolor) bywał
// daleko poza ekranem, zwłaszcza na telefonie. Teraz dymek mówi, czego brakuje,
// i jest to widoczne na każdym zrzucie ekranu dołączonym do zgłoszenia.

/** Kolejność pól na formularzu - ta sama dla dymka i przewinięcia do pierwszego błędu. */
export const SUBMIT_ERROR_ORDER = ['startDateTime', 'endDateTime', 'customer', 'services', 'servicePrices', 'color'] as const;

const fieldsWord = (n: number): string => {
    if (n === 1) return 'pole';
    const lastTwo = n % 100;
    const last = n % 10;
    return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'pola' : 'pól';
};

/** Klucz pierwszego błędu w kolejności pól; błąd spoza listy na końcu. */
export const firstSubmitErrorKey = (errors: Record<string, string>): string | undefined =>
    SUBMIT_ERROR_ORDER.find(key => errors[key]) ?? Object.keys(errors).find(key => errors[key]);

/**
 * Treść dymka: pierwszy błąd zdaniem z formularza, a gdy jest ich więcej - ile pól
 * zostało jeszcze do poprawy.
 */
export const submitErrorMessage = (errors: Record<string, string>): string => {
    const firstKey = firstSubmitErrorKey(errors);
    if (!firstKey) return 'Sprawdź zaznaczone pola formularza.';
    const first = errors[firstKey].trim().replace(/\.$/, '');
    const others = Object.keys(errors).filter(key => key !== firstKey && errors[key]).length;
    return others > 0
        ? `${first}. Poza tym do poprawy: ${others} ${fieldsWord(others)}.`
        : `${first}.`;
};
