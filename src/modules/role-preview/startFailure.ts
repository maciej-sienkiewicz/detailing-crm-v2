/**
 * „Podgląd nie powstał" - wiadomość od okna studia do okna podglądu.
 *
 * Okno podglądu tuż po starcie odcina się od okna studia (`window.opener = null`), a od tej
 * chwili przeglądarka nie pozwala oknu studia go zamknąć: `close()` po prostu nic nie robi.
 * Gdy serwer odmówi założenia piaskownicy, okno czekałoby na nią do końca ważności kodu,
 * odpytując serwer w kółko. Dlatego okno studia wysyła tę wiadomość, a okno podglądu
 * zamyka się samo.
 */
const START_FAILED = 'role-preview:start-failed';
const DEFAULT_REASON = 'Nie udało się przygotować podglądu.';

/** Okno studia: powiadom okno podglądu, że piaskownica nie powstanie. */
export function sendStartFailed(previewWindow: Window, previewBaseUrl: string, reason: string): void {
    try {
        previewWindow.postMessage({ type: START_FAILED, reason }, new URL(previewBaseUrl).origin);
    } catch {
        // Okno już zamknięte albo adres podglądu bez sensu - zostaje samo close().
    }
}

export interface StartFailureWatch {
    /** Powód, dla którego podgląd nie powstał; null, dopóki okno studia go nie zgłosiło. */
    reason(): string | null;
}

/**
 * Okno podglądu: nasłuch na wiadomość od okna studia. Trzeba go włączyć PRZED odcięciem się
 * od okna studia - do tej chwili okno studia zamyka podgląd samo, od tej chwili robi to
 * wiadomość, więc nie ma momentu, w którym nie działa żadna z dróg. Liczy się wyłącznie
 * wiadomość od okna, które otworzyło podgląd.
 */
export function watchStartFailure(
    opener: Window | null,
    closeWindow: () => void = () => window.close(),
): StartFailureWatch {
    let reason: string | null = null;
    if (opener) {
        window.addEventListener('message', event => {
            if (event.source !== opener) return;
            const data = event.data as { type?: unknown; reason?: unknown } | null;
            if (data?.type !== START_FAILED) return;
            reason = typeof data.reason === 'string' && data.reason ? data.reason : DEFAULT_REASON;
            closeWindow();
        });
    }
    return { reason: () => reason };
}
