// src/modules/comms/inbox/board/useBoardDrag.ts
// Przeciąganie kart po tablicy spraw - na zdarzeniach wskaźnika, bez biblioteki.
//
// Karta w ręce to osobna warstwa (`position: fixed`) przesuwana prosto w stylu, poza
// Reactem: render przy każdym ruchu myszy to 60 renderów tablicy na sekundę. React
// dowiaduje się tylko o tym, NAD KTÓRĄ kolumną jest karta - i tylko wtedy, gdy to się
// zmienia. Wtedy tablica liczy podgląd (karta „na próbę" w nowej kolumnie), robi jej
// miejsce, a pozostałe karty rozsuwa useFlip.
//
// Mysz: przeciąganie zaczyna się po kilku pikselach ruchu - krótkie kliknięcie otwiera
// sprawę. Dotyk: po przytrzymaniu palca (jak na iPhonie przy przestawianiu ikon), bo
// ruch palca od razu jest przewijaniem kolumny albo tablicy i nie wolno go zabrać.
//
// Upuszczenie: karta dopływa do miejsca, które na nią czeka, i dopiero wtedy tablica
// zapisuje przesunięcie - prawdziwa karta staje dokładnie tam, gdzie była jej ręczna kopia.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { BoardColumnKey } from '../../utils/leadBoard';
import { DURATION, EASE_SPRING, prefersReducedMotion } from './motion';

export interface DragSession {
    id: string;
    from: BoardColumnKey;
    /** Kolumna pod kartą; null - poza tablicą (upuszczenie odda kartę na miejsce). */
    over: BoardColumnKey | null;
    width: number;
    height: number;
    /** Karta dopływa na miejsce - podgląd jest już ostateczny. */
    landing: boolean;
}

interface Pointer {
    id: string;
    column: BoardColumnKey;
    pointerId: number;
    touch: boolean;
    startX: number;
    startY: number;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    rect: DOMRect;
    active: boolean;
    timer: number;
}

interface Options {
    /** Przewijany poziomo pojemnik kolumn. */
    boardRef: RefObject<HTMLElement | null>;
    /** Warstwa z kartą w ręce (renderuje ją tablica, gdy jest sesja). */
    overlayRef: RefObject<HTMLElement | null>;
    onDrop: (id: string, from: BoardColumnKey, to: BoardColumnKey) => void;
}

const MOUSE_THRESHOLD = 4;
const TOUCH_SLOP = 8;
const LONG_PRESS_MS = 220;
const EDGE = 72;
const MAX_SPEED = 18;

/** Prędkość przewijania przy krawędzi: zero w środku, rośnie im bliżej brzegu. */
const edgeSpeed = (position: number, start: number, end: number): number => {
    if (position < start + EDGE) return -MAX_SPEED * Math.min(1, (start + EDGE - position) / EDGE);
    if (position > end - EDGE) return MAX_SPEED * Math.min(1, (position - (end - EDGE)) / EDGE);
    return 0;
};

export function useBoardDrag({ boardRef, overlayRef, onDrop }: Options) {
    const [session, setSession] = useState<DragSession | null>(null);
    const pointer = useRef<Pointer | null>(null);
    const sessionRef = useRef<DragSession | null>(null);
    const frame = useRef(0);
    const suppressClickUntil = useRef(0);
    const onDropRef = useRef(onDrop);
    useEffect(() => { onDropRef.current = onDrop; }, [onDrop]);

    const update = useCallback((next: DragSession | null) => {
        sessionRef.current = next;
        setSession(next);
    }, []);

    const placeOverlay = useCallback(() => {
        const p = pointer.current;
        const overlay = overlayRef.current;
        if (!p || !overlay) return;
        overlay.style.transform = `translate3d(${p.x - p.offsetX}px, ${p.y - p.offsetY}px, 0)`;
    }, [overlayRef]);

    const hitTest = useCallback((): BoardColumnKey | null => {
        const p = pointer.current;
        const board = boardRef.current;
        if (!p || !board) return null;
        const bounds = board.getBoundingClientRect();
        if (p.y < bounds.top - 40 || p.y > bounds.bottom + 40) return null;
        for (const lane of board.querySelectorAll<HTMLElement>('[data-board-column]')) {
            const rect = lane.getBoundingClientRect();
            // Odstęp między kolumnami należy do bliższej - karta nie „gaśnie" w szczelinie.
            if (p.x >= rect.left - 8 && p.x <= rect.right + 8) return lane.dataset.boardColumn as BoardColumnKey;
        }
        return null;
    }, [boardRef]);

    // Pętla przewijania przy krawędziach - działa także wtedy, gdy palec stoi w miejscu.
    const tick = useCallback(() => {
        const p = pointer.current;
        const board = boardRef.current;
        const current = sessionRef.current;
        if (!p || !p.active || !board || !current || current.landing) return;
        const bounds = board.getBoundingClientRect();
        const dx = edgeSpeed(p.x, bounds.left, bounds.right);
        if (dx) board.scrollLeft += dx;
        if (current.over) {
            const list = board.querySelector<HTMLElement>(`[data-board-scroll="${current.over}"]`);
            if (list) {
                const listBounds = list.getBoundingClientRect();
                const dy = edgeSpeed(p.y, listBounds.top, listBounds.bottom);
                if (dy) list.scrollTop += dy;
            }
        }
        const over = hitTest();
        if (over !== current.over) update({ ...current, over });
        frame.current = requestAnimationFrame(tick);
    }, [boardRef, hitTest, update]);

    const begin = useCallback(() => {
        const p = pointer.current;
        if (!p) return;
        p.active = true;
        if (p.touch) navigator.vibrate?.(8);
        update({ id: p.id, from: p.column, over: p.column, width: p.rect.width, height: p.rect.height, landing: false });
        frame.current = requestAnimationFrame(tick);
    }, [tick, update]);

    const finish = useCallback((cancelled: boolean) => {
        const p = pointer.current;
        const current = sessionRef.current;
        cancelAnimationFrame(frame.current);
        if (!p) return;
        window.clearTimeout(p.timer);
        if (!p.active || !current) {
            pointer.current = null;
            return;
        }
        suppressClickUntil.current = Date.now() + 400;
        const target = cancelled ? current.from : current.over ?? current.from;
        // Najpierw ostateczny podgląd (miejsce w kolumnie docelowej), potem dolot do niego.
        update({ ...current, over: target, landing: true });

        requestAnimationFrame(() => {
            const overlay = overlayRef.current;
            const slot = boardRef.current?.querySelector<HTMLElement>('[data-flip-static]');
            const done = () => {
                pointer.current = null;
                onDropRef.current(current.id, current.from, target);
                update(null);
            };
            if (!overlay || !slot || prefersReducedMotion()) {
                done();
                return;
            }
            const to = slot.getBoundingClientRect();
            overlay.dataset.lifted = 'false';
            const animation = overlay.animate(
                [{ transform: overlay.style.transform }, { transform: `translate3d(${to.left}px, ${to.top}px, 0)` }],
                { duration: DURATION.drop, easing: EASE_SPRING, fill: 'forwards' }
            );
            animation.onfinish = done;
            animation.oncancel = done;
        });
    }, [boardRef, overlayRef, update]);

    // Nasłuch dokumentu tylko wtedy, gdy palec albo przycisk myszy jest na karcie.
    const listen = useCallback(() => {
        const onMove = (event: PointerEvent) => {
            const p = pointer.current;
            if (!p || event.pointerId !== p.pointerId) return;
            p.x = event.clientX;
            p.y = event.clientY;
            const distance = Math.hypot(p.x - p.startX, p.y - p.startY);
            if (!p.active) {
                if (p.touch) {
                    // Palec ruszył przed przytrzymaniem - to przewijanie, nie przeciąganie.
                    if (distance > TOUCH_SLOP) stop();
                    return;
                }
                if (distance < MOUSE_THRESHOLD) return;
                begin();
            }
            event.preventDefault();
            placeOverlay();
        };
        const onUp = (event: PointerEvent) => {
            if (pointer.current && event.pointerId === pointer.current.pointerId) stop(false);
        };
        const onCancel = (event: PointerEvent) => {
            if (pointer.current && event.pointerId === pointer.current.pointerId) stop(true);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && pointer.current?.active) {
                event.preventDefault();
                event.stopPropagation();
                stop(true);
            }
        };
        // Przeglądarka nie może zacząć przewijać pod kartą trzymaną palcem - a o tym, czy
        // gest jest przewijaniem, decyduje już przy pierwszym ruchu. Stąd nasłuch niepasywny.
        const onTouchMove = (event: TouchEvent) => {
            if (pointer.current?.active) event.preventDefault();
        };
        // Przytrzymanie palca na iOS i Androidzie otwiera menu kontekstowe obrazka/linku.
        const onContextMenu = (event: Event) => {
            if (pointer.current?.touch) event.preventDefault();
        };
        const stop = (cancelled = true) => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('contextmenu', onContextMenu, true);
            finish(cancelled);
        };
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('contextmenu', onContextMenu, true);
    }, [begin, finish, placeOverlay]);

    const onPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLElement>, id: string, column: BoardColumnKey) => {
            if (event.button !== 0 || pointer.current || sessionRef.current) return;
            // Przyciski i linki wewnątrz karty działają jak przyciski, nie jak uchwyt.
            if ((event.target as HTMLElement).closest('button, a, input, [data-no-drag]')) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const touch = event.pointerType === 'touch';
            pointer.current = {
                id,
                column,
                pointerId: event.pointerId,
                touch,
                startX: event.clientX,
                startY: event.clientY,
                x: event.clientX,
                y: event.clientY,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
                rect,
                active: false,
                timer: touch ? window.setTimeout(() => pointer.current && begin(), LONG_PRESS_MS) : 0,
            };
            listen();
        },
        [begin, listen]
    );

    // Pierwsze położenie warstwy przed pierwszym malowaniem - karta nie mignie w rogu ekranu.
    useLayoutEffect(() => {
        if (!session || session.landing) return;
        placeOverlay();
        const overlay = overlayRef.current;
        if (!overlay) return;
        const raf = requestAnimationFrame(() => { overlay.dataset.lifted = 'true'; });
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.id]);

    useEffect(() => () => cancelAnimationFrame(frame.current), []);

    /** Kliknięcie, które jest końcem przeciągnięcia, nie otwiera sprawy. */
    const consumeClick = useCallback(() => Date.now() < suppressClickUntil.current, []);

    return { session, onPointerDown, consumeClick };
}
