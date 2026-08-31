import { useState } from 'react';
import styled from 'styled-components';
import { useToast } from '@/common/components/Toast';
import { usePushDevice } from '../hooks/usePushDevice';

/**
 * „Zezwolenia na powiadomienia" na samym telefonie (trasa /call-device,
 * otwierana kodem QR ze „Skrótów mobilnych" albo z Ustawień → Urządzenia
 * mobilne). Zgody na powiadomienia udziela przeglądarka tego urządzenia i
 * tylko w reakcji na gest użytkownika, więc parowanie musi się odbyć TUTAJ —
 * ekran w Ustawieniach pokazuje ten sam stan i listę, ale na komputerze może
 * jedynie podać kod QR.
 */

const Page = styled.div`
    padding: 32px;
    max-width: 560px;

    @media (max-width: 600px) {
        padding: 20px 16px;
    }
`;

const PageTitle = styled.h1`
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.3px;
`;

const PageSubtitle = styled.p`
    margin: 0 0 24px;
    font-size: 14px;
    color: #64748b;
    line-height: 1.5;
`;

const Card = styled.div`
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const PrimaryBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 18px;
    background: #0ea5e9;
    color: white;
    border: none;
    border-radius: 10px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.22);
    transition: background 0.15s, transform 0.1s;

    svg { width: 16px; height: 16px; }
    &:hover { background: #0284c7; }
    &:active { transform: scale(0.98); }
    &:disabled { opacity: 0.6; cursor: default; }
`;

const StatusBadge = styled.div<{ $ok?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 10px;
    background: ${p => (p.$ok ? '#f0fdf4' : '#fffbeb')};
    border: 1px solid ${p => (p.$ok ? '#bbf7d0' : '#fde68a')};
    color: ${p => (p.$ok ? '#16a34a' : '#92400e')};
    font-size: 13px;
    font-weight: 600;

    svg { width: 15px; height: 15px; flex-shrink: 0; }
`;

const Hint = styled.p`
    margin: 0;
    font-size: 13px;
    color: #64748b;
    line-height: 1.55;

    strong { color: #0f172a; }
`;

const DeviceList = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
`;

const DeviceRow = styled.li<{ $revoked?: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 4px;
    border-bottom: 1px solid #f1f5f9;
    opacity: ${p => (p.$revoked ? 0.5 : 1)};

    &:last-child { border-bottom: none; }
`;

const DeviceInfo = styled.div`
    flex: 1;
    min-width: 0;

    p { margin: 0; }
    p:first-child { font-size: 14px; font-weight: 600; color: #0f172a; }
    p:last-child { font-size: 12px; color: #94a3b8; }
`;

const RevokeBtn = styled.button`
    padding: 6px 12px;
    background: transparent;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: #dc2626;
    cursor: pointer;

    &:hover { border-color: #fca5a5; background: #fef2f2; }
`;

const formatWhen = (iso: string | null): string => {
    if (!iso) return 'jeszcze nie użyto';
    return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
};

export const CallDeviceView = () => {
    const { showError, showSuccess } = useToast();
    const push = usePushDevice();
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const handleEnable = async () => {
        try {
            await push.enable();
            showSuccess('Ten telefon będzie odbierać połączenia zlecone z komputera.');
        } catch (error) {
            if (error instanceof Error && error.message === 'permission-denied') {
                showError('Powiadomienia zostały zablokowane. Odblokuj je w ustawieniach przeglądarki dla tej strony.');
            } else {
                showError('Nie udało się włączyć powiadomień. Spróbuj ponownie.');
            }
        }
    };

    const handleRevoke = async (deviceId: string) => {
        setRevokingId(deviceId);
        try {
            await push.revokeDevice(deviceId);
        } finally {
            setRevokingId(null);
        }
    };

    return (
        <Page>
            <PageTitle>Zezwolenia na powiadomienia</PageTitle>
            <PageSubtitle>
                Wydaj zezwolenie na tym telefonie, a kliknięcie numeru klienta na komputerze
                wyświetli tu powiadomienie z przyciskiem „Zadzwoń" — połączenie wykonasz
                jednym dotknięciem.
            </PageSubtitle>

            <Card>
                {push.iosNeedsInstall ? (
                    <StatusBadge>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        </svg>
                        Na iPhonie dodaj najpierw aplikację do ekranu głównego (Safari → Udostępnij →
                        „Dodaj do ekranu głównego"), potem otwórz ją i wróć tutaj.
                    </StatusBadge>
                ) : push.support === 'unsupported' ? (
                    <StatusBadge>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        Ta przeglądarka nie obsługuje powiadomień push.
                    </StatusBadge>
                ) : push.support === 'denied' ? (
                    <StatusBadge>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/>
                            <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/>
                            <path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                        Powiadomienia są zablokowane dla tej strony — odblokuj je w ustawieniach
                        przeglądarki i odśwież.
                    </StatusBadge>
                ) : push.isSubscribedHere ? (
                    <StatusBadge $ok>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Ten telefon odbiera połączenia z komputera.
                    </StatusBadge>
                ) : (
                    <>
                        <PrimaryBtn onClick={handleEnable} disabled={push.isEnabling} type="button">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.59 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            {push.isEnabling ? 'Włączam…' : 'Włącz powiadomienia na tym urządzeniu'}
                        </PrimaryBtn>
                        <Hint>
                            Przeglądarka zapyta o zgodę — wybierz <strong>Zezwól</strong>.
                            Powiadomienia docierają też przy zamkniętej przeglądarce.
                        </Hint>
                    </>
                )}
            </Card>

            {push.devices.length > 0 && (
                <>
                    <PageSubtitle as="h2" style={{ margin: '28px 0 10px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                        Sparowane urządzenia
                    </PageSubtitle>
                    <Card>
                        <DeviceList>
                            {push.devices.map(device => (
                                <DeviceRow key={device.id} $revoked={!device.active}>
                                    <DeviceInfo>
                                        <p>{device.deviceName}{!device.active && ' (odłączone)'}</p>
                                        <p>ostatnio: {formatWhen(device.lastUsedAt)}</p>
                                    </DeviceInfo>
                                    {device.active && (
                                        <RevokeBtn
                                            onClick={() => handleRevoke(device.id)}
                                            disabled={revokingId === device.id}
                                            type="button"
                                        >
                                            Odłącz
                                        </RevokeBtn>
                                    )}
                                </DeviceRow>
                            ))}
                        </DeviceList>
                    </Card>
                </>
            )}
        </Page>
    );
};
