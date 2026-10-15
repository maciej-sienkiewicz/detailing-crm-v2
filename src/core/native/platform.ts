import { Capacitor } from '@capacitor/core';

/**
 * Czy kod działa w aplikacji ze sklepu (Capacitor), a nie w przeglądarce.
 *
 * Aplikacja ładuje tę samą stronę z detailboost.pl, a Capacitor dokłada do niej most
 * do systemu - stąd jedno pytanie zamiast osobnej wersji kodu. Odpowiedź nie zmienia
 * się w trakcie życia strony.
 */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

export const nativePlatform = (): 'ios' | 'android' | 'web' =>
    Capacitor.getPlatform() as 'ios' | 'android' | 'web';

/**
 * Zakupy (abonament, moduły, pakiety SMS) są dostępne wyłącznie w przeglądarce.
 * App Store (3.1.1, 3.1.3(b)) i Google Play wymagają, żeby treści cyfrowe kupowane
 * w aplikacji szły przez ich płatności - a usługa kupiona gdzie indziej wolno używać,
 * byle aplikacja nie zachęcała do zakupu ani nie linkowała do niego.
 */
export const canPurchaseHere = (): boolean => !isNativeApp();
