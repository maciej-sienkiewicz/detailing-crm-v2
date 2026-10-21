import { describe, expect, it, vi } from 'vitest';
import { readVoiceToken } from './voiceToken';

/**
 * Token skrótów mobilnych działa bez sesji, więc nie może iść w adresie do serwera.
 * Strona czyta go z fragmentu (#token=); stary link z `?token=` działa dalej, ale token
 * natychmiast przechodzi do fragmentu.
 */

const history = () => ({ state: { idx: 0 }, replaceState: vi.fn() });

describe('readVoiceToken', () => {
    it('czyta token z fragmentu i nie rusza adresu', () => {
        const h = history();

        expect(readVoiceToken({ pathname: '/m/voice', search: '', hash: '#token=abc123' }, h)).toBe('abc123');
        expect(h.replaceState).not.toHaveBeenCalled();
    });

    it('stary link z ?token= działa, a token przechodzi do fragmentu', () => {
        const h = history();

        expect(readVoiceToken({ pathname: '/m/voice', search: '?token=old-1&x=1', hash: '' }, h)).toBe('old-1');
        expect(h.replaceState).toHaveBeenCalledWith({ idx: 0 }, '', '/m/voice?x=1#token=old-1');
    });

    it('bez tokenu zwraca pusty napis', () => {
        const h = history();

        expect(readVoiceToken({ pathname: '/m/voice', search: '', hash: '' }, h)).toBe('');
        expect(h.replaceState).not.toHaveBeenCalled();
    });
});
