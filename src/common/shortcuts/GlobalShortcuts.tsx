// src/common/shortcuts/GlobalShortcuts.tsx
// Globalny nasłuch skrótów klawiszowych - jedna litera przenosi do widoku.
//
// Zasady bezpieczeństwa pojedynczej litery:
//  • nie działają, gdy fokus stoi w polu tekstowym (input / textarea / select /
//    contentEditable) - litera jest tam treścią, nie poleceniem;
//  • nie działają z modyfikatorami (Ctrl / Cmd / Alt) - to skróty przeglądarki;
//  • nie działają, gdy fokus stoi w oknie dialogowym - pojedyncze klawisze bywają
//    tam zajęte przez formularz, a nawigacja spod otwartego okna zaskakuje;
//  • dają się wyłączyć w Ustawieniach → Skróty klawiszowe. Ustawienie mieszka
//    w localStorage: skrót to nawyk dłoni przy TEJ klawiaturze, nie polityka studia.
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GLOBAL_SHORTCUTS, isTypingContext, useShortcutsEnabled } from './shortcuts';

/** Montowany raz w Layoucie; niczego nie renderuje - tylko słucha klawiatury. */
export function GlobalShortcuts() {
    const navigate = useNavigate();
    const [enabled] = useShortcutsEnabled();

    useEffect(() => {
        if (!enabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.repeat) return;
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            if (isTypingContext(event.target)) return;
            const shortcut = GLOBAL_SHORTCUTS.find((entry) => entry.key === event.key.toLowerCase());
            if (!shortcut) return;
            event.preventDefault();
            navigate(shortcut.to, shortcut.state ? { state: shortcut.state } : undefined);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [enabled, navigate]);

    return null;
}
