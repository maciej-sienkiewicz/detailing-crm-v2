// src/modules/settings/components/phone/PhoneSetups.tsx
//
// Ustawienia funkcji telefonu, które wjeżdżają po „Ustaw powiadomienia",
// „Dodaj skrót na telefon"…
//
// Powiadomienia i kontakty to te same panele co dotąd - jedna implementacja, więc
// telefon zachowuje się tak samo, którędy by tu nie trafił. Skrót głosowy i instalacja
// aplikacji przyszły z dawnej strony „Skróty mobilne" (/mobile-shortcuts), do której
// nic w aplikacji nie linkowało.

import { useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { Navigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { Button, Notice, Panel, SectionTitle, Segmented, ui } from '@/common/components/ui';
import { isNativeApp } from '@/core/native/platform';
import { usePermissions } from '@/core/permissions';
import { useCapability } from '@/modules/subscription';
import { PushNotificationsPanel } from '@/modules/push/components/PushNotificationsPanel';
import { NativePushPanel } from '@/modules/push/native/NativePushPanel';
import { isMobileDevice } from '@/modules/push/utils/webPush';
import { reachNote, useOwnCategoryReach } from '@/modules/push/hooks/useOwnCategoryReach';
import type { PushNotificationCategory } from '@/modules/push/types';
import {
    APPOINTMENT_REMINDER_PERMISSION, AppointmentReminderSetting, MarketNotificationPreferences,
} from '@/common/components/notifications';
// Bezpośrednio z pliku, nie z indeksu modułu: indeks ciągnie widoki Statystyk z wykresami.
import {
    REPORT_NOTIFICATION_PERMISSIONS, ReportNotificationSetting,
} from '@/modules/statistics/components/ReportNotificationSetting';
import { useMobileShortcutToken, useRotateMobileShortcutToken } from '@/modules/voice-commands/hooks/useMobileShortcutToken';
import { usePWAInstall } from '@/modules/voice-commands/hooks/usePWAInstall';
import { ContactsSyncSection } from '../ContactsSyncSection';
import type { PhoneFeatureId } from './phoneFeatures';

// ─── Powiadomienia i dzwonienie ──────────────────────────────────────────────

/**
 * Najpierw „gdzie" (urządzenia i co do którego idzie), potem „kiedy i jak często" -
 * przypomnienie o rezerwacji, raport i podsumowania reklam razem, w jednej sekcji.
 * Wcześniej raport stał między „To urządzenie" a kodem QR, a reklamy osobną ramą pod
 * całością, i nic nie mówiło, jak te części się łączą. Przypomnienie stoi pierwsze:
 * dotyczy codziennej pracy przy aucie, raport i reklamy - spraw właściciela.
 *
 * Włącznik jest jeden: tabela „Rodzaje powiadomień". Sekcja niżej ustawia tylko „kiedy
 * i jak często", a wiersz rodzaju wyłączonego na wszystkich własnych urządzeniach jest
 * wyszarzony ze zdaniem, gdzie go włączyć (ReachGate). Do 25.10.2026 przypomnienie
 * i raport miały tu własne „Wyłączone" i ekran pokazywał „włączone" w tabeli przy
 * powiadomieniu, które nie przychodziło.
 */
function PushSetup() {
    const { can } = usePermissions();
    // Wiadomości o rynku reklam dostaje tylko marketing, i tylko w pakiecie z modułem
    // Instagrama - komu ich nie wyślemy, temu nie pokazujemy przełącznika bez skutku.
    const instagram = useCapability('INSTAGRAM_MONITOR');
    const showMarketPreferences = can('MARKETING_MANAGE') && instagram.enabled;
    const showReport = can([...REPORT_NOTIFICATION_PERMISSIONS]);
    const showReminder = can(APPOINTMENT_REMINDER_PERMISSION);

    return (
        <Stack>
            {/* W aplikacji ze sklepu jedna systemowa zgoda zamiast kreatora przeglądarki. */}
            {isNativeApp() ? <NativePushPanel /> : <PushNotificationsPanel />}
            {(showReminder || showReport || showMarketPreferences) && (
                <Summaries>
                    <SummariesHead>
                        <SectionTitle as="h3">Przypomnienia i podsumowania</SectionTitle>
                        <SummariesLead>
                            Ustaw, kiedy i jak często przychodzą. Czy przychodzą i na które
                            urządzenie, decyduje tabela „Rodzaje powiadomień”.
                        </SummariesLead>
                    </SummariesHead>
                    {showReminder && <ReachGate category="APPOINTMENT_REMINDERS"><AppointmentReminderSetting /></ReachGate>}
                    {showReport && <ReachGate category="REPORTS"><ReportNotificationSetting /></ReachGate>}
                    {showMarketPreferences && <ReachGate category="COMPETITION"><MarketNotificationPreferences embedded /></ReachGate>}
                </Summaries>
            )}
        </Stack>
    );
}

/**
 * Wiersz „kiedy i jak często" dla rodzaju, który nie dochodzi: wyszarzony, ze zdaniem,
 * gdzie go włączyć. Pola zostają czynne - czas czy częstotliwość można ustawić z góry.
 */
function ReachGate({ category, children }: { category: PushNotificationCategory; children: ReactNode }) {
    const note = reachNote(useOwnCategoryReach(category), category);
    return (
        <Gate $muted={note !== null}>
            <div className="settings">{children}</div>
            {note && <GateNote>{note}</GateNote>}
        </Gate>
    );
}

/**
 * Prośba o połączenie to powiadomienie (rodzaj „Dzwonienie z komputera"), więc telefon
 * paruje się tak samo jak do powiadomień - osobny kreator byłby drugą drogą do tego
 * samego, która prędzej czy później zacznie działać inaczej.
 */
function DialSetup() {
    return (
        <Stack>
            <Lead>
                Sparuj telefon, który masz przy sobie, i zostaw przy nim włączone „Dzwonienie
                z komputera”. Numer kliknięty na karcie klienta pojawia się wtedy na telefonie
                z przyciskiem „Zadzwoń”.
            </Lead>
            <PushNotificationsPanel />
        </Stack>
    );
}

// ─── Lead głosem ─────────────────────────────────────────────────────────────

export function VoiceShortcutSetup() {
    const { data: token, isLoading } = useMobileShortcutToken();
    const rotate = useRotateMobileShortcutToken();
    const [confirmRotate, setConfirmRotate] = useState(false);

    if (isLoading) return <Placeholder aria-busy="true" />;
    if (!token) {
        return <Notice tone="info">Skróty głosowe nie są dostępne dla tego konta.</Notice>;
    }

    // Token we fragmencie (#), nie w query stringu: fragment nie trafia do serwera,
    // więc ani do logów proxy, ani do nagłówka Referer.
    const hash = `#token=${encodeURIComponent(token)}`;
    const url = `${window.location.origin}/m/voice${hash}`;

    // Na telefonie ta strona przekierowuje od razu na sam skrót (jak dawne „Skróty
    // mobilne"). Dodana do ekranu głównego wprost z ustawień ikona startowała z manifestu
    // CRM - na Tablicy, a w aplikacji z ekranu głównego iPhone'a nie ma sesji z Safari,
    // więc kończyło się logowaniem (zgłoszenie z 27.10). Działa bez logowania wyłącznie
    // `/m/voice` z tokenem i własnym manifestem, więc to ją telefon ma dodać - a dawny
    // przycisk „Otwórz skrót" łatwo było przeoczyć i dodać stronę ustawień.
    if (isMobileDevice()) {
        return <Navigate to={{ pathname: '/m/voice', hash }} replace />;
    }

    return (
        <Stack>
            <QrLayout>
                <QrBox><QRCodeSVG value={url} size={136} fgColor={ui.ink} bgColor="#ffffff" level="M" /></QrBox>
                <Steps>
                    <li>Zeskanuj kod aparatem telefonu.</li>
                    <li>Dodaj otwartą stronę do ekranu głównego. W Safari: Udostępnij, Do ekranu początkowego. W Chrome: menu ⋮, Dodaj do ekranu głównego. Ikona „Lead głosem” otwiera się bez logowania.</li>
                    <li>Dotknij „Nowy lead” albo „Notatka” i mów.</li>
                </Steps>
            </QrLayout>

            <RotateRow>
                <Button variant="ghost" size="sm" onClick={() => setConfirmRotate(true)} disabled={rotate.isPending}>
                    Unieważnij link
                </Button>
                <span>Gdy telefon zginie albo link trafi w niepowołane ręce.</span>
            </RotateRow>

            <ConfirmationModal
                isOpen={confirmRotate}
                title="Unieważnić link do skrótów?"
                message="Dotychczasowy link i kod QR przestaną działać na wszystkich telefonach. Na telefonie zeskanuj potem nowy kod."
                variant="warning"
                confirmText="Unieważnij"
                onConfirm={() => rotate.mutate()}
                onCancel={() => setConfirmRotate(false)}
            />
        </Stack>
    );
}

// ─── Aplikacja na ekranie głównym ────────────────────────────────────────────

type InstallPlatform = 'ios' | 'android';

const isIos = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent)
    // iPadOS podaje się za Maca; rozpoznajemy go po ekranie dotykowym.
    || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

const INSTALL_STEPS: Record<InstallPlatform, string[]> = {
    // Na iOS ekran główny i powiadomienia działają wyłącznie z Safari.
    ios: [
        'Otwórz CRM w Safari. Inne przeglądarki na iPhonie tego nie potrafią.',
        'Dotknij Udostępnij na dole ekranu.',
        'Wybierz „Do ekranu początkowego” i Dodaj.',
    ],
    android: [
        'Otwórz CRM w Chrome.',
        'Dotknij menu ⋮ w prawym górnym rogu.',
        'Wybierz „Zainstaluj aplikację” albo „Dodaj do ekranu głównego”.',
    ],
};

export function AppInstallSetup() {
    const pwa = usePWAInstall();
    const onPhone = isMobileDevice();
    const [platform, setPlatform] = useState<InstallPlatform>(() => (isIos() ? 'ios' : 'android'));

    if (pwa.isInstalled) {
        return <Notice tone="ok">CRM jest już na ekranie głównym tego urządzenia.</Notice>;
    }

    // Chrome na Androidzie sam proponuje instalację - wtedy wystarczy jeden przycisk.
    if (onPhone && pwa.canInstall) {
        return (
            <Stack>
                <Lead>Ikona pojawi się na ekranie głównym obok innych aplikacji.</Lead>
                <div>
                    <Button variant="primary" size="lg" onClick={() => { void pwa.install(); }}>Dodaj do ekranu</Button>
                </div>
            </Stack>
        );
    }

    const steps = (
        <Steps>
            {INSTALL_STEPS[platform].map(step => <li key={step}>{step}</li>)}
        </Steps>
    );

    return (
        <Stack>
            {!onPhone && (
                <Lead>Zrób to na telefonie: zeskanuj kod, a potem dodaj otwartą stronę do ekranu głównego.</Lead>
            )}
            <Segmented
                label="Telefon"
                options={[{ value: 'ios', label: 'iPhone' }, { value: 'android', label: 'Android' }]}
                value={platform}
                onChange={setPlatform}
            />
            {onPhone ? steps : (
                <QrLayout>
                    <QrBox><QRCodeSVG value={`${window.location.origin}/dashboard`} size={136} fgColor={ui.ink} bgColor="#ffffff" level="M" /></QrBox>
                    {steps}
                </QrLayout>
            )}
        </Stack>
    );
}

// ─── Wybór ───────────────────────────────────────────────────────────────────

export function PhoneSetup({ feature }: { feature: PhoneFeatureId }) {
    switch (feature) {
        case 'push': return <PushSetup />;
        case 'calls': return <ContactsSyncSection />;
        case 'dial': return <DialSetup />;
        case 'voice': return <VoiceShortcutSetup />;
        case 'app': return <AppInstallSetup />;
        // Aparat nie ma ustawień: kod QR pojawia się na komputerze tam, gdzie jest potrzebny.
        case 'camera': return null;
    }
}

// ─── Style ───────────────────────────────────────────────────────────────────

const Stack = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

const Lead = styled.p`
    margin: 0;
    max-width: 62ch;
    font-size: 14px;
    line-height: 1.6;
    color: ${ui.textSecondary};
`;

// Płasko jak tabela nad nią: jedyną wyniesioną kartą w kolumnie jest blok parowania (CLAUDE.md §2).
const Summaries = styled(Panel)`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 18px;
    padding: 16px 20px 18px;

    @media (max-width: 767px) { padding: 16px; }
`;

const SummariesHead = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Gate = styled.div<{ $muted: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    max-width: 100%;

    .settings {
        max-width: 100%;
        opacity: ${p => (p.$muted ? 0.5 : 1)};
        transition: opacity 150ms ease;
    }
`;

const GateNote = styled.p`
    margin: 0;
    max-width: 68ch;
    font-size: 13px;
    line-height: 1.5;
    color: ${ui.inkSoft};
`;

const SummariesLead = styled.p`
    margin: 0;
    max-width: 68ch;
    font-size: 13px;
    line-height: 1.55;
    color: ${ui.textMuted};
`;

const QrLayout = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 20px;
    flex-wrap: wrap;
`;

const QrBox = styled.div`
    padding: 12px;
    border: 1px solid ${ui.line};
    border-radius: 14px;
    background: #ffffff;
    line-height: 0;
`;

const Steps = styled.ol`
    flex: 1;
    min-width: min(240px, 100%);
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13.5px;
    line-height: 1.55;
    color: ${ui.inkSoft};
`;

const RotateRow = styled.div`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px 10px;
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

const Placeholder = styled.div`
    height: 160px;
    border-radius: 14px;
    background: ${ui.surfaceAlt};
`;
