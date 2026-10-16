// src/modules/checkin/utils/phoneDamage.ts
//
// Uszkodzenia zaznaczone telefonem (kod QR) w formularzu przyjęcia na komputerze.
//
// Przychodzą dwiema drogami - zdarzeniem WebSocket przy każdym zapisie na telefonie
// i odczytem z serwera przy wejściu w krok zdjęć oraz po odzyskaniu połączenia - i obie
// muszą trafić do formularza tak samo. Gdy przychodziły tylko zdarzeniem, przegapione
// zdarzenie znaczyło pustą listę w kreatorze, a serwer dokleja zdjęcia z telefonu tylko
// do przysłanych punktów: uszkodzenia z telefonu w ogóle nie trafiały do wizyty.

import type { AnnotationStroke, DamagePoint } from '../types';

/** Usterka w kształcie z serwera (zdarzenie WS albo odczyt) - pola bywają null. */
export interface RawPhoneDamagePoint {
    id: number;
    x: number;
    y: number;
    note?: string | null;
    photos?: { photoId: string; thumbnailUrl?: string | null; strokes?: AnnotationStroke[] | null }[] | null;
}

/**
 * Kształt serwera → kształt formularza. Zdjęcia MUSZĄ przejść dalej: dawniej normalizacja
 * wypisywała tylko id, x, y i notatkę, więc usterka z telefonu przychodziła bez zdjęć.
 */
export const normalisePhoneDamagePoints = (points: RawPhoneDamagePoint[] | null | undefined): DamagePoint[] =>
    (points ?? []).map(point => ({
        id: point.id,
        x: point.x,
        y: point.y,
        note: point.note ?? '',
        photos: (point.photos ?? []).map(photo => ({
            photoId: photo.photoId,
            strokes: photo.strokes ?? [],
            thumbnailUrl: photo.thumbnailUrl ?? undefined,
        })),
    }));

const stampOf = (savedAt: string | null | undefined): number => {
    const stamp = savedAt ? Date.parse(savedAt) : NaN;
    return Number.isFinite(stamp) ? stamp : NaN;
};

/**
 * Czy stan z telefonu jest nowszy niż ten, który formularz już ma.
 *
 * Odczyt przy każdym wejściu w krok zdjęć zwraca zwykle stan już raz wczytany. Wczytany
 * ponownie cofałby to, co sprzedawca zmienił potem na komputerze (notatkę, usunięty
 * punkt). Bez znacznika (stary serwer, uszkodzona data) stan wchodzi - tak jak dawniej.
 */
export const isNewerPhoneDamage = (savedAt: string | null | undefined, appliedAt: string | null | undefined): boolean => {
    const incoming = stampOf(savedAt);
    const applied = stampOf(appliedAt);
    if (Number.isNaN(incoming) || Number.isNaN(applied)) return true;
    return incoming > applied;
};

/**
 * Stan z telefonu w formularzu: punkty z telefonu zastępują poprzednie punkty z telefonu
 * (telefon jest dla nich źródłem prawdy - usunięty tam znika i tutaj), a punkty postawione
 * na komputerze zostają.
 *
 * Dawniej zdarzenie z telefonu podmieniało CAŁĄ listę i punkt zaznaczony przy komputerze
 * znikał przy najbliższym zapisie na telefonie. Telefon nie zna punktów komputera i numeruje
 * od 1, więc punkt komputera o zajętym numerze dostaje następny wolny - serwer łączy zdjęcia
 * z telefonu z punktami właśnie po numerze.
 */
export const mergePhoneDamage = (current: DamagePoint[], phone: DamagePoint[]): DamagePoint[] => {
    const phoneIds = new Set(phone.map(point => point.id));
    const desktopOnly = current.filter(point => !point.fromPhone);
    let nextId = Math.max(0, ...phone.map(point => point.id), ...desktopOnly.map(point => point.id));
    return [
        ...phone.map(point => ({ ...point, fromPhone: true as const })),
        ...desktopOnly.map(point => (phoneIds.has(point.id) ? { ...point, id: ++nextId } : point)),
    ];
};
