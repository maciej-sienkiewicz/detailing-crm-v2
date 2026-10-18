import { describe, expect, it } from 'vitest';
import { contactTapsTotal, glueOrphans, isActionableTarget, lastPostLabel, prefillFromTodo } from './overview';

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

    it('jednoliterowe słowo nie zostaje na końcu linii', () => {
        expect(glueOrphans('Posty w październiku')).toBe('Posty w\u00a0październiku');
        expect(glueOrphans('zasięg i w domu')).toBe('zasięg i\u00a0w\u00a0domu');
        expect(glueOrphans('Kliknięcia „Zadzwoń” i „Trasa”')).toBe('Kliknięcia „Zadzwoń” i\u00a0„Trasa”');
        expect(glueOrphans('z Instagrama')).toBe('z\u00a0Instagrama');
        expect(glueOrphans('plan 3 posty w tygodniu')).toBe('plan 3\u00a0posty w\u00a0tygodniu');
        // Dłuższe słowa zostają, jak były.
        expect(glueOrphans('Telefony od klientów')).toBe('Telefony od klientów');
    });
});

describe('generator z „Do zrobienia"', () => {
    it('realizacja z wizyty ma temat, kontekst i zdjęcia tej wizyty', () => {
        expect(prefillFromTodo({ title: 'Opublikuj realizację: Volvo XC60', detail: '12 zdjęć z wizyty VIS-1', visitId: 'v1' }))
            .toEqual({ topic: 'Realizacja: Volvo XC60', visitId: 'v1' });
    });

    it('zwykłe „Opublikuj post" nie zmyśla tematu', () => {
        expect(prefillFromTodo({ title: 'Opublikuj post', detail: null, visitId: null })).toEqual({});
    });
});
