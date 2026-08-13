// Testy kontraktu recharts 3: handlery wykresu dostają MouseHandlerDataParam
// (activeLabel / activeTooltipIndex), NIE activePayload z recharts 2.
// Regresja: poleganie na activePayload sprawiało, że klik w słupek nigdy nie
// otwierał panelu szczegółów okresu.
import { describe, it, expect } from 'vitest';
import { resolvePeriod, type TrendChartPoint } from './TrendChart';

const data: TrendChartPoint[] = [
    { period: '2026-07-15', value: 50000, count: 1 },
    { period: '2026-07-16', value: 0, count: 3 },
    { period: '2026-07-17', value: 120000, count: 2 },
];

describe('resolvePeriod', () => {
    it('bierze okres z activeLabel (wartość osi X)', () => {
        expect(resolvePeriod({ activeLabel: '2026-07-16' }, data)).toBe('2026-07-16');
    });

    it('spada do activeTooltipIndex, gdy label nie jest stringiem', () => {
        expect(resolvePeriod({ activeTooltipIndex: 2 }, data)).toBe('2026-07-17');
    });

    it('akceptuje indeks jako string (TooltipIndex w recharts 3 to string | null)', () => {
        expect(resolvePeriod({ activeTooltipIndex: '1' }, data)).toBe('2026-07-16');
    });

    it('zwraca null poza zakresem danych i bez stanu', () => {
        expect(resolvePeriod({ activeTooltipIndex: 7 }, data)).toBeNull();
        expect(resolvePeriod({ activeTooltipIndex: -1 }, data)).toBeNull();
        expect(resolvePeriod({}, data)).toBeNull();
        expect(resolvePeriod(undefined, data)).toBeNull();
    });

    it('null-owy indeks (brak aktywnego ticka) nie wybiera niczego', () => {
        expect(resolvePeriod({ activeTooltipIndex: null, activeIndex: null }, data)).toBeNull();
    });
});
