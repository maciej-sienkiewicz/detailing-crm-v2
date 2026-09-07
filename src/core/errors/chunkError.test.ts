// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
    beginChunkRecoveryReload,
    isChunkLoadError,
    resetChunkReloadGuard,
} from './chunkError';

describe('isChunkLoadError', () => {
    it.each([
        // Chrome/Edge - dokładny komunikat z produkcji
        'Failed to fetch dynamically imported module: https://detailboost.pl/assets/MailView-CRm-D0lQ.js',
        'error loading dynamically imported module',                    // Firefox
        'Importing a module script failed.',                            // Safari
        'Unable to preload CSS for /assets/GalleryView-a1b2c3.css',     // Vite
        'Expected a JavaScript module script but the server responded with a MIME type of "text/html"',
    ])('rozpoznaje komunikat przeglądarki: %s', message => {
        expect(isChunkLoadError(new Error(message))).toBe(true);
    });

    it('rozpoznaje ChunkLoadError po nazwie, nawet z pustym komunikatem', () => {
        const error = new Error('');
        error.name = 'ChunkLoadError';
        expect(isChunkLoadError(error)).toBe(true);
    });

    it('działa dla stringów i obiektów z polem message', () => {
        expect(isChunkLoadError('Failed to fetch dynamically imported module: /assets/x.js')).toBe(true);
        expect(isChunkLoadError({ message: 'Loading chunk 42 failed' })).toBe(true);
    });

    it.each([
        'Network Error',                          // axios: padnięte API
        'Request failed with status code 500',    // błąd backendu
        "Cannot read properties of undefined (reading 'map')",
    ])('NIE traktuje zwykłego błędu jako braku chunku: %s', message => {
        expect(isChunkLoadError(new Error(message))).toBe(false);
    });

    it('nie wywraca się na null/undefined', () => {
        expect(isChunkLoadError(null)).toBe(false);
        expect(isChunkLoadError(undefined)).toBe(false);
    });
});

describe('beginChunkRecoveryReload', () => {
    beforeEach(() => {
        window.sessionStorage.clear();
    });

    it('pozwala na pierwsze przeładowanie i blokuje po wyczerpaniu limitu', () => {
        const t0 = 1_000_000;
        expect(beginChunkRecoveryReload(t0)).toBe(true);        // deploy w trakcie sesji
        expect(beginChunkRecoveryReload(t0 + 1_000)).toBe(true); // drugi deploy tuż po
        // Trzecia próba w tym samym oknie = pętla. Zamiast migać stroną,
        // oddajemy sterowanie ekranowi błędu.
        expect(beginChunkRecoveryReload(t0 + 2_000)).toBe(false);
        expect(beginChunkRecoveryReload(t0 + 3_000)).toBe(false);
    });

    it('zeruje licznik po wyjściu poza okno czasowe', () => {
        const t0 = 1_000_000;
        beginChunkRecoveryReload(t0);
        beginChunkRecoveryReload(t0 + 1_000);
        expect(beginChunkRecoveryReload(t0 + 2_000)).toBe(false);

        // Nowa awaria pół minuty później to nowy incydent, nie pętla.
        expect(beginChunkRecoveryReload(t0 + 40_000)).toBe(true);
    });

    it('resetChunkReloadGuard przywraca pełną pulę prób', () => {
        const t0 = 1_000_000;
        beginChunkRecoveryReload(t0);
        beginChunkRecoveryReload(t0 + 100);
        expect(beginChunkRecoveryReload(t0 + 200)).toBe(false);

        resetChunkReloadGuard();
        expect(beginChunkRecoveryReload(t0 + 300)).toBe(true);
    });

    it('ignoruje uszkodzony wpis w sessionStorage', () => {
        window.sessionStorage.setItem('detailboost:chunk-reload', 'nie-json');
        expect(beginChunkRecoveryReload(1_000_000)).toBe(true);
    });
});
