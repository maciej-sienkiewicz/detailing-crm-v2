// Widok „Zaplanowane SMS-y" - kształt odpowiedzi GET /api/scheduled-sms.

/** Skąd bierze się wiadomość; akcja na wierszu musi wiedzieć, gdzie jej szukać. */
export type ScheduledSmsSource =
    | 'QUEUE'
    | 'VISIT_REMINDER'
    | 'THANK_YOU'
    | 'PRE_VISIT'
    | 'POST_VISIT'
    | 'DELAYED_REMINDER'
    | 'CAMPAIGN';

export type ScheduledSmsState = 'PENDING' | 'CANCELLED';

export interface ScheduledSmsCampaign {
    id: string;
    name: string;
    /** SCHEDULED, SENDING, ACTIVE, PAUSED */
    status: string;
    /** Ile SMS-ów czeka; null, gdy odbiorców ustala się dopiero w dniu wysyłki. */
    pendingCount: number | null;
}

export interface ScheduledSmsItem {
    source: ScheduledSmsSource;
    /** Id w obrębie źródła: wiersz, dla automatów id rezerwacji, dla kampanii id kampanii. */
    id: string;
    kindLabel: string;
    /** Dlaczego wiadomość czeka, a nie wyszła od razu. */
    waitingReason: string;
    state: ScheduledSmsState;
    /** null tylko dla kampanii „jak najszybciej". */
    scheduledFor: string | null;
    messageContent: string | null;
    customerId: string | null;
    customerName: string | null;
    phoneNumber: string | null;
    visitId: string | null;
    appointmentId: string | null;
    /** Start wizyty, której dotyczy przypomnienie. */
    appointmentStart: string | null;
    cancelledAt: string | null;
    editable: boolean;
    cancellable: boolean;
    resumable: boolean;
    campaign: ScheduledSmsCampaign | null;
}

export interface ScheduledSmsOverview {
    items: ScheduledSmsItem[];
    /** „12:00" - godziny, w których wolno pisać do klienta. */
    sendWindowOpensAt: string;
    sendWindowClosesAt: string;
    /** Do kiedy sięga lista wyliczanych przypomnień automatu. */
    horizonEnd: string;
}

export interface UpdateScheduledSmsPayload {
    messageContent: string;
    /** ISO-8601 (instant). */
    scheduledFor: string;
}
