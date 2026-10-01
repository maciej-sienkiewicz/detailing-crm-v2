// src/modules/subscription/utils/apiErrors.ts
//
// Błąd mutacji ma być widoczny, ale raz. Interceptor w apiClient pokazuje już
// toast dla każdego 4xx, którego wywołanie nie oznaczyło `skipErrorToast` - więc
// ekran, który dołożyłby swój toast bezwarunkowo, pokazywałby to samo zdanie
// dwa razy. A ekran, który nie dołoży żadnego, zostawia 5xx i zerwane połączenie
// bez słowa: przycisk po prostu „nic nie robi". Stąd jedna reguła w jednym miejscu.

type ApiErrorLike = {
    response?: { status?: number; data?: { message?: string; code?: unknown } };
    config?: { skipErrorToast?: boolean };
    message?: string;
};

/** Status HTTP odpowiedzi; undefined, gdy odpowiedzi nie było (zerwane połączenie). */
export function apiErrorStatus(error: unknown): number | undefined {
    return (error as ApiErrorLike | null)?.response?.status;
}

/** Maszynowy kod błędu z backendu (`code`) - rozgałęziamy po nim, nigdy po treści. */
export function apiErrorCode(error: unknown): string | undefined {
    const code = (error as ApiErrorLike | null)?.response?.data?.code;
    return typeof code === 'string' && code ? code : undefined;
}

/** Komunikat z backendu, jeśli go przysłał. */
export function apiErrorMessage(error: unknown): string | undefined {
    const msg = (error as ApiErrorLike | null)?.response?.data?.message;
    return typeof msg === 'string' && msg.trim() ? msg : undefined;
}

/**
 * Czy interceptor już o tym błędzie powiedział (albo zrobił coś zamiast toastu:
 * 401 przekierowuje na logowanie, 402 otwiera okno dokupienia modułu).
 */
export function isHandledGlobally(error: unknown): boolean {
    const e = error as ApiErrorLike | null;
    const status = e?.response?.status;
    if (status === undefined) return false;
    if (e?.config?.skipErrorToast === true) return false;
    return status >= 400 && status < 500;
}

/** Toast z tytułem dla błędu, o którym nikt jeszcze nie powiedział. */
export function toastUnhandledError(
    showError: (title: string, message?: string) => void,
    error: unknown,
    title: string,
    fallback: string,
): void {
    if (isHandledGlobally(error)) return;
    showError(title, apiErrorMessage(error) ?? fallback);
}
