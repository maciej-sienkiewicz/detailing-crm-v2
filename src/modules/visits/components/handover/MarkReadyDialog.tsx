import { useState } from 'react';
import styled from 'styled-components';
import { MessageSquare, Mail, User } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { PiiValue, joinPiiName } from '@/common/pii';
import { LockedSection } from '@/common/components/LockedSection';
import { useFeature } from '@/modules/subscription';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useMarkReady } from '../../hooks/useMarkReady';
import { Box, Section, SectionLabel } from './HandoverKit';
import type { Visit } from '../../types';
import type { NotificationChannels } from '../../types/stateTransitions';

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
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

const Avatar = styled.div`
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

const CustomerText = styled.div`
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

const Channel = styled.label<{ $checked: boolean; $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: ${st.radiusSm};
    border: 1px solid ${p => (p.$checked && !p.$disabled ? 'rgba(59,130,246,0.3)' : st.border)};
    background: ${p => (p.$checked && !p.$disabled ? st.accentBlueDim : st.bgCard)};
    cursor: ${p => (p.$disabled ? 'not-allowed' : 'pointer')};
    opacity: ${p => (p.$disabled ? 0.5 : 1)};
    transition: all 140ms ease;

    input {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
        cursor: inherit;
        accent-color: ${st.accentBlue};
    }
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

const StatusNote = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.5;
`;

const ModalFooterSplit = styled(ModalFooter)`
    @media (max-width: 560px) {
        flex-direction: column-reverse;
        align-items: stretch;

        > button { width: 100%; }
    }
`;

interface MarkReadyDialogProps {
    visit: Visit;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

/**
 * Oznaczenie pojazdu jako gotowego do odbioru — jedno potwierdzenie.
 *
 * Poprzednio był to dwustopniowy kreator, w którym pierwszy krok („weryfikacja
 * jakości") nie zapisywał żadnych danych i miał wszystkie checkboxy zaznaczone
 * domyślnie. Został usunięty; realna bramka — usługi wymagające potwierdzenia —
 * działa w widoku wizyty i blokuje otwarcie tego okna.
 */
export const MarkReadyDialog = ({ visit, isOpen, onClose, onSuccess }: MarkReadyDialogProps) => {
    const smsFeature = useFeature('SMS_EMAIL');
    const hasEmail = !!visit.customer.email;

    // Okno jest montowane dopiero przy otwarciu i odmontowywane po zamknięciu,
    // więc stan startowy wystarczy ustawić raz.
    const [channels, setChannels] = useState<NotificationChannels>({ sms: true, email: hasEmail });

    const { markReady, isMarkingReady } = useMarkReady(visit.id, () => {
        onSuccess?.();
        onClose();
    });

    const toggle = (channel: keyof NotificationChannels) =>
        setChannels(prev => ({ ...prev, [channel]: !prev[channel] }));

    const willNotify = channels.sms || channels.email;
    const serviceCount = visit.services.filter(s => s.status !== 'REJECTED').length;

    return (
        <ModalShell isOpen={isOpen} onClose={isMarkingReady ? () => {} : onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Pojazd gotowy do odbioru</ModalTitle>
                    <ModalSubtitle>
                        {[visit.vehicle.brand, visit.vehicle.model, visit.vehicle.licensePlate]
                            .filter(Boolean)
                            .join(' · ')}
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={isMarkingReady ? () => {} : onClose} />
            </ModalHeader>

            <ModalContent>
                <Body>
                    <CustomerRow>
                        <Avatar>
                            <User />
                        </Avatar>
                        <CustomerText>
                            <CustomerName>
                                <PiiValue
                                    value={joinPiiName(visit.customer.firstName, visit.customer.lastName)}
                                    kind="name"
                                />
                            </CustomerName>
                            <CustomerContact>
                                <PiiValue value={visit.customer.phone} kind="phone" />
                                {visit.customer.phone && visit.customer.email ? ' · ' : ''}
                                <PiiValue value={visit.customer.email} kind="email" />
                            </CustomerContact>
                        </CustomerText>
                    </CustomerRow>

                    <Section>
                        <SectionLabel>Powiadom klienta</SectionLabel>
                        <LockedSection
                            locked={!smsFeature.enabled}
                            message="Twój abonament nie obsługuje powiadomień SMS."
                        >
                            <Channel $checked={channels.sms}>
                                <input
                                    type="checkbox"
                                    checked={channels.sms}
                                    onChange={() => toggle('sms')}
                                />
                                <ChannelIcon>
                                    <MessageSquare />
                                </ChannelIcon>
                                <ChannelText>
                                    <ChannelLabel>SMS</ChannelLabel>
                                    <ChannelDetail>
                                        <PiiValue value={visit.customer.phone} kind="phone" />
                                    </ChannelDetail>
                                </ChannelText>
                            </Channel>
                        </LockedSection>

                        <Channel $checked={channels.email} $disabled={!hasEmail}>
                            <input
                                type="checkbox"
                                checked={channels.email}
                                disabled={!hasEmail}
                                onChange={() => toggle('email')}
                            />
                            <ChannelIcon>
                                <Mail />
                            </ChannelIcon>
                            <ChannelText>
                                <ChannelLabel>E-mail</ChannelLabel>
                                <ChannelDetail>
                                    <PiiValue
                                        value={visit.customer.email}
                                        kind="email"
                                        emptyFallback="Brak adresu e-mail"
                                    />
                                </ChannelDetail>
                            </ChannelText>
                        </Channel>
                    </Section>

                    <Box>
                        <StatusNote>
                            {serviceCount === 1
                                ? 'Jedna usługa potwierdzona.'
                                : `Wszystkie ${serviceCount} usługi potwierdzone.`}{' '}
                            Po oznaczeniu pojazd trafi na listę gotowych do odbioru.
                        </StatusNote>
                    </Box>
                </Body>
            </ModalContent>

            <ModalFooterSplit>
                <SharedButton
                    $variant="secondary"
                    type="button"
                    disabled={isMarkingReady}
                    onClick={onClose}
                >
                    Anuluj
                </SharedButton>
                <SharedButton
                    $variant="primary"
                    type="button"
                    disabled={isMarkingReady}
                    onClick={() => markReady(channels)}
                >
                    {isMarkingReady
                        ? 'Zapisywanie…'
                        : willNotify
                          ? 'Powiadom i oznacz jako gotowe'
                          : 'Oznacz jako gotowe'}
                </SharedButton>
            </ModalFooterSplit>
        </ModalShell>
    );
};
