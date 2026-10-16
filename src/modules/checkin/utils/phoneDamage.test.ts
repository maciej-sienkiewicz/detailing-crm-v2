// Zgłoszenie: uszkodzenia zaznaczone telefonem nie trafiały do wizyty, gdy komputer
// przegapił zdarzenie WebSocket - kreator wysyłał pustą listę. Teraz kreator dociąga
// stan z serwera, a te funkcje pilnują, żeby ani telefon, ani komputer nie zgubił
// niczego przy łączeniu.
import { describe, expect, it } from 'vitest';
import { isNewerPhoneDamage, mergePhoneDamage, normalisePhoneDamagePoints } from './phoneDamage';
import type { DamagePoint } from '../types';

const point = (id: number, extra: Partial<DamagePoint> = {}): DamagePoint => ({ id, x: 10 * id, y: 20, note: '', ...extra });

describe('normalisePhoneDamagePoints', () => {
    it('przenosi zdjęcia i oznaczenia, a null zamienia na wartości formularza', () => {
        expect(normalisePhoneDamagePoints([{
            id: 1, x: 5, y: 6, note: null,
            photos: [{ photoId: 'ph-1', thumbnailUrl: null, strokes: null }],
        }])).toEqual([{
            id: 1, x: 5, y: 6, note: '',
            photos: [{ photoId: 'ph-1', strokes: [], thumbnailUrl: undefined }],
        }]);
        expect(normalisePhoneDamagePoints(null)).toEqual([]);
    });
});

describe('mergePhoneDamage', () => {
    it('pierwszy stan z telefonu trafia do pustego formularza (dawniej przepadał)', () => {
        const merged = mergePhoneDamage([], [point(1, { note: 'rysa' })]);

        expect(merged).toEqual([point(1, { note: 'rysa', fromPhone: true })]);
    });

    it('punkty z telefonu zastępują poprzednie punkty z telefonu, także usunięte tam', () => {
        const current = [point(1, { fromPhone: true }), point(2, { fromPhone: true })];

        const merged = mergePhoneDamage(current, [point(2, { note: 'wgniecenie' })]);

        expect(merged).toEqual([point(2, { note: 'wgniecenie', fromPhone: true })]);
    });

    it('punkt postawiony na komputerze zostaje, a przy zajętym numerze dostaje następny wolny', () => {
        const desktop = point(1, { note: 'z komputera' });

        const merged = mergePhoneDamage([desktop], [point(1), point(2)]);

        expect(merged.map(p => [p.id, p.note, !!p.fromPhone])).toEqual([
            [1, '', true],
            [2, '', true],
            [3, 'z komputera', false],
        ]);
    });

    it('ten sam stan wczytany drugi raz niczego nie zmienia', () => {
        const once = mergePhoneDamage([point(1)], [point(1), point(2)]);

        expect(mergePhoneDamage(once, [point(1), point(2)])).toEqual(once);
    });
});

describe('isNewerPhoneDamage', () => {
    it('stan już wczytany nie wchodzi drugi raz, nowszy wchodzi', () => {
        const applied = '2026-10-16T10:00:00.123456Z';

        expect(isNewerPhoneDamage(applied, applied)).toBe(false);
        expect(isNewerPhoneDamage('2026-10-16T09:59:59Z', applied)).toBe(false);
        expect(isNewerPhoneDamage('2026-10-16T10:00:01Z', applied)).toBe(true);
    });

    it('bez znacznika stan wchodzi, jak dawniej', () => {
        expect(isNewerPhoneDamage('2026-10-16T10:00:00Z', undefined)).toBe(true);
        expect(isNewerPhoneDamage(undefined, '2026-10-16T10:00:00Z')).toBe(true);
    });
});
