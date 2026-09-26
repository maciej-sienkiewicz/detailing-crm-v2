// src/common/utils/floatingPlacement.ts
//
// Jedno miejsce, które decyduje, gdzie stanie wyskakujący panel (menu, lista, wybór
// okresu) przyczepiony do przycisku.
//
// Dlaczego osobny moduł: panele liczyły pozycję same, każdy trochę inaczej, i każdy
// pilnował tylko jednej krawędzi. Wybór okresu w statystykach kleił się prawą krawędzią
// do prawej krawędzi przycisku (`right = innerWidth - rect.right`) - na telefonie, gdzie
// przycisk zawija się na lewą stronę nagłówka, 250-pikselowy panel wyjeżdżał za lewą
// krawędź ekranu, a na niskim ekranie także dołem. `ActionMenu` pilnował prawej krawędzi
// (`max(8, …)`), ale nie lewej.
//
// Zasada: panel ZAWSZE mieści się w ekranie. Najpierw próbuje stanąć pod przyciskiem,
// potem nad nim; gdy nie mieści się nigdzie, dostaje wysokość tej strony, po której jest
// więcej miejsca, i przewija treść. W poziomie trzyma się wybranej krawędzi przycisku,
// ale przesuwa się, zanim dotknie krawędzi ekranu, a szerszy od ekranu zwęża się.

export interface AnchorBox {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface FloatingPlacement {
    top: number;
    left: number;
    /** Szerokość, na jaką panel może sobie pozwolić (węższy ekran niż panel). */
    maxWidth: number;
    /** Wysokość, na jaką panel może sobie pozwolić; treść ponad nią przewija się. */
    maxHeight: number;
    /** Czy panel stanął nad przyciskiem. */
    above: boolean;
}

export interface PlaceOptions {
    /** Do której krawędzi przycisku panel się przykleja. */
    align?: 'left' | 'right';
    /** Odstęp od przycisku. */
    offset?: number;
    /** Najmniejszy odstęp od krawędzi ekranu. */
    margin?: number;
    /** Pas na dole ekranu, na którym panel nie może leżeć (dolna nawigacja na telefonie). */
    bottomReserve?: number;
}

export function placeFloating(
    anchor: AnchorBox,
    panel: { width: number; height: number },
    viewport: { width: number; height: number },
    { align = 'right', offset = 6, margin = 8, bottomReserve = margin }: PlaceOptions = {},
): FloatingPlacement {
    const maxWidth = Math.max(0, viewport.width - 2 * margin);
    const width = Math.min(panel.width, maxWidth);
    const preferredLeft = align === 'right' ? anchor.right - width : anchor.left;
    const left = Math.min(Math.max(preferredLeft, margin), viewport.width - margin - width);

    const spaceBelow = viewport.height - bottomReserve - (anchor.bottom + offset);
    const spaceAbove = anchor.top - offset - margin;

    if (panel.height <= spaceBelow) {
        return { top: anchor.bottom + offset, left, maxWidth, maxHeight: spaceBelow, above: false };
    }
    if (panel.height <= spaceAbove) {
        return { top: anchor.top - offset - panel.height, left, maxWidth, maxHeight: spaceAbove, above: true };
    }
    // Nie mieści się nigdzie: większa strona i przewijanie w środku panelu.
    if (spaceAbove > spaceBelow) {
        return { top: margin, left, maxWidth, maxHeight: Math.max(0, spaceAbove), above: true };
    }
    return { top: anchor.bottom + offset, left, maxWidth, maxHeight: Math.max(0, spaceBelow), above: false };
}

/** Wymiary widocznej części ekranu - z klawiaturą ekranową i paskami przeglądarki. */
export function visibleViewport(): { width: number; height: number } {
    return {
        width: window.visualViewport?.width ?? window.innerWidth,
        height: window.visualViewport?.height ?? window.innerHeight,
    };
}

/** Na telefonie dół ekranu zajmuje pasek nawigacji aplikacji - panel nie może pod nim lądować. */
export function mobileBottomReserve(viewportWidth: number): number {
    return viewportWidth < 768 ? 88 : 8;
}

/**
 * Ustawia panel wprost w stylu elementu (pomiar DOM-u, nie stan Reacta). Panel musi
 * być w `position: fixed`. Wymiary bierze z elementu po wyrenderowaniu, bez limitów
 * nadanych w poprzednim ustawieniu - inaczej raz zwężony panel nigdy by nie urósł.
 */
export function applyFloatingPlacement(
    panel: HTMLElement,
    anchor: AnchorBox,
    options: PlaceOptions = {},
): FloatingPlacement {
    panel.style.maxHeight = '';
    panel.style.maxWidth = '';
    const viewport = visibleViewport();
    const placement = placeFloating(
        anchor,
        { width: panel.offsetWidth, height: panel.offsetHeight },
        viewport,
        { bottomReserve: mobileBottomReserve(viewport.width), ...options },
    );
    panel.style.top = `${placement.top}px`;
    panel.style.left = `${placement.left}px`;
    panel.style.right = 'auto';
    panel.style.maxWidth = `${placement.maxWidth}px`;
    panel.style.maxHeight = `${placement.maxHeight}px`;
    panel.style.overflowY = 'auto';
    panel.style.visibility = 'visible';
    return placement;
}
