// src/modules/comms/utils/invalidationBatcher.ts
//
// Zbieranie zdarzeń poczty z WebSocketu w paczki przed odświeżeniem danych.
//
// Serwer wysyła jedno zdarzenie na KAŻDĄ wiadomość: pierwszy import skrzynki (90 dni
// wstecz) to setki zdarzeń na minutę, otwarcie wątku z dziesięcioma nieprzeczytanymi -
// dziesięć zdarzeń „przeczytano" naraz. Każde odświeżało listę wątków, licznik
// nieprzeczytanych, wątek i leady - w każdej otwartej karcie w studiu - i całe biuro
// wpadało w limit żądań („Przekroczono limit żądań"). Zdarzenia z jednego okna dają
// teraz jedno odświeżenie każdej rzeczy, bez względu na to, ile ich przyszło.

export interface InvalidationBatch {
    /** Lista wątków i licznik nieprzeczytanych. */
    threadLists: boolean;
    /** Leady (lista, szczegóły, przebieg sprawy). */
    leads: boolean;
    /** Wątki, których szczegóły trzeba odświeżyć. */
    threadIds: Set<string>;
}

export interface InvalidationBatcher {
    add(change: { threadLists?: boolean; leads?: boolean; threadId?: string }): void;
    /** Oddaje zebrane od razu (np. przed odmontowaniem nie ma sensu - wtedy dispose). */
    flush(): void;
    dispose(): void;
}

/**
 * Pierwsze zdarzenie otwiera okno [windowMs]; kolejne tylko dopisują się do paczki.
 * Po oknie paczka idzie do [onFlush] raz. Opóźnienie odświeżenia to najwyżej jedno okno.
 */
export function createInvalidationBatcher(
    onFlush: (batch: InvalidationBatch) => void,
    windowMs: number,
): InvalidationBatcher {
    let batch: InvalidationBatch = { threadLists: false, leads: false, threadIds: new Set() };
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        const ready = batch;
        batch = { threadLists: false, leads: false, threadIds: new Set() };
        if (ready.threadLists || ready.leads || ready.threadIds.size > 0) onFlush(ready);
    };

    return {
        add(change) {
            if (change.threadLists) batch.threadLists = true;
            if (change.leads) batch.leads = true;
            if (change.threadId) batch.threadIds.add(change.threadId);
            if (!timer) timer = setTimeout(flush, windowMs);
        },
        flush,
        dispose() {
            if (timer) clearTimeout(timer);
            timer = null;
            batch = { threadLists: false, leads: false, threadIds: new Set() };
        },
    };
}
