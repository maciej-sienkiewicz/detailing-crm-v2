import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ModalOverlay, ModalBox } from '@/common/styles';

interface ModalShellProps {
    isOpen: boolean;
    onClose: () => void;
    maxWidth?: string;
    /** Horizontal offset from left edge — used by calendar/sidebar-aware modals */
    contentLeft?: number;
    children: ReactNode;
}

/**
 * ModalShell — the canonical modal container used by every modal in the app.
 *
 * Renders a portal, locks body scroll, handles Escape key and backdrop click.
 * Compose with ModalHeader / ModalContent / ModalFooter from @/common/styles.
 *
 * Usage:
 *   <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="520px">
 *     <ModalHeader>...</ModalHeader>
 *     <ModalContent>...</ModalContent>
 *     <ModalFooter>...</ModalFooter>
 *   </ModalShell>
 */
export const ModalShell = ({ isOpen, onClose, maxWidth, contentLeft, children }: ModalShellProps) => {
    // Escape key handler
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    // Body scroll lock
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
            $contentLeft={contentLeft}
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
        >
            <ModalBox $isOpen={isOpen} $maxWidth={maxWidth}>
                {children}
            </ModalBox>
        </ModalOverlay>,
        document.body
    );
};
