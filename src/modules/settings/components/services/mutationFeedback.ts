// src/modules/settings/components/services/mutationFeedback.ts
//
// Kiedy cennik ma sam pokazać błąd zapisu, a kiedy zrobił to już apiClient.
//
// Interceptor w src/core/apiClient.ts pokazuje toast przy każdym 4xx (401 przenosi
// do logowania, 402 otwiera okno planu, 403 przy zmianie mówi o uprawnieniach), ale
// milczy przy 5xx i przy braku sieci. Wcześniej cennik nie łapał błędów wcale:
// zapis kończący się 500 zostawiał otwarty formularz bez słowa wyjaśnienia.
// Pokazanie własnego toastu przy 4xx dałoby za to dwa komunikaty o tym samym.

export function shownByApiClient(error: unknown): boolean {
    const status = (error as { response?: { status?: number } } | null)?.response?.status;
    return status !== undefined && status >= 400 && status < 500;
}

export function reportMutationError(
    showError: (title: string, message?: string) => void,
    error: unknown,
    title: string,
    message = 'Sprawdź połączenie z internetem i spróbuj ponownie.',
): void {
    if (shownByApiClient(error)) return;
    showError(title, message);
}
