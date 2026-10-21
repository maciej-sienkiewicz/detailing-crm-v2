// src/core/logger.ts
/* eslint-disable no-console -- jedyne miejsce w aplikacji, które może pisać do konsoli */
import { isAxiosError } from 'axios';

/**
 * Jedyna droga zapisu błędów i ostrzeżeń w aplikacji.
 *
 * W trybie deweloperskim pisze do konsoli, razem z całym obiektem błędu. Na produkcji
 * konsola zostaje pusta: zdarzenie trafia wyłącznie do zlewu ustawionego przez
 * `setLogSink` (np. Sentry albo własny endpoint), a bez zlewu przepada.
 *
 * Do zlewu nie trafia nic, co mogłoby nieść dane osobowe: dla błędu HTTP tylko metoda,
 * szablon adresu (bez query stringa, z identyfikatorami zastąpionymi `:id`), status
 * i `code` z treści odpowiedzi - nigdy treść żądania ani odpowiedzi. Rozwinięty
 * `AxiosError` w konsoli pokazywał całe `config.data` i `response.data`.
 */

export type LogContext = Record<string, string | number | boolean | null | undefined>;
export type LogLevel = 'warn' | 'error';
export type LogSink = (level: LogLevel, event: string, context: LogContext) => void;

let sink: LogSink | null = null;

export const setLogSink = (next: LogSink | null): void => {
    sink = next;
};

/** Segment ścieżki, który wygląda na identyfikator albo token: ma cyfrę i co najmniej 8 znaków. */
const ID_SEGMENT = /^(?=.*\d)[\w-]{8,}$/;

export const urlTemplate = (url: string): string =>
    url.split('?')[0].split('/').map(segment => (ID_SEGMENT.test(segment) ? ':id' : segment)).join('/');

export const describeError = (error: unknown): LogContext => {
    if (isAxiosError(error)) {
        const body = error.response?.data as { code?: unknown } | undefined;
        return {
            kind: 'http',
            method: error.config?.method?.toUpperCase(),
            url: error.config?.url ? urlTemplate(error.config.url) : undefined,
            status: error.response?.status,
            code: typeof body?.code === 'string' ? body.code : error.code,
        };
    }
    if (error instanceof Error) return { kind: error.name, message: error.message.slice(0, 200) };
    return { kind: typeof error };
};

const emit = (level: LogLevel, event: string, context: LogContext, error?: unknown): void => {
    if (import.meta.env.DEV) {
        if (error === undefined) console[level](`[${event}]`, context);
        else console[level](`[${event}]`, error, context);
        return;
    }
    sink?.(level, event, context);
};

export const logger = {
    warn: (event: string, context: LogContext = {}): void => emit('warn', event, context),
    error: (event: string, error?: unknown, context: LogContext = {}): void =>
        emit('error', event, { ...describeError(error), ...context }, error),
};
