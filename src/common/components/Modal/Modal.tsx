import type { ReactNode } from 'react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    CloseBtn,
} from '@/common/components/ModalKit';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    maxWidth?: string;
}

export const Modal = ({ isOpen, onClose, title, children, maxWidth }: ModalProps) => (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidth={maxWidth ?? '800px'}>
        <ModalHeader>
            <ModalTitleGroup>
                <ModalTitle>{title}</ModalTitle>
            </ModalTitleGroup>
            <CloseBtn onClick={onClose} />
        </ModalHeader>
        <ModalContent>
            {children}
        </ModalContent>
    </ModalShell>
);

export { ModalContent as ModalBody };
