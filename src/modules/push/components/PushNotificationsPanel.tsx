// src/modules/push/components/PushNotificationsPanel.tsx
//
// „Powiadomienia" w Ustawieniach → Urządzenia mobilne.
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

import { useState } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/common/components/Toast';
import { usePushDevice } from '../hooks/usePushDevice';
import { isMobileDevice } from '../utils/webPush';
import { PushPairingCard } from './PushPairingCard';
import { PushDeviceList } from './PushDeviceList';

const PAIRING_URL_PATH = '/call-device';

export function PushNotificationsPanel() {
    const push = usePushDevice();
    const { showError } = useToast();
    const [copied, setCopied] = useState(false);

    // Tylko o układ ekranu: na telefonie kod QR jest bezużyteczny, na komputerze
    // jest jedyną wygodną drogą na telefon. O tym, czy da się tu sparować,
    // decyduje wyłącznie wsparcie przeglądarki (patrz PushPairingCard).
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
            <PairingBlock>
                <BlockLabel>To urządzenie</BlockLabel>
                <PushPairingCard
                    push={push}
                    actionLabel={onPhone ? 'Włącz powiadomienia na tym telefonie' : 'Włącz powiadomienia tutaj'}
                />
                {!onPhone && !push.isSubscribedHere && push.support === 'supported' && (
                    <DesktopNote>
                        Powiadomienia mają sens na telefonie, który nosisz przy sobie - na komputerze
                        włącz je tylko wtedy, gdy pracujesz przy nim na co dzień.
                    </DesktopNote>
                )}
            </PairingBlock>

            {/* Na telefonie nie da się zeskanować własnego ekranu - kod QR zostaje
                dla komputera, jako sposób przeniesienia się na telefon. */}
            {!onPhone && (
                <PhoneBlock>
                    <BlockLabel>Twój telefon</BlockLabel>
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
                            <QrLabel>Zeskanuj telefonem</QrLabel>
                        </QrPanel>

                        <Steps>
                            <StepList>
                                <li>Zeskanuj kod telefonem i <strong>zaloguj się</strong> do CRM, jeśli poprosi.</li>
                                <li>
                                    Na iPhonie najpierw <strong>dodaj aplikację do ekranu głównego</strong>
                                    {' '}(Safari → Udostępnij → „Dodaj do ekranu głównego") i otwórz ją z ikony -
                                    inaczej iOS nie pozwala na powiadomienia.
                                </li>
                                <li>Dotknij <strong>„Włącz powiadomienia"</strong> i zezwól, gdy telefon zapyta.</li>
                                <li>
                                    To samo zrobisz w aplikacji na telefonie:
                                    {' '}<strong>Ustawienia → Urządzenia mobilne → Powiadomienia</strong>.
                                </li>
                            </StepList>

                            <CopyLinkBtn type="button" onClick={handleCopyLink}>
                                {copied ? 'Skopiowano link' : 'Skopiuj link dla telefonu'}
                            </CopyLinkBtn>
                        </Steps>
                    </Layout>
                </PhoneBlock>
            )}

            {push.devices.length > 0 && (
                <DevicesBlock>
                    <BlockLabel>Sparowane urządzenia</BlockLabel>
                    {/* Komunikat o odłączeniu pokazuje sama lista - inaczej byłyby dwa. */}
                    <PushDeviceList devices={push.devices} onRevoke={push.revokeDevice} />
                </DevicesBlock>
            )}
        </Wrap>
    );
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
`;

const PairingBlock = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const PhoneBlock = styled.section`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 20px;
    border-top: 1px solid #f1f5f9;
`;

const DevicesBlock = styled.section`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 20px;
    border-top: 1px solid #f1f5f9;
`;

const BlockLabel = styled.h4`
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: #94a3b8;
`;

const DesktopNote = styled.p`
    margin: 0;
    font-size: 12.5px;
    color: #94a3b8;
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
    min-width: 260px;
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

const CopyLinkBtn = styled.button`
    margin-top: 14px;
    padding: 8px 14px;
    background: white;
    color: #334155;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;

    &:hover { background: #f8fafc; }
`;
