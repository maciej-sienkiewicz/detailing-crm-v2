// src/common/components/PageChrome/pageChrome.ts
//
// Kontrakt między ramą strony (Ustawienia, Pracownicy) a sekcją, która w niej stoi.
//
// Sekcja nie rysuje własnego paska „Zapisz" w dowolnym miejscu: akcja główna trafia
// do nagłówka ramy przez <PageHeaderActions>, a niezapisane zmiany sekcja zgłasza
// przez usePageDirty. Rama zna wtedy stan wszystkich sekcji i może zapytać przed
// wyjściem.
//
// Kontrakt urodził się w Ustawieniach (settingsChrome). Wydzielony, bo lista zespołu
// i rozliczenia przeszły do modułu „Pracownicy": przeniesione „na ślepo" straciłyby
// portal (przyciski lądowałyby w miejscu) i - co gorsze - ochronę przed utratą
// wpisanych danych, bo strażnik milczy poza ramą. Teraz komponent nie wie, w którym
// module stoi.

import { createContext, useContext, useEffect, useId } from 'react';

export interface PageChromeValue {
    /** Zgłoszenie (albo cofnięcie) niezapisanych zmian przez jedną sekcję. */
    setDirty: (id: string, dirty: boolean) => void;
    /** Kontener na akcje sekcji w nagłówku ramy; null zanim się zamontuje. */
    headerActions: HTMLElement | null;
}

export const PageChromeContext = createContext<PageChromeValue | null>(null);

export function usePageChrome(): PageChromeValue | null {
    return useContext(PageChromeContext);
}

/**
 * Sekcja z edycją zgłasza, że ma niezapisane zmiany. Rama pyta wtedy przed wyjściem,
 * a przeglądarka przed zamknięciem karty. Poza ramą (np. w testach) hook nic nie robi.
 */
export function usePageDirty(dirty: boolean) {
    const chrome = useContext(PageChromeContext);
    const id = useId();
    const setDirty = chrome?.setDirty;

    useEffect(() => {
        if (!setDirty) return;
        setDirty(id, dirty);
        return () => setDirty(id, false);
    }, [setDirty, id, dirty]);
}
