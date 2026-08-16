import { useEffect, useState } from 'react';
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
import { useCapability } from '@/modules/subscription';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useMarkReady } from '../../hooks/useMarkReady';
import { useSmsReadiness } from '../../hooks/useSmsReadiness';
import { SmsActivationWizard } from '../SmsActivationWizard';
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
    const comms = useCapability('COMM_SEND_TRANSACTIONAL');
    const hasEmail = !!visit.customer.email;

    // Okno jest montowane dopiero przy otwarciu i odmontowywane po zamknięciu,
    // więc stan startowy wystarczy ustawić raz. Bez modułu komunikacji kanały
    // startują wyłączone — blur na sekcji nie zeruje stanu, więc domyślne
    // sms:true poszłoby do API mimo blokady (backend odrzuciłby je z 402).
    const [channels, setChannels] = useState<NotificationChannels>(() => ({
        sms: false,
        email: false,
    }));
    useEffect(() => {
        if (!comms.isLoading) {
            setChannels({ sms: comms.enabled, email: comms.enabled && hasEmail });
        }
        // Ustawiamy raz, po rozstrzygnięciu entitlementów dla świeżo otwartego okna.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comms.isLoading]);

    const { markReady, isMarkingReady } = useMarkReady(visit.id, () => {
        onSuccess?.();
        onClose();
    });

    // The module lock above is only the first requirement. A disabled or empty
    // "pojazd gotowy" template is the quiet one: the transition succeeds, the SMS
    // box stays ticked, and the customer is simply never told.
    const smsReadiness = useSmsReadiness({
        enabled: isOpen,
        customerPhone: visit.customer.phone,
        templateKey: 'visitReadyForPickup',
    });
    const [wizardOpen, setWizardOpen] = useState(false);

    // Module gaps are already covered by the LockedSection below; this surfaces what
    // it cannot see.
    const smsGaps = smsReadiness.blocking.filter(r => r.id !== 'module' && r.id !== 'phone');

    const toggle = (channel: keyof NotificationChannels) => {
        if (!comms.enabled) return;
        setChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
    };

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

                        {channels.sms && smsGaps.length > 0 && (
                            <SmsGapBar>
                                <SmsGapText>
                                    <strong>SMS nie wyjdzie</strong>
                                    {' — '}
                                    {smsGaps.map(g => `${g.label.toLowerCase()}: ${g.detail}`).join('; ')}.
                                </SmsGapText>
                                <SmsGapAction type="button" onClick={() => setWizardOpen(true)}>
                                    Napraw teraz
                                </SmsGapAction>
                            </SmsGapBar>
                        )}

                        <LockedSection
                            locked={!comms.enabled}
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

                        <Channel $checked={channels.email} $disabled={!hasEmail || !comms.enabled}>
                            <input
                                type="checkbox"
                                checked={channels.email}
                                disabled={!hasEmail || !comms.enabled}
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
                    onClick={() => markReady({
                        sms: comms.enabled && channels.sms,
                        email: comms.enabled && channels.email,
                    })}
                >
                    {isMarkingReady
                        ? 'Zapisywanie…'
                        : willNotify
                          ? 'Powiadom i oznacz jako gotowe'
                          : 'Oznacz jako gotowe'}
                </SharedButton>
            </ModalFooterSplit>

            {/* Mounted only while open — the wizard freezes its step list on mount. */}
            {wizardOpen && <SmsActivationWizard
                isOpen={wizardOpen}
                readiness={smsReadiness}
                templateKey="visitReadyForPickup"
                contextLabel={[visit.vehicle.brand, visit.vehicle.model, visit.vehicle.licensePlate]
                    .filter(Boolean)
                    .join(' · ')}
                onClose={() => setWizardOpen(false)}
                onReady={() => setWizardOpen(false)}
            />}
        </ModalShell>
    );
};

const SmsGapBar = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 10px 12px;
    margin-bottom: 8px;
    border: 1px solid rgba(245, 158, 11, 0.35);
    background: rgba(245, 158, 11, 0.08);
    border-radius: ${st.radiusSm};
`;

const SmsGapText = styled.p`
    flex: 1;
    min-width: 180px;
    margin: 0;
    font-size: ${st.fontXs};
    color: #78350f;
    line-height: 1.5;

    strong { font-weight: 700; }
`;

const SmsGapAction = styled.button`
    flex-shrink: 0;
    padding: 6px 12px;
    font-family: inherit;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: #92400e;
    background: white;
    border: 1px solid rgba(245, 158, 11, 0.45);
    border-radius: 8px;
    cursor: pointer;

    &:hover { background: rgba(245, 158, 11, 0.12); }
`;
