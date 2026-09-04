// src/modules/calendar/utils/morePopoverPlacement.test.tsx

/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { attachMorePopoverPlacement, clampToViewport, VIEWPORT_MARGIN } from './morePopoverPlacement';

const VIEWPORT_WIDTH = 1440;
const VIEWPORT_HEIGHT = 900;

/** Wysokość okna z pełną listą kafelków: nagłówek + lista przycięta do 320 px. */
const FULL_HEIGHT = 372;
/** Wysokość okna, zanim React doleje kafelki - sam nagłówek i pusty środek. */
const HEADER_ONLY_HEIGHT = 48;
/** Komórka w ostatnim wierszu miesiąca: okno startuje nisko i nie ma gdzie zejść. */
const LAST_ROW_TOP = 760;

describe('clampToViewport', () => {
    const base = {
        desiredLeft: 300,
        width: 260,
        viewportWidth: VIEWPORT_WIDTH,
        viewportHeight: VIEWPORT_HEIGHT,
    };

    it('zostawia okno w spokoju, gdy mieści się na ekranie', () => {
        const { top, left } = clampToViewport({ ...base, desiredTop: 120, height: FULL_HEIGHT });

        expect(top).toBe(120);
        expect(left).toBe(300);
    });

    it('podnosi okno z ostatniego wiersza, żeby zmieścił się jego dół', () => {
        // To jest cały problem: FullCalendar pilnuje górnej krawędzi, dolnej nie.
        const { top } = clampToViewport({ ...base, desiredTop: LAST_ROW_TOP, height: FULL_HEIGHT });

        expect(top + FULL_HEIGHT).toBeLessThanOrEqual(VIEWPORT_HEIGHT - VIEWPORT_MARGIN);
        expect(top).toBe(VIEWPORT_HEIGHT - FULL_HEIGHT - VIEWPORT_MARGIN);
    });

    it('dosuwa okno przy prawej krawędzi ekranu', () => {
        const { left } = clampToViewport({ ...base, desiredLeft: 1380, desiredTop: 120, height: FULL_HEIGHT });

        expect(left + base.width).toBeLessThanOrEqual(VIEWPORT_WIDTH - VIEWPORT_MARGIN);
    });

    it('nigdy nie wypycha okna nad górną krawędź', () => {
        // Okno wyższe od ekranu: lepiej pokazać jego początek niż koniec.
        const { top } = clampToViewport({
            ...base,
            desiredTop: LAST_ROW_TOP,
            height: VIEWPORT_HEIGHT + 200,
        });

        expect(top).toBe(VIEWPORT_MARGIN);
    });
});

// ─────────────────────────────────────────────────────────────────────────────

type ResizeCallback = () => void;

/** jsdom nie ma ResizeObserver - podstawiamy taki, który da się wyzwolić z testu. */
class FakeResizeObserver {
    static instances: FakeResizeObserver[] = [];
    observed: Element[] = [];
    disconnected = false;
    private callback: ResizeCallback;

    constructor(callback: ResizeCallback) {
        this.callback = callback;
        FakeResizeObserver.instances.push(this);
    }

    observe(el: Element) { this.observed.push(el); }
    unobserve(el: Element) { this.observed = this.observed.filter(o => o !== el); }
    disconnect() { this.disconnected = true; this.observed = []; }

    /** Zmiana rozmiaru obserwowanego elementu. */
    fire() { if (!this.disconnected) this.callback(); }
}

interface FakePopover {
    el: HTMLElement;
    /** Podmienia zmierzoną wysokość - tak, jakby React dolał kafelki. */
    setHeight: (height: number) => void;
    top: () => number;
    bottom: () => number;
}

function mountPopover(desiredTop: number, initialHeight: number, desiredLeft = 300): FakePopover {
    const el = document.createElement('div');
    el.className = 'fc-popover fc-more-popover';
    el.style.position = 'absolute';
    document.body.appendChild(el);

    let height = initialHeight;
    const width = 260;

    Object.defineProperty(el, 'offsetHeight', { get: () => height, configurable: true });
    Object.defineProperty(el, 'offsetWidth', { get: () => width, configurable: true });
    // Pozycja wyliczona przez FullCalendar, zanim cokolwiek poprawimy.
    el.getBoundingClientRect = () => ({
        top: desiredTop,
        left: desiredLeft,
        right: desiredLeft + width,
        bottom: desiredTop + height,
        width,
        height,
        x: desiredLeft,
        y: desiredTop,
        toJSON: () => ({}),
    }) as DOMRect;

    return {
        el,
        setHeight: (next: number) => { height = next; },
        top: () => parseFloat(el.style.top),
        bottom: () => parseFloat(el.style.top) + height,
    };
}

describe('attachMorePopoverPlacement', () => {
    let dispose: (() => void) | null = null;

    beforeEach(() => {
        FakeResizeObserver.instances = [];
        vi.stubGlobal('ResizeObserver', FakeResizeObserver);
        window.innerWidth = VIEWPORT_WIDTH;
        window.innerHeight = VIEWPORT_HEIGHT;
    });

    afterEach(() => {
        dispose?.();
        dispose = null;
        document.body.innerHTML = '';
        vi.unstubAllGlobals();
    });

    it('wyrywa okno z overflow:hidden siatki, ustawiając je względem ekranu', () => {
        const popover = mountPopover(120, FULL_HEIGHT);

        dispose = attachMorePopoverPlacement(popover.el);

        expect(popover.el.style.position).toBe('fixed');
        expect(popover.top()).toBe(120);
    });

    it('podnosi okno z ostatniego wiersza, gdy treść jest już zmierzona', () => {
        const popover = mountPopover(LAST_ROW_TOP, FULL_HEIGHT);

        dispose = attachMorePopoverPlacement(popover.el);

        expect(popover.bottom()).toBeLessThanOrEqual(VIEWPORT_HEIGHT - VIEWPORT_MARGIN);
    });

    it('poprawia pozycję, gdy React doleje kafelki DOPIERO po pierwszym pomiarze', () => {
        // Regresja, o którą chodzi: @fullcalendar/react renderuje eventContent raz
        // synchronicznie, raz nie (próg 100 ms w jego componentDidMount). Gdy trafi
        // się to drugie, pierwszy pomiar widzi sam nagłówek.
        const popover = mountPopover(LAST_ROW_TOP, HEADER_ONLY_HEIGHT);

        dispose = attachMorePopoverPlacement(popover.el);

        // Pusty środek mieści się pod komórką, więc nic się nie dosuwa - i to jest
        // dokładnie ten stan, w którym stary jednorazowy pomiar zostawiał okno.
        expect(popover.top()).toBe(LAST_ROW_TOP);

        popover.setHeight(FULL_HEIGHT);
        // Bez przeliczenia okno wystawałoby poza ekran:
        expect(LAST_ROW_TOP + FULL_HEIGHT).toBeGreaterThan(VIEWPORT_HEIGHT);

        FakeResizeObserver.instances.forEach(observer => observer.fire());

        expect(popover.bottom()).toBeLessThanOrEqual(VIEWPORT_HEIGHT - VIEWPORT_MARGIN);
        expect(popover.top()).toBe(VIEWPORT_HEIGHT - FULL_HEIGHT - VIEWPORT_MARGIN);
    });

    it('nie pełznie po ekranie przy kolejnych pomiarach tej samej treści', () => {
        // Pozycja żądana czytana jest raz; gdyby każdy pomiar czytał aktualne
        // top/left, okno wędrowałoby w górę z każdym wywołaniem.
        const popover = mountPopover(LAST_ROW_TOP, FULL_HEIGHT);

        dispose = attachMorePopoverPlacement(popover.el);
        const afterFirst = popover.top();

        FakeResizeObserver.instances.forEach(o => o.fire());
        FakeResizeObserver.instances.forEach(o => o.fire());

        expect(popover.top()).toBe(afterFirst);
    });

    it('przelicza pozycję po zmianie rozmiaru okna przeglądarki', () => {
        const popover = mountPopover(120, FULL_HEIGHT);
        dispose = attachMorePopoverPlacement(popover.el);
        expect(popover.top()).toBe(120);

        window.innerHeight = 420;
        window.dispatchEvent(new Event('resize'));

        expect(popover.bottom()).toBeLessThanOrEqual(420 - VIEWPORT_MARGIN);
    });

    it('sprząta po sobie, gdy okno zostanie zamknięte', () => {
        const popover = mountPopover(LAST_ROW_TOP, HEADER_ONLY_HEIGHT);
        dispose = attachMorePopoverPlacement(popover.el);

        dispose();
        dispose = null;

        expect(FakeResizeObserver.instances.every(o => o.disconnected)).toBe(true);

        // Listener resize też ma zniknąć - inaczej zamknięte okno dalej by się
        // pozycjonowało.
        const before = popover.el.style.top;
        window.innerHeight = 300;
        window.dispatchEvent(new Event('resize'));
        expect(popover.el.style.top).toBe(before);
    });
});
