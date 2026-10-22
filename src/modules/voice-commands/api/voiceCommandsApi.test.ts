import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Kontekst strony głosowej: token w nagłówku X-Mobile-Token, nie w adresie. Adres trafia
 * do logów proxy i historii przeglądarki, a token działa bez sesji.
 */

const get = vi.hoisted(() => vi.fn());
vi.mock('@/core', () => ({ apiClient: { get } }));

import { voiceCommandsApi } from './voiceCommandsApi';

afterEach(() => vi.clearAllMocks());

describe('voiceCommandsApi.getContext', () => {
    it('wysyła token w nagłówku, bez query stringa', async () => {
        get.mockResolvedValue({ data: { firstName: 'Anna', studioName: 'Auto Spa' } });

        await voiceCommandsApi.getContext('abc123');

        const [url, config] = get.mock.calls[0];
        expect(url).toBe('/v1/mobile/voice/context');
        expect(config.headers).toEqual({ 'X-Mobile-Token': 'abc123' });
        expect(config.params).toBeUndefined();
    });
});
