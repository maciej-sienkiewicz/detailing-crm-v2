import { useState } from 'react';
import { PiiValue, joinPiiName } from '@/common/pii';
import styled from 'styled-components';
import { User, MessageSquare, Mail } from 'lucide-react';
import type { NotificationChannels } from '../../hooks/useStateTransition';
import type { CustomerInfo } from '../../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { LockedSection } from '@/common/components/LockedSection';
import { useFeature } from '@/modules/subscription';
import { ModalSectionTitle } from '@/common/components/ModalKit';

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
                    <User size={15} />
                </CustomerAvatar>
                <CustomerDetails>
                    <CustomerName>
                        <PiiValue value={joinPiiName(customer.firstName, customer.lastName)} kind="name" />
                    </CustomerName>
                    <CustomerContact>
                        <PiiValue value={customer.phone} kind="phone" />
                        {customer.phone && customer.email ? ' · ' : ''}
                        <PiiValue value={customer.email} kind="email" />
                    </CustomerContact>
                </CustomerDetails>
            </CustomerRow>

            <ModalSectionTitle>Kanały powiadomień</ModalSectionTitle>

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
                        <MessageSquare size={13} />
                    </ChannelIcon>
                    <ChannelText>
                        <ChannelLabel>SMS</ChannelLabel>
                        <ChannelDetail><PiiValue value={customer.phone} kind="phone" /></ChannelDetail>
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
                        <Mail size={13} />
                    </ChannelIcon>
                    <ChannelText>
                        <ChannelLabel>Email</ChannelLabel>
                        <ChannelDetail><PiiValue value={customer.email} kind="email" emptyFallback="Brak adresu email" /></ChannelDetail>
                    </ChannelText>
                </ChannelItem>
            </ChannelList>
        </Container>
    );
};
