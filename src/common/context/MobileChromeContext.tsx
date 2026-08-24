// src/common/context/MobileChromeContext.tsx
//
// Zgłaszanie „trybu skupienia" na telefonie: dolne paski nawigacji (globalny
// oraz zakładki sekcji wizyty) mają zniknąć, kiedy ekran przejmuje edycja
// z własnym paskiem akcji. Bez tego użytkownik ma trzy rzędy przycisków jeden
// nad drugim i musi scrollować, żeby zatwierdzić zmiany.
//
// Rejestrujemy identyfikatory, a nie „true/false", bo o ukrycie może poprosić
// kilka miejsc naraz i wyjście z jednego z nich nie może odsłonić pasków,
// dopóki drugie wciąż jest aktywne.
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

interface ContextValue {
    hidden: boolean;
    setRequest: (id: string, active: boolean) => void;
}

const MobileChromeContext = createContext<ContextValue | null>(null);

export const MobileChromeProvider = ({ children }: { children: ReactNode }) => {
    const requests = useRef(new Set<string>());
    const [hidden, setHidden] = useState(false);

    const setRequest = useCallback((id: string, active: boolean) => {
        if (active) requests.current.add(id);
        else requests.current.delete(id);
        setHidden(requests.current.size > 0);
    }, []);

    const value = useMemo(() => ({ hidden, setRequest }), [hidden, setRequest]);
    return <MobileChromeContext.Provider value={value}>{children}</MobileChromeContext.Provider>;
};

/** Czy któreś miejsce prosi teraz o schowanie dolnych pasków. */
export const useMobileChromeHidden = (): boolean => useContext(MobileChromeContext)?.hidden ?? false;

/**
 * Prosi o schowanie dolnych pasków, dopóki `active` jest prawdą. Sprzątanie
 * przy odmontowaniu jest tu kluczowe: wyjście z widoku w trakcie edycji nie
 * może zostawić aplikacji bez nawigacji. Poza providerem (widoki publiczne,
 * testy) hook nie robi nic.
 */
export const useHideMobileChrome = (id: string, active: boolean): void => {
    const setRequest = useContext(MobileChromeContext)?.setRequest;
    useEffect(() => {
        if (!setRequest) return;
        setRequest(id, active);
        return () => setRequest(id, false);
    }, [setRequest, id, active]);
};
