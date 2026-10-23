import type { ApiProblem } from '@/core/problem';

export type BillingStatus = 'NO_PLAN' | 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED';

export type PlanKey = 'BASIC' | 'FULL';

export type FeatureKey =
    | 'CALENDAR'
    | 'VISITS'
    | 'CUSTOMERS'
    | 'VEHICLES'
    | 'DOCUMENTS'
    | 'GALLERY'
    | 'AI_LEADS'
    | 'INSTAGRAM_MONITORING'
    | 'SMS_EMAIL'
    | 'CAMPAIGNS'
    | 'E_SIGNATURES'
    | 'FINANCE'
    | 'STATISTICS'
    | 'PRODUCTS';

export type AddOnKey =
    | 'AI_LEAD_ASSISTANT'
    | 'INSTAGRAM_MONITORING'
    | 'CLIENT_COMMUNICATION'
    | 'MARKETING_CAMPAIGNS'
    | 'E_SIGNATURES'
    | 'FINANCE_MODULE'
    | 'STATISTICS_MODULE'
    | 'PRODUCTS_MODULE';

export type PaymentEventType =
    | 'SUBSCRIPTION_PURCHASE'
    | 'SUBSCRIPTION_RENEWAL'
    | 'PLAN_UPGRADE'
    | 'PLAN_DOWNGRADE'
    | 'ADD_ON_ACTIVATION'
    | 'ADD_ON_DEACTIVATION';

// ─── Feature gating ────────────────────────────────────────────────────────────

export interface FeatureUpsell {
    addOnKey: string | null;
    addOnName: string | null;
    monthlyPriceGrossCents: number | null;
    isAvailable: boolean;
}

export interface FeatureStatus {
    enabled: boolean;
    source: 'PLAN' | 'ADD_ON' | null;
    upsell: FeatureUpsell | null;
}

// ─── Capability gating ────────────────────────────────────────────────────────

/**
 * Capability = an atomic business action resolved by the BACKEND, including
 * cross-module rules (e.g. SIGNATURE_REMOTE_REQUEST = E_SIGNATURES ∧ SMS_EMAIL).
 * The frontend must never re-evaluate these expressions; it only renders the
 * decision it receives from GET /v1/me/entitlements.
 */
export type CapabilityKey =
    | 'COMM_SEND_TRANSACTIONAL'
    | 'COMM_SEND_CAMPAIGN'
    | 'COMM_SMS_CREDITS'
    | 'SIGNATURE_LOCAL'
    | 'SIGNATURE_REMOTE_REQUEST'
    | 'FINANCE_ACCESS'
    | 'FINANCE_INVOICE_ISSUE'
    | 'FINANCE_KSEF'
    | 'AI_LEAD_ASSIST'
    | 'INSTAGRAM_MONITOR'
    | 'STATS_VIEW';

export interface CapabilityMissingFeature {
    key: FeatureKey;
    displayName: string;
}

export interface CapabilityUpsellOption {
    addOnKey: AddOnKey;
    addOnName: string;
    monthlyPriceGrossCents: number | null;
    isAvailable: boolean;
}

export interface CapabilityStatus {
    enabled: boolean;
    displayName: string;
    /** MODULE - brak kupionego modułu; SUBSCRIPTION - moduł jest, ale pakiet nieaktywny. */
    lockedBy?: 'MODULE' | 'SUBSCRIPTION' | null;
    /** Exactly which features are missing; drives the "requires module X" copy. */
    missingFeatures: CapabilityMissingFeature[];
    /** Purchasable add-ons that provide the missing features. */
    upsell: CapabilityUpsellOption[];
}

export interface EntitlementsResponse {
    plan: {
        key: PlanKey;
        name: string;
        monthlyPriceGrossCents: number;
    };
    features: Record<FeatureKey, FeatureStatus>;
    capabilities: Record<CapabilityKey, CapabilityStatus>;
    activeAddOns: AddOnKey[];
    billingStatus?: BillingStatus;
    /** False - pakiet nieaktywny (wygasł); kupione moduły nie działają. */
    subscriptionActive?: boolean;
}

// ─── Paywall (HTTP 402 contract) ──────────────────────────────────────────────


/** Problem 402 `MODULE_REQUIRED`: obok pól RFC 9457 niesie gotową ofertę dodatku. */
export interface PaywallProblem extends ApiProblem {
    capability?: CapabilityKey;
    capabilityDisplayName?: string;
    missingFeatures: CapabilityMissingFeature[];
    upsell: CapabilityUpsellOption[];
}

// ─── My Plan ──────────────────────────────────────────────────────────────────

export interface PlanRef {
    key: PlanKey;
    name: string;
    monthlyPriceGrossCents: number;
}

export interface ActiveAddOn {
    key: AddOnKey;
    name: string;
    monthlyPriceGrossCents: number;
    /**
     * Moduł wyłączy się z końcem opłaconego okresu (ISO); null - przedłuża się z pakietem.
     * Wyłączenie działa z końcem okresu, a nie od razu - dawniej ekran mówił „od razu".
     */
    cancelAt: string | null;
    /** Czy wyłączenie da się cofnąć; false, gdy kolejny okres opłacono już bez modułu. */
    resumable: boolean;
}

export interface PendingDowngrade {
    toPlanKey: PlanKey;
    toPlanName: string;
    effectiveAt: string;
    /** False, gdy kolejny okres jest już opłacony w cenie niższego pakietu (odwołanie → 409). */
    cancellable: boolean;
}

export interface MyPlanResponse {
    billingStatus: BillingStatus;
    plan: PlanRef;
    activeAddOns: ActiveAddOn[];
    pendingDowngrade: PendingDowngrade | null;
    /** Koniec opłaconego okresu; null w trialu bez zakupu. */
    periodEndsAt: string | null;
    trialEndsAt: string | null;
    /** Rozpoczęte dni do końca triala, okresu, a w karencji - do jej końca. */
    daysRemaining: number | null;
    /** Pakiet i moduły według dzisiejszego stanu. */
    monthlyCostCents: number;
    /**
     * Cena KOLEJNEGO okresu (po zaplanowanym zejściu, bez wyłączanych modułów) - tyle pobierze
     * przedłużenie. Przycisk „Przedłuż" pokazywał dawniej `monthlyCostCents`, czyli 299 zł
     * przy zaplanowanym BASIC, a serwer pobierał 99 zł.
     */
    nextRenewalCostCents: number | null;
    /** Koniec karencji (okres minął, dostęp trwa); null poza karencją. */
    graceEndsAt: string | null;
    /** Czy teraz wolno dokupić moduł albo przejść na wyższy pakiet (trial albo trwający okres). */
    canPurchaseMidPeriod: boolean;
    /** Do kiedy sięgnie okres opłacony przedłużeniem zapłaconym teraz. */
    renewalPeriodEndsAt: string | null;
}

// ─── Feature Plans & Add-Ons ──────────────────────────────────────────────────

export interface FeaturePlan {
    key: PlanKey;
    name: string;
    monthlyPriceGrossCents: number;
    features: FeatureKey[];
    displayOrder: number;
}

export interface AddOnDto {
    key: AddOnKey;
    name: string;
    description: string;
    monthlyPriceGrossCents: number | null;
    features: FeatureKey[];
    isAvailable: boolean;
}

// ─── Price Calculator ─────────────────────────────────────────────────────────

export interface CalculatePriceRequest {
    addOnKeys: AddOnKey[];
}

export interface CalculatePriceResponse {
    basePlanKey: PlanKey;
    basePlanName: string;
    basePlanMonthlyPriceCents: number;
    addOns: Array<{
        key: AddOnKey;
        name: string;
        monthlyPriceGrossCents: number | null;
    }>;
    totalMonthlyPriceCents: number | null;
    hasUndefinedPrices: boolean;
    /** FULL bundle price, for the "cheaper than à la carte" upsell hint. */
    fullPlanMonthlyPriceCents: number | null;
    /** Positive when the assembled package costs more than FULL. */
    savingsWithFullCents: number | null;
}

// ─── Plan Change Preview ──────────────────────────────────────────────────────

export type ChangeType = 'UPGRADE' | 'DOWNGRADE' | 'NO_CHANGE';

export interface PlanChangePreview {
    changeType: ChangeType;
    newPlanKey: PlanKey;
    newPlanName: string;
    effectiveAt: string;
    proratedAmountCents: number | null;
    proratedAmountFormatted: string | null;
    daysRemaining: number | null;
    periodEndsAt: string | null;
    explanation: string;
    /** False - zmiany nie da się teraz kupić (okres minął); `explanation` mówi dlaczego. */
    allowed: boolean;
}

// ─── Add-On Preview ───────────────────────────────────────────────────────────

export interface AddOnPreview {
    addOnKey: AddOnKey;
    addOnName: string;
    proratedAmountCents: number | null;
    proratedAmountFormatted: string | null;
    daysRemaining: number | null;
    periodEndsAt: string | null;
    explanation: string;
    /** False - modułu nie da się teraz kupić (okres minął, moduł w przygotowaniu). */
    allowed: boolean;
}

// ─── Checkout (Przelewy24) ────────────────────────────────────────────────────

export type CheckoutType = 'INITIAL_PURCHASE' | 'RENEWAL' | 'PLAN_UPGRADE' | 'ADD_ON_PURCHASE';

/**
 * Lustro `PaymentOrderStatus` z backendu (payments/order/PaymentOrderEntity.kt) - CAŁE.
 * Dawniej były tu tylko cztery stany, a udany zakup kończy się na FULFILLED: strona
 * powrotu z P24 czekała na PAID, które mija w ułamku sekundy (webhook od razu realizuje
 * zamówienie), więc zostawała na „Sprawdzamy płatność…" aż do ręcznego odświeżenia.
 * Znaczenie stanów dla kupującego rozstrzyga `paymentOutcome` (utils/paymentOrderStatus.ts).
 */
export type PaymentOrderStatus =
    | 'PENDING'
    | 'PAID'
    | 'FULFILLED'
    | 'FAILED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'REFUND_REQUIRED';

export interface CheckoutRequest {
    type: CheckoutType;
    planKey?: PlanKey;
    addOnKeys?: AddOnKey[];
    /** Zgoda z CheckoutConsent - wymagana w typie, żeby żadne wejście do płatności jej nie pominęło. */
    acceptTerms: true;
    /** Dokleja API (LEGAL_VERSION) - wersja dokumentów, którą backend zapisuje przy zgodzie. */
    legalVersion?: string;
}

/**
 * paymentUrl: Przelewy24 payment page to redirect the buyer to.
 * Null when the order needed no payment (trial / zero amount) and was fulfilled
 * immediately; in that case status is already PAID.
 */
export interface CheckoutResponse {
    orderId: string;
    status: PaymentOrderStatus;
    amountCents: number;
    currency: string;
    description: string;
    paymentUrl: string | null;
    /**
     * Dlaczego zamówienie bez płatności nie doszło do skutku (CANCELLED, REFUND_REQUIRED).
     * Brak `paymentUrl` NIE znaczy sukcesu - rozstrzyga `status` (`checkoutNextStep`).
     */
    failureReason?: string | null;
}

export interface PaymentOrder {
    orderId: string;
    type: CheckoutType;
    typeDisplayName: string;
    status: PaymentOrderStatus;
    amountCents: number;
    currency: string;
    description: string;
    createdAt: string;
    paidAt: string | null;
    failureReason: string | null;
}

// ─── Payment History ──────────────────────────────────────────────────────────

export interface PaymentHistoryEntry {
    id: string;
    date: string;
    eventType: PaymentEventType;
    eventTypeDisplayName: string;
    description: string;
    amountCents: number;
    amountFormatted: string;
    currency: string;
    transactionId: string;
    plan: { key: PlanKey; name: string } | null;
    addOn: { key: AddOnKey; name: string } | null;
}

/** Historia płatności to `Page<PaymentHistoryEntry>` (`@/core/page`). */
