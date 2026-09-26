// src/modules/settings/components/services/usePriceSidePreference.ts
//
// „Ceny: Brutto | Netto" w cenniku - która kwota stoi w wierszu jako główna.
//
// Zapamiętane w TEJ przeglądarce, nie na koncie: to wygoda osoby przy biurku
// (księgowa myśli w netto, recepcja w brutto), a nie ustawienie studia. Domyślnie
// brutto, bo tyle płaci klient i tak zwykle wpisuje się cenę.
//
// Pamięć przeglądarki bywa niedostępna (tryb prywatny, zablokowane dane witryny) -
// wtedy każdy odczyt i zapis kończy się po cichu na wartości domyślnej, zamiast
// wywracać sekcję cennika.
import { useCallback, useState } from 'react';
import type { PriceSide } from '@/common/utils/priceInputs';

export const PRICE_SIDE_STORAGE_KEY = 'settings.services.priceSide';
export const DEFAULT_PRICE_SIDE: PriceSide = 'gross';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const browserStorage = (): StorageLike | null => {
    try {
        return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
        return null;
    }
};

export function readPriceSide(storage: StorageLike | null = browserStorage()): PriceSide {
    try {
        const raw = storage?.getItem(PRICE_SIDE_STORAGE_KEY);
        return raw === 'net' || raw === 'gross' ? raw : DEFAULT_PRICE_SIDE;
    } catch {
        return DEFAULT_PRICE_SIDE;
    }
}

export function writePriceSide(side: PriceSide, storage: StorageLike | null = browserStorage()): void {
    try {
        storage?.setItem(PRICE_SIDE_STORAGE_KEY, side);
    } catch {
        // Brak pamięci przeglądarki: wybór działa do odświeżenia strony i tyle.
    }
}

export function usePriceSidePreference(): [PriceSide, (side: PriceSide) => void] {
    const [side, setSide] = useState<PriceSide>(() => readPriceSide());
    const change = useCallback((next: PriceSide) => {
        setSide(next);
        writePriceSide(next);
    }, []);
    return [side, change];
}
