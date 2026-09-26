// src/modules/settings/components/team/mutationError.ts
//
// Błąd zapisu w zakładce „Pracownicy i role" ma być WIDOCZNY. Wcześniej mutacje
// dodania pracownika, zapisu i usunięcia roli nie miały `onError` wcale - przy 4xx
// ratował je globalny dymek z apiClient, ale przy 5xx albo zerwanym połączeniu
// okno stało dalej z przyciskiem „Zapisywanie...", który wracał do „Zapisz", i nic
// nie mówiło, że nic się nie zapisało.
//
// Nie wolno przy tym pokazać DWÓCH dymków: interceptor w src/core/apiClient.ts sam
// zgłasza każdy 4xx (poza 401) i 403 przy mutacji, chyba że żądanie ma
// `skipErrorToast`. Tu zgłaszamy dokładnie to, czego on nie zgłosi.

type ApiErrorShape = {
    response?: { status?: number; data?: { message?: string; code?: string } };
    config?: { skipErrorToast?: boolean };
};

const shape = (error: unknown): ApiErrorShape => (error ?? {}) as ApiErrorShape;

/** Komunikat z odpowiedzi serwera, jeśli jest. */
export function serverMessage(error: unknown): string | null {
    return shape(error).response?.data?.message ?? null;
}

/** Czy globalny interceptor już pokazał (albo celowo przemilczał) ten błąd. */
export function handledGlobally(error: unknown): boolean {
    const { response, config } = shape(error);
    const status = response?.status;
    // Brak odpowiedzi (sieć, CORS, timeout) i 5xx - interceptor milczy.
    if (status === undefined || status >= 500) return false;
    // 401 kończy się przejściem do logowania, 402 z MODULE_REQUIRED otwiera okno zakupu.
    if (status === 401) return true;
    if (status === 402 && response?.data?.code === 'MODULE_REQUIRED') return true;
    // 403 przy mutacji interceptor zgłasza zawsze, resztę 4xx - o ile nikt nie wypisał się flagą.
    if (status === 403) return true;
    return config?.skipErrorToast !== true;
}

/**
 * Dymek błędu dla mutacji, której nie obsłużył interceptor. Tytuł mówi, CO się nie
 * udało („Nie udało się dodać pracownika"), treść - dlaczego i co zrobić.
 */
export function reportMutationError(
    showError: (title: string, message?: string) => void,
    title: string,
    error: unknown,
): void {
    if (handledGlobally(error)) return;
    const status = shape(error).response?.status;
    const message = serverMessage(error)
        ?? (status === undefined
            ? 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.'
            : 'Serwer nie przyjął zmian. Spróbuj ponownie za chwilę.');
    showError(title, message);
}
