// src/core/errors/lazyWithRetry.ts
import { lazy, type ComponentType } from 'react';
import { isChunkLoadError, recoverFromChunkError } from './chunkError';

/** Przerwa przed ponowną próbą - tyle wystarcza na chwilowy zanik sieci. */
const RETRY_DELAY_MS = 400;

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * `React.lazy` odporny na znikające chunki.
 *
 * Kolejność ratunkowa:
 *   1. Ponawiamy `import()` raz - to załatwia chwilowy błąd sieci (tunel, Wi-Fi,
 *      restart nginksa), bez ruszania strony użytkownika.
 *   2. Jeśli plik naprawdę zniknął (deploy podmienił hashe), zlecamy twarde
 *      przeładowanie. Zwracany Promise celowo nigdy się nie rozwiązuje -
 *      strona i tak zaraz zniknie, a rozwiązanie go pokazałoby na moment
 *      ekran błędu.
 *   3. Gdy limit przeładowań jest wyczerpany (albo błąd nie dotyczy chunku),
 *      przepuszczamy błąd dalej - złapie go `errorElement` routera i pokaże
 *      właściwy ekran.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- ComponentType<any> to
   dokładnie ta sama sygnatura, której używa React.lazy; węższy parametr
   uniemożliwiłby przekazanie komponentu z jakimikolwiek propsami. */
export function lazyWithRetry<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T }>,
) {
    return lazy<T>(async () => {
        try {
            return await factory();
        } catch (error) {
            if (!isChunkLoadError(error)) throw error;

            try {
                await wait(RETRY_DELAY_MS);
                return await factory();
            } catch (retryError) {
                if (!isChunkLoadError(retryError)) throw retryError;
                if (recoverFromChunkError()) return await new Promise<{ default: T }>(() => {});
                throw retryError;
            }
        }
    });
}

/**
 * Wariant dla modułów z eksportem nazwanym, np.
 * `lazyNamedWithRetry(() => import('@/modules/gallery/views/GalleryView'), 'GalleryView')`.
 */
export function lazyNamedWithRetry<
    M extends Record<string, unknown>,
    K extends keyof M,
>(factory: () => Promise<M>, exportName: K) {
    return lazyWithRetry(
        () => factory().then(module => ({ default: module[exportName] as ComponentType<any> })),
    );
}
