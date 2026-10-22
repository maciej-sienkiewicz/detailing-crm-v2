// src/modules/settings/components/studioErrors.ts
//
// Błędy żądań w sekcjach „Studio" (Dane firmy, Oznaczenia, Dokumenty i podpisy).
//
// Dwie rzeczy psuły się tu wcześniej:
//  - dubel: interceptor apiClient pokazuje dymek dla każdego 4xx, a sekcja
//    dokładała drugi, własny („Błąd - Nie udało się zapisać danych");
//  - cisza albo żargon: 5xx i brak sieci interceptor przepuszcza bez słowa, a okna
//    pokazywały `err.message` z axiosa - „Request failed with status code 400"
//    zamiast zdania, które backend przysłał w `message`.
//
// Reguła: własny dymek tylko wtedy, gdy globalnego nie było - z uwzględnieniem
// `skipErrorToast`, którym wywołanie mówi „komunikat pokażę sam".

import { problemDetail, problemStatus } from '@/core/problem';

interface RequestConfigLike {
    config?: { skipErrorToast?: boolean; method?: string };
}

/** Czy interceptor (src/core/apiClient.ts) pokazał już dymek dla tego błędu. */
export function shownByInterceptor(error: unknown): boolean {
    const e = error as RequestConfigLike | undefined;
    const status = problemStatus(error);
    if (status === undefined) return false;
    // 401 przenosi do logowania - dymek nic by nie dał.
    if (status === 401) return true;
    // 403 przy akcji (nie przy odczycie) interceptor ogłasza zawsze, bez względu na skipErrorToast.
    if (status === 403) {
        const method = (e?.config?.method ?? 'get').toLowerCase();
        return method !== 'get' && method !== 'head';
    }
    if (e?.config?.skipErrorToast === true) return false;
    return status >= 400 && status < 500;
}

/** Zdanie z backendu (`detail` problemu), jeśli przyszło - konkretniejsze niż nasz ogólnik. */
export function backendMessage(error: unknown): string | undefined {
    return problemDetail(error);
}

/**
 * Komunikat do pokazania w oknie przy polu/formularzu: zdanie backendu, a bez niego
 * własny komunikat błędu (np. z uploadu do S3) - ale nigdy surowe „Request failed
 * with status code …" z axiosa.
 */
export function readableError(error: unknown, fallback: string): string {
    const fromBackend = backendMessage(error);
    if (fromBackend) return fromBackend;
    if (problemStatus(error) !== undefined) return fallback;
    const message = error instanceof Error ? error.message : undefined;
    if (!message || /^Request failed with status code/i.test(message) || message === 'Network Error') return fallback;
    return message;
}
