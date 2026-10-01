// src/common/components/ProgressiveImage/preloadImage.ts

// Przeglądarka nie gwarantuje dokończenia pobierania obrazka, do którego nic już nie trzyma
// referencji - dlatego obiekty Image żyją w module, a nie w efekcie. Mapa jest ograniczona,
// żeby długie przeglądanie nie trzymało setek zdjęć.
const PRELOAD_LIMIT = 12;
const preloaded = new Map<string, HTMLImageElement>();

/** Pobiera zdjęcie w tle, zanim ktoś kliknie strzałkę. Powtórne wywołanie dla adresu nic nie robi. */
export function preloadImage(url: string) {
    if (!url || preloaded.has(url)) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    preloaded.set(url, img);
    if (preloaded.size > PRELOAD_LIMIT) {
        const oldest = preloaded.keys().next().value;
        if (oldest !== undefined) preloaded.delete(oldest);
    }
}
