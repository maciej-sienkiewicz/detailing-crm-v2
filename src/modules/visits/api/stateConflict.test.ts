// Konflikt stanu wizyty rozpoznajemy po kodzie z backendu (GlobalExceptionHandler,
// handler IllegalStateTransitionException), a nie po samym 409: ten sam status niosą
// inne odmowy i brane za konflikt dostawały „Odświeżyliśmy widok" zamiast powodu.
import { describe, expect, it } from 'vitest';
import { VISIT_ALREADY_IN_STATE, VISIT_STATE_CONFLICT, isStateConflict } from './stateConflict';

const response = (status: number, data: Record<string, unknown>) => ({ response: { status, data } });

describe('isStateConflict', () => {
    it('409 z kodem konfliktu stanu to konflikt stanu', () => {
        expect(isStateConflict(response(409, { code: VISIT_ALREADY_IN_STATE, message: 'Wizyta ma już status „Zakończona”.' }))).toBe(true);
        expect(isStateConflict(response(409, { code: VISIT_STATE_CONFLICT, message: 'Wizyta ma teraz status „Zakończona”.' }))).toBe(true);
    });

    it('kody są te same co w VisitStateMachine na backendzie', () => {
        expect(VISIT_ALREADY_IN_STATE).toBe('VISIT_ALREADY_IN_STATE');
        expect(VISIT_STATE_CONFLICT).toBe('VISIT_STATE_CONFLICT');
    });

    it('409 bez kodu (ConflictException, naruszenie unikalności) nie jest konfliktem stanu', () => {
        expect(isStateConflict(response(409, { message: 'Taki wpis już istnieje.' }))).toBe(false);
    });

    it('409 z innym kodem nie jest konfliktem stanu', () => {
        expect(isStateConflict(response(409, { code: 'DRAFT_VISIT_ALREADY_EXISTS', message: 'Szkic już istnieje.' }))).toBe(false);
    });

    it('kod konfliktu przy innym statusie niż 409 nie wystarcza', () => {
        expect(isStateConflict(response(400, { code: VISIT_STATE_CONFLICT }))).toBe(false);
        expect(isStateConflict({ message: 'Network Error' })).toBe(false);
        expect(isStateConflict(undefined)).toBe(false);
    });
});
