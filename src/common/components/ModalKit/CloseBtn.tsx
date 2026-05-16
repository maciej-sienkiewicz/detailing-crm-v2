import { ModalCloseButton } from '@/common/styles';

const IconX = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

interface CloseBtnProps {
    onClick: () => void;
}

/** Pre-wired close button with X icon. Drop inside ModalHeader. */
export const CloseBtn = ({ onClick }: CloseBtnProps) => (
    <ModalCloseButton type="button" onClick={onClick} aria-label="Zamknij">
        <IconX />
    </ModalCloseButton>
);
