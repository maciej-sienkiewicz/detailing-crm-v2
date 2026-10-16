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

/**
 * Kody, z którymi backend zwraca konflikt stanu wizyty: `IllegalStateTransitionException`
 * (VisitStateMachine.CODE_ALREADY_IN_STATE / CODE_STATE_CONFLICT) w GlobalExceptionHandler.
 */
const STATE_CONFLICT_CODES: ReadonlySet<string> = new Set([VISIT_ALREADY_IN_STATE, VISIT_STATE_CONFLICT]);

/**
 * Czy to konflikt stanu, a nie zwykła awaria zapisu.
 *
 * Po kodzie, nie po samym 409: ten sam status niesie też inne odmowy (np. `ConflictException`
 * i naruszenia unikalności przy `/complete`). Brane za konflikt stanu dostawały „Wizyta
 * zmieniła się w międzyczasie… Odświeżyliśmy widok.", choć wizyta stała w miejscu,
 * a prawdziwy powód z backendu przepadał.
 */
export const isStateConflict = (error: unknown): boolean => {
    if (apiErrorStatus(error) !== 409) return false;
    const code = apiErrorCode(error);
    return code !== undefined && STATE_CONFLICT_CODES.has(code);
};
