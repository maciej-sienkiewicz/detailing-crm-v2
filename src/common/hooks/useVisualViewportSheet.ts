// src/common/hooks/useVisualViewportSheet.ts

import { useLayoutEffect, useRef, type RefObject } from 'react';

type SheetRef = RefObject<HTMLElement | null>;

/**
 * Sposób, w jaki arkusz reaguje na klawiaturę:
 *
 * `'pad'` (domyślny) - arkusz NIE zmienia rozmiaru. Zostaje rozpięty na całym
 * ekranie, a wysokość klawiatury ląduje w zmiennej `--kb-inset`, którą lista
 * podpowiedzi dokłada sobie jako `padding-bottom`. Nic się nie przesuwa: to,
 * co znika pod klawiaturą, i tak nie było widoczne, a użytkownik może
 * doscrollować do ostatniej pozycji. Tak działają arkusze, które mają tylko
 * nagłówek, pole wyszukiwania i listę.
 *
 * `'resize'` - dolna krawędź arkusza dojeżdża nad klawiaturę. Potrzebne tylko
 * tam, gdzie na dole arkusza siedzi pasek akcji („Zatwierdź"), który musi
 * zostać w zasięgu kciuka.
 */
type KeyboardBehaviour = 'pad' | 'resize';

interface VisualViewportSheetOptions {
    keyboard?: KeyboardBehaviour;
}

/**
 * Pins a mobile sheet to the *visible* region of the screen.
 *
 * Why this is not just `top: 0; bottom: 0`:
 * `position: fixed` resolves against the **layout** viewport. iOS Safari never
 * resizes the layout viewport when the keyboard opens; it shrinks the
 * **visual** viewport and scrolls it down inside the layout viewport. So a
 * sheet pinned to `top: 0` can end up parked `vv.offsetTop` pixels *above* the
 * first visible pixel - its header and search field disappear off the top edge.
 * Korekta górnej krawędzi jest więc konieczna zawsze; przykładamy ją bez
 * animacji, bo w typowym przypadku `offsetTop` wynosi 0 i nic się nie rusza.
 *
 * Dolna krawędź to inna historia. W PWA (i na Androidzie, gdzie
 * `interactive-widget=resizes-content` kurczy layout viewport) CSS-owe
 * `bottom: 0` samo trafia nad klawiaturę i nie ma czego poprawiać - dlatego
 * tam wszystko wyglądało dobrze. W Safari w przeglądarce layout viewport
 * zostaje pełnoekranowy, więc każda korekta dolnej krawędzi to ruch, który
 * użytkownik widzi jako wysuwanie się arkusza pół sekundy po otwarciu.
 * Domyślny tryb `'pad'` po prostu nie rusza dolnej krawędzi.
 *
 * Browsers without the API keep the CSS fallback (`top: 0; bottom: 0`).
 */
export const useVisualViewportSheet = (
    active: boolean,
    refs: SheetRef | SheetRef[],
    options?: VisualViewportSheetOptions,
): void => {
    // Refy są stabilne, ale tablica dostaje nową tożsamość przy każdym
    // renderze - trzymamy ją poza zależnościami efektu, żeby nasłuch podpiąć
    // raz. Aktualizacja idzie przez efekt (zapis w trakcie renderu jest
    // niedozwolony), zadeklarowany przed właściwym: efekty biegną w kolejności
    // deklaracji, więc lista jest świeża, zanim ktokolwiek ją przeczyta.
    const refsRef = useRef<SheetRef[]>(Array.isArray(refs) ? refs : [refs]);
    useLayoutEffect(() => {
        refsRef.current = Array.isArray(refs) ? refs : [refs];
    });

    const keyboard: KeyboardBehaviour = options?.keyboard ?? 'pad';

    useLayoutEffect(() => {
        if (!active) return;

        const vv = window.visualViewport;
        if (!vv) return;

        let frame = 0;
        const touched: HTMLElement[] = [];

        const apply = () => {
            const keyboardInset = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
            for (const ref of refsRef.current) {
                const el = ref.current;
                if (!el) continue;
                if (!touched.includes(el)) touched.push(el);

                el.style.top = `${vv.offsetTop}px`;

                if (keyboard === 'resize') {
                    el.style.bottom = `${keyboardInset}px`;
                    el.style.height = '';
                    el.style.maxHeight = 'none';
                } else {
                    // Wysokość klawiatury nie rusza arkusza - schodzi do listy
                    // jako zapas do przewinięcia pod ostatnią pozycją.
                    el.style.setProperty('--kb-inset', `${keyboardInset}px`);
                }
            }
        };

        const onViewportChange = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(apply);
        };

        apply();

        vv.addEventListener('resize', onViewportChange);
        vv.addEventListener('scroll', onViewportChange);

        return () => {
            cancelAnimationFrame(frame);
            vv.removeEventListener('resize', onViewportChange);
            vv.removeEventListener('scroll', onViewportChange);
            // Arkusz bywa tym samym węzłem przy kolejnym otwarciu (portal
            // trzyma element), więc sprzątamy po sobie inline'owe style.
            for (const el of touched) {
                el.style.top = '';
                el.style.bottom = '';
                el.style.height = '';
                el.style.maxHeight = '';
                el.style.removeProperty('--kb-inset');
            }
        };
    }, [active, keyboard]);
};
