// src/modules/subscription/utils/apiErrors.ts
//
// Błąd mutacji ma być widoczny, ale raz. Interceptor w apiClient pokazuje już
// toast dla każdego 4xx, którego wywołanie nie oznaczyło `skipErrorToast` - więc
// ekran, który dołożyłby swój toast bezwarunkowo, pokazywałby to samo zdanie
// dwa razy. A ekran, który nie dołoży żadnego, zostawia 5xx i zerwane połączenie
// bez słowa: przycisk po prostu „nic nie robi". Stąd jedna reguła w jednym miejscu.

import { problemDetail, problemStatus } from '@/core/problem';

type RequestConfigLike = {
    config?: { skipErrorToast?: boolean };
};

/**
 * Czy interceptor już o tym błędzie powiedział (albo zrobił coś zamiast toastu:
 * 401 przekierowuje na logowanie, 402 otwiera okno dokupienia modułu).
 */
export function isHandledGlobally(error: unknown): boolean {
    const status = problemStatus(error);
    if (status === undefined) return false;
    if ((error as RequestConfigLike | null)?.config?.skipErrorToast === true) return false;
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
    showError(title, problemDetail(error, fallback));
}
