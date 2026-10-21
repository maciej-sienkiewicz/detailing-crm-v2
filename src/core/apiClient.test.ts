import { afterEach, describe, expect, it } from 'vitest';
import type { AxiosAdapter } from 'axios';
import { DEFAULT_TIMEOUT_MS, UPLOAD_TIMEOUT_MS, apiClient } from './apiClient';

/**
 * Każde zapytanie ma limit czasu: dawniej zawieszone połączenie kręciło się bez końca.
 * Wysyłka pliku dostaje dłuższy, a wywołanie z własnym `timeout` zostaje przy swoim.
 */

const originalAdapter = apiClient.defaults.adapter;
const echoTimeout: AxiosAdapter = async config => ({
    data: config.timeout, status: 200, statusText: 'OK', headers: {}, config,
});

afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
});

describe('apiClient timeout', () => {
    it('ma domyślny limit czasu', async () => {
        apiClient.defaults.adapter = echoTimeout;
        const { data } = await apiClient.get('/v1/company');
        expect(data).toBe(DEFAULT_TIMEOUT_MS);
    });

    it('wysyłka pliku dostaje dłuższy limit', async () => {
        apiClient.defaults.adapter = echoTimeout;
        const { data } = await apiClient.post('/visits/v1/photos', new FormData());
        expect(data).toBe(UPLOAD_TIMEOUT_MS);
    });

    it('własny limit wywołania wygrywa', async () => {
        apiClient.defaults.adapter = echoTimeout;
        const { data } = await apiClient.get('/v1/customers/export', { timeout: 120_000 });
        expect(data).toBe(120_000);
    });
});
