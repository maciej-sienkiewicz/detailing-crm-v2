// src/modules/appointments/components/CustomerSection.tsx
import styled from 'styled-components';
import { Card, CardHeader, CardTitle } from '@/common/components/Card';
import { Button } from '@/common/components/Button';
import { Badge } from '@/common/components/Badge';
import { t } from '@/common/i18n';
import type { SelectedCustomer } from '../types';

const SelectButton = styled(Button)`
    width: 100%;
    font-size: ${props => props.theme.fontSizes.md};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.lg};
    }
`;

const SelectedInfo = styled.div`
    padding: ${props => props.theme.spacing.lg};
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.05) 0%, rgba(14, 165, 233, 0.02) 100%);
    border-radius: ${props => props.theme.radii.lg};
    border: 2px solid ${props => props.theme.colors.primary};
    position: relative;
    overflow: hidden;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: ${props => props.theme.spacing.xl};
    }

    &:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background: linear-gradient(180deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    }
`;

const SelectedHeader = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    margin-bottom: ${props => props.theme.spacing.lg};
    padding-bottom: ${props => props.theme.spacing.md};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const SelectedIcon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: ${props => props.theme.radii.lg};
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, #0284c7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.bold};
    box-shadow: ${props => props.theme.shadows.md};
    flex-shrink: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        width: 48px;
        height: 48px;
        font-size: ${props => props.theme.fontSizes.xl};
    }
`;

const SelectedTitle = styled.div`
    flex: 1;
`;

const SelectedName = styled.div`
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.xs};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xl};
    }
`;

const SelectedDetails = styled.div`
    display: grid;
    gap: ${props => props.theme.spacing.md};
    grid-template-columns: 1fr;
    margin-bottom: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        grid-template-columns: repeat(2, 1fr);
    }
`;

const DetailItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.xs};
`;

const DetailLabel = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.theme.fontWeights.semibold};
    color: ${props => props.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const DetailValue = styled.span`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: ${props => props.theme.fontWeights.medium};
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};

    svg {
        width: 16px;
        height: 16px;
        color: ${props => props.theme.colors.primary};
    }
`;

const ChangeButton = styled(Button)`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${props => props.theme.spacing.sm};
`;

interface CustomerSectionProps {
    selectedCustomer: SelectedCustomer | null;
    onOpenModal: () => void;
}

export const CustomerSection = ({ selectedCustomer, onOpenModal }: CustomerSectionProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t.appointments.createView.customerSection}</CardTitle>
            </CardHeader>

            {!selectedCustomer ? (
                <SelectButton $variant="primary" onClick={onOpenModal}>
                    {t.appointments.createView.addOrSearchCustomer}
                </SelectButton>
            ) : selectedCustomer.isAlias ? (
                <SelectedInfo>
                    <SelectedHeader>
                        <SelectedIcon>
                            👤
                        </SelectedIcon>
                        <SelectedTitle>
                            <SelectedName>
                                {selectedCustomer.alias}
                            </SelectedName>
                            <Badge $variant="warning">
                                Alias
                            </Badge>
                        </SelectedTitle>
                    </SelectedHeader>
                    <SelectedDetails>
                        <DetailItem>
                            <DetailValue style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                Dane klienta zostaną uzupełnione przy rozpoczęciu wizyty
                            </DetailValue>
                        </DetailItem>
                    </SelectedDetails>
                    <ChangeButton $variant="secondary" onClick={onOpenModal}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {t.appointments.createView.changeCustomer}
                    </ChangeButton>
                </SelectedInfo>
            ) : (
                <SelectedInfo>
                    <SelectedHeader>
                        <SelectedIcon>
                            {selectedCustomer.firstName?.charAt(0)}{selectedCustomer.lastName?.charAt(0)}
                        </SelectedIcon>
                        <SelectedTitle>
                            <SelectedName>
                                {selectedCustomer.firstName} {selectedCustomer.lastName}
                            </SelectedName>
                            <Badge $variant={selectedCustomer.isNew ? 'primary' : 'success'}>
                                {selectedCustomer.isNew
                                    ? t.appointments.selectedCustomer.newBadge
                                    : t.appointments.selectedCustomer.existingBadge}
                            </Badge>
                        </SelectedTitle>
                    </SelectedHeader>
                    <SelectedDetails>
                        <DetailItem>
                            <DetailLabel>{t.appointments.selectedCustomer.emailLabel}</DetailLabel>
                            <DetailValue>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {selectedCustomer.email}
                            </DetailValue>
                        </DetailItem>
                        <DetailItem>
                            <DetailLabel>{t.appointments.selectedCustomer.phoneLabel}</DetailLabel>
                            <DetailValue>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {selectedCustomer.phone}
                            </DetailValue>
                        </DetailItem>
                    </SelectedDetails>
                    <ChangeButton $variant="secondary" onClick={onOpenModal}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {t.appointments.createView.changeCustomer}
                    </ChangeButton>
                </SelectedInfo>
            )}
        </Card>
    );
};