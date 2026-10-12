// Widok „Zaplanowana komunikacja" - kształt odpowiedzi GET /api/scheduled-sms i GET /api/scheduled-email.

/** Zakładka kanału: SMS-y i e-maile mają osobne listy, bo osobne są ich źródła i ich edycja. */
export type MessageChannel = 'SMS' | 'EMAIL';

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

// ── Zakładka „Wysłane" - GET /api/scheduled-sms/sent ────────────────────────

export type SentSmsStatus = 'SENT' | 'FAILED';

export interface SentSmsCampaign {
    id: string;
    name: string;
    sentCount: number;
    failedCount: number;
}

export interface SentSmsItem {
    /** Id wpisu dziennika komunikacji; dla kampanii id kampanii. */
    id: string;
    sentAt: string;
    status: SentSmsStatus;
    kindLabel: string;
    messageContent: string | null;
    customerId: string | null;
    customerName: string | null;
    phoneNumber: string | null;
    visitId: string | null;
    appointmentId: string | null;
    /** Powód porażki, gdy status = FAILED. */
    errorMessage: string | null;
    campaign: SentSmsCampaign | null;
}

export interface SentSmsPage {
    items: SentSmsItem[];
    /** Kursor następnej strony („starsze niż"); null, gdy starszych już nie ma. */
    nextBefore: string | null;
}

// ── Zakładka „E-maile" - GET /api/scheduled-email ────────────────────────────

/** E-mail czeka wyłącznie w kolejce okna wysyłki albo w kampanii - nie ma automatów jak SMS. */
export type ScheduledEmailSource = 'QUEUE' | 'CAMPAIGN';

export interface ScheduledEmailItem {
    source: ScheduledEmailSource;
    id: string;
    kindLabel: string;
    waitingReason: string;
    state: ScheduledSmsState;
    scheduledFor: string | null;
    subject: string | null;
    messageContent: string | null;
    customerId: string | null;
    customerName: string | null;
    emailAddress: string | null;
    visitId: string | null;
    appointmentId: string | null;
    /** Pliki, które pójdą w załączniku - zmiana treści ich nie dotyka. */
    attachmentNames: string[];
    cancelledAt: string | null;
    editable: boolean;
    cancellable: boolean;
    resumable: boolean;
    campaign: ScheduledSmsCampaign | null;
}

export interface ScheduledEmailOverview {
    items: ScheduledEmailItem[];
    sendWindowOpensAt: string;
    sendWindowClosesAt: string;
}

export interface UpdateScheduledEmailPayload {
    subject: string;
    messageContent: string;
    /** ISO-8601 (instant). */
    scheduledFor: string;
}

export interface SentEmailItem {
    id: string;
    sentAt: string;
    status: SentSmsStatus;
    kindLabel: string;
    subject: string | null;
    messageContent: string | null;
    customerId: string | null;
    customerName: string | null;
    emailAddress: string | null;
    visitId: string | null;
    appointmentId: string | null;
    errorMessage: string | null;
    campaign: SentSmsCampaign | null;
}

export interface SentEmailPage {
    items: SentEmailItem[];
    nextBefore: string | null;
}

// ── Wspólne dla obu kanałów ──────────────────────────────────────────────────

/** Wiersz kolejki - SMS albo e-mail. Tabele i okna czytają z niego to, co wspólne. */
export type ScheduledItem = ScheduledSmsItem | ScheduledEmailItem;

/** Wiersz historii - SMS albo e-mail. */
export type SentItem = SentSmsItem | SentEmailItem;
