/**
 * Typy zakładki „Moje konta": połączone konto Instagram (oficjalne API Meta),
 * wiadomości z Instagrama, publikacja z generatora i wizytówka w Google.
 *
 * Kształty 1:1 z backendem (instagram/connect, instagram/dm, instagram/publish,
 * googlebusiness). Osobny plik, bo `types.ts` opisuje dane o KONKURENCJI - tu są
 * wyłącznie własne konta studia.
 */

// ─── Instagram: połączenie ────────────────────────────────────────────────────

export type ConnectionStatus = 'NOT_CONNECTED' | 'PENDING_SELECTION' | 'CONNECTED' | 'ERROR';

export interface ConnectionCandidate {
    pageId: string;
    pageName: string;
    igUsername: string;
    followers: number | null;
}

export interface InstagramConnection {
    /** Czy serwer CRM ma klucze aplikacji Meta (META_APP_ID/SECRET) - bez nich łączenie jest nieaktywne. */
    available: boolean;
    status: ConnectionStatus;
    username: string | null;
    pageName: string | null;
    connectedAt: string | null;
    lastSyncAt: string | null;
    lastError: string | null;
    messagingEnabled: boolean;
    candidates: ConnectionCandidate[];
}

// ─── Instagram: statystyki własnego konta ─────────────────────────────────────

/** Rodzaj przycisku kontaktu na profilu - klucze z Meta (`contact_button_type`). */
export type ContactButton = 'CALL' | 'DIRECTION' | 'BOOK_NOW' | 'EMAIL' | 'TEXT';

export interface OwnPeriod {
    reach: number | null;
    views: number | null;
    accountsEngaged: number | null;
    totalInteractions: number | null;
    follows: number | null;
    unfollows: number | null;
    contactTaps: Partial<Record<ContactButton | string, number>>;
}

export interface CityShare {
    name: string;
    sharePct: number;
}

export interface OwnPost {
    mediaId: string;
    permalink: string | null;
    thumbnailUrl: string | null;
    caption: string | null;
    takenAt: string | null;
    productType: string | null;
    reach: number | null;
    views: number | null;
    saved: number | null;
    shares: number | null;
    likes: number | null;
    comments: number | null;
}

export interface MyInstagram {
    connection: InstagramConnection;
    followers: number | null;
    last30: OwnPeriod | null;
    /** Ten sam zestaw sprzed 30 dni; null, dopóki historia nie sięga tak daleko. */
    previous30: OwnPeriod | null;
    /** 24 wartości (godziny 0-23); puste bez danych. */
    bestHours: number[];
    cities: CityShare[];
    topPosts: OwnPost[];
    syncedAt: string | null;
}

// ─── Instagram: wiadomości ────────────────────────────────────────────────────

export interface DmThread {
    id: string;
    username: string | null;
    displayName: string | null;
    leadId: string | null;
    leadStatus: string | null;
    lastMessageAt: string;
    lastSnippet: string | null;
    /** Klient napisał ostatni - ruch po stronie studia. */
    awaitingReply: boolean;
    unreadCount: number;
    /** Do kiedy można odpisać z CRM; null - tylko z aplikacji Instagram. */
    replyDeadline: string | null;
}

// ─── Instagram: publikacja ────────────────────────────────────────────────────

export interface PublishPhoto {
    id: string;
    thumbnailUrl: string;
}

export interface PublishVisit {
    visitId: string;
    visitNumber: string | null;
    vehicle: string;
    date: string;
    photos: PublishPhoto[];
    /** Fakty do „Dodatkowego kontekstu" generatora (bez tablicy, klienta i cen). */
    year?: number | null;
    color?: string | null;
    services?: string[];
}

export interface PublishRequest {
    caption: string | null;
    photoIds: string[];
}

export interface PublishResult {
    mediaId: string;
    permalink: string | null;
}

// ─── Plan publikacji ──────────────────────────────────────────────────────────

export interface InstagramStudioSettings {
    weeklyPostGoal: number;
}

// ─── Wizytówka Google ─────────────────────────────────────────────────────────

export interface GoogleCandidate {
    locationName: string;
    title: string;
    address: string | null;
}

export interface GooglePeriod {
    calls: number;
    directions: number;
    websiteClicks: number;
    conversations: number;
    bookings: number;
    impressions: number;
}

export interface GoogleReview {
    id: string;
    reviewerName: string | null;
    starRating: number | null;
    comment: string | null;
    createdAt: string | null;
    replyComment: string | null;
    replyAt: string | null;
}

export interface GoogleBusiness {
    available: boolean;
    status: ConnectionStatus;
    locationTitle: string | null;
    locationAddress: string | null;
    lastSyncAt: string | null;
    lastError: string | null;
    candidates: GoogleCandidate[];
    averageRating: number | null;
    totalReviews: number | null;
    last30: GooglePeriod | null;
    previous30: GooglePeriod | null;
    /** Ostatni dzień, za który Google podał dane - zwykle 2-3 dni temu. */
    dataUntil: string | null;
    reviews: GoogleReview[];
    unansweredReviews: number;
}

/** Limit Google na odpowiedź właściciela - ten sam co w GoogleReviewRules. */
export const GOOGLE_REPLY_MAX = 4096;
