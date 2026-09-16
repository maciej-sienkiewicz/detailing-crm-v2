// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDamageMapNotifyAvailability } from './useDamageMapNotifyAvailability';

const capability = {
    enabled: true,
    isLoading: false,
    missingFeatures: [] as { displayName: string }[],
};
const balance = {
    data: { availableCredits: 25 } as { availableCredits: number } | undefined,
    isLoading: false,
};
let creditsQueriedWith: boolean | undefined;

vi.mock('@/modules/subscription', () => ({
    useCapability: () => capability,
}));

vi.mock('@/modules/settings/hooks/useSmsCredits', () => ({
    useSmsCreditBalance: (opts?: { enabled?: boolean }) => {
        creditsQueriedWith = opts?.enabled;
        return balance;
    },
}));

const render = (customerEmail: string | null, customerPhone: string | null) =>
    renderHook(() => useDamageMapNotifyAvailability({ customerEmail, customerPhone })).result.current;

describe('useDamageMapNotifyAvailability', () => {
    beforeEach(() => {
        capability.enabled = true;
        capability.isLoading = false;
        capability.missingFeatures = [];
        balance.data = { availableCredits: 25 };
        balance.isLoading = false;
        creditsQueriedWith = undefined;
    });

    it('bez modułu komunikacji nie da się wysłać NICZEGO, także maila', () => {
        /*
         * Sedno pytania z przeglądu. `COMM_SEND_TRANSACTIONAL` blokuje w bramce obie
         * metody wysyłkowe, więc brak modułu to nie „tylko SMS niedostępny".
         */
        capability.enabled = false;
        capability.missingFeatures = [{ displayName: 'Komunikacja' }];

        const result = render('jan@example.com', '534920205');

        expect(result.canNotify).toBe(false);
        expect(result.channel).toBeNull();
        expect(result.blockedReason).toContain('Komunikacja');
    });

    it('mail wygrywa, bo mapa jest załącznikiem', () => {
        const result = render('jan@example.com', '534920205');

        expect(result.canNotify).toBe(true);
        expect(result.channel).toBe('EMAIL');
        // Saldo SMS nie ma tu nic do rzeczy, więc nie pytamy o nie serwera.
        expect(creditsQueriedWith).toBe(false);
    });

    it('bez maila zostaje SMS i wtedy saldo zaczyna decydować', () => {
        const result = render(null, '534920205');

        expect(result.channel).toBe('SMS');
        expect(creditsQueriedWith).toBe(true);
    });

    it('brak kredytów blokuje, gdy SMS jest jedynym kanałem', () => {
        balance.data = { availableCredits: 0 };

        const result = render(null, '534920205');

        expect(result.canNotify).toBe(false);
        expect(result.blockedReason).toContain('kredytów SMS');
    });

    it('nieodczytane saldo nie blokuje: to nie potwierdzone zero', () => {
        // Blokowanie opcji na podstawie liczby, której nie udało się odczytać, byłoby
        // zgadywaniem — bramka i tak powie prawdę przy wysyłce.
        balance.data = undefined;

        expect(render(null, '534920205').canNotify).toBe(true);
    });

    it('klient bez kontaktu nie ma czym dostać wiadomości', () => {
        const result = render(null, null);

        expect(result.canNotify).toBe(false);
        expect(result.blockedReason).toContain('ani adresu e-mail, ani numeru telefonu');
    });

    it('puste ciągi to brak kontaktu, nie kontakt', () => {
        expect(render('   ', '  ').canNotify).toBe(false);
    });

    it('w trakcie ładowania nie twierdzi, że nie można', () => {
        // Render nic, nie blokadę: `canNotify = false` z `isLoading = true` znaczy
        // „jeszcze nie wiem", a okno pokazuje wtedy wczytywanie.
        capability.isLoading = true;

        const result = render('jan@example.com', null);

        expect(result.isLoading).toBe(true);
        expect(result.blockedReason).toBeNull();
    });
});
