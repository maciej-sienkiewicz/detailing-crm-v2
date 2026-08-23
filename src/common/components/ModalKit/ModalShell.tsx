import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ModalOverlay, ModalBox } from '@/common/styles';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZE_MAP: Record<ModalSize, string> = {
    sm: '480px',
    md: '560px',
    lg: '640px',
    xl: '800px',
    /**
     * Okno dokumentowe: podgląd faktury, protokołu, dłuższego wydruku. Treść
     * jest wtedy sama w sobie kartką A4 i przy 800px robi się wąska kolumna,
     * którą trzeba przewijać — a tło i tak jest rozmyte i nieużywane.
     */
    full: 'min(1280px, 100%)',
};

interface ModalShellProps {
    isOpen: boolean;
    onClose: () => void;
    /** Preferred: sm=480px · md=560px · lg=640px · xl=800px · full=prawie cały ekran */
    size?: ModalSize;
    /** @deprecated Use size instead */
    maxWidth?: string;
    /**
     * Warstwa nakładki. Domyślna (1000) jest dobra dla okna otwieranego z widoku.
     * Okno otwierane Z INNEGO OKNA musi dostać SUBMODAL_Z_INDEX — inaczej wyląduje
     * pod tym, z którego wyszło, i będzie wyglądało na takie, które się nie otworzyło.
     */
    zIndex?: number;
    /**
     * Hold the window at a constant height instead of letting it grow and shrink with its
     * content. Use for anything whose body changes size while the user works in it — search
     * pickers above all: a list that resizes the modal on every keystroke makes the buttons
     * around it move under the pointer. The content region scrolls inside the fixed box.
     */
    stableHeight?: boolean;
    /**
     * Rozciąga okno na całą dostępną wysokość zamiast dopasowywać je do treści.
     * Dla okien dokumentowych: przy długiej fakturze znika większość przewijania,
     * a przy krótkiej kartka ma po prostu więcej powietrza pod spodem — tak jak
     * w czytniku PDF. Ma pierwszeństwo przed [stableHeight].
     */
    fillHeight?: boolean;
    children: ReactNode;
}

/**
 * ModalShell: canonical modal container for every modal in the app.
 *
 * Renders a portal, locks body scroll, handles Escape key and backdrop click.
 * Overlay covers the full viewport (sidebar included) with a blur backdrop.
 *
 * Usage:
 *   <ModalShell isOpen={isOpen} onClose={onClose} size="lg">
 *     <ModalHeader>...</ModalHeader>
 *     <ModalContent>...</ModalContent>
 *     <ModalFooter>...</ModalFooter>
 *   </ModalShell>
 */
export const ModalShell = ({ isOpen, onClose, size, maxWidth, zIndex, stableHeight, fillHeight, children }: ModalShellProps) => {
    const resolvedWidth = size ? SIZE_MAP[size] : (maxWidth ?? '560px');

    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    // Keep the modal inside the *visible* region when the on-screen keyboard is
    // up. `position: fixed` resolves against the layout viewport, which iOS
    // never shrinks for the keyboard (it shrinks the visual viewport instead),
    // so a vertically centered modal ends up hidden behind the keyboard.
    //
    // Ważne: nakładka NIE zmienia rozmiaru. Skracanie jej do `vv.height`
    // zostawiało pod spodem pas nierozmytej aplikacji — a przy niespójnych
    // pomiarach w trakcie animacji klawiatury ten pas potrafił zostać na
    // ekranie. Zamiast tego nakładka trzyma cały layout viewport (pełne
    // przyciemnienie i blur), a okno wciskamy w widoczny obszar paddingami:
    //   gora = vv.offsetTop        → pierwszy widoczny piksel
    //   dol  = to, co zjada klawiatura
    const overlayRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!isOpen) return;
        const vv = window.visualViewport;
        if (!vv) return;

        let frame = 0;

        const apply = () => {
            const el = overlayRef.current;
            if (!el) return;
            const hiddenBelow = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
            const keyboardOpen = window.innerHeight - vv.height > 80;
            if (keyboardOpen) {
                el.style.alignItems = 'flex-start';
                el.style.paddingTop = `${vv.offsetTop + 12}px`;
                el.style.paddingBottom = `${hiddenBelow + 12}px`;
                el.style.overflowY = 'auto';
            } else {
                el.style.alignItems = '';
                el.style.paddingTop = '';
                el.style.paddingBottom = '';
                el.style.overflowY = '';
            }
        };

        const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(apply);
        };

        schedule();
        // Klawiatura wjeżdża ~250ms, a iOS raportuje po drodze pośrednie
        // wymiary — domierz po jej ustaniu.
        const settle = [setTimeout(schedule, 150), setTimeout(schedule, 400)];

        vv.addEventListener('resize', schedule);
        vv.addEventListener('scroll', schedule);
        return () => {
            cancelAnimationFrame(frame);
            settle.forEach(clearTimeout);
            vv.removeEventListener('resize', schedule);
            vv.removeEventListener('scroll', schedule);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <ModalOverlay
            ref={overlayRef}
            $isOpen={isOpen}
            $zIndex={zIndex}
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
        >
            <ModalBox
                $isOpen={isOpen}
                $maxWidth={resolvedWidth}
                $fixedHeight={fillHeight ? '100%' : stableHeight ? 'min(640px, 100%)' : undefined}
            >
                {children}
            </ModalBox>
        </ModalOverlay>,
        document.body
    );
};
