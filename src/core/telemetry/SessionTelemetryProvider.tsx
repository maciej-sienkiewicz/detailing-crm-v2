import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/core/context/AuthContext';
import { useIdleTimeout } from '@/core/context/IdleTimeoutProvider';
import { SESSION_TELEMETRY } from './config';
import { SessionActivityTracker, normalizeRoute } from './activityTracker';
import { sessionTelemetryApi } from './sessionApi';

/**
 * Zdarzenia, po których uznajemy, że użytkownik pracuje.
 *
 * Ta sama lista, na której działa `IdleTimeoutProvider` — bo „użytkownik jest obecny" musi
 * znaczyć to samo w mechanizmie, który blokuje ekran, i w tym, który liczy czas pracy.
 * Rozjazd między nimi dałby sesje raportowane jako aktywne po zablokowaniu ekranu.
 *
 * `counted` odróżnia zdarzenie celowe od ciągłego: `mousemove` przesuwa tylko znacznik
 * czasu, reszta podbija licznik interakcji, którego serwer używa do odsiania zapomnianych
 * kart. Kursor dryfujący po ekranie nie może uczynić sesji „znaczącą".
 */
const ACTIVITY_EVENTS: ReadonlyArray<{ event: string; counted: boolean }> = [
    { event: 'mousedown', counted: true },
    { event: 'keydown', counted: true },
    { event: 'touchstart', counted: true },
    { event: 'scroll', counted: true },
    { event: 'click', counted: true },
    { event: 'mousemove', counted: false },
];

const detectDevice = (): string => {
    if (typeof navigator === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (/iPad|Tablet/i.test(ua)) return 'tablet';
    if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
    return 'desktop';
};

interface Props {
    children: ReactNode;
}

/**
 * Mierzy czas realnie przepracowany w CRM i raportuje go backendowi.
 *
 * ## Podział odpowiedzialności
 *
 * Ten komponent odpowiada wyłącznie za *kiedy* i *czym* wysyłamy: timery, nasłuchy DOM,
 * cykl życia Reacta. Decyzja *co* raportujemy — czy miniony interwał był pracą — siedzi
 * w [SessionActivityTracker], bez Reacta i bez timerów, i jest pokryta testami. Błąd
 * w harmonogramie widać w zakładce Network; błąd w regule „czy to była praca" jest cichy
 * i zawyża najważniejszą liczbę produktu, więc trzyma się go osobno.
 *
 * ## Dlaczego heartbeat MILKNIE, gdy użytkownik odchodzi
 *
 * Najmniej oczywista decyzja w tym pliku, i celowa. Kuszące jest wysyłanie
 * `active: false`, żeby serwer wiedział o bezczynności — i byłoby to błędne: każdy
 * heartbeat przesuwa `last_activity_at`, a sweeper zamyka wyłącznie sesje, które
 * zamilkły. Sesja bijąca „jestem bezczynna" nie zostałaby zamknięta nigdy, rozlałaby się
 * na kilka dób i zawyżyła zarówno liczbę sesji, jak i czas pracy.
 *
 * Milczenie jest więc sygnałem. Po `timeout-seconds` (domyślnie 5 minut) sweeper zamyka
 * sesję **wstecznie, na ostatnim heartbeacie**, więc martwy ogon nie jest liczony.
 * Powrót użytkownika po dłuższej przerwie trafia już na zamkniętą sesję, a backend
 * otwiera nową — dzięki czemu nie ma czego doliczyć wstecz.
 *
 * Zostaje okno między progiem bezczynności (2 min) a sweeperem (5 min), w którym powrót
 * mógłby dopisać do 90 sekund nieprzepracowanego czasu. To dokładnie ten przypadek, na
 * który serwer ma zacisk `max-credited-gap-seconds`: strata jest ograniczona i znana,
 * zamiast nieograniczonej i niewidocznej.
 *
 * ## Czego ten komponent świadomie NIE robi
 *
 * **Nie zamyka sesji przy wylogowaniu.** Robi to backend w `AuthController.logout`, zanim
 * unieważni sesję HTTP. Duplikat po stronie klienta byłby drugim źródłem prawdy o tym
 * samym zdarzeniu, a przy wyścigu z unieważnieniem sesji — źródłem gorszym.
 *
 * **Nie wybiera „lidera" spośród kart.** Dwie otwarte karty dzielą to samo ciasteczko,
 * więc trafiają do jednej sesji po stronie serwera, a ten liczy przyrosty jako
 * `now - last_activity_at`: karta, która zdąży pierwsza, przesuwa znacznik, druga widzi
 * różnicę bliską zeru. Podwójne naliczenie jest niemożliwe z konstrukcji, więc
 * `BroadcastChannel` i elekcja lidera dokładałyby stan do synchronizacji bez zysku
 * w poprawności.
 */
export const SessionTelemetryProvider = ({ children }: Props) => {
    const { isAuthenticated, user } = useAuth();
    const { isLocked } = useIdleTimeout();
    const { pathname } = useLocation();

    const trackerRef = useRef<SessionActivityTracker | null>(null);
    const intervalMsRef = useRef<number>(SESSION_TELEMETRY.heartbeatIntervalMs);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startedRef = useRef(false);

    const userId = user?.userId ?? null;

    // ── Cykl życia sesji pomiarowej ──────────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated || !userId) return;

        const tracker = new SessionActivityTracker();
        trackerRef.current = tracker;
        startedRef.current = false;

        let cancelled = false;

        const scheduleNext = () => {
            if (cancelled) return;
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(tick, intervalMsRef.current);
        };

        const applyServerInterval = (seconds?: number) => {
            // Serwer jest autorytetem dla progów pomiaru; klient tylko się dostraja.
            // Dolny limit chroni przed konfiguracją, która zamieniłaby telemetrię
            // w źródło ruchu porównywalne z pracą aplikacji.
            if (typeof seconds === 'number' && seconds >= 10) {
                intervalMsRef.current = seconds * 1000;
            }
        };

        const tick = async () => {
            if (cancelled) return;

            // Milczymy, gdy użytkownik nie pracuje — patrz uzasadnienie w opisie klasy.
            if (tracker.isIdle()) {
                scheduleNext();
                return;
            }

            const snapshot = await sessionTelemetryApi.heartbeat(tracker.collect());
            // Backend zakłada sesję również na samym heartbeacie, więc udana odpowiedź
            // znaczy „sesja po stronie serwera istnieje" nawet wtedy, gdy /start poległ
            // (np. na chwilowym braku sieci tuż po zalogowaniu). Bez tego beacon
            // zamykający nigdy by nie poszedł i sesję zamykałby dopiero sweeper.
            if (snapshot !== null) startedRef.current = true;
            applyServerInterval(snapshot?.nextHeartbeatInSeconds);
            scheduleNext();
        };

        void (async () => {
            const snapshot = await sessionTelemetryApi.start({
                device: detectDevice(),
                route: normalizeRoute(window.location.pathname),
            });
            if (cancelled) return;
            startedRef.current = snapshot !== null;
            applyServerInterval(snapshot?.nextHeartbeatInSeconds);
            scheduleNext();
        })();

        return () => {
            cancelled = true;
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = null;
            trackerRef.current = null;
        };
        // Nowa sesja pomiarowa tylko przy zmianie tożsamości — nie przy każdym renderze.
    }, [isAuthenticated, userId]);

    // ── Sygnały aktywności z DOM ─────────────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) return;

        const handlers = ACTIVITY_EVENTS.map(({ event, counted }) => {
            const handler = () => trackerRef.current?.markInteraction(counted);
            // `passive` — te nasłuchy siedzą na scrollu i mousemove; bez tego przeglądarka
            // musi czekać na zakończenie handlera, zanim przewinie stronę.
            window.addEventListener(event, handler, { passive: true });
            return { event, handler };
        });

        return () => {
            handlers.forEach(({ event, handler }) => window.removeEventListener(event, handler));
        };
    }, [isAuthenticated]);

    // ── Widoczność karty i zamknięcie strony ─────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) return;

        const handleVisibility = () => {
            const visible = document.visibilityState === 'visible';
            trackerRef.current?.setVisible(visible);

            // Przełączenie na inną kartę zamyka bieżący interwał od razu, zamiast czekać
            // do kolejnego tyknięcia — inaczej ostatnia minuta pracy przed przełączeniem
            // przepadałaby przy każdym przejściu do maila czy kalendarza.
            if (!visible && startedRef.current) {
                const tracker = trackerRef.current;
                if (tracker && !tracker.isIdle()) void sessionTelemetryApi.heartbeat(tracker.collect());
            }
        };

        // `pagehide`, nie `beforeunload`: to drugie nie odpala się przy zamknięciu karty
        // na iOS-ie i blokuje bfcache, przez co Safari przestaje przywracać stronę z pamięci.
        const handlePageHide = () => {
            if (startedRef.current) sessionTelemetryApi.end();
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [isAuthenticated]);

    // ── Blokada ekranu z IdleTimeoutProvider ─────────────────────────────────
    useEffect(() => {
        trackerRef.current?.setLocked(isLocked);
    }, [isLocked]);

    // ── Aktualna trasa ───────────────────────────────────────────────────────
    useEffect(() => {
        trackerRef.current?.setRoute(normalizeRoute(pathname));
    }, [pathname]);

    return <>{children}</>;
};
