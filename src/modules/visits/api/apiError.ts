/**
 * Odczyt szczegółów błędu z odpowiedzi API bez rzutowania na `any`.
 *
 * Axios nie typuje ciała odpowiedzi błędu, a interesują nas tylko dwa pola.
 * Zawężamy je punktowo zamiast wyłączać kontrolę typów w każdym handlerze.
 */

interface ApiErrorShape {
    response?: {
        status?: unknown;
        data?: { message?: unknown };
    };
}

/** Komunikat z backendu albo [fallback], gdy odpowiedź go nie zawiera. */
export const apiErrorMessage = (error: unknown, fallback: string): string => {
    const message = (error as ApiErrorShape)?.response?.data?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
};

/** Kod HTTP odpowiedzi, o ile błąd pochodzi z wywołania API. */
export const apiErrorStatus = (error: unknown): number | undefined => {
    const status = (error as ApiErrorShape)?.response?.status;
    return typeof status === 'number' ? status : undefined;
};
