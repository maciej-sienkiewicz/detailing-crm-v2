import { useCallback, useMemo, useState } from 'react';

export interface RowSelection {
    /** Zaznaczone klucze ograniczone do wierszy widocznych TERAZ. */
    selected: string[];
    count: number;
    isSelected: (key: string) => boolean;
    toggle: (key: string) => void;
    /** Zaznacza wszystkie widoczne wiersze, a gdy już są zaznaczone - odznacza je. */
    toggleAll: () => void;
    allSelected: boolean;
    /** Część widocznych wierszy jest zaznaczona - stan pośredni nagłówkowego pola. */
    someSelected: boolean;
    clear: () => void;
}

/**
 * Zaznaczanie wielu wierszy listy, z której da się potem wykonać jedną operację.
 *
 * Kluczowa decyzja: zaznaczenie jest ZAWSZE przycinane do wierszy widocznych w tej
 * chwili. Zmiana filtra, frazy albo strony wyrzuca z zaznaczenia to, czego użytkownik
 * już nie widzi - inaczej „oznacz jako opłacone" ruszyłoby dokumenty, których nie ma
 * na ekranie, a licznik pokazywałby liczbę bez pokrycia w tym, co widać.
 *
 * Przycinanie jest liczone przy odczycie, nie efektem: efekt dawałby jeden render
 * z licznikiem sprzed przycięcia, czyli dokładnie tę liczbę bez pokrycia.
 */
export const useRowSelection = (visibleKeys: string[]): RowSelection => {
    const [raw, setRaw] = useState<ReadonlySet<string>>(() => new Set());

    const visible = useMemo(() => new Set(visibleKeys), [visibleKeys]);

    const selected = useMemo(
        () => visibleKeys.filter((key) => raw.has(key)),
        [visibleKeys, raw]
    );

    const isSelected = useCallback((key: string) => raw.has(key) && visible.has(key), [raw, visible]);

    const toggle = useCallback((key: string) => {
        setRaw((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    }, []);

    const allSelected = visibleKeys.length > 0 && selected.length === visibleKeys.length;

    const toggleAll = useCallback(() => {
        setRaw((prev) => {
            const next = new Set(prev);
            const everyVisibleSelected =
                visibleKeys.length > 0 && visibleKeys.every((key) => next.has(key));
            visibleKeys.forEach((key) => {
                if (everyVisibleSelected) next.delete(key); else next.add(key);
            });
            return next;
        });
    }, [visibleKeys]);

    const clear = useCallback(() => setRaw(new Set()), []);

    return {
        selected,
        count: selected.length,
        isSelected,
        toggle,
        toggleAll,
        allSelected,
        someSelected: selected.length > 0 && !allSelected,
        clear,
    };
};
