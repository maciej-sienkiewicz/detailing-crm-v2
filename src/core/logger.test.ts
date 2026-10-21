import { AxiosError, AxiosHeaders } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeError, logger, setLogSink, urlTemplate } from './logger';

/**
 * Logger to jedyna droga do konsoli i do raportowania błędów. Do zlewu nie może trafić
 * treść żądania ani odpowiedzi, query string ani identyfikator z adresu - tam bywają
 * dane klientów i tokeny linków.
 */

const httpError = () => {
    const config = {
        method: 'post',
        url: '/v1/customers/123e4567-e89b-12d3-a456-426614174000/notes?email=jan@example.com',
        data: '{"note":"Klient Jan Kowalski, tel. 600 100 200"}',
        headers: new AxiosHeaders(),
    };
    return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
        status: 409,
        statusText: 'Conflict',
        data: { code: 'ALREADY_LINKED', message: 'Jan Kowalski ma już notatkę' },
        headers: {},
        config,
    });
};

afterEach(() => {
    setLogSink(null);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe('urlTemplate', () => {
    it('usuwa query string i identyfikatory', () => {
        expect(urlTemplate('/v1/customers/123e4567-e89b-12d3-a456-426614174000/notes?email=a@b.pl'))
            .toBe('/v1/customers/:id/notes');
        expect(urlTemplate('/public/signing/Xk3r9QpL2mZ7/submit')).toBe('/public/signing/:id/submit');
        expect(urlTemplate('/v1/sms-campaigns/automation')).toBe('/v1/sms-campaigns/automation');
    });
});

describe('describeError', () => {
    it('opisuje błąd HTTP bez treści żądania i odpowiedzi', () => {
        const context = describeError(httpError());

        expect(context).toEqual({
            kind: 'http', method: 'POST', url: '/v1/customers/:id/notes', status: 409, code: 'ALREADY_LINKED',
        });
        expect(JSON.stringify(context)).not.toMatch(/Kowalski|600 100 200|example\.com/);
    });
});

describe('logger', () => {
    it('na produkcji nie pisze do konsoli, tylko do zlewu', () => {
        vi.stubEnv('DEV', false);
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const sink = vi.fn();
        setLogSink(sink);

        logger.error('api.failed', httpError());
        logger.warn('push.refresh_failed', { kind: 'http' });

        expect(error).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
        expect(sink).toHaveBeenCalledWith('error', 'api.failed', expect.objectContaining({ status: 409 }));
        expect(sink).toHaveBeenCalledWith('warn', 'push.refresh_failed', { kind: 'http' });
    });

    it('na produkcji bez zlewu milczy', () => {
        vi.stubEnv('DEV', false);
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        logger.error('react.caught', new Error('x'));

        expect(error).not.toHaveBeenCalled();
    });
});
