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
}

// ── Insights ─────────────────────────────────────────────────────────────────

export interface ContactInsights {
    email: string;
    customer: { id: string; name: string | null; phone: string | null } | null;
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
export type LeadSource = 'PHONE' | 'EMAIL' | 'MANUAL';

export interface LeadServiceItem {
    id: string;
    serviceId: string | null;
    name: string;
    priceGross: number;
    quantity: number;
    totalGross: number;
}

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
    category: string | null;
    categoryLabel: string | null;
    lostReasonCode: string | null;
    lostReasonLabel: string | null;
    lostReason: string | null;
    services: LeadServiceItem[];
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
    categories: DictionaryEntry[];
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
}

export interface MarkThreadAsLeadRequest {
    category?: string;
    services: LeadServiceItemInput[];
}

export interface LeadAnalytics {
    from: string;
    to: string;
    totalCreated: number;
    byStatus: Record<string, number>;
    conversionRate: number | null;
    wonValue: number;
    pipelineValue: number;
    categories: {
        code: string | null;
        label: string;
        count: number;
        completed: number;
        conversionRate: number | null;
    }[];
    lostReasons: {
        code: string;
        label: string;
        count: number;
        share: number;
    }[];
    medianFirstResponseMinutes: number | null;
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
