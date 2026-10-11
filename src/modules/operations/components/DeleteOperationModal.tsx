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
import type { OperationType } from '../types';

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
    /** Co usuwamy. Bez tego okno mówi ogólnie, bo woła je też kalendarz dla obu rodzajów. */
    kind?: OperationType;
}

const KIND_LABEL: Record<OperationType, string> = {
    VISIT: 'wizytę',
    RESERVATION: 'rezerwację',
};

export const DeleteOperationModal = ({
    isOpen,
    onClose,
    onConfirm,
    isDeleting,
    operationName,
    kind,
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
                    Usunąć {kind ? KIND_LABEL[kind] : 'wizytę lub rezerwację'} klienta <strong>{operationName}</strong>?
                    Tego nie da się cofnąć.
                </ModalDescription>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isDeleting}>
                    {t.common.cancel}
                </SharedButton>
                <SharedButton $variant="danger" type="button" onClick={onConfirm} disabled={isDeleting}>
                    {isDeleting ? 'Usuwanie…' : t.common.delete}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
