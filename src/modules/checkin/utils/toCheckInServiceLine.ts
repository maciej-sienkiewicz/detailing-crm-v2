// src/modules/checkin/utils/toCheckInServiceLine.ts
//
// Pozycja usługowa rezerwacji → pozycja wyceny check-inu.
//
// Ta funkcja istnieje po to, żeby DOKŁADNE BRUTTO przeżyło granicę API. Serwer
// zwraca przy pozycji `finalPriceGross` policzone swoją, poprawną regułą - i to
// jest jedyna kwota brutto, jaką po stronie klienta mamy. Poprzednie mapowanie
// (inline w CheckInWizardWrapper) po prostu jej nie czytało, więc każda tabela
// niżej musiała brutto ODTWARZAĆ z netta - a przy cenie wpisanej w brutto to
// odtworzenie nie wraca do punktu wyjścia: 154472 gr netto przy 23% VAT daje
// 190001 gr, nie 190000. Usługa za 1900,00 zł pokazywała się w check-inie jako
// 1900,01 zł, z VAT-em 355,29 zamiast 355,28.
//
// Patrz CLAUDE.md, punkt „PIENIĄDZE: brutto, które ktoś ustalił, JEST brutto".

import { exactBaseGross, type PriceAdjustment } from '@/common/utils/priceAdjustment';
import type { ServiceLineItem } from '../types';

/** Pozycja tak, jak przychodzi z `GET /api/v1/appointments/{id}`. */
export interface ReservationServiceResponse {
    id: string;
    serviceId?: string | null;
    serviceName?: string | null;
    /** Starsze odpowiedzi nazywały to pole `priceNet`. */
    name?: string | null;
    basePriceNet?: number | null;
    priceNet?: number | null;
    /** Brutto bazowe, gdy serwer je poda wprost. */
    basePriceGross?: number | null;
    /** Brutto końcowe policzone przez serwer dla tego rabatu. */
    finalPriceGross?: number | null;
    vatRate?: number | null;
    adjustment?: PriceAdjustment | null;
    note?: string | null;
    isPackage?: boolean | null;
    packageItems?: ServiceLineItem['packageItems'];
}

const NO_ADJUSTMENT: PriceAdjustment = { type: 'PERCENT', value: 0 };

export const toCheckInServiceLine = (service: ReservationServiceResponse): ServiceLineItem => {
    const basePriceNet = service.basePriceNet || service.priceNet || 0;
    const vatRate = service.vatRate ?? 23;
    const adjustment = service.adjustment || NO_ADJUSTMENT;

    return {
        id: service.id,
        serviceId: service.serviceId ?? null,
        serviceName: service.serviceName || service.name || '',
        basePriceNet,
        // Bez tej linijki cena wpisana jako brutto rozjeżdża się o grosz w całym
        // dalszym check-inie: w tabeli usług, w podsumowaniu i w protokole.
        basePriceGross: exactBaseGross({
            basePriceNet,
            vatRate,
            adjustment,
            basePriceGross: service.basePriceGross,
            finalPriceGross: service.finalPriceGross,
        }),
        vatRate,
        adjustment,
        note: service.note ?? undefined,
        isPackage: service.isPackage ?? false,
        packageItems: service.packageItems ?? null,
    };
};
