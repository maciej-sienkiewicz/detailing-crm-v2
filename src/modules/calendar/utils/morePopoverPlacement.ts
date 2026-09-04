// src/modules/calendar/utils/morePopoverPlacement.ts

/**
 * Ustawianie okna „jeszcze N" z kalendarza w granicach ekranu.
 *
 * FullCalendar pozycjonuje to okno raz, w `Popover.componentDidMount`, i pilnuje
 * wyłącznie górnej krawędzi (`popoverTop = Math.max(popoverTop, PADDING)`) oraz
 * prawej. Dolnej nie sprawdza w ogóle - w ostatnim wierszu miesiąca okno startuje
 * przy górze komórki i schodzi poniżej ekranu. Ucięcie widać tylko tam, bo tylko
 * tam dół ma znaczenie.
 *
 * Poprawianie tego jednym pomiarem jest loterią. Treść okna (kafelki wizyt) rysuje
 * React przez `@fullcalendar/react`, a ten wybiera między `flushSync` a zwykłym
 * `setState` na podstawie tego, czy od poprzedniego renderu minęło 100 ms
 * (`requestTimestamp - lastRequestTimestamp < 100` w jego `componentDidMount`).
 * Kliknięcie „na spokojnie" → treść jest w DOM synchronicznie i pomiar widzi pełną
 * wysokość. Kliknięcie tuż po innym renderze kalendarza → w chwili pomiaru okno ma
 * sam nagłówek, więc żaden warunek na dolną krawędź się nie zapala, a kafelki
 * dolewają się chwilę później, już poza ekranem. Stąd „raz jest ucięte, raz nie"
 * bez możliwości powtórzenia na życzenie.
 *
 * Dlatego pomiar nie jest jednorazowy: [attachMorePopoverPlacement] trzyma
 * ResizeObserver i przelicza pozycję przy każdej zmianie rozmiaru - tak samo, jak
 * robi to EventSummaryPopover dla własnej treści doładowywanej asynchronicznie.
 * O to, żeby okno nigdy nie było wyższe od ekranu, dba `max-height` listy w CSS.
 */

/** Odstęp od krawędzi ekranu. */
export const VIEWPORT_MARGIN = 8;

export interface PlacementInput {
    /** Pozycja, którą wyliczył FullCalendar - we współrzędnych ekranu. */
    desiredTop: number;
    desiredLeft: number;
    /** Zmierzony rozmiar okna. */
    width: number;
    height: number;
    viewportWidth: number;
    viewportHeight: number;
    margin?: number;
}

export interface Placement {
    top: number;
    left: number;
}

/**
 * Dosuwa okno do ekranu na podstawie ZMIERZONEGO rozmiaru.
 *
 * Górna krawędź wygrywa z dolną: gdyby okno mimo wszystko było wyższe od ekranu,
 * lepiej pokazać jego początek niż koniec.
 */
export function clampToViewport({
    desiredTop,
    desiredLeft,
    width,
    height,
    viewportWidth,
    viewportHeight,
    margin = VIEWPORT_MARGIN,
}: PlacementInput): Placement {
    let top = desiredTop;
    if (top + height + margin > viewportHeight) {
        top = viewportHeight - height - margin;
    }
    if (top < margin) top = margin;

    let left = desiredLeft;
    if (left + width + margin > viewportWidth) {
        left = viewportWidth - width - margin;
    }
    if (left < margin) left = margin;

    return { top, left };
}

/**
 * Wiąże okno z ekranem na cały czas jego życia. Zwraca funkcję sprzątającą.
 */
export function attachMorePopoverPlacement(
    popover: HTMLElement,
    margin: number = VIEWPORT_MARGIN,
): () => void {
    // Pozycja żądana czytana JEDEN raz i we współrzędnych ekranu: po pierwszym
    // przeliczeniu przestawiamy okno na position:fixed i nadpisujemy top/left, więc
    // ponowny odczyt zwracałby już wynik poprzedniego dosunięcia i okno pełzłoby po
    // ekranie z każdym kolejnym pomiarem.
    const anchor = popover.getBoundingClientRect();
    const desiredTop = anchor.top;
    const desiredLeft = anchor.left;

    const place = () => {
        const { top, left } = clampToViewport({
            desiredTop,
            desiredLeft,
            width: popover.offsetWidth,
            height: popover.offsetHeight,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            margin,
        });

        // position:fixed, bo CalendarWrapper ma overflow:hidden i przycina okno
        // pozycjonowane absolutnie względem siatki.
        popover.style.position = 'fixed';
        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
        popover.style.zIndex = '9999';
    };

    place();

    // Kafelki wizyt dolewa React już po wstawieniu okna do DOM (patrz nagłówek
    // pliku), więc pierwszy pomiar bywa pomiarem samego nagłówka. Każda zmiana
    // rozmiaru przelicza pozycję od nowa.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    observer?.observe(popover);
    window.addEventListener('resize', place);

    return () => {
        observer?.disconnect();
        window.removeEventListener('resize', place);
    };
}
