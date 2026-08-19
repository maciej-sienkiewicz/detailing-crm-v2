// src/modules/services/vatOptions.ts
// Stawki VAT wybierane w formularzach cenowych. Wydzielone z modala „Wprowadź nową
// usługę", gdy ten sam wybór pojawił się przy podawaniu ceny usługi rozliczanej
// indywidualnie — lista stawek jest wiedzą domenową, nie szczegółem jednego okna.
import type { VatRate } from './types';

export const VAT_OPTIONS: { value: VatRate; label: string }[] = [
    { value: 23, label: '23%' },
    { value: 8, label: '8%' },
    { value: 5, label: '5%' },
    { value: 0, label: '0%' },
    { value: -1, label: 'zw.' },
];
