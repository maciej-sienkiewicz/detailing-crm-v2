// src/modules/calendar/components/QuickEventModal/linePrices.ts
//
// Ceny pozycji QuickEventModal w kształcie płaskich map formularza - przy dodaniu
// pozycji (useQuickEventForm: addService, handlePriceConfirm, handleQuickServiceCreate)
// i przy zmianie w tabeli usług (handleServicesChange w index.tsx). Wydzielone, żeby
// każde z tych przejść dało się sprawdzić testem bez montowania okna. Kierunek
// odwrotny, mapy → pozycje tabeli, jest w servicesAsLineItems.ts.
//
// Mapy formularza:
//   servicePrices     - brutto bazowe w ZŁOTYCH, dokładne,
//   serviceBasePrices - netto bazowe w GROSZACH, dokładne,
//   serviceVatRates   - stawka VAT pozycji; -1 to „zwolniony".

import { netToGross } from '@/common/utils/priceAdjustment';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import { roundTo2 } from './helpers';

/** Cena jednej pozycji w kształcie map formularza. */
export interface LinePrices {
    /** Brutto bazowe w ZŁOTYCH (servicePrices). */
    grossPln: number;
    /** Netto bazowe w GROSZACH (serviceBasePrices). */
    netCents: number;
    /** Stawka VAT pozycji (serviceVatRates). */
    vatRate: number;
}

/**
 * Pozycja dodana z cennika albo świeżo utworzona w „Wprowadź nową usługę".
 *
 * Stawka VAT wchodzi do formularza RAZEM z ceną. Bez niej `buildAppointmentPayload`
 * nie miał skąd wziąć stawki usługi z cennika i wysyłał domyślne 23% - a backend
 * bierze stawkę pozycji katalogowej z żądania, więc usługa z 8% zapisywała się z 23%.
 */
export const catalogLinePrices = (service: {
    basePriceNet: number;
    basePriceGross?: number | null;
    vatRate: number;
}): LinePrices => ({
    // Brutto z cennika wygrywa; z netta liczymy je tylko, gdy cennik go nie podał.
    grossPln: roundTo2((service.basePriceGross ?? netToGross(service.basePriceNet, service.vatRate)) / 100),
    netCents: service.basePriceNet,
    vatRate: service.vatRate,
});

/**
 * Pozycja z ceną z okna „Wprowadź cenę" (usługa rozliczana indywidualnie). Okno oddaje
 * dokładną parę; brutto liczymy z netta wyłącznie wtedy, gdy go nie ma (0 zł).
 */
export const manualLinePrices = (
    price: { priceNet: number; priceGross: number },
    vatRate: number,
): LinePrices => ({
    grossPln: roundTo2((price.priceGross > 0 ? price.priceGross : netToGross(price.priceNet, vatRate)) / 100),
    netCents: price.priceNet,
    vatRate,
});

/** Mapy cen formularza odtworzone z pozycji tabeli usług. */
export interface FormPrices {
    servicePrices: { [lineId: string]: number };
    serviceBasePrices: { [lineId: string]: number };
    servicePriceInputs: { [lineId: string]: { net: string; gross: string } };
}

/**
 * Pozycje ServicesTable → mapy cen formularza.
 *
 * Obie kwoty pochodzą z POZYCJI, nigdy z cennika. Pozycja bez brutta (tak wraca po
 * zbiorczej zmianie VAT) brała kiedyś netto z cennika i gubiła wszystko, co ustalono
 * poza nim: cena ręczna spadała do 0 zł (w cenniku ma 0), a cena z edycji pozycji
 * albo z wyceny leada wracała do katalogowej - z bruttem liczonym z netta pozycji,
 * czyli w parze, która do siebie nie pasowała.
 *
 * Brutto jest dokładne, gdy pozycja je niesie. Z netta liczymy je tylko wtedy, gdy go
 * nie ma - po zmianie stawki pozycji wpisanej od netta brutto jest z definicji pochodne.
 */
export function formPricesFromLineItems(items: ServiceLineItem[]): FormPrices {
    const prices: FormPrices = { servicePrices: {}, serviceBasePrices: {}, servicePriceInputs: {} };
    items.forEach(item => {
        const grossCents = item.basePriceGross ?? netToGross(item.basePriceNet, item.vatRate);
        prices.serviceBasePrices[item.id] = item.basePriceNet;
        prices.servicePrices[item.id] = grossCents / 100;
        // Oba pola wprost z pozycji, nie odtwarzane jedno z drugiego.
        prices.servicePriceInputs[item.id] = {
            gross: (grossCents / 100).toFixed(2),
            net: (item.basePriceNet / 100).toFixed(2),
        };
    });
    return prices;
}
