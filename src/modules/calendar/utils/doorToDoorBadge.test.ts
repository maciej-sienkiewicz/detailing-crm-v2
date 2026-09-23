// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    D2D_DIRECTION_COLOR,
    D2D_DIRECTION_LABEL,
    countByDirection,
    createD2DBadge,
    d2dBadgeLabel,
    placeD2DBadge,
    sortByDirection,
    updateD2DBadge,
} from './doorToDoorBadge';
import type { DoorToDoorCalendarEntry } from '../types';

const entry = (id: string, direction: DoorToDoorCalendarEntry['direction']): DoorToDoorCalendarEntry => ({
    id, direction, vehicle: 'Bmw Seria 5', customerLastName: 'Mamzerowska', address: 'Jankowice, Poznańska 48',
});

const visibleLegs = (badge: HTMLElement) =>
    [...badge.querySelectorAll<HTMLElement>('.fc-d2d-leg')]
        .filter(leg => leg.style.display !== 'none')
        .map(leg => `${leg.dataset.direction}:${leg.querySelector('.fc-d2d-count')?.textContent}`);

describe('Door to Door w kalendarzu - przyjęcie niebieskie, oddanie czerwone', () => {
    it('przyjęcie pojazdu jest niebieskie (jak dotąd), oddanie czerwone', () => {
        expect(D2D_DIRECTION_COLOR.PICKUP).toBe('#0ea5e9');
        expect(D2D_DIRECTION_COLOR.DELIVERY).toBe('#ef4444');
        expect(D2D_DIRECTION_LABEL).toEqual({ PICKUP: 'Przyjęcie', DELIVERY: 'Oddanie' });
    });

    it('liczy przyjęcia i oddania osobno', () => {
        expect(countByDirection([entry('a', 'PICKUP'), entry('b', 'DELIVERY'), entry('c', 'DELIVERY')]))
            .toEqual({ PICKUP: 1, DELIVERY: 2 });
        expect(countByDirection([])).toEqual({ PICKUP: 0, DELIVERY: 0 });
    });

    it('podpowiedź: najpierw przyjęcia, potem oddania, bez ruszania listy z serwera', () => {
        const entries = [entry('d1', 'DELIVERY'), entry('p1', 'PICKUP'), entry('d2', 'DELIVERY'), entry('p2', 'PICKUP')];
        expect(sortByDirection(entries).map(e => e.id)).toEqual(['p1', 'p2', 'd1', 'd2']);
        expect(entries.map(e => e.id)).toEqual(['d1', 'p1', 'd2', 'p2']);
    });

    it('opis dla czytnika ekranu wymienia tylko kierunki, które są', () => {
        expect(d2dBadgeLabel({ PICKUP: 1, DELIVERY: 2 })).toBe('Door to Door: przyjęcia 1, oddania 2');
        expect(d2dBadgeLabel({ PICKUP: 0, DELIVERY: 1 })).toBe('Door to Door: oddania 1');
    });
});

describe('znacznik w rogu dnia', () => {
    it('dzień z przyjęciem i oddaniem ma dwa samochodziki, każdy ze swoją liczbą', () => {
        const badge = createD2DBadge();
        updateD2DBadge(badge, [entry('a', 'PICKUP'), entry('b', 'DELIVERY'), entry('c', 'DELIVERY')]);

        expect(visibleLegs(badge)).toEqual(['PICKUP:1', 'DELIVERY:2']);
        expect(badge.querySelector('.fc-d2d-leg--pickup')?.getAttribute('data-direction')).toBe('PICKUP');
        expect(badge.querySelector('.fc-d2d-leg--delivery')?.getAttribute('data-direction')).toBe('DELIVERY');
        expect(badge.getAttribute('aria-label')).toBe('Door to Door: przyjęcia 1, oddania 2');
    });

    it('sam odbiór - widać tylko niebieski; po zmianie danych samochodziki się przeliczają', () => {
        const badge = createD2DBadge();
        updateD2DBadge(badge, [entry('a', 'PICKUP')]);
        expect(visibleLegs(badge)).toEqual(['PICKUP:1']);

        updateD2DBadge(badge, [entry('b', 'DELIVERY')]);
        expect(visibleLegs(badge)).toEqual(['DELIVERY:1']);
    });

    it('stoi na lewo od ludzika urlopowego, a bez niego w samym rogu', () => {
        const frame = document.createElement('div');
        const badge = createD2DBadge();
        frame.appendChild(badge);

        placeD2DBadge(frame);
        expect(badge.style.right).toBe('3px');

        const leave = document.createElement('span');
        leave.className = 'fc-leave-badge';
        Object.defineProperty(leave, 'offsetWidth', { value: 25 });
        frame.appendChild(leave);
        placeD2DBadge(frame);
        expect(badge.style.right).toBe('31px');
    });

    it('gdy zasłaniałby numer dnia, samochodziki stają jeden pod drugim', () => {
        const frame = document.createElement('div');
        const dayNumber = document.createElement('a');
        dayNumber.className = 'fc-daygrid-day-number';
        const badge = createD2DBadge();
        frame.append(dayNumber, badge);
        const rect = (left: number, right: number) => () => ({ left, right, top: 0, bottom: 0, width: right - left, height: 0, x: left, y: 0, toJSON: () => ({}) });

        dayNumber.getBoundingClientRect = rect(60, 80);
        badge.getBoundingClientRect = rect(90, 140);
        placeD2DBadge(frame);
        expect(badge.classList.contains('fc-d2d-badge--stacked')).toBe(false);

        badge.getBoundingClientRect = rect(70, 125);
        placeD2DBadge(frame);
        expect(badge.classList.contains('fc-d2d-badge--stacked')).toBe(true);
    });
});
