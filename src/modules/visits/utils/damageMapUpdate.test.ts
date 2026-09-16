import { describe, expect, it } from 'vitest';
import type { DamagePoint } from '@/modules/checkin/types';
import {
    buildDamageMapNotificationDraft,
    buildDamageMapPayload,
    diffDamagePoints,
} from './damageMapUpdate';

const point = (over: Partial<DamagePoint> & { id: number }): DamagePoint => ({
    x: 10,
    y: 20,
    note: '',
    ...over,
});

describe('diffDamagePoints', () => {
    it('rozpoznaje dopisane uszkodzenie — to jest cały powód istnienia tej funkcji', () => {
        const before = [point({ id: 1, note: 'rysa na masce' })];
        const after = [...before, point({ id: 2, x: 60, y: 40, note: 'wgniecenie na drzwiach' })];

        const diff = diffDamagePoints(before, after);

        expect(diff.addedIds).toEqual([2]);
        expect(diff.removedIds).toEqual([]);
        expect(diff.editedIds).toEqual([]);
        expect(diff.countBefore).toBe(1);
        expect(diff.countAfter).toBe(2);
        expect(diff.hasChanges).toBe(true);
    });

    it('usunięcie punktu nie przenumerowuje pozostałych, więc nie udaje edycji', () => {
        // Edytor nadaje nowym punktom max(id)+1, więc po usunięciu nr 2 punkt nr 3
        // NADAL jest punktem nr 3. Gdyby porównanie szło po pozycji na liście,
        // zgłosiłoby tu „1 poprawione" i klient dostałby maila o zmianie, której nie było.
        const before = [point({ id: 1 }), point({ id: 2 }), point({ id: 3, note: 'zadrapanie' })];
        const after = [point({ id: 1 }), point({ id: 3, note: 'zadrapanie' })];

        const diff = diffDamagePoints(before, after);

        expect(diff.removedIds).toEqual([2]);
        expect(diff.editedIds).toEqual([]);
    });

    it('zmiana opisu, położenia i rysunku na zdjęciu liczy się jako edycja', () => {
        const before = [
            point({ id: 1, note: 'rysa' }),
            point({ id: 2, x: 10, y: 10 }),
            point({ id: 3, photos: [{ photoId: 'p1', strokes: [] }] }),
        ];
        const after = [
            point({ id: 1, note: 'głęboka rysa' }),
            point({ id: 2, x: 40, y: 10 }),
            point({
                id: 3,
                photos: [{
                    photoId: 'p1',
                    strokes: [{ color: '#EF4444', width: 1, points: [{ x: 1, y: 1 }] }],
                }],
            }),
        ];

        expect(diffDamagePoints(before, after).editedIds).toEqual([1, 2, 3]);
    });

    it('drgnięcie myszką poniżej ćwierci procenta nie jest zmianą', () => {
        // Współrzędne to procenty z kliknięcia; porównanie co do bitu zgłaszałoby
        // zmianę za każdym przerysowaniem tego samego punktu.
        const before = [point({ id: 1, x: 10, y: 20 })];
        const after = [point({ id: 1, x: 10.1, y: 20.05 })];

        expect(diffDamagePoints(before, after).hasChanges).toBe(false);
    });

    it('ten sam opis z innym białym znakiem nie jest zmianą', () => {
        const before = [point({ id: 1, note: 'rysa' })];
        const after = [point({ id: 1, note: '  rysa  ' })];

        expect(diffDamagePoints(before, after).hasChanges).toBe(false);
    });

    it('brak zdjęć i pusta tablica zdjęć to ten sam punkt', () => {
        const before = [point({ id: 1 })];
        const after = [point({ id: 1, photos: [] })];

        expect(diffDamagePoints(before, after).hasChanges).toBe(false);
    });
});

describe('buildDamageMapNotificationDraft', () => {
    it('nie zawiera polskich znaków — ta sama treść może pójść SMS-em', () => {
        const diff = diffDamagePoints([point({ id: 1 })], [point({ id: 1 }), point({ id: 2, x: 50, y: 50 })]);

        const draft = buildDamageMapNotificationDraft(diff, 'WIZ/2026/09/001');

        expect(draft).not.toMatch(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/);
        expect(draft).toContain('WIZ/2026/09/001');
        expect(draft).toContain('Nowych oznaczen: 1');
    });
});

describe('buildDamageMapPayload', () => {
    const points = [point({ id: 1, note: 'rysa' })];

    it('pusty typ nadwozia jest pomijany, żeby nie nadpisać wyboru z przyjęcia', () => {
        const payload = buildDamageMapPayload({
            damagePoints: points,
            vehicleType: null,
            mode: 'NEW_FILE',
            notifyCustomer: false,
        });

        expect('vehicleType' in payload).toBe(false);
        expect(payload.mode).toBe('NEW_FILE');
    });

    it('treść wiadomości leci tylko przy wybranym TAK', () => {
        const withNo = buildDamageMapPayload({
            damagePoints: points,
            vehicleType: 'suv',
            mode: 'NEW_FILE',
            notifyCustomer: false,
            // Operator napisał treść, potem zmienił zdanie na „nie informuj".
            notifyMessage: 'Dorysowalismy rysa na masce',
        });
        expect('notifyMessage' in withNo).toBe(false);
        expect(withNo.notifyCustomer).toBe(false);

        const withYes = buildDamageMapPayload({
            damagePoints: points,
            vehicleType: 'suv',
            mode: 'REPLACE_EXISTING',
            notifyCustomer: true,
            notifyMessage: '  Dorysowalismy nowe oznaczenie  ',
        });
        expect(withYes.notifyMessage).toBe('Dorysowalismy nowe oznaczenie');
        expect(withYes.mode).toBe('REPLACE_EXISTING');
    });

    it('puste pole treści znaczy „użyj tekstu domyślnego", nie „wyślij pustą wiadomość"', () => {
        const payload = buildDamageMapPayload({
            damagePoints: points,
            vehicleType: 'suv',
            mode: 'NEW_FILE',
            notifyCustomer: true,
            notifyMessage: '   ',
        });

        expect('notifyMessage' in payload).toBe(false);
        expect(payload.notifyCustomer).toBe(true);
    });
});
