import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ModalOverlay, ModalBox } from '@/common/styles';
import { useModalViewport } from '@/common/hooks';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZE_MAP: Record<ModalSize, string> = {
    sm: '480px',
    md: '560px',
    lg: '640px',
    xl: '800px',
    /**
     * Okno dokumentowe: podgląd faktury, protokołu, dłuższego wydruku. Treść
     * jest wtedy sama w sobie kartką A4 i przy 800px robi się wąska kolumna,
     * którą trzeba przewijać - a tło i tak jest rozmyte i nieużywane.
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
     * Okno otwierane Z INNEGO OKNA musi dostać SUBMODAL_Z_INDEX - inaczej wyląduje
     * pod tym, z którego wyszło, i będzie wyglądało na takie, które się nie otworzyło.
     */
    zIndex?: number;
    /**
     * Hold the window at a constant height instead of letting it grow and shrink with its
     * content. Use for anything whose body changes size while the user works in it - search
     * pickers above all: a list that resizes the modal on every keystroke makes the buttons
     * around it move under the pointer. The content region scrolls inside the fixed box.
     */
    stableHeight?: boolean;
    /**
     * Rozciąga okno na całą dostępną wysokość zamiast dopasowywać je do treści.
     * Dla okien dokumentowych: przy długiej fakturze znika większość przewijania,
     * a przy krótkiej kartka ma po prostu więcej powietrza pod spodem - tak jak
     * w czytniku PDF. Ma pierwszeństwo przed [stableHeight].
     */
    fillHeight?: boolean;
    /**
     * Czy okno wolno zamknąć Escape'em i kliknięciem w tło. Domyślnie tak - i tak ma
     * zostać wszędzie, gdzie zamknięcie niczego nie kosztuje.
     *
     * `false` jest dla okien, w których zamknięcie JEST decyzją i musi zostać podjęte
     * świadomie: okno „Dokumentacja i Podpisy" zostawiało po odruchowym Escape
     * rozgrzebane przyjęcie pojazdu - wizytę zapisaną, ale nierozpoczętą, bez żadnej
     * ścieżki powrotu. Przy `false` krzyżyk nadal działa: to on ma otworzyć pytanie
     * o decyzję, zamiast wychodzić po cichu.
     */
    dismissible?: boolean;
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
export const ModalShell = ({ isOpen, onClose, size, maxWidth, zIndex, stableHeight, fillHeight, dismissible = true, children }: ModalShellProps) => {
    const resolvedWidth = size ? SIZE_MAP[size] : (maxWidth ?? '560px');

    // Escape, blokada tła i układ przy wysuniętej klawiaturze - wspólne dla
    // wszystkich okien w aplikacji, także tych na własnych nakładkach.
    const overlayRef = useRef<HTMLDivElement>(null);
    useModalViewport(isOpen, overlayRef, dismissible ? onClose : undefined);

    if (!isOpen) return null;

    return createPortal(
        <ModalOverlay
            ref={overlayRef}
            $isOpen={isOpen}
            $zIndex={zIndex}
            onMouseDown={(e) => dismissible && e.target === e.currentTarget && onClose()}
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
