// src/core/errors/installChunkErrorHandler.ts
import { logger } from '../logger';
import { isChunkLoadError, recoverFromChunkError, resetChunkReloadGuard } from './chunkError';

/** Po tylu ms bez błędu uznajemy, że aplikacja wstała, i zerujemy licznik prób. */
const HEALTHY_AFTER_MS = 10_000;

/**
 * Globalne przechwytywanie błędów chunków - poza Reactem.
 *
 * Nie każdy nieudany `import()` przechodzi przez ErrorBoundary: Vite ładuje
 * chunki także z `<link rel="modulepreload">`, a kod aplikacji potrafi
 * zawołać `import()` poza renderem (prefetch, obsługa zdarzenia). Takie
 * odrzucenia lądują w `unhandledrejection`, gdzie żaden boundary ich nie widzi
 * - i to one dawały w konsoli błąd bez ekranu.
 *
 * Wołane raz, przed `ReactDOM.createRoot(...).render(...)`.
 */
export function installChunkErrorHandler(): void {
    // Zdarzenie Vite: padł `<link rel="modulepreload">` chunku (typy w
    // vite/client). Bez `preventDefault()` Vite rzuca ten błąd dalej, więc
    // najpierw je gasimy, potem naprawiamy po swojemu.
    window.addEventListener('vite:preloadError', event => {
        event.preventDefault();
        recoverFromChunkError();
    });

    window.addEventListener('unhandledrejection', event => {
        // Każde odrzucenie, którego nikt nie obsłużył, przeglądarka wypisuje jako
        // „Uncaught (in promise)" - przy AxiosError razem z treścią żądania i odpowiedzi.
        // Gasimy to i oddajemy loggerowi; same przyczyny poprawiamy u źródła.
        event.preventDefault();
        if (isChunkLoadError(event.reason)) {
            recoverFromChunkError();
            return;
        }
        logger.error('unhandled.rejection', event.reason);
    });

    window.addEventListener('error', event => {
        // `error` bez `event.error` to najczęściej błąd ładowania zasobu
        // (<script src>), którego treści przeglądarka nie ujawnia - te
        // pomijamy, żeby nie przeładowywać strony przez cudzy skrypt.
        if (!isChunkLoadError(event.error)) return;
        recoverFromChunkError();
    });

    // Aplikacja żyje od kilku sekund bez błędu chunku → naprawa zadziałała,
    // więc licznik przeładowań nie może obciążać przyszłych, niezwiązanych
    // z tym awarii.
    window.setTimeout(resetChunkReloadGuard, HEALTHY_AFTER_MS);
}
