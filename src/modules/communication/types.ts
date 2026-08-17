// src/modules/communication/types.ts
// Typy 1:1 z kontraktem API modułu komunikacji (prefix /communication).

export type LeadStage = 'NEW' | 'QUOTED' | 'TO_CONFIRM' | 'SCHEDULED' | 'WON' | 'LOST';

export type MessageDirection = 'INBOUND' | 'OUTBOUND';

/** Karta leada na tablicy / wiersz listy. Kwoty w groszach. */
export interface LeadCard {
    id: number;
    stage: LeadStage;
    vehicleBrand?: string | null;
    vehicleModel?: string | null;
    vehicleYear?: number | null;
    services: string[];
    customerName?: string | null;
    contactEmail: string;
    /** Suma wysłanej wyceny w groszach (null gdy brak wyceny). */
    quoteTotal?: number | null;
    lastMessageAt: string;
    lastDirection: MessageDirection;
    unread: boolean;
    returningCustomer: boolean;
    createdAt: string;
}

export type FactKey = 'VEHICLE' | 'SERVICE' | 'PHONE' | 'PREFERRED_DATE';

export interface Fact {
    id: number;
    key: FactKey;
    value: string;
    verified: boolean;
    sourceMessageId?: number | null;
}

export interface QuoteItem {
    name: string;
    /** Kwota w groszach. */
    price: number;
}

export interface MessageTimelineItem {
    type: 'MESSAGE';
    id: number;
    direction: MessageDirection;
    sentAt: string;
    fromName?: string | null;
    bodyText: string;
}

export interface NoteTimelineItem {
    type: 'NOTE';
    id: number;
    text: string;
    createdAt: string;
    author?: string | null;
}

export interface EventTimelineItem {
    type: 'EVENT';
    text: string;
    at: string;
}

export interface QuoteTimelineItem {
    type: 'QUOTE';
    id: number;
    items: QuoteItem[];
    /** Suma w groszach. */
    total: number;
    sentAt: string;
}

export type TimelineItem =
    | MessageTimelineItem
    | NoteTimelineItem
    | EventTimelineItem
    | QuoteTimelineItem;

export interface LeadDetail extends LeadCard {
    phone?: string | null;
    facts: Fact[];
    timeline: TimelineItem[];
}

export interface LeadListResponse {
    leads: LeadCard[];
}

export interface ReplyRequest {
    bodyText: string;
    quote?: { items: QuoteItem[] };
    nextStage?: string;
}

export interface ReplyResponse {
    messageId: number;
}

export interface StageChangeRequest {
    stage: LeadStage;
    reason?: string;
}

export interface UpdateFactRequest {
    factId: number;
    value: string;
}

export interface ReviewItem {
    threadId: number;
    fromEmail: string;
    fromName?: string | null;
    subject?: string | null;
    snippet: string;
    receivedAt: string;
}

export interface ReviewQueueResponse {
    items: ReviewItem[];
}

export type ReviewDecision = 'INQUIRY' | 'IGNORE_SENDER';

export type MailProviderType = 'GOOGLE_API' | 'MS_GRAPH' | 'IMAP_SMTP';
export type MailAuthType = 'OAUTH2' | 'PASSWORD';
export type MailAccountStatus = 'ACTIVE' | 'AUTH_FAILED' | 'DISABLED';

export interface ProviderDetectResult {
    providerType: MailProviderType;
    authType: MailAuthType;
    imapHost?: string | null;
    imapPort?: number | null;
    smtpHost?: string | null;
    smtpPort?: number | null;
    requiresAppPassword: boolean;
    guideUrl?: string | null;
}

export interface CreateMailAccountRequest {
    email: string;
    password: string;
    imapHost?: string | null;
    imapPort?: number | null;
    smtpHost?: string | null;
    smtpPort?: number | null;
}

export interface MailAccount {
    id: number;
    emailAddress: string;
    providerType: string;
    status: MailAccountStatus;
    lastSyncAt?: string | null;
}
