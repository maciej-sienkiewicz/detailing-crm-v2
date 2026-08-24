// src/common/hooks/useModalViewport.ts

import { useEffect, type RefObject } from 'react';

/**
 * Zachowanie okna modalnego, którego nie da się opisać samym CSS-em. Wyjęte
 * z ModalShell, żeby okna zbudowane na własnych nakładkach (wykaz usług,
 * rabaty) zachowywały się dokładnie tak samo — to one były źródłem zgłoszeń
 * „tło się przewija", „okno ucięte", „nie da się zamknąć".
 *
 * Robi trzy rzeczy:
 *
 *  1. Escape zamyka okno.
 *  2. Blokuje przewijanie tła. Musi objąć <html>, nie tylko <body>: to element
 *     dokumentu jest kontenerem przewijania, więc samo wyciszenie <body> nic
 *     nie dawało. `overscroll-behavior` odcina jeszcze łańcuch przewijania
 *     z wnętrza okna na dokument.
 *  3. Wciska okno w widoczny obszar, gdy wyjedzie klawiatura ekranowa.
 *     `position: fixed` rozlicza się względem layout viewportu, którego iOS
 *     nie skraca dla klawiatury (skraca visual viewport), więc wyśrodkowane
 *     pionowo okno chowa się za klawiaturą razem ze swoją stopką.
 *
 *     Nakładka NIE zmienia przy tym rozmiaru — skracanie jej do `vv.height`
 *     zostawiało pod spodem pas nierozmytej aplikacji. Zamiast tego trzyma
 *     cały layout viewport, a okno dociskamy paddingami:
 *       góra = vv.offsetTop  → pierwszy widoczny piksel
 *       dół  = to, co zjada klawiatura
 */
export const useModalViewport = (
    isOpen: boolean,
    overlayRef: RefObject<HTMLElement | null>,
    onClose?: () => void,
): void => {
    useEffect(() => {
        if (!isOpen || !onClose) return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const root = document.documentElement;
        const prev = {
            rootOverflow: root.style.overflow,
            rootOverscroll: root.style.overscrollBehavior,
            bodyOverflow: document.body.style.overflow,
        };
        root.style.overflow = 'hidden';
        root.style.overscrollBehavior = 'none';
        document.body.style.overflow = 'hidden';
        return () => {
            root.style.overflow = prev.rootOverflow;
            root.style.overscrollBehavior = prev.rootOverscroll;
            document.body.style.overflow = prev.bodyOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const vv = window.visualViewport;
        if (!vv) return;

        let frame = 0;

        const apply = () => {
            const el = overlayRef.current;
            if (!el) return;
            const hiddenBelow = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
            const keyboardOpen = window.innerHeight - vv.height > 80;
            if (keyboardOpen) {
                el.style.alignItems = 'flex-start';
                el.style.paddingTop = `${vv.offsetTop + 12}px`;
                el.style.paddingBottom = `${hiddenBelow + 12}px`;
                el.style.overflowY = 'auto';
            } else {
                el.style.alignItems = '';
                el.style.paddingTop = '';
                el.style.paddingBottom = '';
                el.style.overflowY = '';
            }
        };

        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(apply);
        };

        schedule();
        // Klawiatura wjeżdża ~250ms, a iOS raportuje po drodze pośrednie
        // wymiary — domierz po jej ustaniu.
        const settle = [setTimeout(schedule, 150), setTimeout(schedule, 400)];

        vv.addEventListener('resize', schedule);
        vv.addEventListener('scroll', schedule);
        return () => {
            cancelAnimationFrame(frame);
            settle.forEach(clearTimeout);
            vv.removeEventListener('resize', schedule);
            vv.removeEventListener('scroll', schedule);
        };
    }, [isOpen, overlayRef]);
};
