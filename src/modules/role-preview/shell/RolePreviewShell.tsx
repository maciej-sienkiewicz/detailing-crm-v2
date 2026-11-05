import { useCallback, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { rolePreviewApi, type RolePreviewState } from '../rolePreviewApi';
import type { StartFailureWatch } from '../startFailure';
import { PreviewPanel } from './PreviewPanel';
import {
    changeCount, changesWord, DEVICE_LABEL, DEVICE_WIDTH, diffCodes, effectiveExpiry, frameLostSession, type DeviceMode,
} from './previewModel';
import { problemDetail, problemStatus } from '@/core/problem';

type Phase =
    | { kind: 'entering'; slow: boolean }
    | { kind: 'loading' }
    | { kind: 'ready'; state: RolePreviewState }
    | { kind: 'used' }
    | { kind: 'gone' }
    | { kind: 'replaced'; roleName: string }
    | { kind: 'ended'; erased: boolean }
    | { kind: 'failed'; message: string };

/** Ile najdłużej czekamy na przygotowanie piaskownicy - tyle żyje kod wejścia. */
const ENTER_DEADLINE_MS = 115_000;
const ENTER_RETRY_MS = 1_000;
const SLOW_AFTER_MS = 15_000;
/**
 * Stan (lista „Co system wysłałby na zewnątrz”, czas wygaśnięcia) - co 10 s. Przy 30 s
 * panel przez pół minuty po wysłaniu SMS-a twierdził „Nic. Podgląd niczego nie wysyła”.
 */
const REFRESH_MS = 10_000;
/** Ile razy próbujemy wczytać stan po wejściu, zanim pokażemy błąd zamiast kręcącego się kółka. */
const LOAD_ATTEMPTS = 5;
const LOAD_RETRY_MS = 2_000;

/**
 * Który podgląd należy do tej karty. Przeglądarka ma pod adresem podglądu jedno ciasteczko
 * sesji, więc podgląd otwarty w drugim oknie przejmuje sesję także tego okna. Bez tego okno
 * pokazywało cudzą rolę pod swoim paskiem, a „Zakończ podgląd” kończyło podgląd z drugiego
 * okna (audyt 05.11). Piaskownicę rozpoznajemy po końcu jej życia - stałym i różnym dla
 * każdej. sessionStorage, bo jest osobny dla każdej karty i przeżywa przeładowanie.
 */
const OWN_PREVIEW_KEY = 'role-preview:own-expires-at';
const readOwnPreview = (): string | null => {
    try { return window.sessionStorage.getItem(OWN_PREVIEW_KEY); } catch { return null; }
};
const writeOwnPreview = (expiresAt: string) => {
    try { window.sessionStorage.setItem(OWN_PREVIEW_KEY, expiresAt); } catch { /* bez pamięci karty sprawdzamy tylko w tej sesji okna */ }
};
const samePreview = (a: string, b: string) => Date.parse(a) === Date.parse(b);

/** Komunikat serwera bywa bez kropki, a w karcie stoi przed kolejnym zdaniem. */
const asSentence = (text: string) => (/[.!?…]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

const statusOf = (error: unknown) => problemStatus(error);
const messageOf = (error: unknown) =>
    problemDetail(error);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

type EnterOutcome = { kind: 'entered' } | { kind: 'used' } | { kind: 'failed'; message: string };

/**
 * Wymiana kodu na sesję piaskownicy - z czekaniem, aż piaskownica powstanie (202), bo okno
 * otwiera się, zanim serwer ją założy. Dawniej serwer odpowiadał wtedy 404, czyli czerwonym
 * wpisem w Network co sekundę.
 */
async function enterWithRetry(entryCode: string, startFailure?: StartFailureWatch): Promise<EnterOutcome> {
    const started = Date.now();
    while (Date.now() - started < ENTER_DEADLINE_MS) {
        // Okno studia zgłosiło, że serwer odmówił - piaskownica nie powstanie, nie ma na co czekać.
        const refused = startFailure?.reason();
        if (refused) return { kind: 'failed', message: refused };
        try {
            if (await rolePreviewApi.enter(entryCode) === 'entered') return { kind: 'entered' };
            await sleep(ENTER_RETRY_MS);
            continue;
        } catch (error) {
            const status = statusOf(error);
            if (status === 409 || status === 400) return { kind: 'used' };
            // Brak sieci, przeciążenie, restart serwera: kod żyje dalej, więc próbujemy znowu,
            // zamiast kończyć podgląd na pierwszym czkawce połączenia.
            if (status === undefined || status === 429 || status >= 500) {
                await sleep(ENTER_RETRY_MS);
                continue;
            }
            return { kind: 'failed', message: messageOf(error) ?? 'Nie udało się wejść do podglądu.' };
        }
    }
    return { kind: 'failed', message: 'Przygotowanie podglądu trwało za długo.' };
}

/**
 * Kod działa RAZ, więc wymiana musi odbyć się raz na załadowanie strony - także wtedy, gdy
 * React uruchomi efekt dwukrotnie (StrictMode). Drugie wywołanie dostaje tę samą obietnicę.
 */
const enterAttempts = new Map<string, Promise<EnterOutcome>>();
function enterOnce(entryCode: string, startFailure?: StartFailureWatch): Promise<EnterOutcome> {
    let attempt = enterAttempts.get(entryCode);
    if (!attempt) {
        attempt = enterWithRetry(entryCode, startFailure);
        enterAttempts.set(entryCode, attempt);
    }
    return attempt;
}

/**
 * Okno podglądu roli - osobny adres, osobna sesja (piaskownicy), zero dostępu do studia,
 * z którego podgląd otwarto.
 *
 * Na górze stały pas „To jest aplikacja podglądowa…", pod nim prawdziwa aplikacja CRM
 * w ramce (ten sam kod co zawsze, zalogowana jako pracownik piaskownicy), z prawej panel
 * uprawnień. Kod wejścia przychodzi w części adresu po `#` i znika z paska adresu, zanim
 * okno zrobi cokolwiek innego.
 */
export function RolePreviewShell({ entryCode, startFailure }: {
    entryCode: string | null;
    /** Sygnał od okna studia, że piaskownica nie powstanie (patrz `watchStartFailure`). */
    startFailure?: StartFailureWatch;
}) {
    const [phase, setPhase] = useState<Phase>(() =>
        entryCode ? { kind: 'entering', slow: false } : { kind: 'loading' },
    );
    // Na szerokim ekranie panel stoi obok aplikacji; na wąskim przykryłby ją w całości,
    // więc tam najpierw widać aplikację, a panel otwiera się przyciskiem.
    const [panelOpen, setPanelOpen] = useState(() => window.matchMedia?.('(min-width: 901px)').matches ?? true);
    const [device, setDevice] = useState<DeviceMode>('desktop');
    const [applying, setApplying] = useState(false);
    const [applyError, setApplyError] = useState<string | null>(null);
    const [ending, setEnding] = useState(false);
    const frameRef = useRef<HTMLIFrameElement>(null);
    // Z kodem w adresie to nowy podgląd tej karty; bez kodu (przeładowanie) - zapamiętany.
    const ownPreview = useRef<string | null>(entryCode ? null : readOwnPreview());
    const loadFailures = useRef(0);

    /** Czy stan z serwera to podgląd tej karty; pierwszy widziany zostaje jej podglądem. */
    const isOwn = useCallback((state: RolePreviewState) => {
        if (!ownPreview.current) {
            ownPreview.current = state.expiresAt;
            writeOwnPreview(state.expiresAt);
            return true;
        }
        return samePreview(ownPreview.current, state.expiresAt);
    }, []);

    const refresh = useCallback(async () => {
        try {
            const state = await rolePreviewApi.current();
            loadFailures.current = 0;
            const own = isOwn(state);
            setPhase(prev => {
                if (prev.kind === 'ended') return prev;
                return own ? { kind: 'ready', state } : { kind: 'replaced', roleName: state.roleName };
            });
        } catch (error) {
            const status = statusOf(error);
            if (status === 401 || status === 404) {
                setPhase(prev => (prev.kind === 'ended' ? prev : { kind: 'gone' }));
                return;
            }
            // Chwilowy błąd sieci nie kończy działającego podglądu - następne odświeżenie spróbuje
            // znowu. Ale przed pierwszym stanem okno kręciło kółkiem bez końca (audyt 05.11):
            // po kilku próbach mówimy, co się stało.
            loadFailures.current += 1;
            const giveUp = loadFailures.current >= LOAD_ATTEMPTS;
            setPhase(prev => {
                if (prev.kind !== 'entering' && prev.kind !== 'loading') return prev;
                return giveUp
                    ? { kind: 'failed', message: 'Nie udało się wczytać podglądu. Sprawdź połączenie i odśwież okno.' }
                    : prev;
            });
            if (!giveUp) window.setTimeout(() => { void refreshRef.current(); }, LOAD_RETRY_MS);
        }
    }, [isOwn]);
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;

    // Wejście: kod z adresu na sesję piaskownicy. Bez kodu (np. po przeładowaniu okna)
    // sprawdzamy, czy sesja piaskownicy jeszcze żyje.
    useEffect(() => {
        let cancelled = false;
        if (!entryCode) {
            void refresh();
            return () => { cancelled = true; };
        }
        const slowTimer = window.setTimeout(() => {
            if (!cancelled) setPhase(prev => (prev.kind === 'entering' ? { kind: 'entering', slow: true } : prev));
        }, SLOW_AFTER_MS);
        void enterOnce(entryCode, startFailure).then(outcome => {
            if (cancelled) return;
            if (outcome.kind === 'entered') void refresh();
            else if (outcome.kind === 'used') setPhase({ kind: 'used' });
            else setPhase({ kind: 'failed', message: outcome.message });
        });
        return () => {
            cancelled = true;
            window.clearTimeout(slowTimer);
        };
    }, [entryCode, refresh, startFailure]);

    // Odświeżanie stanu (efekty, czas wygaśnięcia) - tylko gdy okno jest na wierzchu, oraz od
    // razu po powrocie do karty: podgląd z drugiego okna mógł ją w międzyczasie przejąć.
    const ready = phase.kind === 'ready';
    useEffect(() => {
        if (!ready) return;
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') void refresh();
        }, REFRESH_MS);
        const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [ready, refresh]);

    /** Przed zmianą roli i końcem: sesja tej przeglądarki może już należeć do podglądu z innego okna. */
    const stillOwn = async (): Promise<boolean> => {
        try {
            const state = await rolePreviewApi.current();
            if (isOwn(state)) return true;
            setPhase({ kind: 'replaced', roleName: state.roleName });
            return false;
        } catch {
            // Wygasła albo niedostępna - dalsze wywołanie samo to zgłosi.
            return true;
        }
    };

    const handleFrameLoad = () => {
        let path: string | null = null;
        try {
            path = frameRef.current?.contentWindow?.location.pathname ?? null;
        } catch {
            path = null;
        }
        // Aplikacja w ramce wylądowała na logowaniu: sesja podglądu wygasła albo ktoś się wylogował.
        if (path && frameLostSession(path)) {
            setPhase(prev => (prev.kind === 'ended' ? prev : { kind: 'gone' }));
            return;
        }
        void refresh();
    };

    const reloadFrame = () => {
        try {
            frameRef.current?.contentWindow?.location.reload();
        } catch {
            if (frameRef.current) frameRef.current.src = '/';
        }
    };

    const applyRole = async (permissions: string[], trackWorkTime: boolean) => {
        setApplying(true);
        setApplyError(null);
        try {
            if (!(await stillOwn())) return;
            const state = await rolePreviewApi.updateRole(permissions, trackWorkTime);
            setPhase({ kind: 'ready', state });
            // Aplikacja w ramce zna uprawnienia z chwili załadowania - przeładowanie w tym
            // samym miejscu pokazuje od razu, co widzi rola po zmianie.
            reloadFrame();
        } catch (error) {
            const status = statusOf(error);
            if (status === 401 || status === 404) setPhase({ kind: 'gone' });
            else setApplyError(messageOf(error) ?? 'Nie udało się zmienić uprawnień. Spróbuj ponownie.');
        } finally {
            setApplying(false);
        }
    };

    const endPreview = async () => {
        setEnding(true);
        if (!(await stillOwn())) {
            setEnding(false);
            return;
        }
        let erased = true;
        try {
            await rolePreviewApi.end();
        } catch {
            // Sesja mogła już wygasnąć - i tak pokazujemy koniec, piaskownicę usunie sprzątanie.
            erased = false;
        }
        setPhase({ kind: 'ended', erased });
        setEnding(false);
        window.close();
    };

    const togglePanel = () => {
        // Otwarcie panelu to pytanie „co by wyszło” - odpowiedź ma być aktualna.
        if (!panelOpen) void refresh();
        setPanelOpen(!panelOpen);
    };

    return (
        <Shell>
            <Banner role="banner">
                <BannerText>
                    <BannerTitle>Podgląd: tak widzi aplikację pracownik z tą rolą</BannerTitle>
                    {phase.kind === 'ready' && (
                        <BannerMeta>
                            <span>Rola „{phase.state.roleName}”, dane przykładowe</span>
                            <span>Nic nie wychodzi na zewnątrz</span>
                            <span>
                                Wygasa o {effectiveExpiry(phase.state.expiresAt, phase.state.idleExpiresAt)
                                    .toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </BannerMeta>
                    )}
                </BannerText>
                {phase.kind === 'ready' && (
                    <BannerActions>
                        <DeviceSwitch role="group" aria-label="Rozmiar ekranu">
                            {(Object.keys(DEVICE_LABEL) as DeviceMode[]).map(mode => (
                                <DeviceBtn
                                    key={mode}
                                    type="button"
                                    $active={device === mode}
                                    aria-pressed={device === mode}
                                    onClick={() => setDevice(mode)}
                                >
                                    {DEVICE_LABEL[mode]}
                                </DeviceBtn>
                            ))}
                        </DeviceSwitch>
                        <BannerBtn type="button" aria-expanded={panelOpen} onClick={togglePanel}>
                            Uprawnienia
                            <ChangesBadge state={phase.state} />
                        </BannerBtn>
                        <EndBtn type="button" onClick={endPreview} disabled={ending}>
                            {ending ? 'Kończenie…' : 'Zakończ podgląd'}
                        </EndBtn>
                    </BannerActions>
                )}
            </Banner>

            {phase.kind === 'ready' ? (
                <Workspace>
                    <Stage>
                        <FrameBox $width={DEVICE_WIDTH[device]}>
                            <AppFrame
                                ref={frameRef}
                                src="/"
                                title="Aplikacja CRM oczami pracownika z podglądaną rolą"
                                onLoad={handleFrameLoad}
                            />
                        </FrameBox>
                    </Stage>
                    {panelOpen && (
                        <PreviewPanel
                            state={phase.state}
                            applying={applying}
                            applyError={applyError}
                            onApply={applyRole}
                            onClose={() => setPanelOpen(false)}
                        />
                    )}
                </Workspace>
            ) : (
                <Center>
                    <StatusCard phase={phase} />
                </Center>
            )}
        </Shell>
    );
}

function ChangesBadge({ state }: { state: RolePreviewState }) {
    const count = changeCount(diffCodes(state.initialPermissions, state.permissions))
        + (state.trackWorkTime !== state.initialTrackWorkTime ? 1 : 0);
    if (count === 0) return null;
    return <Count aria-label={`${count} ${changesWord(count)} względem roli z ustawień`}>{count}</Count>;
}


function StatusCard({ phase }: { phase: Exclude<Phase, { kind: 'ready' }> }) {
    switch (phase.kind) {
        case 'entering':
        case 'loading':
            return (
                <Card aria-live="polite">
                    <Spinner aria-hidden="true" />
                    <CardTitle>Przygotowujemy podgląd</CardTitle>
                    <CardText>
                        {phase.kind === 'loading'
                            ? 'Wczytujemy podgląd tej roli.'
                            : phase.slow
                                ? 'To trwa dłużej niż zwykle - zakładamy studio z danymi przykładowymi.'
                                : 'Zakładamy studio z danymi przykładowymi i konto pracownika z tą rolą.'}
                    </CardText>
                </Card>
            );
        case 'used':
            return (
                <Card>
                    <CardTitle>Ten link do podglądu już nie działa</CardTitle>
                    <CardText>
                        Link do podglądu działa jeden raz i tylko przez chwilę. Otwórz podgląd ponownie
                        z ustawień ról.
                    </CardText>
                </Card>
            );
        case 'gone':
            return (
                <Card>
                    <CardTitle>Podgląd roli się zakończył</CardTitle>
                    <CardText>
                        Podgląd kończy się po wylogowaniu, po dłuższej przerwie albo po upływie czasu podglądu.
                        Dane przykładowe znikają razem z nim. Otwórz go ponownie w ustawieniach ról.
                    </CardText>
                </Card>
            );
        case 'replaced':
            return (
                <Card>
                    <CardTitle>Ten podgląd zastąpił nowszy</CardTitle>
                    <CardText>
                        W tej przeglądarce otwarto podgląd roli „{phase.roleName}” w innym oknie. Przeglądarka
                        ma jeden podgląd naraz, więc ten się zakończył. Możesz zamknąć to okno.
                    </CardText>
                </Card>
            );
        case 'ended':
            return (
                <Card>
                    <CardTitle>Podgląd zakończony</CardTitle>
                    <CardText>
                        {phase.erased
                            ? 'Dane przykładowe zostały usunięte. Możesz zamknąć to okno.'
                            : 'Dane przykładowe znikną same, gdy podgląd wygaśnie. Możesz zamknąć to okno.'}
                    </CardText>
                </Card>
            );
        case 'failed':
            return (
                <Card>
                    <CardTitle>Nie udało się otworzyć podglądu</CardTitle>
                    <CardText>{asSentence(phase.message)} Zamknij to okno i otwórz podgląd ponownie z ustawień ról.</CardText>
                </Card>
            );
    }
}

// ─── Styled ─────────────────────────────────────────────────────────────────────
const Shell = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    background: #e2e8f0;
    color: #0f172a;
    /* Globalne style aplikacji (czcionka) montuje jej ThemeProvider - okno podglądu go nie ma. */
    font-family: var(--font-family-sans, 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
`;

const Banner = styled.header`
    display: flex;
    align-items: center;
    gap: 12px 16px;
    flex-wrap: wrap;
    width: 100%;
    padding: 10px 16px;
    background: #7c2d12;
    background: linear-gradient(90deg, #9a3412, #c2410c);
    color: #fff7ed;
    box-shadow: 0 2px 8px rgba(124, 45, 18, 0.35);
    z-index: 10;
`;

const BannerText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 240px;
`;

const BannerTitle = styled.strong`
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.01em;
`;

/* Trzy fakty jako osobne elementy z odstępem, nie ciąg sklejony kropką (CLAUDE.md §4). */
const BannerMeta = styled.span`
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 12px;
    color: #fed7aa;
`;

const BannerActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const DeviceSwitch = styled.div`
    display: flex;
    padding: 2px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.14);

    @media (max-width: 640px) { display: none; }
`;

const DeviceBtn = styled.button<{ $active: boolean }>`
    padding: 6px 10px;
    border: none;
    border-radius: 7px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: ${p => (p.$active ? '#9a3412' : '#fff7ed')};
    background: ${p => (p.$active ? '#fff7ed' : 'transparent')};
`;

const BannerBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border: 1px solid rgba(255, 247, 237, 0.5);
    border-radius: 9px;
    background: transparent;
    color: #fff7ed;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:hover { background: rgba(255, 255, 255, 0.12); }
`;

const EndBtn = styled(BannerBtn)`
    background: #fff7ed;
    color: #9a3412;
    border-color: #fff7ed;

    &:hover:not(:disabled) { background: #ffedd5; }
    &:disabled { opacity: 0.7; cursor: wait; }
`;

const Count = styled.span`
    min-width: 18px;
    padding: 1px 6px;
    border-radius: 9px;
    background: #fff7ed;
    color: #9a3412;
    font-size: 11px;
    font-weight: 700;
    text-align: center;
`;

const Workspace = styled.div`
    position: relative;
    display: flex;
    flex: 1;
    min-height: 0;
`;

const Stage = styled.main`
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: center;
    overflow: auto;
`;

const FrameBox = styled.div<{ $width: number | null }>`
    display: flex;
    width: ${p => (p.$width ? `${p.$width}px` : '100%')};
    max-width: 100%;
    height: 100%;
    ${p => p.$width && `
        margin: 16px 0;
        height: calc(100% - 32px);
        border-radius: 18px;
        overflow: hidden;
        box-shadow: 0 0 0 8px #0f172a, 0 16px 40px rgba(15, 23, 42, 0.35);
    `}
`;

const AppFrame = styled.iframe`
    flex: 1;
    width: 100%;
    height: 100%;
    border: none;
    background: white;
`;

const Center = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
`;

const Card = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    max-width: 460px;
    padding: 28px 24px;
    text-align: center;
    background: white;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.12);
`;

const CardTitle = styled.h1`
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
`;

const CardText = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: #475569;
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const Spinner = styled.span`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid #fed7aa;
    border-top-color: #c2410c;
    animation: ${spin} 0.8s linear infinite;
`;
