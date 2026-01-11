import { useState } from 'react';
import styled from 'styled-components';
import type { NotificationChannels } from '../../hooks/useStateTransition.ts';
import type { CustomerInfo } from '../../types';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
`;

const Description = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
    line-height: 1.6;
`;

const CustomerCard = styled.div`
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 1px solid #0ea5e9;
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
`;

const CustomerName = styled.div`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    margin-bottom: ${props => props.theme.spacing.xs};
`;

const CustomerContact = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textSecondary};
`;

const ChannelsSection = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
`;

const SectionTitle = styled.h3`
    margin: 0 0 ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};

    svg {
        width: 20px;
        height: 20px;
        color: var(--brand-primary);
    }
`;

const ChannelOptions = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
`;

const ChannelOption = styled.label<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.md};
    background: ${props => props.$disabled ? props.theme.colors.surfaceAlt : 'white'};
    border: 2px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    transition: all 0.2s ease;
    opacity: ${props => props.$disabled ? 0.6 : 1};

    &:hover {
        border-color: ${props => !props.$disabled && 'var(--brand-primary)'};
    }
`;

const Checkbox = styled.input`
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: var(--brand-primary);

    &:disabled {
        cursor: not-allowed;
    }
`;

const ChannelInfo = styled.div`
    flex: 1;
`;

const ChannelLabel = styled.div`
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    color: ${props => props.theme.colors.text};
    margin-bottom: 2px;
`;

const ChannelDetail = styled.div`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

const ChannelIcon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: ${props => props.theme.radii.md};
    background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
`;

const InfoBox = styled.div`
    padding: ${props => props.theme.spacing.md};
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
    border: 1px solid #10b981;
    border-radius: ${props => props.theme.radii.md};
    display: flex;
    gap: ${props => props.theme.spacing.sm};
`;

const InfoIcon = styled.div`
    font-size: 20px;
    flex-shrink: 0;
`;

const InfoText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: #065f46;
    line-height: 1.5;
`;

const ActionButtons = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: ${props => props.theme.spacing.md};
`;

const ActionButton = styled.button<{ $variant: 'secondary' | 'primary' }>`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    border: none;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;

    ${props => props.$variant === 'secondary' && `
        background: white;
        color: ${props.theme.colors.textSecondary};
        border: 2px solid ${props.theme.colors.border};

        &:hover {
            background: ${props.theme.colors.surfaceHover};
        }
    `}

    ${props => props.$variant === 'primary' && `
        background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
        color: white;
        box-shadow: ${props.theme.shadows.md};

        &:hover {
            box-shadow: ${props.theme.shadows.lg};
            transform: translateY(-1px);
        }
    `}
`;

interface NotificationStepProps {
    customer: CustomerInfo;
    onSkip: () => void;
    onSend: (channels: NotificationChannels) => void;
}

export const NotificationStep = ({ customer, onSkip, onSend }: NotificationStepProps) => {
    const [channels, setChannels] = useState<NotificationChannels>({
        sms: true,
        email: !!customer.email,
    });

    const handleToggle = (channel: keyof NotificationChannels) => {
        setChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
    };

    const hasAnyChannel = channels.sms || channels.email;

    return (
        <Container>
            <Description>
                Powiadom klienta o zakończeniu prac i gotowości pojazdu do odbioru.
                Wybierz kanały komunikacji.
            </Description>

            <CustomerCard>
                <CustomerName>
                    {customer.firstName} {customer.lastName}
                </CustomerName>
                <CustomerContact>
                    📞 {customer.phone}
                    {customer.email && ` • 📧 ${customer.email}`}
                </CustomerContact>
            </CustomerCard>

            <ChannelsSection>
                <SectionTitle>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Kanały powiadomień
                </SectionTitle>

                <ChannelOptions>
                    <ChannelOption>
                        <Checkbox
                            type="checkbox"
                            checked={channels.sms}
                            onChange={() => handleToggle('sms')}
                        />
                        <ChannelIcon>💬</ChannelIcon>
                        <ChannelInfo>
                            <ChannelLabel>Wiadomość SMS</ChannelLabel>
                            <ChannelDetail>Wysłane na: {customer.phone}</ChannelDetail>
                        </ChannelInfo>
                    </ChannelOption>

                    <ChannelOption $disabled={!customer.email}>
                        <Checkbox
                            type="checkbox"
                            checked={channels.email}
                            onChange={() => handleToggle('email')}
                            disabled={!customer.email}
                        />
                        <ChannelIcon>📧</ChannelIcon>
                        <ChannelInfo>
                            <ChannelLabel>Email</ChannelLabel>
                            <ChannelDetail>
                                {customer.email || 'Brak adresu email w bazie'}
                            </ChannelDetail>
                        </ChannelInfo>
                    </ChannelOption>
                </ChannelOptions>
            </ChannelsSection>

            {hasAnyChannel && (
                <InfoBox>
                    <InfoIcon>💡</InfoIcon>
                    <InfoText>
                        Klient otrzyma informację o gotowości pojazdu oraz godzinach pracy warsztatu.
                        Powiadomienie zostanie wysłane natychmiast.
                    </InfoText>
                </InfoBox>
            )}

            <ActionButtons>
                <ActionButton $variant="secondary" onClick={onSkip}>
                    Pomiń powiadomienia
                </ActionButton>
                <ActionButton
                    $variant="primary"
                    onClick={() => onSend(channels)}
                    disabled={!hasAnyChannel}
                >
                    Wyślij i kontynuuj
                </ActionButton>
            </ActionButtons>
        </Container>
    );
};