import { describe, it, expect } from 'vitest';
import { toCheckInServiceLine } from './toCheckInServiceLine';

/*
 * Zgłoszenie z produkcji, druga odsłona: check-in rezerwacji
 * /reservations/{id}/checkin pokazywał usługę za 1900,00 zł jako 1900,01 zł,
 * z VAT-em 355,29 zamiast 355,28 - mimo że GET /api/v1/appointments/{id}
 * zwracał finalPriceGross 190000 i totalVat 35528.
 *
 * Powód: mapowanie odpowiedzi na pozycje wyceny czytało samo netto i wyrzucało
 * brutto. Niżej nie było już czego użyć, więc każda tabela odtwarzała brutto
 * z netta - a to odtworzenie nie wraca do punktu wyjścia.
 */
const response = {
    id: 'f09623ff-bde9-40a3-9036-645296fe5b35',
    serviceId: '75be5f95-ed2f-4b79-ad66-651c3e307bf5',
    serviceName: 'Testowa usluga trzecia',
    basePriceNet: 154472,
    vatRate: 23,
    adjustment: { type: 'PERCENT' as const, value: 0 },
    note: '',
    finalPriceNet: 154472,
    finalPriceGross: 190000,
    isPackage: false,
    packageItems: null,
};

describe('toCheckInServiceLine', () => {
    it('przenosi dokładne brutto z odpowiedzi serwera', () => {
        const line = toCheckInServiceLine(response);

        expect(line.basePriceNet).toBe(154472);
        expect(line.basePriceGross).toBe(190000);
        // Netto + VAT liczone z tej pary daje równo 1900,00 zł.
        expect(line.basePriceGross! - line.basePriceNet).toBe(35528);
    });

    it('nie zmyśla brutta, gdy serwer go nie przysłał', () => {
        const withoutGross = { ...response, finalPriceGross: undefined };
        const line = toCheckInServiceLine(withoutGross);

        // undefined, a nie policzone 190001 - niżej zadziała jawny fallback.
        expect(line.basePriceGross).toBeUndefined();
    });

    it('brutto bazowe podane wprost wygrywa z odtwarzaniem', () => {
        const line = toCheckInServiceLine({ ...response, basePriceGross: 190000, finalPriceGross: 123 });

        expect(line.basePriceGross).toBe(190000);
    });

    it('przy rabacie liczonym od netta brutta bazowego nie da się odtworzyć', () => {
        const line = toCheckInServiceLine({
            ...response,
            adjustment: { type: 'PERCENT', value: -10 },
            finalPriceGross: 171000,
        });

        expect(line.basePriceGross).toBeUndefined();
    });

    it('przenosi resztę pozycji bez zmian', () => {
        const line = toCheckInServiceLine(response);

        expect(line.serviceName).toBe('Testowa usluga trzecia');
        expect(line.serviceId).toBe('75be5f95-ed2f-4b79-ad66-651c3e307bf5');
        expect(line.vatRate).toBe(23);
        expect(line.adjustment).toEqual({ type: 'PERCENT', value: 0 });
        expect(line.isPackage).toBe(false);
    });
});
