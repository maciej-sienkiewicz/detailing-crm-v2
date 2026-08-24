// src/common/hooks/useMediaQuery.ts

import { useEffect, useState } from 'react';

/**
 * Odpowiedź na dowolne zapytanie medialne, żywa przy zmianie rozmiaru okna.
 *
 * Potrzebna tam, gdzie o układzie decyduje nie tylko CSS, ale i zachowanie:
 * np. na telefonie ta sama kafelka nie ma prowadzić do profilu klienta, bo
 * użytkownik dotyka jej, chcąc otworzyć wizytę.
 */
export const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(() =>
        typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches
    );

    useEffect(() => {
        if (!window.matchMedia) return;
        const mql = window.matchMedia(query);
        const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
        // Stan startowy bierzemy z inicjalizatora useState, więc tu tylko
        // nasłuchujemy — bez ustawiania stanu w ciele efektu.
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
    }, [query]);

    return matches;
};
