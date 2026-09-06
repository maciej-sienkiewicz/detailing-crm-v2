// src/core/errors/RouteErrorBoundary.tsx
import { useEffect, useState } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { ErrorScreen, UpdatingScreen } from './ErrorScreen';
import { canAttemptChunkReload, isChunkLoadError, recoverFromChunkError } from './chunkError';

/**
 * Bezpiecznik: gdyby `location.reload()` nie doszło do skutku (zablokowane
 * przez przeglądarkę, martwa sieć), po tym czasie zamiast wiecznego spinnera
 * pokazujemy ekran błędu z przyciskiem.
 */
const RELOAD_STALLED_MS = 8_000;

/** Czytelny opis błędu do rozwijanej sekcji "Szczegóły techniczne". */
function describeError(error: unknown): string {
    if (isRouteErrorResponse(error)) {
        const data = typeof error.data === 'string' ? error.data : JSON.stringify(error.data);
        return `${error.status} ${error.statusText}\n${data}`;
    }
    if (error instanceof Error) return `${error.name}: ${error.message}`;
    if (typeof error === 'string') return error;
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

/**
 * `errorElement` całego routera. React Router wypycha tutaj każdy błąd
 * rzucony podczas renderowania route'u - w tym odrzucone `import()` z
 * `lazy()`, które wcześniej kończyły się ekranem "Unexpected Application Error!".
 *
 * Zachowanie:
 *   1. Brakujący chunk (stara wersja w karcie vs. nowy deploy) → jedno twarde
 *      przeładowanie, żeby pobrać świeży `index.html` z aktualnymi hashami.
 *   2. Wyczerpany limit przeładowań (patrz chunkError.ts) → ekran błędu z
 *      przyciskiem, zamiast pętli odświeżania.
 *   3. Każdy inny błąd (500 z API, błąd renderowania) → generyczny ekran błędu.
 */
export function RouteErrorBoundary() {
    const error = useRouteError();
    const chunkError = isChunkLoadError(error);

    // Czysty odczyt licznika w trakcie renderu decyduje, CO pokazać; sam
    // reload dzieje się w efekcie, bo to skutek uboczny.
    const willReload = chunkError && canAttemptChunkReload();
    const [reloadStalled, setReloadStalled] = useState(false);

    useEffect(() => {
        if (!willReload) return;

        recoverFromChunkError();

        const timer = window.setTimeout(() => setReloadStalled(true), RELOAD_STALLED_MS);
        return () => window.clearTimeout(timer);
    }, [willReload]);

    if (willReload && !reloadStalled) return <UpdatingScreen />;

    if (chunkError) {
        return (
            <ErrorScreen
                title="Nie udało się wczytać aplikacji"
                description="Pobranie najnowszej wersji DetailBoost nie powiodło się. Sprawdź połączenie z internetem i odśwież stronę, a jeśli problem się powtarza - skontaktuj się ze wsparciem DetailBoost."
                details={describeError(error)}
            />
        );
    }

    if (import.meta.env.DEV) console.error('[RouteErrorBoundary]', error);

    return <ErrorScreen details={describeError(error)} />;
}
