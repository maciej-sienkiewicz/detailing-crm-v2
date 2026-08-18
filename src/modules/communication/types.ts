// src/modules/communication/types.ts
// Widok modułu „Zapytania" składa się z dwóch źródeł backendowych:
//   • leady            — istniejący moduł /api/v1/leads (statusy, wycena, komentarze),
//   • skrzynka i wątki — moduł /api/v1/mailbox (korespondencja, odpowiedzi, konta).
// Poniższe typy to modele widoku: część pól powstaje z mapowania encji leada,
// dlatego nie są kopią 1:1 żadnej odpowiedzi API.

import type { LeadStatus } from '../leads/types';

/**
 * Etap na tablicy to po prostu status leada — nie wprowadzamy własnej drabinki.
 * Unia stringów, bo API zwraca wartości tekstowe, a nie instancje enuma.
 */
export type LeadStage = `${LeadStatus}`;

export type MessageDirection = 'INBOUND' | 'OUTBOUND';

/** Karta leada na tablicy / wiersz listy. Kwoty w groszach. */
export interface LeadCard {
    id: string;
    stage: LeadStage;
    vehicleBrand?: string | null;
    vehicleModel?: string | null;
    services: string[];
    customerName?: string | null;
    contactIdentifier: string;
    /** Szacowana wartość leada w groszach (0 gdy brak wyceny). */
    estimatedValue: number;
    /** Ostatnia zmiana na leadzie — wiek pokazywany na karcie. */
    lastActivityAt: string;
    /** Nieodczytana odpowiedź klienta (backendowe newActivityAt). */
    hasNewActivity: boolean;
    /** Lead oznaczony przez system jako wymagający sprawdzenia. */
    requiresVerification: boolean;
    createdAt: string;
}

/** Chip faktu w nagłówku szuflady. Wartości pochodzą z leada i jego wyceny. */
export type FactKey = 'VEHICLE' | 'SERVICE' | 'CONTACT';

export interface Fact {
    id: string;
    key: FactKey;
    value: string;
    /** false → ramka przerywana; backend zna tylko flagę requiresVerification na leadzie. */
    verified: boolean;
}

export interface QuoteItem {
    name: string;
    /** Kwota brutto w groszach. */
    price: number;
}

export interface MessageTimelineItem {
    type: 'MESSAGE';
    id: string;
    direction: MessageDirection;
    sentAt: string;
    fromName?: string | null;
    bodyText: string;
    sendStatus: 'RECEIVED' | 'OUTBOX_PENDING' | 'SENT' | 'FAILED';
}

export interface NoteTimelineItem {
    type: 'NOTE';
    id: string;
    text: string;
    createdAt: string;
    author?: string | null;
}

/** Wycena zapisana na leadzie — obiekt w osi czasu, nie tekst. */
export interface QuoteTimelineItem {
    type: 'QUOTE';
    id: string;
    items: QuoteItem[];
    /** Suma brutto w groszach. */
    total: number;
    sentAt: string;
}

export type TimelineItem = MessageTimelineItem | NoteTimelineItem | QuoteTimelineItem;

export interface LeadDetailView extends LeadCard {
    facts: Fact[];
    timeline: TimelineItem[];
    /** Wątek e-mail leada; null gdy lead powstał ręcznie albo przed wdrożeniem skrzynki. */
    threadId: string | null;
    /** Odpowiadanie z CRM wymaga podpiętej skrzynki stojącej za wątkiem. */
    canReplyFromCrm: boolean;
    /** Pozycje gotowe do wstawienia w edytorze (ręczna wycena ma pierwszeństwo nad wyliczoną). */
    quoteItems: QuoteItem[];
}

// ─── Skrzynka (/api/v1/mailbox) ────────────────────────────────────────────

export interface ThreadMessage {
    id: string;
    direction: MessageDirection;
    fromEmail: string;
    fromName: string | null;
    subject: string | null;
    sentAt: string;
    bodyText: string;
    hasAttachments: boolean;
    sendStatus: 'RECEIVED' | 'OUTBOX_PENDING' | 'SENT' | 'FAILED';
}

export interface LeadThread {
    threadId: string | null;
    leadId: string | null;
    classification: string | null;
    lastMessageAt: string | null;
    lastDirection: MessageDirection | null;
    canReplyFromCrm: boolean;
    messages: ThreadMessage[];
}

export interface ReviewItem {
    threadId: string;
    fromEmail: string;
    fromName?: string | null;
    subject?: string | null;
    snippet: string;
    receivedAt: string;
}

export type ReviewDecision = 'INQUIRY' | 'IGNORE_SENDER';

export type MailProviderType = 'GOOGLE_API' | 'MS_GRAPH' | 'IMAP_SMTP';
export type MailAuthType = 'OAUTH2' | 'PASSWORD' | 'APP_PASSWORD';
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
    id: string;
    emailAddress: string;
    providerType: MailProviderType;
    status: MailAccountStatus;
    lastError?: string | null;
    lastSyncAt?: string | null;
}
