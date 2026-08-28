// src/modules/push/components/CallPhonesPanel.tsx
//
// „Telefony do połączeń" w Ustawieniach → Urządzenia mobilne.
//
// Samo parowanie musi się odbyć NA TELEFONIE (przeglądarka pyta o zgodę na
// powiadomienia tam, gdzie ma je wyświetlać), więc na komputerze pokazujemy kod
// QR do /call-device. Gdy ustawienia są otwarte na telefonie, ten sam panel daje
// przycisk parowania tego urządzenia — nie ma sensu kazać skanować własnego
// ekranu.

import { useState } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/common/components/Toast';
import { usePushDevice } from '../hooks/usePushDevice';
import { isMobileDevice } from '../utils/webPush';

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
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

const PairHereBtn = styled.button`
    margin-top: 14px;
    padding: 10px 16px;
    background: #0ea5e9;
    color: white;
    border: none;
    border-radius: 9px;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:hover:not(:disabled) { background: #0284c7; }
    &:disabled { opacity: 0.6; cursor: default; }
`;

const PairedHere = styled.p`
    margin: 14px 0 0;
    font-size: 13px;
    font-weight: 600;
    color: #059669;
`;

const DeviceCard = styled.div`
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
`;

const DeviceRow = styled.div<{ $revoked?: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    border-bottom: 1px solid #f1f5f9;
    opacity: ${p => (p.$revoked ? 0.5 : 1)};

    &:last-child { border-bottom: none; }
`;

const DeviceInfo = styled.div`
    flex: 1;
    min-width: 0;

    p { margin: 0; }
    p:first-child { font-size: 13px; font-weight: 600; color: #0f172a; }
    p:last-child { font-size: 12px; color: #94a3b8; }
`;

const RevokeBtn = styled.button`
    padding: 5px 11px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;

    &:hover:not(:disabled) { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.3); color: #dc2626; }
    &:disabled { opacity: 0.5; cursor: default; }
`;

const formatWhen = (iso: string | null): string =>
    iso ? new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : 'jeszcze nie użyto';

export function CallPhonesPanel() {
    const push = usePushDevice();
    const { showError, showSuccess } = useToast();
    const [revokingId, setRevokingId] = useState<string | null>(null);

    // Na komputerze nie proponujemy parowania: powiadomienie ma zadzwonić
    // z telefonu, a push na maszynie, z której klikamy numer, nic nie daje.
    // Zostaje sam kod QR, czyli jedyna droga, która ma sens.
    const canPairHere =
        isMobileDevice() &&
        push.support === 'supported' &&
        !push.iosNeedsInstall &&
        !push.isSubscribedHere;

    const handleEnable = async () => {
        try {
            await push.enable();
            showSuccess('Sparowano', 'To urządzenie będzie odbierać połączenia zlecone z komputera.');
        } catch (error) {
            showError(
                'Nie udało się sparować',
                error instanceof Error && error.message === 'permission-denied'
                    ? 'Powiadomienia są zablokowane. Odblokuj je w ustawieniach przeglądarki dla tej strony.'
                    : 'Spróbuj ponownie.'
            );
        }
    };

    const handleRevoke = async (deviceId: string) => {
        setRevokingId(deviceId);
        try {
            await push.revokeDevice(deviceId);
            showSuccess('Telefon odłączony', 'To urządzenie nie będzie już dostawać powiadomień o połączeniach.');
        } catch {
            showError('Nie udało się odłączyć', 'Spróbuj ponownie.');
        } finally {
            setRevokingId(null);
        }
    };

    return (
        <Wrap>
            <Layout>
                <QrPanel>
                    <QrBox>
                        <QRCodeSVG
                            value={`${window.location.origin}/call-device`}
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
                        <li>Na iPhonie najpierw <strong>dodaj aplikację do ekranu głównego</strong>, bo Safari inaczej nie wyświetli powiadomień.</li>
                        <li>Dotknij <strong>„Włącz powiadomienia o połączeniach"</strong> i zezwól na powiadomienia.</li>
                        <li>Od teraz kliknięcie numeru klienta na komputerze wyświetli na telefonie powiadomienie z przyciskiem <strong>„Zadzwoń"</strong>.</li>
                    </StepList>

                    {canPairHere && (
                        <PairHereBtn type="button" onClick={handleEnable} disabled={push.isEnabling}>
                            {push.isEnabling ? 'Paruję...' : 'Sparuj to urządzenie'}
                        </PairHereBtn>
                    )}
                    {push.isSubscribedHere && (
                        <PairedHere>To urządzenie odbiera połączenia z komputera.</PairedHere>
                    )}
                </Steps>
            </Layout>

            {push.devices.length > 0 && (
                <DeviceCard>
                    {push.devices.map(device => (
                        <DeviceRow key={device.id} $revoked={!device.active}>
                            <DeviceInfo>
                                <p>{device.deviceName}{!device.active && ' (odłączony)'}</p>
                                <p>ostatnio: {formatWhen(device.lastUsedAt)}</p>
                            </DeviceInfo>
                            {device.active && (
                                <RevokeBtn
                                    type="button"
                                    onClick={() => handleRevoke(device.id)}
                                    disabled={revokingId === device.id}
                                >
                                    {revokingId === device.id ? 'Odłączam...' : 'Odłącz'}
                                </RevokeBtn>
                            )}
                        </DeviceRow>
                    ))}
                </DeviceCard>
            )}
        </Wrap>
    );
}
