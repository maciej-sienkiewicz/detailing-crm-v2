/**
 * Progi pomiaru czasu pracy w CRM.
 *
 * Te liczby są decyzją produktową, nie szczegółem implementacyjnym — definiują, co firma
 * rozumie przez „użytkownik spędził dziś 40 minut w systemie". Ich zmiana unieważnia
 * porównania z poprzednimi miesiącami, więc leżą w jednym miejscu, a nie rozsiane po
 * trzech plikach.
 *
 * Autorytetem jest backend: `crm.metrics.session.*`. Wartości poniżej to wyłącznie
 * fallback na czas między montowaniem providera a pierwszą odpowiedzią serwera — po niej
 * interwał bierze się z pola `nextHeartbeatInSeconds`, dzięki czemu zmiana konfiguracji
 * po stronie serwera nie wymaga wdrożenia frontendu.
 */
export const SESSION_TELEMETRY = {
    /** Domyślny odstęp między heartbeatami, zanim serwer poda własny. */
    heartbeatIntervalMs: 60_000,

    /**
     * Po tylu milisekundach bez interakcji przestajemy raportować interwał jako aktywny.
     *
     * To pierwsza z dwóch barier chroniących przed „pustymi sesjami" (karta zostawiona
     * na noc). Druga, twardsza, jest po stronie serwera: pojedynczy heartbeat może
     * dopisać najwyżej `max-credited-gap-seconds`, więc nawet gdyby ten warunek zawiódł,
     * 16-godzinna przerwa dopisze 90 sekund, a nie 16 godzin. Klient jest tu
     * optymalizacją dokładności, nigdy jedynym zabezpieczeniem.
     */
    idleThresholdMs: 120_000,

    /**
     * Minimalny odstęp między zapisami znacznika ostatniej interakcji.
     *
     * `mousemove` potrafi wystrzelić kilkaset razy na sekundę. Bez tego progu każdy ruch
     * myszą wykonywałby zapis do pola i pracę GC na wątku głównym, w aplikacji, w której
     * kalendarz i tak walczy o klatki.
     */
    interactionThrottleMs: 1_000,

    /** Ścieżka beacona zamykającego sesję. Pełna, bo `sendBeacon` nie zna baseURL axiosa. */
    endBeaconUrl: '/api/v1/metrics/session/end',
} as const;
