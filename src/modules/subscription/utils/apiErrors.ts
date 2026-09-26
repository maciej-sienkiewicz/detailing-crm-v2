// src/modules/subscription/utils/apiErrors.ts
//
// Błąd mutacji ma być widoczny, ale raz. Interceptor w apiClient pokazuje już
// toast dla każdego 4xx, którego wywołanie nie oznaczyło `skipErrorToast` - więc
// ekran, który dołożyłby swój toast bezwarunkowo, pokazywałby to samo zdanie
// dwa razy. A ekran, który nie dołoży żadnego, zostawia 5xx i zerwane połączenie
// bez słowa: przycisk po prostu „nic nie robi". Stąd jedna reguła w jednym miejscu.

type ApiErrorLike = {
    response?: { status?: number; data?: { message?: string } };
    config?: { skipErrorToast?: boolean };
    message?: string;
};

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
