import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ModalOverlay, ModalBox } from '@/common/styles';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<ModalSize, string> = {
    sm: '480px',
    md: '560px',
    lg: '640px',
    xl: '800px',
};

interface ModalShellProps {
    isOpen: boolean;
    onClose: () => void;
    /** Preferred: sm=480px · md=560px · lg=640px · xl=800px */
    size?: ModalSize;
    /** @deprecated Use size instead */
    maxWidth?: string;
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
export const ModalShell = ({ isOpen, onClose, size, maxWidth, children }: ModalShellProps) => {
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
    // While the keyboard is open, pin the overlay to the visual viewport and
    // align the modal to its top; restore the centered layout on close.
    const overlayRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!isOpen) return;
        const vv = window.visualViewport;
        if (!vv) return;

        const apply = () => {
            const el = overlayRef.current;
            if (!el) return;
            const keyboardOpen = vv.height < window.innerHeight - 80;
            if (keyboardOpen) {
                el.style.top = `${vv.offsetTop}px`;
                el.style.height = `${vv.height}px`;
                el.style.alignItems = 'flex-start';
                el.style.overflowY = 'auto';
            } else {
                el.style.top = '';
                el.style.height = '';
                el.style.alignItems = '';
                el.style.overflowY = '';
            }
        };

        apply();
        vv.addEventListener('resize', apply);
        vv.addEventListener('scroll', apply);
        return () => {
            vv.removeEventListener('resize', apply);
            vv.removeEventListener('scroll', apply);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <ModalOverlay
            ref={overlayRef}
            $isOpen={isOpen}
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
        >
            <ModalBox $isOpen={isOpen} $maxWidth={resolvedWidth}>
                {children}
            </ModalBox>
        </ModalOverlay>,
        document.body
    );
};
