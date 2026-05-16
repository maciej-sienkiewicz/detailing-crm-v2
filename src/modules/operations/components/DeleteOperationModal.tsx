// src/modules/operations/components/DeleteOperationModal.tsx

import styled from 'styled-components';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { t } from '@/common/i18n';

const ModalDescription = styled.p`
    margin: 0;
    font-size: 14px;
    color: #64748b;
    line-height: 1.5;
`;

interface DeleteOperationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
    operationName: string;
}

export const DeleteOperationModal = ({
    isOpen,
    onClose,
    onConfirm,
    isDeleting,
    operationName,
}: DeleteOperationModalProps) => {
    if (!isOpen) return null;

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="480px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Potwierdź usunięcie</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <ModalDescription>
                    Czy na pewno chcesz usunąć operację dla klienta <strong>{operationName}</strong>?
                    Tej operacji nie można cofnąć.
                </ModalDescription>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isDeleting}>
                    {t.common.cancel}
                </SharedButton>
                <SharedButton $variant="danger" type="button" onClick={onConfirm} disabled={isDeleting}>
                    {isDeleting ? 'Usuwanie...' : t.common.delete}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
