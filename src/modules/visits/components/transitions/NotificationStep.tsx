import { useState } from 'react';
import styled from 'styled-components';
import type { NotificationChannels } from '../../hooks/useStateTransition';
import type { CustomerInfo } from '../../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { LockedSection } from '@/common/components/LockedSection';
import { useFeature } from '@/modules/subscription';

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const CustomerRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: ${st.bg};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

const CustomerAvatar = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: ${st.gradientBlue};
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    svg { width: 15px; height: 15px; }
`;

const CustomerDetails = styled.div`
    flex: 1;
    min-width: 0;
`;

const CustomerName = styled.div`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const CustomerContact = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const SectionLabel = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

const ChannelList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const ChannelItem = styled.label<{ $disabled?: boolean; $checked?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: ${p => p.$checked && !p.$disabled ? st.accentBlueDim : st.bgCard};
    border: 1px solid ${p => p.$checked && !p.$disabled ? 'rgba(59,130,246,0.3)' : st.border};
    border-radius: ${st.radiusSm};
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$disabled ? 0.5 : 1};
    transition: all 140ms ease;

    &:hover:not([data-disabled]) {
        border-color: ${st.accentBlue};
    }
`;

const Checkbox = styled.input`
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    cursor: inherit;
    accent-color: ${st.accentBlue};
`;

const ChannelIcon = styled.div`
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: ${st.textSecondary};
    svg { width: 13px; height: 13px; }
`;

const ChannelText = styled.div`
    flex: 1;
    min-width: 0;
`;

const ChannelLabel = styled.div`
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${st.text};
`;

const ChannelDetail = styled.div`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

interface NotificationStepProps {
    customer: CustomerInfo;
    onChannelsChange?: (channels: NotificationChannels) => void;
}

export const NotificationStep = ({ customer, onChannelsChange }: NotificationStepProps) => {
    const smsFeature = useFeature('SMS_EMAIL');
    const [channels, setChannels] = useState<NotificationChannels>({
        sms: true,
        email: !!customer.email,
    });

    const toggle = (channel: keyof NotificationChannels) => {
        const next = { ...channels, [channel]: !channels[channel] };
        setChannels(next);
        onChannelsChange?.(next);
    };

    return (
        <Container>
            <CustomerRow>
                <CustomerAvatar>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="8" r="4"/>
                        <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"/>
                    </svg>
                </CustomerAvatar>
                <CustomerDetails>
                    <CustomerName>
                        {customer.firstName} {customer.lastName}
                    </CustomerName>
                    <CustomerContact>
                        {[customer.phone, customer.email].filter(Boolean).join(' · ')}
                    </CustomerContact>
                </CustomerDetails>
            </CustomerRow>

            <SectionLabel>Kanały powiadomień</SectionLabel>

            <ChannelList>
                <LockedSection
                    locked={!smsFeature.enabled}
                    message="Twój abonament nie obsługuje powiadomień SMS."
                >
                <ChannelItem $checked={channels.sms}>
                    <Checkbox
                        type="checkbox"
                        checked={channels.sms}
                        onChange={() => toggle('sms')}
                    />
                    <ChannelIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                    </ChannelIcon>
                    <ChannelText>
                        <ChannelLabel>SMS</ChannelLabel>
                        <ChannelDetail>{customer.phone}</ChannelDetail>
                    </ChannelText>
                </ChannelItem>
                </LockedSection>

                <ChannelItem $checked={channels.email} $disabled={!customer.email} data-disabled={!customer.email || undefined}>
                    <Checkbox
                        type="checkbox"
                        checked={channels.email}
                        onChange={() => toggle('email')}
                        disabled={!customer.email}
                    />
                    <ChannelIcon>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                            <polyline points="22,6 12,13 2,6"/>
                        </svg>
                    </ChannelIcon>
                    <ChannelText>
                        <ChannelLabel>Email</ChannelLabel>
                        <ChannelDetail>{customer.email || 'Brak adresu email'}</ChannelDetail>
                    </ChannelText>
                </ChannelItem>
            </ChannelList>
        </Container>
    );
};
