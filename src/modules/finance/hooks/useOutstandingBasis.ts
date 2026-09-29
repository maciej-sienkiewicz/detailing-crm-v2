// src/modules/finance/hooks/useOutstandingBasis.ts
//
// Netto czy brutto w kaflu „Należności" - wybór użytkownika, zapamiętany w tej
// przeglądarce. Domyślnie netto, jak przychody, koszty i zysk obok. localStorage
// bywa niedostępny (tryb prywatny) - wtedy wybór działa do odświeżenia strony.

import { useState } from 'react';
import type { AmountBasis } from '../utils/outstandingTile';

const KEY = 'finance.outstanding.basis';

export function useOutstandingBasis(): [AmountBasis, (basis: AmountBasis) => void] {
    const [basis, setBasis] = useState<AmountBasis>(() => {
        try { return window.localStorage.getItem(KEY) === 'gross' ? 'gross' : 'net'; } catch { return 'net'; }
    });
    function update(next: AmountBasis) {
        setBasis(next);
        try { window.localStorage.setItem(KEY, next); } catch { /* bez pamięci - wybór do odświeżenia */ }
    }
    return [basis, update];
}
