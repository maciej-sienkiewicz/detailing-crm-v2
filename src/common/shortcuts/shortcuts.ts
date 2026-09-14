// src/common/shortcuts/shortcuts.ts
// Definicje globalnych skrótów klawiszowych + stan ich włączenia.
//
// Osobno od komponentu nasłuchu (GlobalShortcuts.tsx), bo z tych definicji
// korzysta też ściąga w Ustawieniach - a plik eksportujący komponent nie może
// eksportować stałych bez psucia Fast Refresh.
import { useEffect, useState } from 'react';

export interface GlobalShortcut {
    /** Litera z klawiatury - porównywana z event.key po zniżeniu. */
    key: string;
    /** Cel nawigacji. */
    to: string;
    /** Stan nawigacji - np. sygnał „otwórz okno szybkiej wizyty" dla kalendarza. */
    state?: Record<string, unknown>;
    /** Opis do ściągi w Ustawieniach. */
    description: string;
}

export const GLOBAL_SHORTCUTS: GlobalShortcut[] = [
    { key: 'w', to: '/checkin/new', description: 'Przyjęcie auta - nowa wizyta' },
    { key: 'r', to: '/calendar', state: { openQuickEvent: true }, description: 'Nowa rezerwacja w kalendarzu (dziś → jutro)' },
    { key: 'k', to: '/calendar', description: 'Kalendarz' },
    { key: 'l', to: '/leads', description: 'Leady' },
    { key: 'p', to: '/communication', description: 'Komunikacja (poczta)' },
    { key: 'f', to: '/finances', description: 'Finanse' },
    { key: 's', to: '/statistics', description: 'Statystyki' },
    { key: 'g', to: '/gallery', description: 'Galeria' },
    { key: 'i', to: '/instagram', description: 'Instagram' },
    { key: 'u', to: '/settings', description: 'Ustawienia' },
];

const STORAGE_KEY = 'app.keyboardShortcuts.enabled';
const CHANGE_EVENT = 'app:keyboard-shortcuts-change';

/** Domyślnie włączone; „0" w localStorage znaczy „wyłączone przez użytkownika". */
export function areShortcutsEnabled(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) !== '0';
    } catch {
        return true;
    }
}

export function setShortcutsEnabled(enabled: boolean): void {
    try {
        localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
    } catch {
        /* tryb prywatny itp. - przełącznik po prostu nie przetrwa odświeżenia */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Stan włączenia + setter, zsynchronizowany między komponentami i kartami przeglądarki. */
export function useShortcutsEnabled(): [boolean, (enabled: boolean) => void] {
    const [enabled, setEnabled] = useState(areShortcutsEnabled);
    useEffect(() => {
        const sync = () => setEnabled(areShortcutsEnabled());
        window.addEventListener(CHANGE_EVENT, sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener(CHANGE_EVENT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);
    return [enabled, setShortcutsEnabled];
}

/** Czy klawisz padł tam, gdzie litera jest treścią albo należy do otwartego dialogu. */
export function isTypingContext(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return true;
    if (target.isContentEditable) return true;
    if (target.closest('[role="dialog"], [aria-modal="true"]')) return true;
    return false;
}
