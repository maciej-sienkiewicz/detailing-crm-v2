// src/modules/push/components/PushNotificationWizard.tsx
//
// Kreator powiadomień push - jedna ścieżka dla wszystkich miejsc, w których się je
// włącza: strony /call-device (z kodu QR), Ustawień → Telefon → Powiadomienia
// i zachęty na telefonie (PushOnboardingPrompt).
//
// Dlaczego kreator, a nie przycisk. Użytkownicy odpadali w trzech miejscach:
//   1. iPhone: przycisk „Włącz" nie mógł zadziałać, bo Safari w karcie nie ma API
//      push. Komunikat „dodaj do ekranu głównego" był zdaniem w bursztynowej
//      ramce - bez obrazka przycisku, którego trzeba szukać, i bez słowa o tym,
//      że aplikacja z ikony wymaga ponownego zalogowania (iOS trzyma ją osobno
//      od Safari). Ludzie dodawali ikonę, widzieli ekran logowania i uznawali,
//      że „nie działa".
//   2. Systemowy monit bez kontekstu: „CRM chce wysyłać powiadomienia" pada na
//      zimno, a odmowa jest w praktyce OSTATECZNA - przeglądarka drugi raz nie
//      zapyta. Dlatego najpierw nasz ekran mówi, CO będzie przychodzić i po co,
//      i dopiero przycisk na nim wywołuje monit (soft ask).
//   3. Po „Zezwól" nic się nie działo, więc nikt nie wiedział, czy działa.
//      Powiadomienie próbne idzie prawdziwą ścieżką (serwer → usługa push →
//      Service Worker) i zamyka tę niepewność.
//
// Etap jest WYLICZANY ze stanu urządzenia (wizardStage), nie zapamiętywany:
// aplikacja otwarta z ikony na iPhonie startuje z pustą pamięcią, a mimo to
// sama trafia na krok „Zezwól".

import { useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { useToast } from '@/common/components/Toast';
import { Button, ui } from '@/common/components/ui';
import type { PushDeviceState } from '../hooks/usePushDevice';
import type { PushPlatform } from '../utils/pushPlatform';
import { wizardStage, wizardTrail, wizardTrailIndex } from '../utils/wizardStage';
import {
    BellIcon, CheckIcon, InboxIcon, IosAddIcon, IosShareIcon, MegaphoneIcon, MoreIcon, PhoneIcon, SendIcon,
    WalletIcon, WarnIcon,
} from './wizardIcons';
import { problemDetail } from '@/core/problem';

interface Props {
    push: PushDeviceState;
    /** Tylko w oknie zachęty: „Nie teraz". Na stronach ustawień nie ma czego odkładać. */
    onDismiss?: () => void;
}

/** Komunikat błędu parowania - po przyczynie, nie po ogólnym „spróbuj ponownie". */
function pairingErrorMessage(error: unknown, platform: PushPlatform): string {
    const code = error instanceof Error ? error.message : '';
    if (code === 'permission-denied') {
        return platform.kind === 'ios-app'
            ? 'Powiadomienia są zablokowane. Włącz je w Ustawieniach iPhone’a → Powiadomienia → aplikacja z nazwą studia.'
            : 'Powiadomienia są zablokowane. Odblokuj je w ustawieniach przeglądarki dla tej strony.';
    }
    if (code === 'sw-unavailable') {
        return 'Nie udało się włączyć powiadomień. Odśwież stronę i spróbuj ponownie. ' +
            'W trybie prywatnym przeglądarki powiadomienia nie działają.';
    }
    if (code === 'subscription-incomplete') {
        return 'Przeglądarka nie dokończyła włączania powiadomień. Odśwież stronę i spróbuj ponownie.';
    }
    return 'Spróbuj ponownie.';
}

/** Zdanie z serwera (422 niesie powód po ludzku) albo zapasowe. */
function serverMessage(error: unknown, fallback: string): string {
    const message = problemDetail(error);
    return typeof message === 'string' && message.trim() ? message : fallback;
}

export function PushNotificationWizard({ push, onDismiss }: Props) {
    const { platform } = push;
    const stage = wizardStage(push);
    const trail = wizardTrail(platform);
    const trailIndex = wizardTrailIndex(stage, platform);

    return (
        <Wrap>
            {trailIndex !== null && (
                <Trail aria-label={`Krok ${trailIndex + 1} z ${trail.length}`}>
                    {trail.map((label, index) => (
                        <TrailStep
                            key={label}
                            $state={index < trailIndex ? 'done' : index === trailIndex ? 'current' : 'next'}
                            aria-current={index === trailIndex ? 'step' : undefined}
                        >
                            <TrailDot>{index < trailIndex ? <CheckIcon /> : index + 1}</TrailDot>
                            <span>{label}</span>
                        </TrailStep>
                    ))}
                </Trail>
            )}

            {stage === 'checking' && <Muted>Sprawdzam to urządzenie…</Muted>}
            {stage === 'install' && platform.kind === 'ios-install' && <InstallStage platform={platform} onDismiss={onDismiss} />}
            {stage === 'open-installed' && platform.kind === 'ios-install' && (
                <OpenInstalledStage platform={platform} onDismiss={onDismiss} />
            )}
            {stage === 'open-in-browser' && platform.kind === 'open-in-browser' && <OpenInBrowserStage os={platform.os} />}
            {stage === 'update-os' && <UpdateOsStage />}
            {stage === 'unsupported' && (
                <Notice $tone="warn">
                    <WarnIcon />
                    <span>
                        Ta przeglądarka nie obsługuje powiadomień. Na telefonie otwórz CRM
                        w <strong>Chrome</strong> (Android) albo w <strong>Safari</strong> (iPhone).
                    </span>
                </Notice>
            )}
            {stage === 'blocked' && <BlockedStage platform={platform} />}
            {stage === 'ask' && <AskStage push={push} onDismiss={onDismiss} />}
            {stage === 'ready' && <ReadyStage push={push} />}
        </Wrap>
    );
}

// ─── Etap: dodaj do ekranu początkowego (iOS) ─────────────────────────────────

function InstallStage({ platform, onDismiss }: {
    platform: Extract<PushPlatform, { kind: 'ios-install' }>;
    onDismiss?: () => void;
}) {
    const deviceWhere = platform.device === 'ipad' ? 'iPadzie' : 'iPhonie';
    const shareWhere =
        platform.browser === 'chrome' ? 'w pasku adresu Chrome'
            : platform.browser === 'edge' ? 'w menu Edge'
                : platform.device === 'ipad' ? 'w prawym górnym rogu Safari'
                    : 'na dolnym pasku Safari';

    return (
        <>
            <Lead>
                <Title>Najpierw dodaj CRM do ekranu początkowego</Title>
                <Text>
                    Na {deviceWhere} powiadomienia działają tylko w aplikacjach z ekranu początkowego.
                    Ten krok robisz tylko raz.
                </Text>
            </Lead>

            <Steps>
                <Step>
                    <StepNo>1</StepNo>
                    <StepBody>
                        Dotknij <Glyph><IosShareIcon /></Glyph> <strong>Udostępnij</strong> {shareWhere}.
                        {platform.browser === 'safari' && platform.device === 'iphone' && (
                            <StepHint>
                                Jeśli nie widzisz tej ikony, dotknij najpierw <Glyph><MoreIcon /></Glyph> obok adresu strony.
                            </StepHint>
                        )}
                    </StepBody>
                </Step>
                <Step>
                    <StepNo>2</StepNo>
                    <StepBody>
                        Przewiń listę i wybierz <Glyph><IosAddIcon /></Glyph> <strong>Dodaj do ekranu początkowego</strong>,
                        potem <strong>Dodaj</strong>.
                    </StepBody>
                </Step>
                <Step>
                    <StepNo>3</StepNo>
                    <StepBody>
                        Otwórz CRM <strong>z nowej ikony</strong> i zaloguj się jeszcze raz.
                        <StepHint>
                            Aplikacja z ekranu początkowego ma osobne logowanie. Po zalogowaniu
                            otwiera się kolejny krok.
                        </StepHint>
                    </StepBody>
                </Step>
            </Steps>

            {/* Safari nie wie, że ikona już jest - więc mówimy o tym zawsze, także bez
                podpowiedzi z konta (np. aplikacja dodana, ale powiadomienia nigdy niewłączone). */}
            <Muted>
                Jeśli CRM jest już na ekranie początkowym, otwórz go z ikony. Safari nie otwiera
                aplikacji z ekranu początkowego.
            </Muted>

            {platform.browser !== 'safari' && (
                <Muted>
                    Jeśli w menu nie ma tej opcji, <CopyLinkButton label="skopiuj link" /> i otwórz go w Safari.
                </Muted>
            )}
            {onDismiss && <Footer><Button variant="ghost" onClick={onDismiss}>Nie teraz</Button></Footer>}
        </>
    );
}

// ─── Etap: aplikacja już jest na ekranie (iOS, podpowiedź z konta) ─────────────

function OpenInstalledStage({ platform, onDismiss }: {
    platform: Extract<PushPlatform, { kind: 'ios-install' }>;
    onDismiss?: () => void;
}) {
    // Podpowiedź bywa chybiona (inny iPhone na tym samym koncie), więc instrukcja
    // instalacji jest zawsze o jedno dotknięcie stąd.
    const [showInstall, setShowInstall] = useState(false);
    if (showInstall) return <InstallStage platform={platform} onDismiss={onDismiss} />;

    const deviceName = platform.device === 'ipad' ? 'iPadzie' : 'iPhonie';
    return (
        <>
            <Lead>
                <Title>Otwórz CRM z ikony na ekranie początkowym</Title>
                <Text>
                    Na tym koncie powiadomienia działają już w aplikacji na {deviceName}. W przeglądarce
                    ich nie ma, a Safari nie otwiera aplikacji z ekranu początkowego.
                </Text>
            </Lead>

            <Steps>
                <Step>
                    <StepNo>1</StepNo>
                    <StepBody>Przejdź do ekranu początkowego.</StepBody>
                </Step>
                <Step>
                    <StepNo>2</StepNo>
                    <StepBody>
                        Dotknij ikony z <strong>nazwą Twojego studia</strong> (albo „DetailBoost").
                        <StepHint>
                            Ikona nosi nazwę studia, bo tak nazywała się aplikacja w chwili dodania.
                            Jeśli jej nie widzisz, przeciągnij palcem w dół na ekranie początkowym i wpisz tę nazwę.
                        </StepHint>
                    </StepBody>
                </Step>
            </Steps>

            <Muted>
                <InlineLink type="button" onClick={() => setShowInstall(true)}>Pokaż, jak dodać ikonę</InlineLink>,
                jeśli nie ma jej na tym telefonie.
            </Muted>
            {onDismiss && <Footer><Button variant="ghost" onClick={onDismiss}>Nie teraz</Button></Footer>}
        </>
    );
}

// ─── Etap: przeglądarka wbudowana ─────────────────────────────────────────────

function OpenInBrowserStage({ os }: { os: 'ios' | 'android' }) {
    const browser = os === 'ios' ? 'Safari' : 'Chrome';
    return (
        <>
            <Lead>
                <Title>Otwórz tę stronę w {browser}</Title>
                <Text>
                    Ta strona jest otwarta wewnątrz innej aplikacji (np. Facebooka albo poczty),
                    a tam powiadomienia nie działają.
                </Text>
            </Lead>
            <Steps>
                <Step>
                    <StepNo>1</StepNo>
                    <StepBody>
                        Dotknij menu <strong>{os === 'ios' ? '•••' : '⋮'}</strong> w rogu ekranu
                        i wybierz <strong>Otwórz w {os === 'ios' ? 'Safari' : 'przeglądarce'}</strong>.
                    </StepBody>
                </Step>
                <Step>
                    <StepNo>2</StepNo>
                    <StepBody>
                        Jeśli nie ma takiej opcji, <CopyLinkButton label="skopiuj link" /> i wklej go w {browser}.
                    </StepBody>
                </Step>
            </Steps>
        </>
    );
}

function UpdateOsStage() {
    return (
        <Notice $tone="warn">
            <WarnIcon />
            <span>
                Powiadomienia z aplikacji internetowych działają od iOS <strong>16.4</strong>.
                Zaktualizuj system: Ustawienia → Ogólne → Uaktualnienia.
            </span>
        </Notice>
    );
}

// ─── Etap: zablokowane ────────────────────────────────────────────────────────

function BlockedStage({ platform }: { platform: PushPlatform }) {
    let steps: ReactNode;
    if (platform.kind === 'ios-app') {
        steps = <>Otwórz <strong>Ustawienia</strong> iPhone’a → <strong>Powiadomienia</strong> → wybierz aplikację z nazwą studia → włącz <strong>Pozwalaj na powiadomienia</strong>.</>;
    } else if (platform.kind === 'android' && platform.installed) {
        steps = <>Przytrzymaj ikonę z nazwą studia na ekranie → <strong>Informacje o aplikacji</strong> → <strong>Powiadomienia</strong> → włącz.</>;
    } else if (platform.kind === 'android') {
        steps = <>Dotknij ikony obok adresu strony → <strong>Uprawnienia</strong> → <strong>Powiadomienia</strong> → <strong>Zezwól</strong>.</>;
    } else {
        steps = <>Kliknij ikonę obok adresu strony → <strong>Powiadomienia</strong> → <strong>Zezwalaj</strong>, potem odśwież stronę.</>;
    }

    return (
        <>
            <Lead>
                <Title>Powiadomienia są zablokowane</Title>
                <Text>
                    Po odmowie okienko zgody już się nie pokazuje. Odblokuj powiadomienia
                    w ustawieniach. Po powrocie do CRM ten krok odświeża się automatycznie.
                </Text>
            </Lead>
            <Notice $tone="warn">
                <WarnIcon />
                <span>{steps}</span>
            </Notice>
        </>
    );
}

// ─── Etap: dlaczego warto + zgoda ─────────────────────────────────────────────

// Jedno zdanie na korzyść, bez osobnego tytułu i opisu pod nim - dwie linie na
// pozycję przytłaczały przycisk. Zdanie mówi wprost, co i kiedy przyjdzie: w czasie
// teraźniejszym i bez „telefon zapyta" (przewodnik „Styl tekstów w animacjach DetailBoost").
const BENEFITS = [
    { icon: <PhoneIcon />, text: 'Numer kliknięty na komputerze pojawia się na telefonie z przyciskiem „Zadzwoń”.' },
    { icon: <WalletIcon />, text: 'Powiadomienie przychodzi przy nowej rezerwacji, przyjęciu auta i wydaniu auta klientowi.' },
    { icon: <InboxIcon />, text: 'Każde nowe zapytanie od klienta jest od razu na telefonie.' },
    { icon: <MegaphoneIcon />, text: 'Powiadomienie przychodzi też, gdy konkurencja uruchomi reklamę w okolicy studia.' },
];

function AskStage({ push, onDismiss }: { push: PushDeviceState; onDismiss?: () => void }) {
    const { showError, showSuccess } = useToast();
    const allowLabel = push.platform.kind === 'ios-app' ? 'Pozwól' : 'Zezwól';

    const handleEnable = async () => {
        try {
            // enable() pyta o zgodę synchronicznie - to wywołanie musi stać w obsłudze
            // kliknięcia bez żadnego await przed nim (patrz usePushDevice).
            await push.enable();
            showSuccess('Powiadomienia włączone', 'Wyślij powiadomienie próbne i sprawdź, jak wygląda.');
        } catch (error) {
            showError('Nie udało się włączyć powiadomień', pairingErrorMessage(error, push.platform));
        }
    };

    return (
        <>
            {/* Serwer nie uznał już tego urządzenia i subskrypcja została zdjęta (usePushDevice) -
                bez tego zdania wyglądałoby, jakby ekran sam z siebie „zapomniał" włączonych powiadomień. */}
            {push.unpairedByServer && (
                <Notice $tone="warn">
                    <WarnIcon />
                    <span>
                        Powiadomienia na tym urządzeniu są wyłączone. Urządzenie odłączono w tabeli
                        „Rodzaje powiadomień” albo w tej przeglądarce powiadomienia włączono na innym koncie.
                    </span>
                </Notice>
            )}

            <Lead>
                <Title>Włącz powiadomienia na tym urządzeniu</Title>
                <Text>Przychodzą także wtedy, gdy CRM jest zamknięty.</Text>
            </Lead>

            <Benefits>
                {BENEFITS.map(benefit => (
                    <Benefit key={benefit.text}>
                        <BenefitTile>{benefit.icon}</BenefitTile>
                        <BenefitTitle>{benefit.text}</BenefitTitle>
                    </Benefit>
                ))}
            </Benefits>

            <Footer>
                <Button variant="primary" size="lg" block onClick={handleEnable} disabled={push.isEnabling}>
                    <BellIcon />
                    {push.isEnabling ? 'Włączam…' : 'Włącz powiadomienia'}
                </Button>
                {onDismiss && <Button variant="ghost" onClick={onDismiss}>Nie teraz</Button>}
            </Footer>
            <Muted>
                W okienku systemu wybierz <strong>{allowLabel}</strong>. Odmowy nie da się cofnąć w CRM.
            </Muted>
        </>
    );
}

// ─── Etap: gotowe ─────────────────────────────────────────────────────────────

function ReadyStage({ push }: { push: PushDeviceState }) {
    const { showError, showSuccess } = useToast();
    const [testSent, setTestSent] = useState(false);
    const onAndroid = push.platform.kind === 'android';
    const onIos = push.platform.kind === 'ios-app';

    const handleTest = async () => {
        try {
            await push.sendTest();
            setTestSent(true);
        } catch (error) {
            showError('Nie udało się wysłać próbnego powiadomienia', serverMessage(error, 'Spróbuj ponownie za chwilę.'));
        }
    };

    const handleDisable = async () => {
        try {
            await push.disable();
            showSuccess('Powiadomienia wyłączone', 'To urządzenie nie dostaje już powiadomień.');
        } catch {
            showError('Nie udało się wyłączyć', 'Spróbuj ponownie.');
        }
    };

    return (
        <>
            <Notice $tone="ok">
                <CheckIcon />
                <span>To urządzenie odbiera powiadomienia z CRM.</span>
            </Notice>

            {testSent ? (
                <Lead>
                    <Title>Powiadomienie wysłane</Title>
                    <Text>
                        Powiadomienie przychodzi w ciągu kilku sekund. Najlepiej widać je
                        na zablokowanym ekranie.
                    </Text>
                    <Details>
                        <summary>Nie przyszło?</summary>
                        <ul>
                            <li>Wyłącz tryb <strong>Nie przeszkadzać</strong> albo <strong>Skupienie</strong>.</li>
                            {onAndroid && (
                                <li>
                                    Oszczędzanie baterii może wstrzymywać powiadomienia. Wyłącz je: Ustawienia →
                                    Aplikacje → Chrome (albo aplikacja z nazwą studia) → Bateria → <strong>Bez ograniczeń</strong>.
                                </li>
                            )}
                            {onIos && (
                                <li>Sprawdź Ustawienia → Powiadomienia → aplikacja z nazwą studia: <strong>Pozwalaj na powiadomienia</strong>.</li>
                            )}
                            <li>Wyłącz powiadomienia na tym urządzeniu i włącz je ponownie.</li>
                        </ul>
                    </Details>
                </Lead>
            ) : (
                <Text>Wyślij powiadomienie próbne i sprawdź, czy przychodzi na to urządzenie.</Text>
            )}

            <Footer>
                {/* Jedyne wypełnienie, dopóki próbne nie poszło - to jest krok następny.
                    Po wysłaniu zostaje dostępne, ale już nie prowadzi. */}
                <Button
                    variant={testSent ? 'tinted' : 'primary'}
                    size="lg"
                    block
                    onClick={handleTest}
                    disabled={push.isSendingTest}
                >
                    <SendIcon />
                    {push.isSendingTest ? 'Wysyłam…' : testSent ? 'Wyślij jeszcze raz' : 'Wyślij powiadomienie próbne'}
                </Button>
            </Footer>

            {(onAndroid || onIos) && (
                <Details>
                    <summary>Własny dźwięk powiadomień</summary>
                    {onAndroid ? (
                        <p>
                            Dźwięk ustawiasz w Androidzie, nie w CRM: Ustawienia telefonu → Aplikacje →
                            {push.platform.kind === 'android' && push.platform.installed ? ' aplikacja z nazwą studia' : ' Chrome'} →
                            Powiadomienia → wybierz kategorię z nazwą tej strony → <strong>Dźwięk</strong>.
                            Wybierz dowolny dzwonek, także własny plik.
                        </p>
                    ) : (
                        <p>
                            Aplikacje internetowe na iPhonie mają zawsze dźwięk systemowy. Własnego
                            dźwięku nie można ustawić. Sprawdź tylko, czy dźwięk jest włączony: Ustawienia →
                            Powiadomienia → aplikacja z nazwą studia → <strong>Dźwięki</strong>.
                        </p>
                    )}
                </Details>
            )}

            <DisableRow>
                <Button variant="ghost" size="sm" onClick={handleDisable} disabled={push.isDisabling}>
                    {push.isDisabling ? 'Wyłączam…' : 'Wyłącz na tym urządzeniu'}
                </Button>
                {push.serviceWorkerVersion && (
                    <VersionNote>Wersja modułu powiadomień: {push.serviceWorkerVersion}</VersionNote>
                )}
            </DisableRow>
        </>
    );
}

// ─── Kopiowanie linku ─────────────────────────────────────────────────────────

function CopyLinkButton({ label }: { label: string }) {
    const { showError } = useToast();
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        } catch {
            showError('Nie udało się skopiować linku', 'Skopiuj adres ręcznie z paska przeglądarki.');
        }
    };

    return (
        <InlineLink type="button" onClick={handleCopy}>
            {copied ? 'Skopiowano' : label}
        </InlineLink>
    );
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
`;

const Trail = styled.ol`
    display: flex;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;
`;

const TrailDot = styled.span`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;

    svg { width: 11px; height: 11px; }
`;

// Bieżący krok nosi odcień marki jako tło i obwódkę, bez wypełnienia: jedynym
// wypełnieniem w oknie jest przycisk kroku (CLAUDE.md §2).
const TrailStep = styled.li<{ $state: 'done' | 'current' | 'next' }>`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: ${ui.radiusRow};
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    border: 1px solid ${p => (p.$state === 'current' ? ui.brandLine : p.$state === 'done' ? ui.okLine : ui.line)};
    background: ${p => (p.$state === 'current' ? ui.brandTint : p.$state === 'done' ? ui.okTint : ui.surface)};
    color: ${p => (p.$state === 'current' ? ui.brandInk : p.$state === 'done' ? ui.okInk : ui.textFaint)};

    span:last-child { overflow: hidden; text-overflow: ellipsis; }

    ${TrailDot} {
        border: 1px solid currentColor;
    }
`;

const Lead = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Title = styled.h3`
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: ${ui.ink};
    letter-spacing: -0.2px;
    line-height: 1.3;
`;

const Text = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: ${ui.textSecondary};
`;

const Muted = styled.p`
    margin: 0;
    font-size: 12.5px;
    line-height: 1.55;
    color: ${ui.textMuted};

    strong { color: ${ui.inkSoft}; }
`;

const Steps = styled.ol`
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Step = styled.li`
    display: flex;
    gap: 12px;
    align-items: flex-start;
`;

const StepNo = styled.span`
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: ${ui.brandInk};
    background: ${ui.brandTint};
    border: 1px solid ${ui.brandLineSoft};
`;

const StepBody = styled.div`
    font-size: 14px;
    line-height: 1.6;
    color: ${ui.inkSoft};
    padding-top: 2px;

    strong { color: ${ui.ink}; }
`;

const StepHint = styled.span`
    display: block;
    margin-top: 2px;
    font-size: 12.5px;
    color: ${ui.textMuted};
`;

// Glif w linii tekstu, w kolorze iOS - użytkownik szuka TEGO kształtu na ekranie.
const Glyph = styled.span`
    display: inline-flex;
    vertical-align: -4px;
    color: #007aff;

    svg { width: 19px; height: 19px; }
`;

const Notice = styled.div<{ $tone: 'ok' | 'warn' }>`
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 11px 14px;
    border-radius: ${ui.radiusRow};
    background: ${p => (p.$tone === 'ok' ? ui.okTint : ui.warnTint)};
    border: 1px solid ${p => (p.$tone === 'ok' ? ui.okLine : ui.warnLine)};
    color: ${p => (p.$tone === 'ok' ? ui.okInk : ui.warnInk)};
    font-size: 13.5px;
    line-height: 1.55;
    font-weight: 500;

    strong { font-weight: 700; }
    svg { width: 16px; height: 16px; flex-shrink: 0; margin-top: 2px; }
`;

const Benefits = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const Benefit = styled.li`
    display: flex;
    gap: 12px;
    align-items: center;
`;

const BenefitTile = styled.span`
    flex-shrink: 0;
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

const BenefitTitle = styled.div`
    font-size: 14px;
    font-weight: 500;
    line-height: 1.45;
    color: ${ui.ink};
`;

const Footer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;

    svg { width: 17px; height: 17px; }

    @media (min-width: 601px) {
        align-items: flex-start;
        > button { width: auto; }
    }
`;

const Details = styled.details`
    font-size: 13px;
    line-height: 1.55;
    color: ${ui.textSecondary};

    summary {
        cursor: pointer;
        font-weight: 600;
        color: ${ui.brandInk};
        padding: 4px 0;
    }

    ul { margin: 6px 0 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
    p { margin: 6px 0 0; }
    strong { color: ${ui.ink}; }
`;

const DisableRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding-top: 12px;
    border-top: 1px solid ${ui.lineFaint};
`;

const VersionNote = styled.span`
    font-size: 11.5px;
    color: ${ui.textFaint};
`;

const InlineLink = styled.button`
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-weight: 600;
    color: ${ui.brandInk};
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
`;
