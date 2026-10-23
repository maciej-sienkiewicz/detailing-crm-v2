import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { UpsellModal } from '../components/UpsellModal';
import { useCapability } from './useCapability';
import type { CapabilityKey } from '../types';

/**
 * Przycisk funkcji z płatnego modułu: z modułem robi swoje, bez niego otwiera ofertę modułu.
 *
 * Dawniej przyciski AI (szkic odpowiedzi, korekta) wołały serwer zawsze - a ten nie sprawdzał
 * modułu, więc studio BASIC korzystało z AI za darmo. Teraz serwer odmawia (402); bez tej
 * bramki kliknięcie kończyłoby się oknem zakupu i do tego dymkiem z błędem.
 */
export function useCapabilityGate(capability: CapabilityKey) {
    const { enabled } = useCapability(capability);
    const [upsellOpen, setUpsellOpen] = useState(false);

    const run = useCallback((action: () => void) => {
        if (enabled) action();
        else setUpsellOpen(true);
    }, [enabled]);

    // Portal: przycisk bywa w oknie z transformacją (ModalShell, panel), a `position: fixed`
    // wewnątrz niej przykleiłby ofertę do okna zamiast do ekranu.
    const upsell = upsellOpen
        ? createPortal(<UpsellModal capability={capability} onClose={() => setUpsellOpen(false)} />, document.body)
        : null;

    return { enabled, run, upsell };
}
