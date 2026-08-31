// src/modules/settings/components/PushDevicesSection.tsx
//
// „Zezwolenia na powiadomienia" — telefony, które odbierają powiadomienia
// z CRM (dziś: prośba o połączenie z komputera, „Zadzwoń" jednym dotknięciem).
//
// Zgody na powiadomienia udziela PRZEGLĄDARKA URZĄDZENIA, na którym stoi
// użytkownik, i tylko w reakcji na jego gest — z komputera nie da się włączyć
// powiadomień na telefonie. Dlatego ekran rozgałęzia się tak samo jak
// konfiguracja kontaktów: na telefonie przycisk, na komputerze kod QR, który
// otwiera tę samą operację na właściwym urządzeniu.

import { useState } from 'react';
import styled from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/common/components/Toast';
import { usePushDevice } from '@/modules/push';
import { Card, ColLabel, EmptyWrap, EmptyTitle, EmptyDesc, SkeletonBox, Badge } from './rbacShared.styles';

/** Telefon czy komputer — decyduje o tym, czy pokazać przycisk, czy kod QR. */
function isHandheld(): boolean {
    return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

function formatWhen(iso: string | null): string {
    if (!iso) return 'Jeszcze nie użyto';
    return new Date(iso).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' });
}

export function PushDevicesSection() {
    const push = usePushDevice();
    const { showError, showSuccess } = useToast();
    const [handheld] = useState(isHandheld);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const pairUrl = `${window.location.origin}/call-device`;

    const handleEnable = async () => {
        try {
            await push.enable();
            showSuccess('Gotowe', 'To urządzenie będzie odbierać powiadomienia z CRM.');
        } catch (error) {
            if (error instanceof Error && error.message === 'permission-denied') {
                showError('Powiadomienia zablokowane', 'Odblokuj je w ustawieniach przeglądarki dla tej strony.');
            } else {
                showError('Nie udało się włączyć powiadomień. Spróbuj ponownie.');
            }
        }
    };

    const handleRevoke = async (deviceId: string) => {
        setRevokingId(deviceId);
        try {
            await push.revokeDevice(deviceId);
            showSuccess('Zezwolenie cofnięte', 'To urządzenie nie będzie już dostawać powiadomień.');
        } finally {
            setRevokingId(null);
        }
    };

    return (
        <>
            <Intro>
                <IntroTitle>Powiadomienia o połączeniach</IntroTitle>
                <IntroDesc>
                    Kliknięcie numeru klienta na komputerze wyświetla na telefonie powiadomienie
                    z przyciskiem „Zadzwoń". Zgodę na powiadomienia trzeba wydać na każdym
                    telefonie osobno — z komputera nie da się jej włączyć zdalnie.
                </IntroDesc>
            </Intro>

            <SetupCard>
                {handheld ? (
                    <HandheldSetup
                        push={push}
                        onEnable={handleEnable}
                    />
                ) : (
                    <>
                        <QrWrap>
                            <QRCodeSVG value={pairUrl} size={132} level="M" fgColor="#0f172a" bgColor="#ffffff" />
                        </QrWrap>
                        <Steps>
                            <Step><StepNo>1</StepNo>Zeskanuj kod aparatem telefonu — otworzy się strona parowania.</Step>
                            <Step><StepNo>2</StepNo>Dotknij <strong>Włącz powiadomienia na tym urządzeniu</strong> i wybierz <strong>Zezwól</strong>.</Step>
                            <Step><StepNo>3</StepNo>Telefon pojawi się na liście poniżej. Powiadomienia docierają też przy zamkniętej przeglądarce.</Step>
                            <IosNote>
                                Na iPhonie strona musi być najpierw dodana do ekranu głównego
                                (Safari → Udostępnij → „Dodaj do ekranu głównego") — iOS wysyła
                                powiadomienia tylko do zainstalowanej aplikacji.
                            </IosNote>
                        </Steps>
                    </>
                )}
            </SetupCard>

            <Card>
                <ListHeader>
                    <ColLabel>Urządzenie</ColLabel>
                    <ColLabel>Ostatnie powiadomienie</ColLabel>
                    <ColLabel>Stan</ColLabel>
                    <ColLabel />
                </ListHeader>

                {push.isLoadingDevices ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <ListRow key={i}>
                            <SkeletonBox $w={`${55 + (i % 2) * 15}%`} />
                            <SkeletonBox $w="110px" />
                            <SkeletonBox $w="80px" />
                            <SkeletonBox $w="60px" />
                        </ListRow>
                    ))
                ) : push.devices.length === 0 ? (
                    <EmptyWrap>
                        <EmptyTitle>Żadne urządzenie nie ma jeszcze zezwolenia</EmptyTitle>
                        <EmptyDesc>
                            {handheld
                                ? 'Włącz powiadomienia powyżej — zajmie to chwilę.'
                                : 'Zeskanuj kod telefonem, żeby wydać zezwolenie na tym telefonie.'}
                        </EmptyDesc>
                    </EmptyWrap>
                ) : (
                    push.devices.map(device => (
                        <ListRow key={device.id} $muted={!device.active}>
                            <DeviceName>{device.deviceName}</DeviceName>
                            <CellText>{formatWhen(device.lastUsedAt)}</CellText>
                            <div>
                                {device.active
                                    ? <Badge $variant="green">Odbiera powiadomienia</Badge>
                                    : <Badge $variant="gray">Odłączone</Badge>}
                            </div>
                            <RowActions>
                                {device.active && (
                                    <RevokeBtn
                                        type="button"
                                        onClick={() => handleRevoke(device.id)}
                                        disabled={revokingId === device.id}
                                    >
                                        {revokingId === device.id ? 'Cofam…' : 'Cofnij'}
                                    </RevokeBtn>
                                )}
                            </RowActions>
                        </ListRow>
                    ))
                )}
            </Card>
        </>
    );
}

/**
 * Ustawienia otwarte na telefonie: zgodę można wydać tu i teraz, więc zamiast
 * kodu QR pokazujemy stan tego urządzenia i jeden przycisk.
 */
function HandheldSetup({ push, onEnable }: {
    push: ReturnType<typeof usePushDevice>;
    onEnable: () => void;
}) {
    if (push.iosNeedsInstall) {
        return (
            <Notice>
                Na iPhonie dodaj najpierw aplikację do ekranu głównego (Safari → Udostępnij →
                „Dodaj do ekranu głównego"), otwórz ją i wróć tutaj. iOS wysyła powiadomienia
                tylko do zainstalowanej aplikacji.
            </Notice>
        );
    }
    if (push.support === 'unsupported') {
        return <Notice>Ta przeglądarka nie obsługuje powiadomień push.</Notice>;
    }
    if (push.support === 'denied') {
        return (
            <Notice>
                Powiadomienia są zablokowane dla tej strony. Odblokuj je w ustawieniach
                przeglądarki i odśwież stronę.
            </Notice>
        );
    }
    if (push.isSubscribedHere) {
        return <NoticeOk>To urządzenie ma zezwolenie i odbiera powiadomienia z CRM.</NoticeOk>;
    }
    return (
        <EnableWrap>
            <EnableBtn type="button" onClick={onEnable} disabled={push.isEnabling}>
                {push.isEnabling ? 'Włączam…' : 'Włącz powiadomienia na tym urządzeniu'}
            </EnableBtn>
            <EnableHint>
                Przeglądarka zapyta o zgodę — wybierz <strong>Zezwól</strong>.
            </EnableHint>
        </EnableWrap>
    );
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const Intro = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const IntroTitle = styled.h3`
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
`;

const IntroDesc = styled.p`
    margin: 0;
    max-width: 620px;
    font-size: 13px;
    line-height: 1.55;
    color: #64748b;
`;

const SetupCard = styled.div`
    display: flex;
    gap: 20px;
    padding: 16px;
    background: rgba(14, 165, 233, 0.06);
    border: 1px solid rgba(14, 165, 233, 0.25);
    border-radius: 12px;

    @media (max-width: 639px) { flex-direction: column; align-items: stretch; }
`;

const QrWrap = styled.div`
    flex-shrink: 0;
    padding: 10px;
    background: #fff;
    border-radius: 10px;
    line-height: 0;
`;

const Steps = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
`;

const Step = styled.div`
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: 13px;
    line-height: 1.5;
    color: #334155;
`;

const StepNo = styled.span`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #0ea5e9;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
`;

const IosNote = styled.p`
    margin: 2px 0 0 30px;
    font-size: 12px;
    line-height: 1.5;
    color: #94a3b8;
`;

const Notice = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
    color: #92400e;
`;

const NoticeOk = styled(Notice)`
    color: #059669;
    font-weight: 600;
`;

const EnableWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
`;

const EnableBtn = styled.button`
    width: 100%;
    min-height: 46px;
    padding: 0 18px;
    border: none;
    border-radius: 10px;
    background: #0ea5e9;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;

    &:hover { background: #0284c7; }
    &:disabled { opacity: 0.6; cursor: default; }
`;

const EnableHint = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.5;
    color: #64748b;

    strong { color: #0f172a; }
`;

const ListHeader = styled.div`
    display: grid;
    grid-template-columns: 1.4fr 1.1fr 1fr 110px;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid #f1f5f9;

    @media (max-width: 639px) { display: none; }
`;

const ListRow = styled.div<{ $muted?: boolean }>`
    display: grid;
    grid-template-columns: 1.4fr 1.1fr 1fr 110px;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #f8fafc;
    opacity: ${p => (p.$muted ? 0.55 : 1)};

    &:last-child { border-bottom: none; }

    @media (max-width: 639px) {
        grid-template-columns: 1fr auto;
        row-gap: 6px;
    }
`;

const DeviceName = styled.span`
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
`;

const CellText = styled.span`
    font-size: 13px;
    color: #64748b;

    @media (max-width: 639px) { display: none; }
`;

const RowActions = styled.div`
    display: flex;
    justify-content: flex-end;
`;

const RevokeBtn = styled.button`
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;

    &:hover { border-color: #fca5a5; color: #dc2626; }
    &:disabled { opacity: 0.6; cursor: default; }
`;
