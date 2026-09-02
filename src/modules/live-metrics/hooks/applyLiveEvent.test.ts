import { describe, expect, it } from 'vitest';
import { applyLiveEvent } from './applyLiveEvent';
import type { BusinessEventDto, LiveMetricsOverview } from '../types';

const MINUTE = 60_000;
const base = Date.parse('2026-09-02T20:00:00.000Z');

const minutePoints = (count: number) =>
    Array.from({ length: 3 }, (_, i) => ({
        at: new Date(base + i * MINUTE).toISOString(),
        count,
    }));

const overview = (): LiveMetricsOverview => ({
    scope: 't:studio',
    tenantId: 'studio',
    zone: 'Europe/Warsaw',
    generatedAt: new Date(base).toISOString(),
    descriptors: [],
    stats: [
        { series: 'VISIT_CREATED', total: 10, today: 4, lastHour: 2, last15Minutes: 1, lastEventAt: null },
        { series: 'VISIT_CREATED:DIRECT', total: 3, today: 1, lastHour: 1, last15Minutes: 0, lastEventAt: null },
        { series: 'RESERVATION_CREATED', total: 7, today: 2, lastHour: 0, last15Minutes: 0, lastEventAt: null },
    ],
    lastHourByMinute: {
        VISIT_CREATED: minutePoints(0),
        'VISIT_CREATED:DIRECT': minutePoints(0),
        RESERVATION_CREATED: minutePoints(0),
    },
    last24hByHour: { VISIT_CREATED: minutePoints(0), 'VISIT_CREATED:DIRECT': minutePoints(0) },
    last30dByDay: { VISIT_CREATED: minutePoints(0), 'VISIT_CREATED:DIRECT': minutePoints(0) },
    hourOfDayProfile7d: { VISIT_CREATED: Array(24).fill(0), RESERVATION_CREATED: Array(24).fill(0) },
    recentEvents: [],
});

const event = (overrides: Partial<BusinessEventDto> = {}): BusinessEventDto => ({
    id: 'e1',
    tenantId: 'studio',
    type: 'VISIT_CREATED',
    series: ['VISIT_CREATED', 'VISIT_CREATED:DIRECT'],
    dimension: 'origin',
    dimensionValue: 'DIRECT',
    occurredAt: new Date(base + 2 * MINUTE).toISOString(),
    attributes: { visitId: 'v-1' },
    ...overrides,
});

describe('applyLiveEvent', () => {
    it('podbija serię bazową i pod-serię, a resztę zostawia', () => {
        const next = applyLiveEvent(overview(), event());

        const stat = (series: string) => next.stats.find(s => s.series === series)!;
        expect(stat('VISIT_CREATED').today).toBe(5);
        expect(stat('VISIT_CREATED:DIRECT').today).toBe(2);
        expect(stat('RESERVATION_CREATED').today).toBe(2);
        expect(stat('VISIT_CREATED').lastEventAt).toBe(event().occurredAt);
    });

    it('trafia w otwarty kubełek zamiast dokładać nowy', () => {
        const next = applyLiveEvent(overview(), event());
        const points = next.lastHourByMinute.VISIT_CREATED;

        expect(points).toHaveLength(3);
        expect(points[2].count).toBe(1);
        expect(points[0].count).toBe(0);
    });

    it('przesuwa okno, gdy zdarzenie otwiera kolejny kubełek', () => {
        const next = applyLiveEvent(overview(), event({ occurredAt: new Date(base + 3 * MINUTE).toISOString() }));
        const points = next.lastHourByMinute.VISIT_CREATED;

        expect(points).toHaveLength(3);
        expect(points[points.length - 1].count).toBe(1);
        expect(points[0].at).toBe(new Date(base + MINUTE).toISOString());
    });

    it('trafia we właściwy kubełek dla spóźnionej ramki', () => {
        const next = applyLiveEvent(overview(), event({ occurredAt: new Date(base).toISOString() }));

        expect(next.lastHourByMinute.VISIT_CREATED[0].count).toBe(1);
        expect(next.lastHourByMinute.VISIT_CREATED[2].count).toBe(0);
    });

    it('nie duplikuje zdarzenia, które już jest w strumieniu', () => {
        const first = applyLiveEvent(overview(), event());
        const second = applyLiveEvent(first, event());

        expect(second.recentEvents).toHaveLength(1);
    });

    it('nie mutuje wejścia', () => {
        const input = overview();
        applyLiveEvent(input, event());

        expect(input.stats.find(s => s.series === 'VISIT_CREATED')!.today).toBe(4);
        expect(input.lastHourByMinute.VISIT_CREATED[2].count).toBe(0);
        expect(input.recentEvents).toHaveLength(0);
    });

    it('ignoruje zdarzenie z niepoprawnym znacznikiem czasu', () => {
        const input = overview();
        expect(applyLiveEvent(input, event({ occurredAt: 'nie-data' }))).toBe(input);
    });
});
