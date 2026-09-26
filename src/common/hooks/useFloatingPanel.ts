// src/common/hooks/useFloatingPanel.ts
//
// Panel przyczepiony do przycisku, który ZAWSZE mieści się w ekranie.
//
// Panel musi być w `position: fixed` i najlepiej w portalu do <body>: panele w
// `position: absolute` w kontenerze wyjeżdżały za prawą krawędź telefonu (filtr tagów
// w galerii, menu koloru w edytorze poczty) albo były ucinane przez nagłówek strony
// z `overflow: hidden` (własny zakres w analizie leadów, okres w zleceniach zbiorczych).
//
// Pozycja idzie za przyciskiem przy przewijaniu strony i zmianie rozmiaru ekranu, także
// gdy wysuwa się klawiatura. Przewijanie WEWNĄTRZ panelu go nie przelicza - to
// wyzerowałoby przewinięcie listy.

import { useLayoutEffect, type RefObject } from 'react';
import { applyFloatingPlacement, type PlaceOptions } from '@/common/utils/floatingPlacement';

export function useFloatingPanel(
    open: boolean,
    anchorRef: RefObject<HTMLElement | null>,
    panelRef: RefObject<HTMLElement | null>,
    options: PlaceOptions = {},
    /** Zmiana treści panelu, po której trzeba go zmierzyć od nowa (np. liczba pozycji). */
    contentKey?: unknown,
): void {
    const { align, offset, margin, bottomReserve } = options;
    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const panel = panelRef.current;
            const anchor = anchorRef.current;
            if (panel && anchor) {
                applyFloatingPlacement(panel, anchor.getBoundingClientRect(), { align, offset, margin, bottomReserve });
            }
        };
        const onScroll = (e: Event) => {
            if (panelRef.current?.contains(e.target as Node)) return;
            place();
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', onScroll, true);
        window.visualViewport?.addEventListener('resize', place);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', onScroll, true);
            window.visualViewport?.removeEventListener('resize', place);
        };
    }, [open, anchorRef, panelRef, align, offset, margin, bottomReserve, contentKey]);
}
