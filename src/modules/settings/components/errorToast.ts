// src/modules/settings/components/errorToast.ts
//
// Czy błąd żądania pokazał już globalny interceptor (src/core/apiClient.ts)?
//
// Interceptor sam wyświetla dymek dla 4xx (poza 401, które przenosi do logowania)
// i dla 403 przy akcji użytkownika, a 402 „MODULE_REQUIRED" otwiera okno zakupu.
// Sekcja, która do tego dokłada własne showError, pokazuje to samo zdanie dwa
// razy. Za to 5xx i brak sieci interceptor przepuszcza bez słowa - i wtedy
// kliknięcie „Usuń" czy przełącznik kończyły się ciszą. Stąd reguła: własny dymek
// tylko wtedy, gdy globalnego nie było.

import { problemDetail, problemStatus } from '@/core/problem';

export function toastedGlobally(error: unknown): boolean {
    // Żądanie z `skipErrorToast` interceptor przepuszcza bez dymka - wtedy własny dymek
    // sekcji jest jedynym, a nie drugim. Bez tego warunku błąd zapisu znikał bez śladu.
    if ((error as { config?: { skipErrorToast?: boolean } } | null)?.config?.skipErrorToast === true) return false;
    const status = problemStatus(error);
    if (status === undefined) return false;
    return status >= 400 && status < 500;
}

/** Komunikat serwera, jeśli jest - brzmi konkretniej niż nasz ogólnik. */
export function serverMessage(error: unknown): string | undefined {
    return problemDetail(error);
}
