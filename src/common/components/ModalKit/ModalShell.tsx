import { useEffect, type ReactNode } from 'react';
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
    /** Preferred — sm=480px · md=560px · lg=640px · xl=800px */
    size?: ModalSize;
    /** @deprecated Use size instead */
    maxWidth?: string;
    children: ReactNode;
}

/**
 * ModalShell — canonical modal container for every modal in the app.
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

    if (!isOpen) return null;

    return createPortal(
        <ModalOverlay
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
