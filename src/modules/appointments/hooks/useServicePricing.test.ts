import { describe, it, expect } from 'vitest';
import { useServicePricing } from './useServicePricing';
import type { ServiceLineItem } from '../types';

/*
 * Odtworzenie zgłoszenia z produkcji.
 *
 * Usługa „Testuwa usluga" założona z ceną 1900,00 zł BRUTTO zapisała się poprawnie
 * (basePriceNet 154472 gr, basePriceGross 190000 gr), rezerwacja też wróciła z
 * serwera poprawna (finalPriceGross 190000, totalVat 35528) - a tabela „Usługi"
 * pokazywała 1900,01 zł, bo liczyła brutto z netta zamiast użyć tego, które
 * dostała.
 */
const line = (over: Partial<ServiceLineItem> = {}): ServiceLineItem => ({
    id: 'line-1',
    serviceId: 'b8a2db33-9fd2-4cbf-a446-893829893256',
    serviceName: 'Testuwa usluga',
    basePriceNet: 154472,
    vatRate: 23,
    requireManualPrice: false,
    adjustment: { type: 'PERCENT', value: 0 },
    note: '',
    ...over,
});

describe('calculateServicePrice - cena wpisana jako brutto', () => {
    const { calculateServicePrice, calculateTotal } = useServicePricing();

    it('brutto z katalogu pokazuje się co do grosza', () => {
        const pricing = calculateServicePrice(line({ basePriceGross: 190000 }));

        expect(pricing.finalPriceGross).toBe(190000);
        expect(pricing.originalPriceGross).toBe(190000);
        expect(pricing.finalPriceNet).toBe(154472);
        // Ta sama liczba, którą zwraca serwer w `totalVat`.
        expect(pricing.vatAmount).toBe(35528);
    });

    it('brutto policzone przez serwer wygrywa, gdy pozycja przyszła z API', () => {
        const pricing = calculateServicePrice(line({ finalPriceGross: 190000 }));

        expect(pricing.finalPriceGross).toBe(190000);
    });

    it('netto plus VAT daje dokładnie brutto z tej samej linijki', () => {
        const pricing = calculateServicePrice(line({ basePriceGross: 190000 }));

        expect(pricing.finalPriceNet + pricing.vatAmount).toBe(pricing.finalPriceGross);
    });

    it('bez ustalonego brutta liczy je z netta - tak jak dla ceny wpisanej jako netto', () => {
        const pricing = calculateServicePrice(line({ basePriceNet: 100000 }));

        expect(pricing.finalPriceGross).toBe(123000);
    });

    it('rabat procentowy przelicza brutto od nowa, bo kwota bazowa przestała obowiązywać', () => {
        const pricing = calculateServicePrice(
            line({ basePriceGross: 190000, adjustment: { type: 'PERCENT', value: -10 } }),
        );

        expect(pricing.originalPriceGross).toBe(190000);
        expect(pricing.finalPriceNet).toBe(139025);
        expect(pricing.hasDiscount).toBe(true);
    });

    it('suma rezerwacji nie dokłada grosza na pozycję', () => {
        const totals = calculateTotal([
            line({ id: 'a', basePriceGross: 190000 }),
            line({ id: 'b', basePriceGross: 190000 }),
        ]);

        expect(totals.totalFinalGross).toBe(380000);
        expect(totals.totalVat).toBe(71056);
        expect(totals.hasTotalDiscount).toBe(false);
    });
});
