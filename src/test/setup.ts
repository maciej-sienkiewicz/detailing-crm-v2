import '@testing-library/jest-dom';

/*
 * jsdom nie ma ResizeObserver-a, a komponenty, które mierzą siebie po wyrenderowaniu
 * (np. pisak do zaznaczania uszkodzeń na zdjęciu), wywołują go w efekcie. Bez atrapy
 * test przechodzi, ale suite kończy się „Errors 1" z wnętrza React-a — czyli szumem,
 * który przy następnej prawdziwej awarii nikogo już nie zaalarmuje.
 *
 * Atrapa jest bezczynna świadomie: testy nie sprawdzają układu w pikselach, a
 * zgłoszenie fałszywego rozmiaru byłoby gorsze od niezgłoszenia żadnego.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
}
