// src/modules/settings/components/shared/settingsChrome.ts
//
// Kontrakt między ramą ustawień (SettingsView) a sekcjami.
//
// Sekcja nie rysuje własnego tytułu ani własnego paska „Zapisz" w dowolnym miejscu:
// tytuł i opis stoją w nagłówku ramy, akcja główna trafia do niego przez
// <SettingsHeaderActions>, a niezapisane zmiany sekcja zgłasza przez
// useSettingsDirty. Rama zna wtedy stan wszystkich sekcji i może zapytać przed
// wyjściem - wcześniej pasek obiecywał „Opuszczenie strony bez zapisu spowoduje
// utratę zmian", a przejście do innej sekcji po cichu wyrzucało edycję.

import { createContext, useContext, useEffect, useId } from 'react';

export interface SettingsChromeValue {
    /** Zgłoszenie (albo cofnięcie) niezapisanych zmian przez jedną sekcję. */
    setDirty: (id: string, dirty: boolean) => void;
    /** Kontener na akcje sekcji w nagłówku ramy; null zanim się zamontuje. */
    headerActions: HTMLElement | null;
}

export const SettingsChromeContext = createContext<SettingsChromeValue | null>(null);

export function useSettingsChrome(): SettingsChromeValue | null {
    return useContext(SettingsChromeContext);
}

/**
 * Sekcja z edycją zgłasza, że ma niezapisane zmiany. Rama pyta wtedy przed przejściem
 * do innej sekcji albo wyjściem z ustawień, a przeglądarka przed zamknięciem karty.
 * Poza ramą ustawień (np. w testach) hook nic nie robi.
 */
export function useSettingsDirty(dirty: boolean) {
    const chrome = useContext(SettingsChromeContext);
    const id = useId();
    const setDirty = chrome?.setDirty;

    useEffect(() => {
        if (!setDirty) return;
        setDirty(id, dirty);
        return () => setDirty(id, false);
    }, [setDirty, id, dirty]);
}
