// src/modules/comms/types.ts
// Typy modułu komunikacji i leadów — lustrzane odbicie DTO backendu
// (CommsController /api/v1/comms, LeadsController /api/v1/leads, MailboxController /api/v1/mailbox).

// ── Skrzynki ─────────────────────────────────────────────────────────────────

export type MailAccountStatus = 'ACTIVE' | 'AUTH_FAILED' | 'DISABLED';

export interface MailAccountState {
    id: string;
    emailAddress: string;
    status: MailAccountStatus;
    lastError: string | null;
    lastSyncAt: string | null;
}

export interface ProviderDetectResult {
    providerType: 'GOOGLE_API' | 'MS_GRAPH' | 'IMAP_SMTP';
    authType: string;
    imapHost: string | null;
    imapPort: number | null;
    smtpHost: string | null;
    smtpPort: number | null;
    requiresAppPassword: boolean;
    guideUrl: string | null;
}

export interface ConnectMailAccountRequest {
    email: string;
    password: string;
    imapHost?: string;
    imapPort?: number;
    smtpHost?: string;
    smtpPort?: number;
}

// ── Wątki i wiadomości ───────────────────────────────────────────────────────

export type CommDirection = 'INBOUND' | 'OUTBOUND';
export type CommReadSource = 'CRM' | 'EXTERNAL';

export interface CommThread {
    id: string;
    accountId: string;
    subject: string | null;
    participantEmail: string;
    participantName: string | null;
    lastMessageAt: string;
    lastDirection: CommDirection;
    lastSnippet: string | null;
    messageCount: number;
    unreadCount: number;
    hasAttachments: boolean;
    leadId: string | null;
    labelId: string | null;
    archived: boolean;
}

export interface CommThreadPage {
    items: CommThread[];
    total: number;
    page: number;
    pageSize: number;
    totalUnread: number;
}

export interface CommAttachment {
    id: string;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    isInline: boolean;
}

export interface CommMessage {
    id: string;
    threadId: string;
    direction: CommDirection;
    fromEmail: string;
    fromName: string | null;
    toEmails: string[];
    ccEmails: string[];
    subject: string | null;
    sentAt: string;
    bodyHtml: string | null;
    isRead: boolean;
    readSource: CommReadSource | null;
    readAt: string | null;
    sendStatus: string;
    attachments: CommAttachment[];
}

export interface CommThreadDetail {
    thread: CommThread;
    messages: CommMessage[];
}

export interface CommLabel {
    id: string;
    name: string;
    color: string | null;
    position: number;
}

export interface ThreadListFilters {
    accountId?: string;
    archived?: boolean;
    labelId?: string;
    onlyUnread?: boolean;
    onlyLeads?: boolean;
    query?: string;
    page?: number;
    pageSize?: number;
}

export interface SendMailRequest {
    accountId?: string;
    threadId?: string;
    to: string[];
    cc?: string[];
    subject?: string;
    bodyHtml: string;
    /** Stopkę dokleja serwer — zapisana treść jest jedynym źródłem prawdy. */
    appendSignature?: boolean;
}

/** Stopka nadawcy — należy do zalogowanego użytkownika, nie do studia. */
export interface MailSignature {
    bodyHtml: string | null;
    /** Czy przełącznik „Dodaj stopkę" startuje włączony. */
    enabledByDefault: boolean;
}

// ── Insights ─────────────────────────────────────────────────────────────────

export interface ContactInsights {
    email: string;
    customer: {
        id: string;
        name: string | null;
        phone: string | null;
        completedVisitCount: number;
        totalSpentGross: number;
    } | null;
    previousThreads: {
        id: string;
        subject: string | null;
        lastMessageAt: string;
        snippet: string | null;
        leadId: string | null;
    }[];
    leads: Lead[];
    upcomingAppointments: InsightsAppointment[];
    pastAppointments: InsightsAppointment[];
}

export interface InsightsAppointment {
    id: string;
    title: string | null;
    startDateTime: string;
    endDateTime: string;
    status: string;
}

// ── Leady ────────────────────────────────────────────────────────────────────

export type LeadStatus = 'NEW' | 'IN_PROGRESS' | 'CONFIRMED' | 'COMPLETED' | 'LOST' | 'NO_SHOW';
export type LeadSource = 'PHONE' | 'EMAIL' | 'FORM' | 'MANUAL';

export interface LeadServiceItem {
    id: string;
    serviceId: string | null;
    name: string;
    priceGross: number;
    /** Netto i VAT — null dla pozycji wycenionych, zanim edytor je zapamiętywał. */
    priceNet: number | null;
    vatRate: number | null;
    note: string | null;
    quantity: number;
    totalGross: number;
}

/**
 * Czyj jest ruch w rozmowie. Wyliczane przez backend z korespondencji, nie ustawiane
 * ręcznie — to fakt (kto napisał ostatni), a nie decyzja (na jakim etapie jest lead).
 */
export type LeadReplyState = 'AWAITING_OUR_REPLY' | 'AWAITING_CLIENT_REPLY' | 'NO_CONVERSATION';

export interface Lead {
    id: string;
    source: LeadSource;
    status: LeadStatus;
    contactIdentifier: string;
    customerName: string | null;
    initialMessage: string | null;
    estimatedValue: number;
    requiresVerification: boolean;
    customerId: string | null;
    appointmentId: string | null;
    visitId: string | null;
    assignedUserId: string | null;
    assignedUserName: string | null;
    threadId: string | null;
    /** Kody tagów — oś „o co pytają" w analityce; lead może mieć ich kilka. */
    tags: string[];
    tagLabels: string[];
    /** Wartości z katalogu pojazdów; null, gdy nie rozpoznano. */
    vehicleBrand: string | null;
    vehicleModel: string | null;
    /** PENDING = rozpoznanie w toku (spinner w tabeli), DONE = zakończone. */
    vehicleDetectionStatus: 'PENDING' | 'DONE';
    lostReasonCode: string | null;
    lostReasonLabel: string | null;
    lostReason: string | null;
    services: LeadServiceItem[];
    replyState: LeadReplyState;
    /** Od kiedy trwa bieżące oczekiwanie; null, gdy nie ma na co czekać. */
    waitingSince: string | null;
    lastInboundAt: string | null;
    lastOutboundAt: string | null;
    firstResponseAt: string | null;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface LeadPage {
    items: Lead[];
    total: number;
    page: number;
    pageSize: number;
}

export interface DictionaryEntry {
    code: string;
    label: string;
}

export interface LeadDictionaries {
    tags: DictionaryEntry[];
    lostReasons: DictionaryEntry[];
}

export interface LeadStatusHistoryEntry {
    fromStatus: LeadStatus | null;
    toStatus: LeadStatus;
    lostReasonLabel: string | null;
    changedByName: string | null;
    createdAt: string;
}

export interface LeadServiceItemInput {
    serviceId: string | null;
    name?: string;
    priceGross?: number;
    quantity: number;
    priceNet?: number;
    vatRate?: number;
    note?: string;
}

export interface MarkThreadAsLeadRequest {
    tags: string[];
    services: LeadServiceItemInput[];
}

/** 1 = poniedziałek … 7 = niedziela; backend zawsze przysyła komplet siedmiu. */
export interface WeekdayStat {
    weekday: number;
    count: number;
}

/** Dzień miesiąca 1–31; komplet, także z zerami. */
export interface MonthDayStat {
    day: number;
    count: number;
}

export interface LeadCategoryStat {
    code: string | null;
    label: string;
    count: number;
    completed: number;
    lost: number;
    conversionRate: number | null;
}

export interface LeadSourceStat {
    source: string;
    count: number;
    won: number;
    closed: number;
    winRate: number | null;
}

export type ResponseBucketKey = 'UNDER_1H' | 'UNDER_4H' | 'UNDER_24H' | 'OVER_24H' | 'NO_REPLY';

export interface ResponseBucket {
    key: ResponseBucketKey;
    count: number;
    won: number;
    closed: number;
    winRate: number | null;
}

/**
 * „Nie wykryto zależności" jest pełnoprawną odpowiedzią i przychodzi z backendu
 * jako werdykt, a nie jako brak danych do narysowania. Ocena próby zapada tam,
 * gdzie są liczby; okno tylko ją wypowiada.
 */
export interface ResponseImpact {
    buckets: ResponseBucket[];
    verdict: 'FASTER_WINS' | 'NO_RELATION' | 'NOT_ENOUGH_DATA';
    fastWinRate: number | null;
    slowWinRate: number | null;
}

export interface VehicleOutlier {
    label: string;
    count: number;
    won: number;
    closed: number;
    winRate: number;
    direction: 'ABOVE' | 'BELOW';
}

/** [periodStart] to poniedziałek tygodnia albo pierwszy dzień miesiąca (YYYY-MM-DD). */
export interface TimelinePoint {
    periodStart: string;
    created: number;
    won: number;
    lost: number;
    winRate: number | null;
    /** Wartość zapytań okresu w rozbiciu na wynik — grosze. */
    wonValue: number;
    lostValue: number;
    /** Rozmowy wciąż żywe: otwarte i młodsze niż okno decyzji. */
    openValue: number;
    /** Otwarte, ale starsze niż okno decyzji — formalnie żywe, w praktyce ucichłe. */
    silentValue: number;
}

/**
 * Wygrane i przegrane w jednym segmencie aut. Dwie osie: wielkość mówi o pracy
 * (ile lakieru, ile wykrojów folii), klasa rynkowa o rozmowie o cenie.
 */
export interface SegmentStat {
    code: string;
    label: string;
    count: number;
    won: number;
    lost: number;
    winRate: number | null;
    averageValue: number | null;
}

/**
 * Wiersz macierzy „usługa × dzień tygodnia".
 * [counts] ma zawsze siedem pozycji: poniedziałek → niedziela.
 */
export interface WeekdayMatrixRow {
    code: string | null;
    label: string;
    /** Średnia wycena leadów tej usługi, które zostały wycenione; null gdy żaden. */
    averageValue: number | null;
    counts: number[];
    total: number;
}

/**
 * Pieniądze czekające na odpowiedź — stan BIEŻĄCY, nie okno raportu.
 * Zaległa rozmowa nie przestaje być zaległa dlatego, że ktoś przełączył widok
 * na „ostatnie 30 dni".
 */
export interface AwaitingWork {
    value: number;
    count: number;
    oldest: {
        leadId: string;
        name: string;
        vehicle: string | null;
        value: number;
        waitingDays: number;
    } | null;
}

/** Wyciek pieniędzy: [code] to kod powodu albo NO_REPLY. */
export interface Leak {
    code: string;
    label: string;
    value: number;
    count: number;
}

export interface LeadAnalytics {
    from: string;
    to: string;
    totalCreated: number;
    byStatus: Record<string, number>;
    conversionRate: number | null;
    wonValue: number;
    lostValue: number;
    pipelineValue: number;
    /** Otwarte, ale starsze niż okno decyzji — osobno, bo to już nie jest pipeline. */
    silentValue: number;
    categories: LeadCategoryStat[];
    lostReasons: {
        code: string;
        label: string;
        count: number;
        share: number;
    }[];
    medianFirstResponseMinutes: number | null;
    medianDaysToDecision: number | null;
    inquiriesByWeekday: WeekdayStat[];
    decisionsByWeekday: WeekdayStat[];
    inquiriesByMonthDay: MonthDayStat[];
    responseImpact: ResponseImpact;
    vehicleOutliers: VehicleOutlier[];
    timeline: TimelinePoint[];
    weekdayMatrix: WeekdayMatrixRow[];
    bySizeSegment: SegmentStat[];
    byMarketTier: SegmentStat[];
    bySource: LeadSourceStat[];
    awaiting: AwaitingWork;
    leaks: Leak[];
    wonValuePrevious: number;
    confirmedValueThisWeek: number;
}

// ── Zdarzenia WebSocket (topic dashboardu) ───────────────────────────────────

export interface DashboardSocketEvent<T = unknown> {
    type: string;
    payload: T;
    timestamp: string;
}

export interface CommThreadUpdatedPayload {
    threadId: string;
    newMessage: boolean;
}

export interface CommMessageReadPayload {
    threadId: string;
    messageId: string;
    readSource: CommReadSource;
}

// ── Kontekst kontaktu w nagłówku rozmowy ─────────────────────────────────────

/** Dwie liczby do plakietek: ile innych wątków i ile notatek ma ten adres. */
export interface ThreadContactBadges {
    email: string;
    otherThreadCount: number;
    noteCount: number;
}

export interface ContactNote {
    id: string;
    body: string;
    createdByName: string;
    createdAt: string;
    updatedAt: string;
    edited: boolean;
}

export type ContactNoteAction = 'CREATED' | 'UPDATED' | 'DELETED';

export interface ContactNoteEvent {
    id: string;
    action: ContactNoteAction;
    bodyBefore: string | null;
    bodyAfter: string | null;
    actorName: string;
    createdAt: string;
}

// ── Webhooki formularzy ──────────────────────────────────────────────────────

export interface LeadIntakeWebhook {
    id: string;
    name: string;
    /** Ostatnie znaki tokenu — do rozpoznania wpisu, bez ujawniania adresu. */
    tokenHint: string;
    active: boolean;
    fieldMapping: string | null;
    defaultTagCodes: string[];
    createdAt: string;
    lastReceivedAt: string | null;
    receivedCount: number;
}

/** Token widać jeden raz — przy tworzeniu. */
export interface CreatedLeadIntakeWebhook {
    webhook: LeadIntakeWebhook;
    token: string;
}

export type LeadIntakeDeliveryStatus = 'CREATED' | 'DUPLICATE' | 'REJECTED';

export interface LeadIntakeDelivery {
    id: string;
    receivedAt: string;
    status: LeadIntakeDeliveryStatus;
    reason: string | null;
    leadId: string | null;
    payload: string;
}

// ── Wizytówka kontaktu ───────────────────────────────────────────────────────

export interface ContactCardCustomer {
    id: string;
    fullName: string;
    phone: string | null;
    completedVisitCount: number;
    totalSpentGross: number;
    /** Ostatnia ODBYTA wizyta; null, gdy klient jeszcze u nas nie był. */
    lastVisitAt: string | null;
}

export interface ContactCardVehicle {
    id: string;
    brand: string;
    model: string;
    year: number | null;
    licensePlate: string | null;
}

export interface ContactCardVisit {
    id: string;
    title: string | null;
    date: string;
    status: string;
    totalGross: number;
    vehicleLabel: string;
}

/**
 * Surowe liczby, nie ocena. Próg, od którego dwa odwołania są problemem, zależy
 * od tego, jak studio pracuje — a liczbę da się pokazać i wyjaśnić. „Podwyższone
 * ryzyko" bez podania czego dotyczy to zarzut, którego nie sposób sprawdzić.
 */
export interface ContactCardRisk {
    /** Rezerwacje odwołane albo porzucone; zawsze 0 dla kontaktu spoza kartoteki. */
    abandonedBookings: number;
    /** Wcześniejsze zapytania zamknięte jako przegrane albo bez pojawienia się. */
    abandonedLeads: number;
}

export interface ContactCard {
    email: string;
    /** null = adresu nie ma w kartotece. */
    customer: ContactCardCustomer | null;
    vehicles: ContactCardVehicle[];
    recentVisits: ContactCardVisit[];
    risk: ContactCardRisk;
}

// ── Słowniki prezentacyjne ───────────────────────────────────────────────────

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
    NEW: 'Nowy',
    IN_PROGRESS: 'W kontakcie',
    CONFIRMED: 'Rezerwacja',
    COMPLETED: 'Zrealizowany',
    LOST: 'Przegrany',
    NO_SHOW: 'Nie pojawił się',
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, { bg: string; fg: string }> = {
    NEW: { bg: '#eff6ff', fg: '#1d4ed8' },
    IN_PROGRESS: { bg: '#fefce8', fg: '#a16207' },
    CONFIRMED: { bg: '#f0fdf4', fg: '#15803d' },
    COMPLETED: { bg: '#ecfdf5', fg: '#047857' },
    LOST: { bg: '#fef2f2', fg: '#b91c1c' },
    NO_SHOW: { bg: '#faf5ff', fg: '#7e22ce' },
};

/** Statusy, na które użytkownik może przełączyć leada ręcznie. */
export const LEAD_STATUS_FLOW: LeadStatus[] = ['NEW', 'IN_PROGRESS', 'CONFIRMED', 'COMPLETED', 'LOST', 'NO_SHOW'];
