import { apiErrorStatus } from './apiError';

/**
 * Konflikt stanu wizyty (HTTP 409) — czyli „ekran pokazywał nieaktualny status".
 *
 * Zgłoszenie z warsztatu, od którego to powstało: pracownik klikał „Oznacz jako
 * gotowe" i dostawał czerwone „Cannot transition from READY_FOR_PICKUP to
 * READY_FOR_PICKUP. Allowed transitions: [COMPLETED, IN_PROGRESS]". Wizyta była już
 * gotowa — ktoś inny (kolega, tablet, druga karta) zdążył pierwszy, a ta przeglądarka
 * o tym nie wiedziała, bo widok wizyty nie odświeża się sam.
 *
 * Backend zwraca dziś zdanie po polsku i `code`. Ten moduł jest jego stroną kliencką:
 * rozpoznaje konflikt i pozwala wywołującemu zareagować raz, spójnie.
 */

/** Wizyta jest już w stanie, o który prosiliśmy — nie ma czego naprawiać. */
export const VISIT_ALREADY_IN_STATE = 'VISIT_ALREADY_IN_STATE';
/** Wizyta jest w innym stanie — trzeba spojrzeć na ekran, bo zmienił się pod nami. */
export const VISIT_STATE_CONFLICT = 'VISIT_STATE_CONFLICT';

interface ApiErrorBody {
    response?: { data?: { code?: unknown } };
}

/** Maszynowy kod błędu z odpowiedzi API, o ile backend go podał. */
export const apiErrorCode = (error: unknown): string | undefined => {
    const code = (error as ApiErrorBody)?.response?.data?.code;
    return typeof code === 'string' ? code : undefined;
};

/** Czy to konflikt stanu, a nie zwykła awaria zapisu. */
export const isStateConflict = (error: unknown): boolean => apiErrorStatus(error) === 409;
