// src/common/components/ServicesTable/serviceVersion.ts
//
// Pozycja wyceny na wygaszonej wersji usługi z cennika.
//
// Edycja pozycji cennika (np. ceny) tworzy nową wersję z nowym id i wygasza starą.
// Rezerwacja umówiona wcześniej zostaje przy starej wersji i jej cenie - studio bywa
// związane ceną podaną klientowi. Serwer mówi, jaka wersja jest dziś aktualna
// (`newerVersion`), a tabela pokazuje to przy pozycji i pozwala ją odświeżyć jednym
// kliknięciem. Bez kliknięcia nic się nie zmienia: zapis idzie ze starym id.
import type { ServiceLineItem } from './index';

export interface ServiceVersion {
    serviceId: string;
    serviceName: string;
    basePriceNet: number;
    basePriceGross: number;
    vatRate: number;
    requireManualPrice: boolean;
}

/**
 * Pozycja przeniesiona na aktualną wersję usługi. Rabat i notatka zostają - to decyzje
 * podjęte przy tej rezerwacji, a nie część cennika. Przy usłudze, która ma teraz cenę
 * ustalaną ręcznie, cennik nie ma ceny do podstawienia, więc zostaje dotychczasowa.
 */
export function applyNewerVersion<T extends ServiceLineItem>(line: T): T {
    const next = line.newerVersion;
    if (!next) return line;
    const prices = next.requireManualPrice
        ? { basePriceNet: line.basePriceNet, basePriceGross: line.basePriceGross, vatRate: line.vatRate }
        : { basePriceNet: next.basePriceNet, basePriceGross: next.basePriceGross, vatRate: next.vatRate };
    return {
        ...line,
        ...prices,
        serviceId: next.serviceId,
        serviceName: next.serviceName,
        requireManualPrice: next.requireManualPrice,
        newerVersion: null,
    };
}

/** „450,00 zł" - brutto, jak każda kwota w aplikacji (CLAUDE.md §1). */
export function formatVersionPrice(grossCents: number): string {
    return `${(grossCents / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
}
