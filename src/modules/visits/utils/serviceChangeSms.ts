// src/modules/visits/utils/serviceChangeSms.ts
//
// Pomocnicze funkcje SMS-a o zmianach w usługach. Samą treść składa serwer z szablonu
// studia (Ustawienia komunikacji) - dawniej sklejało ją tu okno, a serwer miał drugą,
// inną wersję tego samego zdania.

/** Fraza doklejana przez backend na końcu każdej takiej wiadomości. */
export const CONSENT_CALL_TO_ACTION = 'Odpisz TAK, aby zaakceptować.';

/* Wykrywanie ogonków, zamiana na ASCII i arytmetyka segmentów mieszkają w
   `@/common/utils`: ta sama reguła decyduje o rachunku w kilku oknach i w ustawieniach,
   więc nie może mieć kilku kopii. Re-eksport zostaje, żeby nie przepisywać importów. */
export { hasPolishCharacters, toAscii } from '@/common/utils';

export interface ServiceChangeSummary {
    addedNames: string[];
    removedNames: string[];
    priceChangedNames: string[];
    /** Cena końcowa brutto po zmianach, w groszach. */
    totalGrossAfter: number;
}
