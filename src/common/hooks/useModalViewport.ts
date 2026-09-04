// src/common/hooks/useModalViewport.ts

import { useEffect, useId, type RefObject } from 'react';
import { useHideMobileChrome } from '@/common/context/MobileChromeContext';

/**
 * Zachowanie okna modalnego, którego nie da się opisać samym CSS-em. Wyjęte
 * z ModalShell, żeby okna zbudowane na własnych nakładkach (wykaz usług,
 * rabaty) zachowywały się dokładnie tak samo - to one były źródłem zgłoszeń
 * „tło się przewija", „okno ucięte", „nie da się zamknąć".
 *
 * Robi trzy rzeczy:
 *
 *  1. Escape zamyka okno.
 *  2. Blokuje przewijanie tła. Musi objąć <html>, nie tylko <body>: to element
 *     dokumentu jest kontenerem przewijania, więc samo wyciszenie <body> nic
 *     nie dawało. `overscroll-behavior` odcina jeszcze łańcuch przewijania
 *     z wnętrza okna na dokument.
 *  3. Chowa na telefonie oba dolne paski nawigacji. Leżą przy tej samej
 *     krawędzi co stopka okna i potrafiły ją zasłonić - a nawigacja pod
 *     otwartym oknem i tak jest nieklikalna.
 *  4. Wciska okno w widoczny obszar, gdy wyjedzie klawiatura ekranowa, i pilnuje,
 *     żeby aktualnie edytowane pole zostało widoczne - po zmianie geometrii
 *     ekranu pole potrafiło wylądować pod klawiaturą i trzeba było doscrollować
 *     do miejsca, w którym się właśnie pisze.
 *     `position: fixed` rozlicza się względem layout viewportu, którego iOS
 *     nie skraca dla klawiatury (skraca visual viewport), więc wyśrodkowane
 *     pionowo okno chowa się za klawiaturą razem ze swoją stopką.
 *
 *     Nakładka NIE zmienia przy tym rozmiaru - skracanie jej do `vv.height`
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

    useHideMobileChrome(useId(), isOpen);

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

        /**
         * Pole, w którym użytkownik właśnie pisze, musi zostać widoczne.
         *
         * „Widoczne" to nie to samo co „w obrębie ekranu": okno ma własny obszar
         * przewijania między nagłówkiem a stopką i pole potrafi wylądować pod
         * przyciskami, formalnie mieszcząc się w pasmie widocznym mimo klawiatury.
         * Liczymy więc część wspólną obszaru przewijania okna z tym pasmem, a
         * przewijamy dopiero, gdy pole naprawdę z niej wypadło - inaczej
         * wyrywalibyśmy widok komuś, kto przewija okno w trakcie pisania.
         */
        const revealFocusedField = () => {
            const overlay = overlayRef.current;
            const focused = document.activeElement as HTMLElement | null;
            if (!overlay || !focused || !overlay.contains(focused)) return;

            let top = vv.offsetTop;
            let bottom = vv.offsetTop + vv.height;
            for (let el = focused.parentElement; el && el !== overlay; el = el.parentElement) {
                const style = window.getComputedStyle(el);
                if (!/(auto|scroll)/.test(style.overflowY)) continue;
                if (el.scrollHeight - el.clientHeight <= 1) continue;
                const box = el.getBoundingClientRect();
                top = Math.max(top, box.top);
                bottom = Math.min(bottom, box.bottom);
                break;
            }

            const rect = focused.getBoundingClientRect();
            const MARGIN = 8;
            if (rect.top >= top + MARGIN && rect.bottom <= bottom - MARGIN) return;
            focused.scrollIntoView({ block: 'center', inline: 'nearest' });
        };

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
                revealFocusedField();
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
        // wymiary - domierz po jej ustaniu.
        const settle = [setTimeout(schedule, 150), setTimeout(schedule, 400)];

        // Przejście między polami nie zmienia geometrii ekranu (klawiatura już
        // stoi), więc samo `resize` by tego nie złapało.
        let focusTimers: ReturnType<typeof setTimeout>[] = [];
        const onFocusIn = () => {
            focusTimers.forEach(clearTimeout);
            focusTimers = [setTimeout(revealFocusedField, 60), setTimeout(revealFocusedField, 300)];
        };

        vv.addEventListener('resize', schedule);
        vv.addEventListener('scroll', schedule);
        document.addEventListener('focusin', onFocusIn);
        return () => {
            cancelAnimationFrame(frame);
            settle.forEach(clearTimeout);
            focusTimers.forEach(clearTimeout);
            vv.removeEventListener('resize', schedule);
            vv.removeEventListener('scroll', schedule);
            document.removeEventListener('focusin', onFocusIn);
        };
    }, [isOpen, overlayRef]);
};
