import { useState } from 'react';
import styled from 'styled-components';
import { Modal } from '@/common/components/Modal';
import { Button } from '@/common/components/Button';
import type { VehicleOwner, AssignOwnerPayload, OwnershipRole } from '../types';
import { useOwnerManagement } from '../hooks/useOwnerManagement';
import { t } from '@/common/i18n';

const ModalContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const OwnersList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const OwnerCard = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: ${props => props.theme.spacing.md};
    background: ${props => props.theme.colors.surfaceAlt};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
`;

const OwnerInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const OwnerName = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
`;

const OwnerRole = styled.span<{ $role: string }>`
    display: inline-block;
    padding: 2px 8px;
    border-radius: ${props => props.theme.radii.full};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    width: fit-content;

    ${props => {
        if (props.$role === 'PRIMARY') return 'background: #dcfce7; color: #166534;';
        if (props.$role === 'COMPANY') return 'background: #dbeafe; color: #1e40af;';
        return 'background: #f3f4f6; color: #6b7280;';
    }}
`;

const RemoveButton = styled.button`
    padding: ${props => props.theme.spacing.xs} ${props => props.theme.spacing.sm};
    background: transparent;
    color: ${props => props.theme.colors.error};
    border: 1px solid ${props => props.theme.colors.error};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: ${props => props.theme.colors.error};
        color: white;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const AddOwnerSection = styled.div`
    padding-top: ${props => props.theme.spacing.lg};
    border-top: 1px solid ${props => props.theme.colors.border};
`;

const AddButton = styled(Button)`
    width: 100%;
`;

interface EditOwnersModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicleId: string;
    owners: VehicleOwner[];
}

export const EditOwnersModal = ({ isOpen, onClose, vehicleId, owners }: EditOwnersModalProps) => {
    const { removeOwner, isRemoving } = useOwnerManagement(vehicleId);

    const handleRemove = (customerId: string) => {
        if (owners.length === 1) {
            alert('Nie można usunąć ostatniego właściciela');
            return;
        }

        if (window.confirm(t.vehicles.detail.owners.confirmRemove)) {
            removeOwner(customerId);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Zarządzaj właścicielami">
            <ModalContent>
                <OwnersList>
                    {owners.map(owner => (
                        <OwnerCard key={owner.customerId}>
                            <OwnerInfo>
                                <OwnerName>{owner.customerName}</OwnerName>
                                <OwnerRole $role={owner.role}>
                                    {t.vehicles.detail.owners.role[owner.role]}
                                </OwnerRole>
                            </OwnerInfo>
                            <RemoveButton
                                onClick={() => handleRemove(owner.customerId)}
                                disabled={isRemoving || owners.length === 1}
                            >
                                Usuń
                            </RemoveButton>
                        </OwnerCard>
                    ))}
                </OwnersList>

                <AddOwnerSection>
                    <AddButton $variant="primary">
                        + Dodaj właściciela
                    </AddButton>
                </AddOwnerSection>
            </ModalContent>
        </Modal>
    );
};