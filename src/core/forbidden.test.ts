import { describe, expect, it } from 'vitest';
import {
    forbiddenReaction,
    isSubscriptionInactive,
    PERMISSIONS_STALE_EVENT,
    SUBSCRIPTION_INACTIVE_EVENT,
} from './forbidden';

const forbidden = (method: string, data: Record<string, unknown> = {}) => ({
    response: { status: 403, data },
    config: { method },
});

describe('forbiddenReaction', () => {
    it('wygasły abonament: zdarzenie dla bramki abonamentu zamiast odświeżania uprawnień', () => {
        const err = forbidden('post', { code: 'SUBSCRIPTION_INACTIVE', message: 'Subskrypcja nieaktywna' });
        expect(isSubscriptionInactive(err)).toBe(true);
        expect(forbiddenReaction(err)).toEqual({ event: SUBSCRIPTION_INACTIVE_EVENT, toastMessage: null });
    });

    it('wygasły abonament przy odczycie też milczy', () => {
        const err = forbidden('get', { code: 'SUBSCRIPTION_INACTIVE' });
        expect(forbiddenReaction(err).toastMessage).toBeNull();
        expect(forbiddenReaction(err).event).toBe(SUBSCRIPTION_INACTIVE_EVENT);
    });

    it('brak uprawnień przy kliknięciu: toast z powodem z backendu i odświeżenie uprawnień', () => {
        const err = forbidden('delete', { message: 'Tylko właściciel może usunąć klienta' });
        expect(isSubscriptionInactive(err)).toBe(false);
        expect(forbiddenReaction(err)).toEqual({
            event: PERMISSIONS_STALE_EVENT,
            toastMessage: 'Tylko właściciel może usunąć klienta',
        });
    });

    it('brak uprawnień bez komunikatu: zdanie domyślne', () => {
        expect(forbiddenReaction(forbidden('patch')).toastMessage).toBe('Nie masz uprawnień do wykonania tej operacji');
    });

    it('brak uprawnień przy odczycie w tle: bez toastu', () => {
        expect(forbiddenReaction(forbidden('get', { message: 'x' }))).toEqual({
            event: PERMISSIONS_STALE_EVENT,
            toastMessage: null,
        });
    });

    it('kod abonamentu przy innym statusie niż 403 nie jest wygaśnięciem', () => {
        expect(isSubscriptionInactive({ response: { status: 402, data: { code: 'SUBSCRIPTION_INACTIVE' } } })).toBe(false);
        expect(isSubscriptionInactive(null)).toBe(false);
    });
});
