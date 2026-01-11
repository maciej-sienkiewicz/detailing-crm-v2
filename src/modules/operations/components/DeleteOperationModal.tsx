// src/modules/operations/components/DeleteOperationModal.tsx

import styled from 'styled-components';
import { Button, ButtonGroup } from '@/common/components/Button';
import { t } from '@/common/i18n';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
`;

const ModalContainer = styled.div`
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1);
    width: 100%;
    max-width: 480px;
    padding: 24px;
`;

const ModalTitle = styled.h2`
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const ModalDescription = styled.p`
    margin: 0 0 24px;
    font-size: 14px;
    color: ${props => props.theme.colors.textSecondary};
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
        <Overlay onClick={onClose}>
            <ModalContainer onClick={e => e.stopPropagation()}>
                <ModalTitle>Potwierdź usunięcie</ModalTitle>
                <ModalDescription>
                    Czy na pewno chcesz usunąć operację dla klienta <strong>{operationName}</strong>?
                    Tej operacji nie można cofnąć.
                </ModalDescription>
                <ButtonGroup>
                    <Button
                        $variant="secondary"
                        onClick={onClose}
                        disabled={isDeleting}
                        $fullWidth
                    >
                        {t.common.cancel}
                    </Button>
                    <Button
                        $variant="danger"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        $fullWidth
                    >
                        {isDeleting ? 'Usuwanie...' : t.common.delete}
                    </Button>
                </ButtonGroup>
            </ModalContainer>
        </Overlay>
    );
};