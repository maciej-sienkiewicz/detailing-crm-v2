// Stan zgody na regulamin przed płatnością - patrz components/CheckoutConsent.tsx.
import { useState } from 'react';

export interface CheckoutConsentState {
    accepted: boolean;
    /** Kliknięto „zapłać" bez zgody - blok podświetla się i mówi, czego brakuje. */
    missing: boolean;
    setAccepted: (value: boolean) => void;
    /** Zwraca true, gdy można iść do płatności; w przeciwnym razie zaznacza brak zgody. */
    require: () => boolean;
}

export function useCheckoutConsent(): CheckoutConsentState {
    const [accepted, setAcceptedState] = useState(false);
    const [missing, setMissing] = useState(false);
    return {
        accepted,
        missing,
        setAccepted: (value) => {
            setAcceptedState(value);
            if (value) setMissing(false);
        },
        require: () => {
            if (!accepted) setMissing(true);
            return accepted;
        },
    };
}
