// src/common/shortcuts/GlobalShortcuts.tsx
// Globalny nasłuch skrótów klawiszowych.
//
// Kolejność rozstrzygania: najpierw skróty SEKCYJNE (cyfry przełączające
// zakładki w bieżącej sekcji), potem AKCJE (Z - notatka), na końcu skróty
// GLOBALNE (litery nawigujące). Sekcyjne idą pierwsze, żeby sekcja mogła
// nadpisać klawisz, gdyby kiedyś doszło do kolizji.
//
// Zasady bezpieczeństwa pojedynczego klawisza:
//  • nie działają, gdy fokus stoi w polu tekstowym (input / textarea / select /
//    contentEditable) - znak jest tam treścią, nie poleceniem;
//  • nie działają z modyfikatorami (Ctrl / Cmd / Alt) - to skróty przeglądarki;
//  • nie działają, gdy fokus stoi w oknie dialogowym - pojedyncze klawisze bywają
//    tam zajęte przez formularz, a nawigacja spod otwartego okna zaskakuje;
//  • dają się wyłączyć w Ustawieniach → Skróty klawiszowe.
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ACTION_SHORTCUTS,
    GLOBAL_SHORTCUTS,
    isTypingContext,
    scopedShortcutsFor,
    useShortcutsEnabled,
} from './shortcuts';

/** Montowany raz w Layoucie; niczego nie renderuje - tylko słucha klawiatury. */
export function GlobalShortcuts() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [enabled] = useShortcutsEnabled();

    useEffect(() => {
        if (!enabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.repeat) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (isTypingContext(event.target)) return;

            const key = event.key.toLowerCase();

            // 1. Zakładki bieżącej sekcji (cyfry) - tylko tam, gdzie mają sens.
            const scoped = scopedShortcutsFor(pathname).find((entry) => entry.key === key);
            if (scoped) {
                event.preventDefault();
                navigate(scoped.to, { replace: true });
                return;
            }

            // 2. Akcje - otwierają coś na miejscu, bez zmiany widoku.
            const action = ACTION_SHORTCUTS.find((entry) => entry.key === key);
            if (action) {
                event.preventDefault();
                window.dispatchEvent(new Event(action.event));
                return;
            }

            // 3. Nawigacja globalna (litery).
            const shortcut = GLOBAL_SHORTCUTS.find((entry) => entry.key === key);
            if (!shortcut) return;
            event.preventDefault();
            navigate(shortcut.to, shortcut.state ? { state: shortcut.state } : undefined);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [enabled, navigate, pathname]);

    return null;
}
