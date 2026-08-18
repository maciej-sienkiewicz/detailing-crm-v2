// src/modules/checkin/views/mobile/uploadErrors.ts
//
// The mobile uploader talks to the backend with an X-Upload-Token instead of a session,
// so its failure modes differ from the rest of the app: the token can be revoked while
// the page stays open. Raw axios messages ("Request failed with status code 403") tell
// the operator nothing, so failures are translated here.

interface HttpErrorShape {
    response?: { status?: number; data?: { message?: string } };
}

const httpStatus = (err: unknown): number | undefined =>
    (err as HttpErrorShape | null)?.response?.status;

const serverMessage = (err: unknown): string | undefined =>
    (err as HttpErrorShape | null)?.response?.data?.message;

/**
 * True when the upload token is no longer valid — the QR session was replaced,
 * revoked (visit created on desktop) or simply expired. The page must stop retrying
 * and ask for a fresh QR code.
 */
export const isSessionGoneError = (err: unknown): boolean => {
    const status = httpStatus(err);
    if (status === 401 || status === 403) return true;
    // No response object (non-axios error): fall back to the message text
    const message = err instanceof Error ? err.message.toLowerCase() : '';
    return status === undefined && (message.includes('403') || message.includes('token'));
};

/** A short, actionable Polish message for a failed photo upload. */
export const describeUploadError = (err: unknown): string => {
    if (isSessionGoneError(err)) {
        return 'Sesja wygasła — poproś o nowy kod QR na stanowisku obsługi.';
    }

    const status = httpStatus(err);
    if (status === 413) return 'Zdjęcie jest zbyt duże — zrób je ponownie w niższej rozdzielczości.';
    if (status !== undefined && status >= 500) return 'Błąd serwera — spróbujemy ponownie za chwilę.';

    const fromServer = serverMessage(err);
    if (fromServer) return fromServer;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return 'Brak połączenia — zdjęcie wyślemy automatycznie po jego odzyskaniu.';
    }
    return 'Nie udało się wysłać zdjęcia — naciśnij "Ponów".';
};
