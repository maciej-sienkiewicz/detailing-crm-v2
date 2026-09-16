// src/modules/visits/utils/damageMapUpdate.ts
//
// Logika okna „Zaktualizuj uszkodzenia" odjęta od jego wyglądu.
//
// Powód jest praktyczny: to, CO okno powie użytkownikowi przed zapisem („dodajesz
// 2 oznaczenia, usuwasz 1"), i to, co pójdzie do API, to jedyne dwie rzeczy, które
// mogą tu zrobić szkodę. Żadna z nich nie potrzebuje DOM-u do sprawdzenia.

import type { DamagePoint } from '@/modules/checkin/types';
import type { DamageMapUpdateMode, UpdateDamageMapPayload } from '../types';
import { toAscii } from './serviceChangeSms';

export interface DamageMapDiff {
    /** Numery punktów, których wcześniej nie było. */
    addedIds: number[];
    /** Numery punktów, które zniknęły. */
    removedIds: number[];
    /** Numery punktów, którym zmieniono opis, położenie albo zdjęcia. */
    editedIds: number[];
    countBefore: number;
    countAfter: number;
    hasChanges: boolean;
}

/**
 * Porównanie map po numerze punktu.
 *
 * Numer (`id`) jest tu tożsamością, nie kolejnością: edytor nadaje nowym punktom
 * `max(id) + 1`, więc usunięcie punktu nr 2 NIE przenumerowuje pozostałych i
 * „punkt 3" znaczy ten sam punkt przed i po edycji.
 */
export const diffDamagePoints = (before: DamagePoint[], after: DamagePoint[]): DamageMapDiff => {
    const beforeById = new Map(before.map(p => [p.id, p]));
    const afterById = new Map(after.map(p => [p.id, p]));

    const addedIds = after.filter(p => !beforeById.has(p.id)).map(p => p.id);
    const removedIds = before.filter(p => !afterById.has(p.id)).map(p => p.id);
    const editedIds = after
        .filter(p => {
            const previous = beforeById.get(p.id);
            return previous !== undefined && !isSamePoint(previous, p);
        })
        .map(p => p.id);

    return {
        addedIds,
        removedIds,
        editedIds,
        countBefore: before.length,
        countAfter: after.length,
        hasChanges: addedIds.length > 0 || removedIds.length > 0 || editedIds.length > 0,
    };
};

/*
 * Współrzędne są procentami z kliknięcia myszką, więc porównanie liczb
 * zmiennoprzecinkowych co do bitu uznałoby przerysowanie tego samego punktu za
 * zmianę. Ćwierć procenta szerokości schematu to mniej niż promień markera —
 * poniżej tego nikt nie widzi różnicy, więc nie ma o czym informować klienta.
 */
const POSITION_EPSILON = 0.25;

const isSamePoint = (a: DamagePoint, b: DamagePoint): boolean =>
    Math.abs(a.x - b.x) < POSITION_EPSILON &&
    Math.abs(a.y - b.y) < POSITION_EPSILON &&
    (a.note ?? '').trim() === (b.note ?? '').trim() &&
    photoSignature(a) === photoSignature(b);

/** Zdjęcia i ich zaznaczenia: zmiana rysunku na zdjęciu też jest zmianą mapy. */
const photoSignature = (point: DamagePoint): string =>
    (point.photos ?? [])
        .map(photo => `${photo.photoId}:${(photo.strokes ?? []).length}`)
        .sort()
        .join('|');

/** Polska odmiana: 1 oznaczenie, 2-4 oznaczenia, 5+ oznaczeń. */
export const markWord = (count: number): string => {
    if (count === 1) return 'oznaczenie';
    const last = count % 10;
    const lastTwo = count % 100;
    return last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14) ? 'oznaczenia' : 'oznaczeń';
};

/**
 * Jedno zdanie o tym, co zapis zrobi z mapą. Pokazywane NAD przyciskiem zapisu,
 * bo to ostatni moment, w którym da się zauważyć, że skasowało się pół protokołu
 * przyjęcia jednym „Wyczyść wszystko".
 */
export const describeDamageMapChange = (diff: DamageMapDiff): string => {
    if (!diff.hasChanges) return 'Nic się nie zmieniło — nie ma czego zapisywać.';

    const parts: string[] = [];
    if (diff.addedIds.length > 0) {
        parts.push(`${diff.addedIds.length} ${markWord(diff.addedIds.length)} więcej`);
    }
    if (diff.removedIds.length > 0) {
        parts.push(`${diff.removedIds.length} ${markWord(diff.removedIds.length)} mniej`);
    }
    if (diff.editedIds.length > 0) {
        parts.push(`${diff.editedIds.length} poprawione`);
    }
    return `${parts.join(', ')} — na mapie zostanie ${diff.countAfter} ${markWord(diff.countAfter)}.`;
};

/**
 * Domyślna treść wiadomości do klienta.
 *
 * Bez ogonków: nie wiemy, czy backend wyśle maila (klient ma adres) czy SMS-a
 * (nie ma), a w SMS-ie polskie znaki przełączają kodowanie na UCS-2 i tną segment
 * ze 160 znaków do 70. Tekst, który zmieści się w jednym SMS-ie, w mailu wygląda
 * co najwyżej oszczędnie; odwrotnie — kosztuje.
 *
 * Z tego samego powodu szkic NIE obiecuje kanału ani załącznika: „dokument w
 * załączniku" jest prawdą w mailu i kłamstwem w SMS-ie, a operator nie ma skąd
 * wiedzieć, którą drogą wiadomość pójdzie — decyduje o tym zawartość kartoteki
 * klienta. Zdanie o dostarczeniu dokłada backend, już wiedząc, czym wysyła.
 */
export const buildDamageMapNotificationDraft = (
    diff: DamageMapDiff,
    visitNumber: string
): string => {
    const head = `Wizyta ${visitNumber}: zaktualizowalismy mape uszkodzen pojazdu.`;
    const detail = diff.addedIds.length > 0
        ? ` Nowych oznaczen: ${diff.addedIds.length} (lacznie ${diff.countAfter}).`
        : ` Oznaczen na mapie: ${diff.countAfter}.`;
    return toAscii(`${head}${detail}`);
};

export const buildDamageMapPayload = (params: {
    damagePoints: DamagePoint[];
    vehicleType?: string | null;
    mode: DamageMapUpdateMode;
    notifyCustomer: boolean;
    notifyMessage?: string;
}): UpdateDamageMapPayload => {
    const trimmedMessage = params.notifyMessage?.trim();
    return {
        damagePoints: params.damagePoints,
        // Pusty typ nadwozia pomijamy, żeby backend użył zapisanego wcześniej —
        // wysłanie "" nadpisałoby wybór z przyjęcia niczym.
        ...(params.vehicleType ? { vehicleType: params.vehicleType } : {}),
        mode: params.mode,
        notifyCustomer: params.notifyCustomer,
        // Treść leci tylko wtedy, gdy klient ma zostać powiadomiony ORAZ operator
        // faktycznie coś napisał. Puste pole = tekst domyślny z backendu, nie ""
        // wysłane jako wiadomość.
        ...(params.notifyCustomer && trimmedMessage ? { notifyMessage: trimmedMessage } : {}),
    };
};
