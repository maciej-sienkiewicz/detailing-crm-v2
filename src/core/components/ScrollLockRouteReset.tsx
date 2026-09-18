// src/core/components/ScrollLockRouteReset.tsx
//
// Siatka bezpieczeństwa dla blokady scrolla: po każdej zmianie ścieżki
// zwalnia wszystkie blokady z src/common/utils/scrollLock.ts.
//
// Zliczanie referencji usuwa wyścig „kto przywraca style", ale nie chroni
// przed właścicielem, który w ogóle nie posprząta (błąd w renderze złapany
// przez boundary zanim efekt zdąży się zarejestrować, przyszły kod z
// pominiętym cleanupem). Skutkiem takiej wpadki była strona zamrożona do
// odświeżenia — ograniczamy więc promień rażenia do jednego ekranu: każdy
// właściciel blokady (okno modalne, menu mobilne) jest przypięty do widoku,
// zatem po nawigacji żadna blokada nie ma prawa trwać. Reagujemy tylko na
// pathname, nie na search/hash: okna sterowane parametrami zapytania nie
// mogą tracić blokady przy zmianie filtra.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { releaseAllScrollLocks } from '@/common/utils/scrollLock';

export const ScrollLockRouteReset = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        releaseAllScrollLocks();
    }, [pathname]);
    return null;
};
