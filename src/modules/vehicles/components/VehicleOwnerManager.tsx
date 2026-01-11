import { useState } from 'react';
import styled from 'styled-components';
import type { VehicleOwner, AssignOwnerPayload } from '../types';
import { t } from '@/common/i18n';

const ManagerContainer = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
`;

const ManagerHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const Title = styled.h3`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const Subtitle = styled.p`
    margin: 4px 0 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const AddButton = styled.button`
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    background: var(--brand-primary);
    color: white;
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover {
        opacity: 0.9;
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
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
    transition: all 0.2s ease;

    &:hover {
        border-color: var(--brand-primary);
    }
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

interface VehicleOwnerManagerProps {
    owners: VehicleOwner[];
    onAssignOwner: (payload: AssignOwnerPayload) => void;
    onRemoveOwner: (customerId: string) => void;
    isAssigning: boolean;
    isRemoving: boolean;
}

export const VehicleOwnerManager = ({
                                        owners,
                                        onAssignOwner,
                                        onRemoveOwner,
                                        isAssigning,
                                        isRemoving,
                                    }: VehicleOwnerManagerProps) => {
    const [isAdding, setIsAdding] = useState(false);

    const handleRemove = (customerId: string) => {
        if (window.confirm(t.vehicles.detail.owners.confirmRemove)) {
            onRemoveOwner(customerId);
        }
    };

    return (
        <ManagerContainer>
            <ManagerHeader>
                <div>
                    <Title>{t.vehicles.detail.owners.title}</Title>
                    <Subtitle>{t.vehicles.detail.owners.subtitle}</Subtitle>
                </div>
                <AddButton
                    onClick={() => setIsAdding(true)}
                    disabled={isAssigning}
                >
                    + {t.vehicles.detail.owners.addOwner}
                </AddButton>
            </ManagerHeader>

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
                            {t.vehicles.detail.owners.removeOwner}
                        </RemoveButton>
                    </OwnerCard>
                ))}
            </OwnersList>
        </ManagerContainer>
    );
};