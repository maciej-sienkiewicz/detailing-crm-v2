// src/modules/comms/inbox/board/useFlip.ts
// Karty, które zmieniają miejsce, PRZESUWAJĄ się tam, zamiast przeskakiwać (FLIP:
// First, Last, Invert, Play).
//
// Po każdym renderze mierzymy każdy element `[data-flip]` i porównujemy z położeniem
// sprzed renderu. Różnicę odwracamy transformacją i puszczamy ją do zera - przeglądarka
// rysuje płynny ruch, a układ (flex, przewijanie) zostaje w rękach CSS-a.
//
// Dlaczego tak, a nie biblioteka: ruch obejmuje trzy różne przyczyny naraz - miejsce
// robione przeciąganej karcie, upuszczenie i sprawę przestawioną przez serwer (klient
// odpisał, karta sama przechodzi z „Odpowiedzieliśmy" do „Oczekuje"). Jedna reguła
// „cokolwiek się ruszyło, ma się przesunąć" obsługuje wszystkie trzy bez wiedzy o nich.
//
// Miejsce na przeciąganą kartę (`data-flip-static`) nosi jej identyfikator, ale samo się
// nie przesuwa: to puste miejsce, nie przedmiot, a w ręce jest już karta. Dzięki temu
// karta po upuszczeniu „dziedziczy" jego położenie i nie drgnie, a karta oddana na
// stare miejsce (rezygnacja z zamknięcia sprawy) płynie tam z miejsca, które zajmowała.
//
// Położenia pamiętamy we współrzędnych ekranu, więc przewinięcie kolumny też je
// zmienia - stąd odświeżanie zapamiętanych położeń przy każdym przewinięciu. Bez tego
// pierwszy render po przewinięciu „przesuwałby" każdą kartę o przewiniętą odległość.
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { DURATION, EASE_SPRING, prefersReducedMotion } from './motion';

const measure = (root: HTMLElement): Map<string, DOMRect> => {
    const rects = new Map<string, DOMRect>();
    root.querySelectorAll<HTMLElement>('[data-flip]').forEach((el) => rects.set(el.dataset.flip!, el.getBoundingClientRect()));
    return rects;
};

export function useFlip(rootRef: RefObject<HTMLElement | null>): void {
    const rects = useRef<Map<string, DOMRect> | null>(null);

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const previous = rects.current;
        const reduce = prefersReducedMotion();
        const elements = root.querySelectorAll<HTMLElement>('[data-flip]');

        // Trwający ruch przerywamy przed pomiarem - inaczej nowe położenie liczyłoby się
        // razem z transformacją w połowie drogi.
        elements.forEach((el) => el.getAnimations().forEach((animation) => {
            if (animation.id === 'flip') animation.cancel();
        }));
        const next = measure(root);

        if (previous && !reduce) {
            let entering = 0;
            elements.forEach((el) => {
                if (el.dataset.flipStatic !== undefined) return;
                const id = el.dataset.flip!;
                const now = next.get(id)!;
                const before = previous.get(id);
                if (!before) {
                    // Nowa karta (nowe zapytanie, sprawa wróciła z archiwum) - wyłania się,
                    // zamiast pojawić się znikąd. Kilka naraz - lekko po kolei.
                    const animation = el.animate(
                        [{ opacity: 0, transform: 'translateY(8px) scale(0.97)' }, { opacity: 1, transform: 'none' }],
                        { duration: DURATION.shift, easing: EASE_SPRING, delay: Math.min(entering++, 12) * 18, fill: 'backwards' }
                    );
                    animation.id = 'flip';
                    return;
                }
                const dx = before.left - now.left;
                const dy = before.top - now.top;
                if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
                const animation = el.animate(
                    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
                    { duration: DURATION.shift, easing: EASE_SPRING }
                );
                animation.id = 'flip';
            });
        }
        rects.current = next;
    });

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        let frame = 0;
        const refresh = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                if (rootRef.current) rects.current = measure(rootRef.current);
            });
        };
        // Przewijanie nie bąbelkuje - łapiemy je w fazie przechwytywania, dla wszystkich kolumn naraz.
        root.addEventListener('scroll', refresh, true);
        window.addEventListener('resize', refresh);
        return () => {
            cancelAnimationFrame(frame);
            root.removeEventListener('scroll', refresh, true);
            window.removeEventListener('resize', refresh);
        };
    }, [rootRef]);
}
