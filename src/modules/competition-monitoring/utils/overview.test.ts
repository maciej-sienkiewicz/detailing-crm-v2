import { describe, expect, it } from 'vitest';
import { contactTapsTotal, isActionableTarget, lastPostLabel, prefillFromTodo } from './overview';

describe('Przegląd', () => {
    it('nieznany cel przycisku nie daje przycisku', () => {
        expect(isActionableTarget('GENERATE_POST')).toBe(true);
        expect(isActionableTarget('OPEN_ADS')).toBe(true);
        expect(isActionableTarget('COS_NOWEGO')).toBe(false);
        expect(isActionableTarget(null)).toBe(false);
    });

    it('kliknięcia kontaktu sumują wszystkie przyciski', () => {
        expect(contactTapsTotal({ CALL: 7, DIRECTION: 5 })).toBe(12);
        expect(contactTapsTotal({})).toBeNull();
        expect(contactTapsTotal(null)).toBeNull();
    });

    it('ostatni post po ludzku', () => {
        expect(lastPostLabel(0)).toBe('ostatni dziś');
        expect(lastPostLabel(1)).toBe('ostatni wczoraj');
        expect(lastPostLabel(6)).toBe('ostatni 6 dni temu');
        expect(lastPostLabel(null)).toBe('jeszcze bez postów');
    });
});

describe('generator z „Do zrobienia"', () => {
    it('realizacja z wizyty ma temat, kontekst i zdjęcia tej wizyty', () => {
        expect(prefillFromTodo({ title: 'Opublikuj realizację: Volvo XC60', detail: '12 zdjęć z wizyty VIS-1', visitId: 'v1' }))
            .toEqual({ topic: 'Realizacja: Volvo XC60', context: '12 zdjęć z wizyty VIS-1', visitId: 'v1' });
    });

    it('zwykłe „Opublikuj post" nie zmyśla tematu', () => {
        expect(prefillFromTodo({ title: 'Opublikuj post', detail: null, visitId: null })).toEqual({});
    });
});
