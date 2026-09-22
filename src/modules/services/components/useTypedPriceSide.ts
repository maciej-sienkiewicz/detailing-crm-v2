// src/modules/services/components/useTypedPriceSide.ts
//
// Która strona pary PriceInput jest wpisana przez człowieka: netto czy brutto.
// Używają tego okna z polem ceny i wyborem stawki VAT („Wprowadź nową usługę",
// „Podaj cenę usługi"), bo zmiana stawki ma zachować stronę WPISANĄ i przeliczyć
// drugą (repriceForVatRate, CLAUDE.md §1) - wpisane brutto 1900,00 zł zostaje
// 1900,00 zł przy każdej stawce.
//
// PriceInput oddaje samą parę (`onChange(net, gross)`), bez informacji, z którego pola
// przyszła, a sama para tego nie powie: 100,00 / 123,00 przy 23% mogło przyjść z każdego
// z dwóch pól. Dlatego stronę czytamy ze zdarzenia wpisywania, które z pól PriceInput
// wypływa do obudowy. Samo kliknięcie w pole niczego nie przestawia - liczy się to,
// w którym polu człowiek PISAŁ. Kolejność pól w PriceInput jest stała: [netto, brutto].

import { useCallback, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { PriceSide } from '@/common/utils/priceInputs';

/** Które z dwóch pól PriceInput jest celem zdarzenia; `null`, gdy żadne. */
export const priceFieldSide = (fields: Element | null, target: EventTarget | null): PriceSide | null => {
    if (!fields || !target) return null;
    const index = Array.from(fields.querySelectorAll('input')).indexOf(target as HTMLInputElement);
    return index === 0 ? 'net' : index === 1 ? 'gross' : null;
};

/**
 * Strona ceny, w której człowiek ostatnio pisał. `fieldsRef` i `onFieldsChange` trafiają
 * na element obejmujący PriceInput. Zanim ktokolwiek coś wpisze - netto (dotychczasowe
 * zachowanie tych okien; przy pustych polach obie strony i tak są zerem).
 */
export function useTypedPriceSide() {
    const [typedSide, setTypedSide] = useState<PriceSide>('net');
    const fieldsRef = useRef<HTMLDivElement>(null);
    const onFieldsChange = useCallback((event: FormEvent<HTMLDivElement>) => {
        const side = priceFieldSide(fieldsRef.current, event.target);
        if (side) setTypedSide(side);
    }, []);
    return { typedSide, fieldsRef, onFieldsChange };
}
