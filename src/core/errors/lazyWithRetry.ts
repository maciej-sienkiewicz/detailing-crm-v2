// src/core/errors/lazyWithRetry.ts
import { isChunkLoadError, recoverFromChunkError } from './chunkError';

/** Przerwa przed ponowną próbą - tyle wystarcza na chwilowy zanik sieci. */
const RETRY_DELAY_MS = 400;

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * `import()` odporny na znikające chunki.
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
 *
 * Osobno od `lazyWithRetry`, bo trasy routera ładują widoki przez `route.lazy`
 * (core/router.tsx), a nie przez `React.lazy` - ratunek ma być ten sam.
 */
export async function importWithRetry<M>(factory: () => Promise<M>): Promise<M> {
    try {
        return await factory();
    } catch (error) {
        if (!isChunkLoadError(error)) throw error;

        try {
            await wait(RETRY_DELAY_MS);
            return await factory();
        } catch (retryError) {
            if (!isChunkLoadError(retryError)) throw retryError;
            if (recoverFromChunkError()) return await new Promise<M>(() => {});
            throw retryError;
        }
    }
}

