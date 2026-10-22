import { describe, expect, it } from 'vitest';
import {
    isProblem, problemCode, problemDetail, problemField, problemFieldError, problemOf, problemStatus,
} from './problem';

/** Błąd axiosa z treścią odpowiedzi - tak, jak dociera do `catch` i `onError`. */
const failure = (status: number, data: unknown) => ({ isAxiosError: true, response: { status, data } });

const problem = {
    type: 'urn:detailboost:problem:visit-not-started',
    title: 'Wizyta nierozpoczęta',
    status: 409,
    detail: 'Wizyta nie została jeszcze rozpoczęta',
    instance: '/api/v1/visits/v-1',
    code: 'VISIT_NOT_STARTED',
    visitId: 'v-1',
    // Pola dawnego ErrorResponse, które backend wysyła jeszcze w okresie przejściowym.
    error: 'Wizyta nierozpoczęta',
    message: 'Wizyta nie została jeszcze rozpoczęta',
    timestamp: '2026-10-22T10:00:00Z',
};

describe('ApiProblem', () => {
    it('czyta problem RFC 9457 razem z danymi do decyzji', () => {
        const parsed = problemOf(failure(409, problem));

        expect(parsed).toMatchObject({
            type: problem.type, title: problem.title, status: 409, detail: problem.detail,
            instance: problem.instance, code: 'VISIT_NOT_STARTED', fieldErrors: [], visitId: 'v-1',
        });
        expect(problemDetail(failure(409, problem))).toBe('Wizyta nie została jeszcze rozpoczęta');
        expect(problemCode(failure(409, problem))).toBe('VISIT_NOT_STARTED');
        expect(isProblem(failure(409, problem), 'VISIT_NOT_STARTED')).toBe(true);
        expect(isProblem(failure(409, problem), 'DRAFT_VISIT_ALREADY_EXISTS')).toBe(false);
    });

    it('błędy pól idą z fieldErrors', () => {
        const error = failure(400, {
            ...problem, status: 400, code: 'VALIDATION_FAILED', detail: 'Sprawdź dane w formularzu',
            fieldErrors: [{ field: 'from', message: 'Podaj datę początkową.' }, { field: 'to', message: 'Podaj datę końcową.' }],
        });

        expect(problemField(error)).toBe('from');
        expect(problemFieldError(error, 'to')).toBe('Podaj datę końcową.');
        expect(problemFieldError(error, 'search')).toBeUndefined();
    });

    it('rozumie dawny ErrorResponse, żeby front mógł wejść przed backendem', () => {
        const legacy = failure(400, { error: 'Błąd walidacji', message: 'Podaj datę.', field: 'from', code: 'MISSING_PARAMETER' });

        expect(problemDetail(legacy)).toBe('Podaj datę.');
        expect(problemCode(legacy)).toBe('MISSING_PARAMETER');
        expect(problemField(legacy)).toBe('from');
        expect(problemOf(legacy)?.status).toBe(400);
    });

    it('błąd bez treści to nie problem - zostaje zdanie zapasowe', () => {
        const network = { isAxiosError: true, message: 'Network Error' };
        const blob = failure(500, new Blob(['x']));
        const empty = failure(502, '');

        for (const error of [network, blob, empty, null, undefined, new Error('boom')]) {
            expect(problemOf(error)).toBeNull();
            expect(problemDetail(error)).toBeUndefined();
            expect(problemDetail(error, 'Spróbuj ponownie.')).toBe('Spróbuj ponownie.');
        }
        expect(problemStatus(blob)).toBe(500);
        expect(problemStatus(network)).toBeUndefined();
    });

    it('puste zdanie z serwera nie wypiera zapasowego', () => {
        expect(problemDetail(failure(400, { ...problem, detail: '  ', message: '' }), 'Zapasowe')).toBe('Zapasowe');
    });
});
