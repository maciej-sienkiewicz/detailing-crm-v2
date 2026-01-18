import styled from 'styled-components';
import { useState } from 'react';
import { useDeleteProtocolRule } from '../api/useProtocols';
import type { ProtocolRule } from '../types';

// Material Design 3 inspired card
const Card = styled.div`
    position: relative;
    padding: 1.25rem;
    background: white;
    border: 1px solid rgb(226, 232, 240);
    border-radius: 0.75rem;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        border-color: rgb(203, 213, 225);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
`;

const CardHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
`;

const TitleSection = styled.div`
    flex: 1;
    min-width: 0;
`;

const DocumentName = styled.h3`
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: rgb(15, 23, 42);
    display: flex;
    align-items: center;
    gap: 0.375rem;
    letter-spacing: -0.01em;
`;

const MandatoryIcon = styled.span`
    color: rgb(239, 68, 68);
    font-weight: 700;
    font-size: 1.125rem;
`;

const Description = styled.p`
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
    color: rgb(100, 116, 139);
    line-height: 1.5;
`;

const BadgeGroup = styled.div`
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
`;

const Badge = styled.span<{ $variant: 'global' | 'service' | 'mandatory' | 'optional' }>`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;

    ${props => {
        switch (props.$variant) {
            case 'global':
                return `
                    background: rgb(239, 246, 255);
                    color: rgb(37, 99, 235);
                `;
            case 'service':
                return `
                    background: rgb(243, 232, 255);
                    color: rgb(147, 51, 234);
                `;
            case 'mandatory':
                return `
                    background: rgb(254, 242, 242);
                    color: rgb(220, 38, 38);
                `;
            case 'optional':
                return `
                    background: rgb(243, 244, 246);
                    color: rgb(75, 85, 99);
                `;
        }
    }}

    svg {
        width: 12px;
        height: 12px;
    }
`;

const Actions = styled.div`
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
`;

const IconButton = styled.button<{ $variant?: 'primary' | 'danger' }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    border-radius: 0.5rem;
    border: none;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;

    ${props => props.$variant === 'primary' ? `
        background: rgb(59, 130, 246);
        color: white;

        &:hover {
            background: rgb(37, 99, 235);
        }

        &:active {
            background: rgb(29, 78, 216);
        }
    ` : props.$variant === 'danger' ? `
        background: rgb(239, 68, 68);
        color: white;

        &:hover {
            background: rgb(220, 38, 38);
        }

        &:active {
            background: rgb(185, 28, 28);
        }
    ` : `
        background: rgb(241, 245, 249);
        color: rgb(51, 65, 85);

        &:hover {
            background: rgb(226, 232, 240);
        }

        &:active {
            background: rgb(203, 213, 225);
        }
    `}

    svg {
        width: 14px;
        height: 14px;
    }
`;

const TextButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: rgb(59, 130, 246);
    background: transparent;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        background: rgb(239, 246, 255);
    }

    &:active {
        background: rgb(219, 234, 254);
    }

    svg {
        width: 14px;
        height: 14px;
    }
`;

const DetailsPanel = styled.div`
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgb(226, 232, 240);
`;

const DetailRow = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    font-size: 0.8125rem;
`;

const DetailLabel = styled.span`
    color: rgb(100, 116, 139);
    font-weight: 500;
`;

const DetailValue = styled.span`
    color: rgb(15, 23, 42);
    font-weight: 500;
`;

// Icons
const ShieldCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const WrenchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const EditIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

interface ProtocolRuleCardProps {
    rule: ProtocolRule;
    onEdit?: (rule: ProtocolRule) => void;
    onRefresh?: () => void;
}

export const ProtocolRuleCard = ({ rule, onEdit, onRefresh }: ProtocolRuleCardProps) => {
    const [showDetails, setShowDetails] = useState(false);
    const deleteMutation = useDeleteProtocolRule();

    const handleDelete = async () => {
        if (!confirm(`Czy na pewno chcesz usunąć przypisanie protokołu "${rule.protocolTemplate?.name}"?`)) {
            return;
        }

        try {
            await deleteMutation.mutateAsync(rule.id);
            onRefresh?.();
        } catch (error) {
            console.error('Failed to delete protocol rule:', error);
        }
    };

    const handleEdit = () => {
        onEdit?.(rule);
    };

    const toggleDetails = () => {
        setShowDetails(!showDetails);
    };

    return (
        <Card>
            <CardHeader>
                <TitleSection>
                    <DocumentName>
                        {rule.isMandatory && <MandatoryIcon>*</MandatoryIcon>}
                        {rule.protocolTemplate?.name || 'Nieznany protokół'}
                    </DocumentName>
                    {rule.protocolTemplate?.description && (
                        <Description>{rule.protocolTemplate.description}</Description>
                    )}
                    <BadgeGroup>
                        <Badge $variant={rule.triggerType === 'GLOBAL_ALWAYS' ? 'global' : 'service'}>
                            {rule.triggerType === 'GLOBAL_ALWAYS' ? <GlobeIcon /> : <WrenchIcon />}
                            {rule.triggerType === 'GLOBAL_ALWAYS' ? 'Globalny' : rule.serviceName || 'Specyficzny'}
                        </Badge>
                        <Badge $variant={rule.isMandatory ? 'mandatory' : 'optional'}>
                            {rule.isMandatory ? <ShieldCheckIcon /> : null}
                            {rule.isMandatory ? 'Obowiązkowy' : 'Opcjonalny'}
                        </Badge>
                    </BadgeGroup>
                </TitleSection>
                <Actions>
                    <TextButton onClick={toggleDetails}>
                        <EyeIcon />
                        {showDetails ? 'Ukryj' : 'Szczegóły'}
                    </TextButton>
                    <IconButton onClick={handleEdit}>
                        <EditIcon />
                        Edytuj
                    </IconButton>
                    <IconButton $variant="danger" onClick={handleDelete}>
                        <TrashIcon />
                        Usuń
                    </IconButton>
                </Actions>
            </CardHeader>
            {showDetails && (
                <DetailsPanel>
                    <DetailRow>
                        <DetailLabel>ID reguły:</DetailLabel>
                        <DetailValue>{rule.id}</DetailValue>
                    </DetailRow>
                    <DetailRow>
                        <DetailLabel>Szablon protokołu:</DetailLabel>
                        <DetailValue>{rule.protocolTemplate?.name || 'Brak'}</DetailValue>
                    </DetailRow>
                    <DetailRow>
                        <DetailLabel>Etap:</DetailLabel>
                        <DetailValue>{rule.stage === 'CHECK_IN' ? 'Przyjęcie' : 'Wydanie'}</DetailValue>
                    </DetailRow>
                    <DetailRow>
                        <DetailLabel>Typ wyzwalacza:</DetailLabel>
                        <DetailValue>
                            {rule.triggerType === 'GLOBAL_ALWAYS' ? 'Globalny - zawsze wymagany' : 'Specyficzny dla usługi'}
                        </DetailValue>
                    </DetailRow>
                    {rule.triggerType === 'SERVICE_SPECIFIC' && (
                        <DetailRow>
                            <DetailLabel>Usługa:</DetailLabel>
                            <DetailValue>{rule.serviceName || rule.serviceId || 'Nie określono'}</DetailValue>
                        </DetailRow>
                    )}
                    <DetailRow>
                        <DetailLabel>Obowiązkowy:</DetailLabel>
                        <DetailValue>{rule.isMandatory ? 'Tak' : 'Nie'}</DetailValue>
                    </DetailRow>
                    <DetailRow>
                        <DetailLabel>Kolejność wyświetlania:</DetailLabel>
                        <DetailValue>{rule.displayOrder}</DetailValue>
                    </DetailRow>
                </DetailsPanel>
            )}
        </Card>
    );
};
