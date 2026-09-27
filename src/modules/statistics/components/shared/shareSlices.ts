// src/modules/statistics/components/shared/shareSlices.ts
// Budowanie danych dla donuta udziału kategorii, wspólne dla Przychodów i Kosztów.

import {
    mobileBottomReserve,
    placeFloating,
    visibleViewport,
    type AnchorBox,
} from '@/common/utils/floatingPlacement';

export const PIE_UNASSIGNED_COLOR = '#94A3B8';
export const PIE_OTHER_COLOR = '#CBD5E1';
const PIE_FALLBACK_COLOR = '#6B7280';

export interface PieSliceDatum {
    key: string;
    categoryId: string | null;
    name: string;
    color: string;
    value: number;
    itemCount: number;
}

interface ShareCategoryInput {
    categoryId: string;
    name: string;
    color: string | null;
    /** Wartość w PLN (float) */
    value: number;
    itemCount: number;
}

/**
 * Buduje wycinki donuta: N największych kategorii, ogon zwinięty do „Pozostałe",
 * a nieprzypisane pozycje jako osobny neutralny wycinek: dzięki temu procenty
 * są udziałami w CAŁOŚCI, nie tylko w części przypisanej.
 */
export function buildCategoryShareSlices(
    categories: ShareCategoryInput[],
    unassigned: { value: number; itemCount: number },
    maxSlices = 7,
): PieSliceDatum[] {
    const sorted = [...categories]
        .filter(c => c.value > 0)
        .sort((a, b) => b.value - a.value);

    const head = sorted.slice(0, maxSlices);
    const tail = sorted.slice(maxSlices);

    const slices: PieSliceDatum[] = head.map(c => ({
        key:        c.categoryId,
        categoryId: c.categoryId,
        name:       c.name,
        color:      c.color ?? PIE_FALLBACK_COLOR,
        value:      c.value,
        itemCount:  c.itemCount,
    }));

    if (tail.length > 0) {
        slices.push({
            key:        '__other',
            categoryId: null,
            name:       `Pozostałe kategorie (${tail.length})`,
            color:      PIE_OTHER_COLOR,
            value:      tail.reduce((s, c) => s + c.value, 0),
            itemCount:  tail.reduce((s, c) => s + c.itemCount, 0),
        });
    }

    if (unassigned.value > 0) {
        slices.push({
            key:        '__unassigned',
            categoryId: null,
            name:       'Nieprzypisane',
            color:      PIE_UNASSIGNED_COLOR,
            value:      unassigned.value,
            itemCount:  unassigned.itemCount,
        });
    }

    return slices;
}

const CTX_MENU_WIDTH = 230;
const CTX_MENU_HEIGHT = 240;
export const CTX_MENU_OFFSET = 4;

/**
 * Pozycja menu kontekstowego przy klikniętym elemencie.
 *
 * `x`/`y` to tylko pierwsze przybliżenie przy typowym rozmiarze menu. Prawdziwe
 * menu ma 220-280 px szerokości, a wysokość zależy od liczby kategorii - dlatego
 * zwracamy też `anchor` (prostokąt elementu), a CategoryAssignMenu po wyrenderowaniu
 * mierzy się i ustawia od niego na nowo. Samo x/y ze stałych 230 × 240 wyjeżdżało
 * dołem przy dłuższej liście kategorii i nie miało limitu wysokości.
 */
export function ctxMenuPosition(anchor: DOMRect): { x: number; y: number; anchor: AnchorBox } {
    const box: AnchorBox = { top: anchor.top, bottom: anchor.bottom, left: anchor.left, right: anchor.right };
    const viewport = visibleViewport();
    const { left, top } = placeFloating(
        box,
        { width: CTX_MENU_WIDTH, height: CTX_MENU_HEIGHT },
        viewport,
        { align: 'right', offset: CTX_MENU_OFFSET, bottomReserve: mobileBottomReserve(viewport.width) },
    );
    return { x: left, y: top, anchor: box };
}
