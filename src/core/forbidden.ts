// src/core/forbidden.ts
//
// Co zrobić z odpowiedzią 403. Dwie różne przyczyny dają ten sam status:
//
//  - brak uprawnień roli: UI ma się dowiedzieć, czego użytkownik nie może, więc
//    odświeża /auth/me (`auth:permissions-stale`), a akcja, którą ktoś kliknął,
//    dostaje toast z powodem;
//  - SUBSCRIPTION_INACTIVE: studio straciło dostęp, bo abonament wygasł w trakcie
//    sesji. To nie jest sprawa uprawnień - odświeżanie /auth/me niczego nie zmieniało,
//    a każda kliknięta akcja kończyła się gołym toastem „brak dostępu", dopóki ktoś
//    nie przeładował strony. Bramka abonamentu odczytuje status tylko przy montowaniu,
//    więc trzeba jej powiedzieć wprost, że status się zmienił - wtedy sama pokaże
//    okno odnowienia, które tłumaczy wszystko lepiej niż toast.
//
// Decyzja jest czystą funkcją, żeby dało się ją przetestować bez axiosa i okna.

export const SUBSCRIPTION_INACTIVE_CODE = 'SUBSCRIPTION_INACTIVE';

/** Abonament przestał być aktywny - nasłuchuje go bramka abonamentu. */
export const SUBSCRIPTION_INACTIVE_EVENT = 'api:subscription-inactive';

/** Uprawnienia roli mogły się zmienić - nasłuchuje go AuthContext. */
export const PERMISSIONS_STALE_EVENT = 'auth:permissions-stale';

const DEFAULT_FORBIDDEN_MESSAGE = 'Nie masz uprawnień do wykonania tej operacji';

interface ForbiddenErrorLike {
    response?: { status?: number; data?: { code?: unknown; message?: unknown } };
    config?: { method?: string; skipErrorToast?: boolean };
}

export interface ForbiddenReaction {
    event: typeof SUBSCRIPTION_INACTIVE_EVENT | typeof PERMISSIONS_STALE_EVENT;
    /** Treść toastu dla akcji, którą ktoś kliknął; null = bez toastu. */
    toastMessage: string | null;
}

export function isSubscriptionInactive(error: unknown): boolean {
    const e = error as ForbiddenErrorLike | null;
    return e?.response?.status === 403 && e.response.data?.code === SUBSCRIPTION_INACTIVE_CODE;
}

/**
 * Reakcja na 403. Odczyty, których użytkownik nie wywołał, zawsze milczą (widok
 * po prostu nic nie pokazuje). Przy wygasłym abonamencie milczą też mutacje - okno
 * odnowienia, które bramka pokaże po odświeżeniu statusu, mówi, co się stało
 * i co z tym zrobić, a toast pod nim byłby tylko szumem.
 *
 * Wywołanie z `skipErrorToast` mówi o błędzie samo (toast z tytułem, komunikat
 * w oknie) - tak jak przy każdym innym 4xx. Bez tego 403 z takiego wywołania
 * (np. „tylko właściciel" przy zamówieniu) pokazywało to samo zdanie dwa razy:
 * gołe stąd i z tytułem od wywołującego. Uprawnienia odświeżamy mimo to.
 */
export function forbiddenReaction(error: unknown): ForbiddenReaction {
    if (isSubscriptionInactive(error)) {
        return { event: SUBSCRIPTION_INACTIVE_EVENT, toastMessage: null };
    }
    const e = error as ForbiddenErrorLike | null;
    const method = (e?.config?.method ?? 'get').toLowerCase();
    const isRead = method === 'get' || method === 'head';
    const handledByCaller = e?.config?.skipErrorToast === true;
    const message = e?.response?.data?.message;
    return {
        event: PERMISSIONS_STALE_EVENT,
        toastMessage: isRead || handledByCaller
            ? null
            : (typeof message === 'string' && message ? message : DEFAULT_FORBIDDEN_MESSAGE),
    };
}
