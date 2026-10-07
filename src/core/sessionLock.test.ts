// @vitest-environment jsdom
//
// Zgłoszenie biznesu z 07.10: „Sesja zablokowana" znikała po otwarciu aplikacji
// w nowej karcie. Blokada jest teraz na serwerze (423 SESSION_LOCKED); ten moduł
// przenosi wiadomość o niej między kartami i wspólny czas ostatniej aktywności.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { apiClient } from './apiClient';
import {
    SESSION_LOCKED_EVENT, isSessionLockedResponse, lastSharedActivity, onLockSignal,
    recordActivity, resetActivityThrottleForTests,
} from './sessionLock';

afterEach(() => {
    localStorage.clear();
    resetActivityThrottleForTests();
});

const storageEvent = (key: string, newValue: string) =>
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));

describe('sygnał blokady między kartami', () => {
    it('inna karta dostaje blokadę i odblokowanie, obce klucze nic nie znaczą', () => {
        const handler = vi.fn();
        const unsubscribe = onLockSignal(handler);

        storageEvent('crm_session_lock_signal', 'locked:1');
        storageEvent('crm_session_lock_signal', 'unlocked:2');
        storageEvent('inny_klucz', 'locked:3');

        expect(handler.mock.calls).toEqual([[true], [false]]);
        unsubscribe();
        storageEvent('crm_session_lock_signal', 'locked:4');
        expect(handler).toHaveBeenCalledTimes(2);
    });
});

describe('wspólna aktywność', () => {
    it('zapis co najwyżej raz na 5 s, chyba że wymuszony', () => {
        recordActivity(10_000);
        recordActivity(12_000);
        expect(lastSharedActivity()).toBe(10_000);
        recordActivity(15_000);
        expect(lastSharedActivity()).toBe(15_000);
        recordActivity(16_000, true);
        expect(lastSharedActivity()).toBe(16_000);
    });
});

describe('apiClient - 423 SESSION_LOCKED', () => {
    // Własny adapter sam rozstrzyga o błędzie - jak przeglądarka, która dostała 423.
    const lockedAdapter = async (config: InternalAxiosRequestConfig) => {
        throw new AxiosError('Locked', 'ERR_BAD_REQUEST', config, null, {
            data: { code: 'SESSION_LOCKED', message: 'Sesja jest zablokowana.' },
            status: 423, statusText: 'Locked', headers: {}, config,
        });
    };

    it('pokazuje ekran blokady zamiast dymka z błędem', async () => {
        const locked = vi.fn();
        const toast = vi.fn();
        window.addEventListener(SESSION_LOCKED_EVENT, locked);
        window.addEventListener('api:error', toast);

        await expect(apiClient.get('/visits', { adapter: lockedAdapter })).rejects.toBeTruthy();

        expect(locked).toHaveBeenCalledTimes(1);
        expect(toast).not.toHaveBeenCalled();
        window.removeEventListener(SESSION_LOCKED_EVENT, locked);
        window.removeEventListener('api:error', toast);
    });

    it('inny 423 to nie blokada sesji', () => {
        expect(isSessionLockedResponse(423, { code: 'SESSION_LOCKED' })).toBe(true);
        expect(isSessionLockedResponse(423, { code: 'RESOURCE_LOCKED' })).toBe(false);
        expect(isSessionLockedResponse(403, { code: 'SESSION_LOCKED' })).toBe(false);
    });
});
