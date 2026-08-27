// src/modules/visits/components/handover/signatureStep.ts

/** Ile dokumentów wydania czeka na podpis i ile go już ma. */
export interface ProtocolSignatureStatus {
    /** Liczba dokumentów etapu CHECK_OUT. 0 = studio nie ma czego podpisywać. */
    total: number;
    signed: number;
}

/**
 * Czy protokół wydania jest podpisany w całości.
 *
 * Studio bez skonfigurowanego dokumentu wydania (`total === 0`) NIE jest
 * podpisane — jest bez dokumentu. Ta wartość jedzie do backendu jako
 * `signatureObtained`, więc pusta lista nie może udawać zebranego podpisu.
 */
export const allProtocolsSigned = (status: ProtocolSignatureStatus): boolean =>
    status.total > 0 && status.signed === status.total;

/**
 * Etykieta przejścia z kroku podpisu do rozliczenia.
 *
 * Pominięcie podpisu jest możliwe — inaczej studio bez skonfigurowanego
 * dokumentu wydania albo bez modułu podpisów nie wydałoby pojazdu w ogóle — ale
 * ma być decyzją, a nie skutkiem ubocznym kliknięcia „Dalej". Gdy nie ma czego
 * podpisywać, nie ma też czego pomijać i przycisk o tym nie wspomina.
 */
export const advanceLabel = (status: ProtocolSignatureStatus): string => {
    if (status.total === 0) return 'Przejdź do płatności';
    if (status.signed < status.total) return 'Pomiń podpis i przejdź do płatności';
    return 'Przejdź do płatności';
};
