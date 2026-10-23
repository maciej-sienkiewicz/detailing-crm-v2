// src/common/shortcuts/shortcuts.ts
// Definicje skrótów klawiszowych + stan ich włączenia.
//
// Trzy rodzaje skrótów:
//  • GLOBAL_SHORTCUTS  - litera przenosi do widoku, działa wszędzie;
//  • SCOPED_SHORTCUTS  - cyfra przełącza zakładkę, ale TYLKO w swojej sekcji
//    (1-4 w Finansach, 1-2 w Statystykach, 1-4 na Instagramie). Cyfra poza
//    sekcją nic nie robi, więc ta sama „1" może znaczyć co innego w każdej;
//  • ACTION_SHORTCUTS  - litera otwiera coś na miejscu, bez nawigacji (Z - notatka).
//
// Osobno od komponentu nasłuchu (GlobalShortcuts.tsx), bo z tych definicji
// korzysta też ściąga w Ustawieniach - a plik eksportujący komponent nie może
// eksportować stałych bez psucia Fast Refresh.
import type { PermissionCode, PersonalDataAction } from '@/core/permissions';
import { useEffect, useState } from 'react';

export interface GlobalShortcut {
    /** Klawisz - porównywany z event.key po zniżeniu. */
    key: string;
    /** Cel nawigacji. */
    to: string;
    /** Stan nawigacji - np. sygnał „otwórz okno szybkiej wizyty" dla kalendarza. */
    state?: Record<string, unknown>;
    /** Opis do ściągi w Ustawieniach. */
    description: string;
    /**
     * Akcja wymagająca danych osobowych (personalDataActions). Bez niej skrót nic nie
     * robi i nie ma go w ściądze - inaczej „W" prowadziłoby prosto na ekran odmowy.
     */
    requiresAction?: PersonalDataAction;
}

export const GLOBAL_SHORTCUTS: GlobalShortcut[] = [
    { key: 'w', to: '/checkin/new', description: 'Przyjęcie auta - nowa wizyta', requiresAction: 'canCreateVisit' },
    { key: 'r', to: '/calendar', state: { openQuickEvent: true }, description: 'Nowa rezerwacja', requiresAction: 'canCreateAppointment' },
    { key: 'k', to: '/calendar', description: 'Kalendarz' },
    { key: 'l', to: '/inbox', description: 'Zapytania' },
    { key: 'p', to: '/mail', description: 'Poczta' },
    { key: 'f', to: '/finances', description: 'Finanse' },
    { key: 's', to: '/statistics', description: 'Statystyki' },
    { key: 'g', to: '/gallery', description: 'Galeria' },
    { key: 'i', to: '/instagram', description: 'Instagram' },
    { key: 'u', to: '/settings', description: 'Ustawienia' },
];

/**
 * Skrót sekcyjny prowadzi do zakładki na dwa sposoby, bo zakładki są robione
 * dwojako:
 *  • `param` - zakładka siedzi w parametrze adresu (Finanse `?tab=`, Instagram
 *    `?view=`). Ustawiamy tylko ten jeden parametr i zostawiamy resztę, żeby
 *    skok między zakładkami nie gubił wybranego okresu ani roku;
 *  • `to`    - zakładka to osobna trasa (Statystyki mają `/statistics/costs`).
 */
export interface ScopedShortcut {
    key: string;
    /** Parametr adresu do ustawienia, z zachowaniem pozostałych. */
    param?: { name: string; value: string };
    /**
     * Parametry, które należą tylko do innej zakładki i mają zniknąć przy skoku - tak samo,
     * jak znikają przy kliknięciu zakładki myszą. Bez tego „1" z Konkurencji zostawiało
     * w adresie `pokaz=profile` i okres, które na Przeglądzie nic nie znaczą.
     */
    drop?: string[];
    /** Pełny cel nawigacji - dla zakładek będących osobnymi trasami. */
    to?: string;
    description: string;
}

/** Skróty działające tylko w obrębie jednej sekcji aplikacji. */
export interface ScopedShortcutGroup {
    /** Prefiks ścieżki, w której te skróty działają. */
    path: string;
    /** Nazwa sekcji - nagłówek w ściądze. */
    label: string;
    shortcuts: ScopedShortcut[];
}

/** Parametry adresu, które znaczą coś tylko na zakładce Konkurencja Instagrama. */
const COMPETITION_ONLY_PARAMS = ['show', 'period', 'year'];

export const SCOPED_SHORTCUTS: ScopedShortcutGroup[] = [
    {
        path: '/finances',
        label: 'Finanse',
        shortcuts: [
            { key: '1', param: { name: 'tab', value: 'income' }, description: 'Dokumenty przychodowe' },
            { key: '2', param: { name: 'tab', value: 'expenses' }, description: 'Dokumenty kosztowe' },
            { key: '3', param: { name: 'tab', value: 'cash' }, description: 'Kasa' },
            { key: '4', param: { name: 'tab', value: 'payment-summary' }, description: 'Podsumowanie płatności' },
        ],
    },
    {
        path: '/statistics',
        label: 'Statystyki',
        shortcuts: [
            { key: '1', to: '/statistics', description: 'Przychody i sprzedaż' },
            { key: '2', to: '/statistics/costs', description: 'Koszty' },
            { key: '3', to: '/statistics/reports', description: 'Raporty' },
        ],
    },
    {
        path: '/instagram',
        label: 'Instagram',
        shortcuts: [
            // Kolejność i wartości jak zakładki w CompetitionMonitoringView. Dawne wartości
            // (tydzien, porownanie, tresci, reklamy) przechodziły przez przekierowanie starych
            // adresów i lądowały w innej kolejności niż pasek zakładek: „2" otwierało Konkurencję,
            // a „Moje konta" nie miały skrótu wcale.
            { key: '1', param: { name: 'view', value: 'overview' }, drop: COMPETITION_ONLY_PARAMS, description: 'Przegląd' },
            { key: '2', param: { name: 'view', value: 'mine' }, drop: COMPETITION_ONLY_PARAMS, description: 'Moje konta' },
            { key: '3', param: { name: 'view', value: 'competition' }, description: 'Konkurencja' },
            { key: '4', param: { name: 'view', value: 'inspiration' }, drop: COMPETITION_ONLY_PARAMS, description: 'Inspiracje' },
        ],
    },
];

/** Zdarzenie „otwórz okno nowej notatki" - nasłuchuje go QuickNoteProvider. */
export const QUICK_NOTE_EVENT = 'app:quick-note';

export interface ActionShortcut {
    key: string;
    /** Nazwa zdarzenia rozgłaszanego na window. */
    event: string;
    description: string;
    /** Uprawnienie, bez którego akcja nie ma sensu - ściąga go wtedy nie pokazuje. */
    requires?: PermissionCode;
}

export const ACTION_SHORTCUTS: ActionShortcut[] = [
    { key: 'z', event: QUICK_NOTE_EVENT, description: 'Nowe zadanie — z każdego widoku', requires: 'TASKS_MANAGE' },
];

/** Skróty aktywne dla danej ścieżki: sekcyjne tej sekcji (jeśli jakaś pasuje). */
export function scopedShortcutsFor(pathname: string): ScopedShortcut[] {
    const group = SCOPED_SHORTCUTS.find(
        (entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`),
    );
    return group ? group.shortcuts : [];
}

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

/** Czy klawisz padł tam, gdzie znak jest treścią albo należy do otwartego dialogu. */
export function isTypingContext(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return true;
    if (target.isContentEditable) return true;
    if (target.closest('[role="dialog"], [aria-modal="true"]')) return true;
    return false;
}
