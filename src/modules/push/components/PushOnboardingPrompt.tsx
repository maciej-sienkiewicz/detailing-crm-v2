// src/modules/push/components/PushOnboardingPrompt.tsx
//
// Zachęta do włączenia powiadomień - na telefonie, w układzie aplikacji.
//
// Do tej pory powiadomienia włączało się wyłącznie z Ustawień → Urządzenia
// mobilne albo ze strony z kodu QR. Kto tam nie trafił, nie wiedział, że taka
// funkcja istnieje - a na iPhonie i tak nie dałby rady bez instrukcji. Zachęta
// przychodzi do użytkownika zamiast czekać, aż on przyjdzie do niej:
//
//   - tylko na telefonie (na komputerze powiadomienia mają mniejszy sens, a panel
//     w ustawieniach prowadzi tam na telefon przez kod QR);
//   - tylko gdy jest co zrobić: etap „dodaj do ekranu" albo „zezwól". Zablokowane,
//     włączone, nieobsługiwane - nic nie wyskakuje;
//   - nie od razu po wejściu: najpierw użytkownik widzi to, po co przyszedł;
//   - „Nie teraz" odkłada zachętę na dwa tygodnie. Odmowa systemowego monitu jest
//     ostateczna, a nasza - nie; dlatego pytamy NASZĄ kartą, a systemowy monit
//     pada dopiero w kreatorze, po wyjaśnieniu.
//
// Wyjątek od „nie od razu": aplikacja otwarta z ikony na iPhonie. Użytkownik
// właśnie przeszedł krok „dodaj do ekranu", więc następny krok ma czekać na
// niego, a nie kazać się szukać.
//
// Karta jest odcieniem marki z obwódką, bez wypełnienia: stoi nad cudzym widokiem,
// który ma własny krok następny (CLAUDE.md §2). Wypełniony przycisk jest dopiero
// w oknie kreatora, które na chwilę przejmuje ekran.

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalContent, CloseBtn } from '@/common/components/ModalKit';
import { Button, ui } from '@/common/components/ui';
import { BOTTOM_NAV_SPACE } from '@/widgets/BottomNav/constants';
import { usePushDevice } from '../hooks/usePushDevice';
import { isMobileDevice } from '../utils/webPush';
import { isServiceWorkerAllowedHere } from '../utils/serviceWorkerRegistration';
import { detectPushPlatform, readPlatformEnv } from '../utils/pushPlatform';
import { wizardStage } from '../utils/wizardStage';
import { PushNotificationWizard } from './PushNotificationWizard';
import { BellIcon } from './wizardIcons';

const SNOOZE_KEY = 'push-onboarding-snoozed-until';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
/** Tyle trwa „najpierw to, po co przyszedł" - potem zachęta może się pokazać. */
const SHOW_DELAY_MS = 6_000;
/** Aplikacja z ikony na iPhonie: krok „zezwól" czeka od razu. */
const SHOW_DELAY_AFTER_INSTALL_MS = 1_200;

const CARD_COPY: Partial<Record<ReturnType<typeof wizardStage>, { title: string; text: string }>> = {
    install: {
        title: 'Powiadomienia na tym iPhonie',
        text: 'Dwa kroki i telefon da znać o nowym zapytaniu czy zamkniętej wizycie.',
    },
    // Konto ma już aplikację na iPhonie, a użytkownik jest w Safari - nie każemy mu
    // instalować drugi raz, tylko mówimy, gdzie są jego powiadomienia.
    'open-installed': {
        title: 'Masz CRM na ekranie początkowym',
        text: 'Powiadomienia działają w aplikacji z ikony, nie w przeglądarce.',
    },
    ask: {
        title: 'Włącz powiadomienia',
        text: 'Telefon da znać o nowym zapytaniu, zamkniętej wizycie i połączeniu z komputera.',
    },
};

/** Tam kreator już jest na ekranie - druga droga do niego tylko by przeszkadzała. */
const HIDDEN_ON = ['/call-device', '/settings'];

const readSnoozedUntil = (): number => {
    try {
        return Number(localStorage.getItem(SNOOZE_KEY)) || 0;
    } catch {
        return 0;
    }
};

const snooze = () => {
    try {
        localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {
        // Tryb prywatny: zachęta wróci przy następnym uruchomieniu - trudno.
    }
};

/**
 * Warunki, które nie zależą od stanu push - sprawdzane PRZED zamontowaniem hooka,
 * żeby komputer i podgląd roli nie rejestrowały workera ani nie pytały o subskrypcję.
 */
const isEligibleDevice = (): boolean => {
    if (!isServiceWorkerAllowedHere() || !isMobileDevice()) return false;
    const kind = detectPushPlatform(readPlatformEnv()).kind;
    return kind === 'ios-install' || kind === 'ios-app' || kind === 'android';
};

export function PushOnboardingPrompt() {
    const [eligible] = useState(() => isEligibleDevice() && readSnoozedUntil() < Date.now());
    const { pathname } = useLocation();
    if (!eligible || HIDDEN_ON.some(prefix => pathname.startsWith(prefix))) return null;
    return <Prompt />;
}

function Prompt() {
    const push = usePushDevice({ withDevices: false });
    const stage = wizardStage(push);
    const [visible, setVisible] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    // Na iPhonie w Safari etap zależy od listy urządzeń konta („install" czy
    // „open-installed") - bez czekania na nią karta mogła zmienić treść pod palcem.
    const devicesPending = push.platform.kind === 'ios-install' && push.isLoadingDevices;
    const actionable = !devicesPending &&
        (stage === 'install' || stage === 'open-installed' || stage === 'ask');
    const justInstalled = push.platform.kind === 'ios-app';

    useEffect(() => {
        if (!actionable) return;
        const timer = window.setTimeout(
            () => setVisible(true),
            justInstalled ? SHOW_DELAY_AFTER_INSTALL_MS : SHOW_DELAY_MS,
        );
        return () => window.clearTimeout(timer);
    }, [actionable, justInstalled]);

    const dismiss = () => {
        snooze();
        setDismissed(true);
        setWizardOpen(false);
    };

    // Po włączeniu kreator zostaje otwarty (krok „sprawdź"), a karta znika.
    const showCard = visible && actionable && !dismissed && !wizardOpen;

    return (
        <>
            {showCard && (
                <Card role="region" aria-label="Powiadomienia na telefon">
                    <Tile><BellIcon /></Tile>
                    <Copy>
                        <CardTitle>{CARD_COPY[stage]?.title}</CardTitle>
                        <CardText>{CARD_COPY[stage]?.text}</CardText>
                    </Copy>
                    <Actions>
                        <Button variant="tinted" size="sm" onClick={() => setWizardOpen(true)}>
                            {stage === 'ask' ? 'Włącz' : 'Pokaż jak'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={dismiss}>Nie teraz</Button>
                    </Actions>
                </Card>
            )}

            <ModalShell isOpen={wizardOpen} onClose={() => setWizardOpen(false)} size="sm">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Powiadomienia na telefon</ModalTitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={() => setWizardOpen(false)} />
                </ModalHeader>
                <ModalContent>
                    <PushNotificationWizard
                        push={push}
                        onDismiss={stage === 'ready' ? undefined : dismiss}
                    />
                </ModalContent>
            </ModalShell>
        </>
    );
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const rise = keyframes`
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const Card = styled.div`
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(${BOTTOM_NAV_SPACE} + 12px);
    /* Nad treścią i dolnym paskiem (97), pod oknami (1000). */
    z-index: 98;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 10px 12px;
    padding: 14px;
    border-radius: ${ui.radiusPanel};
    border: 1px solid ${ui.brandLine};
    /* Biel, nie odcień: odcień niesie przycisk „Włącz" - na tle w tym samym kolorze znikał. */
    background: ${ui.surface};
    box-shadow: ${ui.shadowMenu};
    animation: ${rise} 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both;

    @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const Tile = styled.span`
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: ${ui.brandTint};
    border: 1px solid ${ui.brandLineSoft};
    color: ${ui.brandInk};

    svg { width: 18px; height: 18px; }
`;

const Copy = styled.div`
    min-width: 0;
`;

const CardTitle = styled.div`
    font-size: 14.5px;
    font-weight: 700;
    color: ${ui.ink};
`;

const CardText = styled.div`
    margin-top: 2px;
    font-size: 13px;
    line-height: 1.45;
    color: ${ui.textSecondary};
`;

const Actions = styled.div`
    grid-column: 1 / -1;
    display: flex;
    gap: 8px;

    > button:first-child { flex: 1; }
`;
