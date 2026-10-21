// @vitest-environment jsdom
//
// Odrzucenie, którego nikt nie obsłużył, przeglądarka wypisuje jako „Uncaught (in promise)",
// a przy AxiosError razem z treścią żądania i odpowiedzi. Handler gasi to zdarzenie
// i oddaje je loggerowi; błąd chunku dalej idzie do naprawy przeładowaniem.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const logger = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn() }));
const recoverFromChunkError = vi.hoisted(() => vi.fn());

vi.mock('../logger', () => ({ logger }));
vi.mock('./chunkError', () => ({
    isChunkLoadError: (error: unknown) => error instanceof Error && error.name === 'ChunkLoadError',
    recoverFromChunkError,
    resetChunkReloadGuard: vi.fn(),
}));

import { installChunkErrorHandler } from './installChunkErrorHandler';

const rejection = (reason: unknown) => {
    const event = new Event('unhandledrejection', { cancelable: true });
    Object.defineProperty(event, 'reason', { value: reason });
    window.dispatchEvent(event);
    return event;
};

beforeAll(() => installChunkErrorHandler());

afterEach(() => vi.clearAllMocks());

describe('installChunkErrorHandler', () => {
    it('gasi zwykłe odrzucenie i oddaje je loggerowi', () => {
        const reason = new Error('Request failed with status code 409');

        const event = rejection(reason);

        expect(event.defaultPrevented).toBe(true);
        expect(logger.error).toHaveBeenCalledWith('unhandled.rejection', reason);
        expect(recoverFromChunkError).not.toHaveBeenCalled();
    });

    it('błąd chunku naprawia przeładowaniem, bez wpisu w loggerze', () => {
        const reason = new Error('Failed to fetch dynamically imported module');
        reason.name = 'ChunkLoadError';

        const event = rejection(reason);

        expect(event.defaultPrevented).toBe(true);
        expect(recoverFromChunkError).toHaveBeenCalledTimes(1);
        expect(logger.error).not.toHaveBeenCalled();
    });
});
