import { SESSION_TELEMETRY } from './config';

/**
 * Ładunek pojedynczego heartbeatu.
 *
 * Zwróć uwagę, czego tu NIE ma: czasu trwania interwału. Klient nie raportuje, ile czasu
 * minęło — mierzy to serwer własnym zegarem. Gdyby klient podawał własne czasy, mógłby
 * wpisać studio w dowolną liczbę godzin, a te liczby trafiają do rozmów o cenniku
 * i o odnowieniu. Wpływ przeglądarki kończy się na fladze „czy ten interwał był pracą".
 */
export interface HeartbeatPayload {
    active: boolean;
    interactions: number;
    route?: string;
}

interface TrackerOptions {
    /** Wstrzykiwany zegar — dzięki temu testy nie potrzebują fałszowania czasu globalnie. */
    now?: () => number;
    idleThresholdMs?: number;
    interactionThrottleMs?: number;
}

/**
 * Decyduje, czy miniony interwał był pracą — i nic poza tym.
 *
 * Świadomie nie zawiera timerów, HTTP ani niczego z Reacta. Reguła „co raportujemy" jest
 * jedyną częścią tego mechanizmu, w której da się popełnić błąd cichy i kosztowny
 * (zawyżony czas pracy wygląda jak sukces produktu), więc jest odseparowana i pokryta
 * testami. Harmonogram i transport — czyli „kiedy i czym wysyłamy" — żyją w
 * [SessionTelemetryProvider]; ich awaria jest głośna i widoczna w zakładce Network.
 *
 * Wszystkie sygnały są push, nie pull: tracker nie odpytuje DOM-u, tylko przyjmuje stan
 * od warstwy wiążącej. Dzięki temu ten sam kod działa w teście bez jsdom.
 */
export class SessionActivityTracker {
    private readonly now: () => number;
    private readonly idleThresholdMs: number;
    private readonly interactionThrottleMs: number;

    private interactions = 0;
    private lastInteractionAt: number;
    private lastInteractionWriteAt = 0;
    private visible = true;
    private locked = false;
    private route?: string;

    constructor(options: TrackerOptions = {}) {
        this.now = options.now ?? (() => Date.now());
        this.idleThresholdMs = options.idleThresholdMs ?? SESSION_TELEMETRY.idleThresholdMs;
        this.interactionThrottleMs =
            options.interactionThrottleMs ?? SESSION_TELEMETRY.interactionThrottleMs;
        // Otwarcie aplikacji samo w sobie jest interakcją — inaczej pierwszy heartbeat
        // po zalogowaniu raportowałby bezczynność, mimo że użytkownik właśnie wszedł.
        this.lastInteractionAt = this.now();
    }

    /**
     * Sygnał świadczący o tym, że użytkownik pracuje.
     *
     * @param counted czy zdarzenie ma podbić licznik interakcji. Ruch myszy przesuwa
     *   wyłącznie znacznik czasu (`false`): kursor dryfujący po ekranie w trakcie rozmowy
     *   telefonicznej to nie jest praca, a serwer używa `interaction_count > 0` jako
     *   jednego z dwóch warunków uznania sesji za znaczącą. Kliknięcia, klawiatura,
     *   scroll i dotyk liczą się w pełni — czytanie kalendarza też jest pracą.
     */
    markInteraction(counted = true): void {
        const now = this.now();

        if (counted) {
            // Twardy sufit: licznik trafia do walidacji @Max(10_000) po stronie serwera,
            // a przekroczenie odrzuciłoby cały heartbeat wraz z informacją o aktywności.
            if (this.interactions < 10_000) this.interactions += 1;
            this.lastInteractionAt = now;
            this.lastInteractionWriteAt = now;
            return;
        }

        // Zdarzenia ciągłe (mousemove) przesuwają znacznik nie częściej niż raz na próg.
        if (now - this.lastInteractionWriteAt >= this.interactionThrottleMs) {
            this.lastInteractionAt = now;
            this.lastInteractionWriteAt = now;
        }
    }

    setVisible(visible: boolean): void {
        // Powrót do karty jest sam w sobie interakcją: użytkownik świadomie tu wrócił.
        if (visible && !this.visible) this.markInteraction();
        this.visible = visible;
    }

    /**
     * Ekran zablokowany przez `IdleTimeoutProvider` (panel przełączania użytkownika).
     *
     * Bez tego ruch myszą po zablokowanej nakładce raportowałby się jako praca — a to
     * dokładnie ten moment, w którym wiadomo na pewno, że nikt nie pracuje.
     */
    setLocked(locked: boolean): void {
        this.locked = locked;
    }

    setRoute(route: string): void {
        if (route === this.route) return;
        this.route = route;
        // Zmiana ekranu to jednoznaczna, celowa akcja użytkownika.
        this.markInteraction();
    }

    /** Czy sesja jest w stanie, w którym w ogóle warto wysyłać heartbeat. */
    isIdle(): boolean {
        return !this.buildActiveFlag();
    }

    /**
     * Zbiera ładunek i **zeruje licznik interakcji**.
     *
     * Konsumujące odczytanie jest celowe: dwa heartbeaty nie mogą zaraportować tych
     * samych kliknięć, bo licznik służy do odróżnienia zapomnianej karty od realnej
     * pracy, a podwójne liczenie przesuwałoby ten osąd w stronę pochlebną.
     */
    collect(): HeartbeatPayload {
        const payload: HeartbeatPayload = {
            active: this.buildActiveFlag(),
            interactions: this.interactions,
            route: this.route,
        };
        this.interactions = 0;
        return payload;
    }

    private buildActiveFlag(): boolean {
        if (this.locked) return false;
        if (!this.visible) return false;
        return this.now() - this.lastInteractionAt < this.idleThresholdMs;
    }
}

/**
 * Sprowadza ścieżkę SPA do wzorca: `/wizyty/8f3c…/protokol` → `/wizyty/{id}/protokol`.
 *
 * Bez tego kolumna `last_route` zbierałaby jeden odrębny wpis na każdą wizytę w systemie,
 * a raport „na których ekranach pracują nasi klienci" rozsypałby się na tysiące
 * jednoelementowych grup — czyli przestałby odpowiadać na pytanie, dla którego powstał.
 *
 * Maskujemy po stronie klienta, a nie parsujemy wzorca z react-routera, bo ta funkcja jest
 * deterministyczna i testowalna, a nie zależy od wewnętrznej reprezentacji tras w bibliotece.
 */
export const normalizeRoute = (pathname: string): string => {
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const NUMERIC = /^\d+$/;
    // Tokeny publiczne (linki do podpisu, karty wizyty) bywają długimi losowymi ciągami —
    // wpuszczenie ich do metryk oznaczałoby zapisanie sekretu w tabeli analitycznej.
    const OPAQUE = /^[A-Za-z0-9_-]{16,}$/;

    return pathname
        .split('/')
        .map(segment => {
            if (!segment) return segment;
            if (UUID.test(segment)) return '{id}';
            if (NUMERIC.test(segment)) return '{id}';
            if (OPAQUE.test(segment)) return '{token}';
            return segment;
        })
        .join('/')
        .slice(0, 200);
};
