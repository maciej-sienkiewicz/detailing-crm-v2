import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Szerokość konkretnego elementu, a nie okna.
 *
 * Do czego to jest: układ, który zależy od tego, ile miejsca MA KOMPONENT,
 * nie od tego, ile ma ekran. Zapytanie `@media` widzi wyłącznie okno, więc
 * komponent stojący obok paska bocznego albo w kolumnie siatki dostaje
 * odpowiedź na inne pytanie niż zadał — przy oknie 1100 px i rozwiniętym
 * pasku bocznym lista ma realnie ~790 px, a `@media (max-width: 900px)`
 * dalej twierdzi, że jest szeroko.
 *
 * W CSS odpowiedzią są zapytania kontenerowe (`container-type: inline-size`).
 * Ten hook jest ich odpowiednikiem dla LOGIKI — dla decyzji, których nie da
 * się wyrazić stylem (np. czy wiersz ma być jednym celem dotyku, czy zbiorem
 * osobnych odnośników). Próg trzymamy wtedy w jednym miejscu i podajemy obu
 * stronom, żeby CSS i JavaScript nie przełączały się w różnych momentach.
 *
 * Zwraca `null`, dopóki nic nie zmierzono — wywołujący ma wtedy powiedzieć
 * wprost, co robi przed pierwszym pomiarem, zamiast dostać mylące zero.
 */
export const useContainerWidth = <T extends HTMLElement>(): [RefObject<T | null>, number | null] => {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState<number | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        // Pierwszy pomiar synchronicznie: obserwator i tak zgłosi rozmiar od razu,
        // ale dopiero po najbliższej klatce, a to widać jako przeskok układu.
        setWidth(element.getBoundingClientRect().width);

        // jsdom w testach nie zna ResizeObservera — zostaje pomiar początkowy.
        if (typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(entries => {
            const measured = entries[0]?.contentRect.width;
            if (measured !== undefined) setWidth(measured);
        });
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    return [ref, width];
};
