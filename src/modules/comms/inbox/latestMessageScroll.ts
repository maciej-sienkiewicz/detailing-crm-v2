// src/modules/comms/inbox/latestMessageScroll.ts
// Otwarcie rozmowy na ostatniej wiadomości - osobno od komponentów, żeby dało się testować.

/** Odstęp nad ostatnią wiadomością, gdy staje u góry widoku - widać, że coś jest nad nią. */
const LATEST_TOP_GAP = 16;
/** Jak długo przewinięcie podąża za dorysowującymi się mailami. */
const FOLLOW_LAYOUT_MS = 4000;

/**
 * Gdzie przewinąć, żeby ostatnia wiadomość była widoczna w całości od początku: jej górna
 * krawędź u góry widoku. Krótka wiadomość nie dojedzie tak wysoko - przeglądarka zatrzyma
 * przewijanie na dole i zostanie widoczna w całości razem z poprzednimi.
 */
export function latestMessageScrollTop(containerTop: number, scrollTop: number, messageTop: number): number {
    return Math.max(0, scrollTop + (messageTop - containerTop) - LATEST_TOP_GAP);
}

/**
 * Ustawia ostatnią wiadomość i pilnuje jej, dopóki maile się dorysowują.
 *
 * Treść maila stoi w ramce, która dostaje wysokość dopiero po wczytaniu, więc jedno
 * przewinięcie przy otwarciu trafiało w „dół" sprzed dorysowania - i rozmowa otwierała
 * się w połowie wątku, z ostatnią wiadomością uciętą u dołu. Przewinięcie powtarza się
 * przy każdej zmianie wysokości przez kilka sekund, chyba że użytkownik sam przewinie.
 *
 * @return sprzątanie - do zwrócenia z efektu.
 */
export function followLatestMessage(element: HTMLDivElement, lastId: string): () => void {
    let userScrolled = false;
    const place = () => {
        if (userScrolled) return;
        const last = Array.from(element.querySelectorAll<HTMLElement>('[data-message-id]'))
            .find((node) => node.dataset.messageId === lastId);
        if (!last) {
            element.scrollTop = element.scrollHeight;
            return;
        }
        element.scrollTop = latestMessageScrollTop(
            element.getBoundingClientRect().top,
            element.scrollTop,
            last.getBoundingClientRect().top
        );
    };
    place();

    const stop = () => { userScrolled = true; };
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    events.forEach((name) => element.addEventListener(name, stop, { passive: true }));

    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place);
    // Wiadomości (ramki maili rosną po wczytaniu) i sam widok (rozkładająca się odpowiedź pod nim).
    if (observer) [element, ...Array.from(element.children)].forEach((node) => observer.observe(node));
    const timeout = window.setTimeout(() => observer?.disconnect(), FOLLOW_LAYOUT_MS);

    return () => {
        events.forEach((name) => element.removeEventListener(name, stop));
        observer?.disconnect();
        window.clearTimeout(timeout);
    };
}
