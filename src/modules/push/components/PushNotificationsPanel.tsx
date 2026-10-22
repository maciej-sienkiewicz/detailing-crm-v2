// src/modules/push/components/PushNotificationsPanel.tsx
//
// Ustawienia → Telefon → Powiadomienia (i Dzwonienie z komputera, które paruje się tak samo).
//
// Powiadomienie ma zabuczeć w kieszeni, więc włącza się je NA TYM urządzeniu,
// które ma je pokazywać - przeglądarka pyta o zgodę tylko dla siebie.
//
// Poprzednia wersja panelu wychodziła z założenia, że ustawienia otwiera się na
// komputerze, i pokazywała wyłącznie kod QR do /call-device. Otwarty na telefonie
// (a po dodaniu aplikacji do ekranu głównego to naturalne miejsce) dawał kod QR,
// którego nie da się zeskanować własnym ekranem - funkcja była nieosiągalna.
// Teraz przycisk parowania jest ZAWSZE, gdy przeglądarka obsługuje push, a kod QR
// pojawia się tylko tam, gdzie ma sens: na komputerze, jako droga na telefon.
//
// Części panelu nazywały etykiety 11 px wersalikami w szarości - jedyna rama
// każdej części (CLAUDE.md §2, wycofane). Teraz: „To urządzenie" leży na jedynej
// wyniesionej powierzchni (to tu się coś robi), kod QR i lista urządzeń płasko.
//
// Kolejność to kolejność pytań: skąd się parujesz → co przychodzi na które urządzenie.
// Ustawienie raportu stało tu między „To urządzenie" a kodem QR, a podsumowania reklam
// pod całością - widok skakał między „gdzie" i „jak często". Ustawienia „jak często"
// są teraz razem, pod tym panelem (PhoneSetups).
//
// Na komputerze nie ma kreatora „Włącz powiadomienia na tym urządzeniu": powiadomienia
// mają przychodzić na telefon, więc pierwsza i jedyna wyniesiona karta to kod QR.
// Komputer, który już je kiedyś włączył, nadal jest kolumną w tabeli rodzajów
// (z oznaczeniem „To urządzenie") i tam się go odłącza.

import { useState } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/common/components/Toast';
import { Button, Card, SectionTitle, ui } from '@/common/components/ui';
import { usePushDevice } from '../hooks/usePushDevice';
import { isMobileDevice } from '../utils/webPush';
import { PushNotificationWizard } from './PushNotificationWizard';
import { DeviceNotificationSettings } from './DeviceNotificationSettings';

const PAIRING_URL_PATH = '/call-device';

export function PushNotificationsPanel() {
    const push = usePushDevice();
    const { showError } = useToast();
    const [copied, setCopied] = useState(false);

    // Tylko o układ ekranu: na telefonie kod QR jest bezużyteczny, na komputerze
    // jest jedyną wygodną drogą na telefon. O tym, czy da się tu sparować,
    // decyduje wyłącznie wsparcie przeglądarki (patrz PushNotificationWizard).
    const onPhone = isMobileDevice();
    const pairingUrl = `${window.location.origin}${PAIRING_URL_PATH}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(pairingUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            showError('Nie udało się skopiować linku', 'Skopiuj adres ręcznie z paska przeglądarki.');
        }
    };

    return (
        <Wrap>
            {/* Na telefonie nie da się zeskanować własnego ekranu - tam parowanie dzieje się
                tutaj, w kreatorze. Na komputerze kod QR to droga na telefon. */}
            {onPhone ? (
                <PairingBlock>
                    <SectionTitle as="h3">Ten telefon</SectionTitle>
                    <PushNotificationWizard push={push} />
                </PairingBlock>
            ) : (
                <PairingBlock>
                    <SectionTitle as="h3">Dodaj telefon</SectionTitle>
                    <BlockLead>
                        Powiadomienia z CRM przychodzą na telefon. Kolejne telefony dodaj tym samym kodem.
                    </BlockLead>
                    <Layout>
                        <QrPanel>
                            <QrBox>
                                <QRCodeSVG
                                    value={pairingUrl}
                                    size={132}
                                    fgColor="#0f172a"
                                    bgColor="#ffffff"
                                    level="M"
                                />
                            </QrBox>
                            <QrLabel>Kod dla telefonu</QrLabel>
                        </QrPanel>

                        <Steps>
                            <StepList>
                                <li>Zeskanuj kod aparatem telefonu i zaloguj się do CRM, jeśli trzeba.</li>
                                <li>Na iPhonie dodaj CRM do ekranu początkowego. Instrukcja jest na ekranie telefonu.</li>
                                <li>Dotknij „Włącz powiadomienia” i zezwól na nie w okienku systemu.</li>
                            </StepList>

                            <CopyRow>
                                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                                    {copied ? 'Skopiowano link' : 'Skopiuj link dla telefonu'}
                                </Button>
                            </CopyRow>
                        </Steps>
                    </Layout>
                </PairingBlock>
            )}

            {/* Co przychodzi na które urządzenie - właściciel widzi całe studio. */}
            <DeviceNotificationSettings
                onRevoke={push.revokeDevice}
                currentDeviceId={push.currentDeviceId}
                emptyHint={onPhone
                    ? 'Włącz powiadomienia na tym telefonie.'
                    : 'Zeskanuj kod telefonem i włącz na nim powiadomienia.'}
            />
        </Wrap>
    );
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const PairingBlock = styled(Card)`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px 20px 20px;

    @media (max-width: 767px) { padding: 16px; }
`;

const BlockLead = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${ui.textMuted};
    line-height: 1.55;
    max-width: 68ch;
`;

const Layout = styled.div`
    display: flex;
    gap: 24px;
    align-items: flex-start;
    flex-wrap: wrap;
`;

const QrPanel = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
`;

const QrBox = styled.div`
    padding: 12px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    line-height: 0;
`;

const QrLabel = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
`;

const Steps = styled.div`
    flex: 1;
    min-width: min(260px, 100%);
`;

const StepList = styled.ol`
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 7px;
    font-size: 13px;
    line-height: 1.55;
    color: #475569;

    strong { color: #0f172a; }
`;

const CopyRow = styled.div`
    margin-top: 14px;
`;
