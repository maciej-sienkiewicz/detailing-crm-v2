import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { MessageSquare, Mail } from 'lucide-react';
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
import { PiiValue, joinPiiName } from '@/common/pii';
import { LockedSection } from '@/common/components/LockedSection';
import { useCapability, UpsellModal } from '@/modules/subscription';
import { Button, ChoiceCard, ChoiceList, Notice, SectionTitle } from '@/common/components/ui';
import { useMarkReady } from '../../hooks/useMarkReady';
import { useSmsReadiness } from '../../hooks/useSmsReadiness';
import { SmsActivationWizard } from '../SmsActivationWizard';
import type { Visit } from '../../types';
import type { NotificationChannels } from '../../types/stateTransitions';

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Lede = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.55;
    color: #475569;
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
 * Oznaczenie pojazdu jako gotowego do odbioru: jedno potwierdzenie.
 *
 * Poprzednio był to dwustopniowy kreator, w którym pierwszy krok („weryfikacja
 * jakości") nie zapisywał żadnych danych i miał wszystkie checkboxy zaznaczone
 * domyślnie. Został usunięty; realna bramka (usługi wymagające potwierdzenia)
 * działa w widoku wizyty i blokuje otwarcie tego okna.
 */
export const MarkReadyDialog = ({ visit, isOpen, onClose, onSuccess }: MarkReadyDialogProps) => {
    const comms = useCapability('COMM_SEND_TRANSACTIONAL');
    const hasEmail = !!visit.customer.email;

    // Okno jest montowane dopiero przy otwarciu i odmontowywane po zamknięciu,
    // więc stan startowy wystarczy ustawić raz. Bez modułu komunikacji kanały
    // startują wyłączone: blur na sekcji nie zeruje stanu, więc domyślne
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
    const [upsellOpen, setUpsellOpen] = useState(false);

    // Module gaps are already covered by the LockedSection below; this surfaces what
    // it cannot see.
    const smsGaps = smsReadiness.blocking.filter(r => r.id !== 'module' && r.id !== 'phone');

    const toggle = (channel: keyof NotificationChannels) => {
        if (!comms.enabled) return;
        setChannels(prev => ({ ...prev, [channel]: !prev[channel] }));
    };

    const willNotify = channels.sms || channels.email;
    const vehicleLabel = [[visit.vehicle.brand, visit.vehicle.model].filter(Boolean).join(' '), visit.vehicle.licensePlate].filter(Boolean).join(', ');

    return (
        <ModalShell isOpen={isOpen} onClose={isMarkingReady ? () => {} : onClose} size="md">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Pojazd gotowy do odbioru</ModalTitle>
                    <ModalSubtitle>{vehicleLabel}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={isMarkingReady ? () => {} : onClose} />
            </ModalHeader>

            <ModalContent>
                <Body>
                    <SectionTitle as="h3">Powiadom klienta</SectionTitle>
                    <Lede>
                        <PiiValue value={joinPiiName(visit.customer.firstName, visit.customer.lastName)} kind="name" />
                        {' '}dostanie wiadomość, że może odebrać auto.
                    </Lede>

                    {channels.sms && smsGaps.length > 0 && (
                        <Notice
                            tone="warn"
                            title="SMS nie wyjdzie"
                            action={<Button size="sm" onClick={() => setWizardOpen(true)}>Napraw teraz</Button>}
                        >
                            {smsGaps.map(g => `${g.label}: ${g.detail}`).join('. ')}.
                        </Notice>
                    )}

                    <LockedSection
                        locked={!comms.enabled}
                        message="Twój abonament nie obsługuje powiadomień SMS ani e-mail."
                        onLockedClick={() => setUpsellOpen(true)}
                    >
                        <ChoiceList>
                            <ChoiceCard
                                checked={channels.sms}
                                onChange={() => toggle('sms')}
                                icon={<MessageSquare />}
                                title="SMS"
                                detail={<PiiValue value={visit.customer.phone} kind="phone" emptyFallback="Brak numeru telefonu" />}
                            />
                            <ChoiceCard
                                checked={channels.email}
                                disabled={!hasEmail}
                                onChange={() => toggle('email')}
                                icon={<Mail />}
                                title="E-mail"
                                detail={<PiiValue value={visit.customer.email} kind="email" emptyFallback="Brak adresu e-mail" />}
                            />
                        </ChoiceList>
                    </LockedSection>
                </Body>
            </ModalContent>

            <ModalFooterSplit>
                <Button disabled={isMarkingReady} onClick={onClose}>Anuluj</Button>
                {/* Zieleń: krok domyka etap wizyty - ten sam przycisk co w nagłówku. */}
                <Button
                    variant="success"
                    disabled={isMarkingReady}
                    onClick={() => markReady({
                        sms: comms.enabled && channels.sms,
                        email: comms.enabled && channels.email,
                    })}
                >
                    {isMarkingReady
                        ? 'Zapisywanie...'
                        : willNotify
                          ? 'Powiadom i oznacz jako gotowe'
                          : 'Oznacz jako gotowe'}
                </Button>
            </ModalFooterSplit>

            {/* Mounted only while open: the wizard freezes its step list on mount. */}
            {wizardOpen && <SmsActivationWizard
                isOpen={wizardOpen}
                readiness={smsReadiness}
                templateKey="visitReadyForPickup"
                contextLabel={vehicleLabel}
                onClose={() => setWizardOpen(false)}
                onReady={() => setWizardOpen(false)}
            />}
            {upsellOpen && (
                <UpsellModal capability="COMM_SEND_TRANSACTIONAL" onClose={() => setUpsellOpen(false)} />
            )}
        </ModalShell>
    );
};
