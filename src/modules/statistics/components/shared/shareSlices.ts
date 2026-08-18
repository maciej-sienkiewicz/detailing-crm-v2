// src/modules/statistics/components/shared/shareSlices.ts
// Budowanie danych dla donuta udziału kategorii, wspólne dla Przychodów i Kosztów.

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

/** Pozycjonuje menu kontekstowe względem klikniętego elementu tak, aby mieściło się w oknie. */
export function ctxMenuPosition(anchor: DOMRect): { x: number; y: number } {
    const x = Math.max(8, Math.min(anchor.right - CTX_MENU_WIDTH, window.innerWidth - CTX_MENU_WIDTH - 8));
    const y = anchor.bottom + 4 + CTX_MENU_HEIGHT > window.innerHeight
        ? Math.max(8, anchor.top - CTX_MENU_HEIGHT - 4)
        : anchor.bottom + 4;
    return { x, y };
}
