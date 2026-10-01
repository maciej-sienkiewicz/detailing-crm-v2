/**
 * PAST_DUE = okres karencji: opłacony okres minął, ale studio ma jeszcze pełny
 * dostęp do `graceEndsAt`. Nie ma automatycznego obciążenia karty - przedłużenie
 * opłaca właściciel ręcznie, więc w tekstach nie piszemy „płatność nie przeszła",
 * tylko że okres minął i trzeba go przedłużyć.
 */
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

/**
 * Why a capability is disabled. 'SUBSCRIPTION' = the studio's subscription is not
 * active (expired): the module may well be in the plan, so the UI must point to
 * renewing the subscription, never to buying a module.
 */
export type CapabilityLockedBy = 'MODULE' | 'SUBSCRIPTION';

export interface CapabilityStatus {
    enabled: boolean;
    displayName: string;
    /** Exactly which features are missing; drives the "requires module X" copy. */
    missingFeatures: CapabilityMissingFeature[];
    /** Purchasable add-ons that provide the missing features. */
    upsell: CapabilityUpsellOption[];
    /** Null when enabled. Optional only for older payloads and test fixtures. */
    lockedBy?: CapabilityLockedBy | null;
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
    /**
     * False → every feature and capability is disabled because the subscription
     * is not active (lockedBy = 'SUBSCRIPTION'), not because a module is missing.
     */
    subscriptionActive?: boolean;
}

// ─── Paywall (HTTP 402 contract) ──────────────────────────────────────────────

/** Machine-readable codes carried by every HTTP 402 body. Branch on code, never on message. */
export const PAYWALL_CODE_MODULE_REQUIRED = 'MODULE_REQUIRED';
export const PAYWALL_CODE_INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS';

/**
 * 409 przy odwołaniu obniżenia, a także przy ponownym zaplanowaniu innego obniżenia
 * (POST change-plan): kolejny okres opłacono już w cenie niższego planu.
 */
export const DOWNGRADE_ALREADY_PAID_CODE = 'DOWNGRADE_ALREADY_PAID';

/** 409 przy „Przywróć" moduł: kolejny okres opłacono już bez tego modułu. */
export const ADD_ON_RENEWAL_ALREADY_PAID_CODE = 'ADD_ON_RENEWAL_ALREADY_PAID';

/** 409 przy zamówieniu: pierwsze kliknięcie właśnie rejestruje płatność w Przelewy24. */
export const CHECKOUT_IN_PROGRESS_CODE = 'CHECKOUT_IN_PROGRESS';
/** 409: szkic zamówienia „za darmo w okresie próbnym", a próba właśnie się skończyła - cena się zmieniła. */
export const PRICE_CHANGED_CODE = 'PRICE_CHANGED';

export interface PaywallErrorResponse {
    code: string;
    error: string;
    message: string;
    capability: CapabilityKey | null;
    capabilityDisplayName: string | null;
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
    monthlyPriceGrossCents: number | null;
    /**
     * Wyłączenie zaplanowane na koniec opłaconego okresu: moduł działa do tej daty,
     * potem znika i nie wchodzi do ceny przedłużenia. Null = moduł zostaje.
     * „Przywróć" (POST /add-ons/{key}/resume) kasuje plan wyłączenia bez opłaty.
     */
    cancelAt: string | null;
    /**
     * Czy zaplanowane wyłączenie da się jeszcze cofnąć. False, gdy kolejny okres
     * opłacono już bez tego modułu - „Przywróć" skończyłoby się 409
     * ADD_ON_RENEWAL_ALREADY_PAID, a moduł można dokupić dopiero od `cancelAt`.
     * Bez `cancelAt` zawsze false.
     */
    resumable: boolean;
}

export interface PendingDowngrade {
    toPlanKey: PlanKey;
    toPlanName: string;
    effectiveAt: string;
    /**
     * False, gdy kolejny okres jest już opłacony w cenie niższego planu - odwołanie
     * zwróciłoby 409 DOWNGRADE_ALREADY_PAID, więc go nie proponujemy.
     */
    cancellable: boolean;
}

export interface MyPlanResponse {
    billingStatus: BillingStatus;
    plan: PlanRef;
    activeAddOns: ActiveAddOn[];
    pendingDowngrade: PendingDowngrade | null;
    /**
     * Koniec opłaconego okresu. Null, gdy studio nigdy nie płaciło (wygasły okres
     * próbny) - takiego studia nie wolno pytać „opłacony okres minął".
     */
    periodEndsAt: string | null;
    /**
     * Koniec okresu próbnego. Bywa ustawiony także przy ACTIVE: pakiet kupiony
     * w trakcie próby zaczyna opłacony okres dopiero z jej końcem. Status, nie ta
     * data, decyduje, czy pokazać okres próbny.
     */
    trialEndsAt: string | null;
    /** Koniec karencji (PAST_DUE): do tej daty studio ma jeszcze pełny dostęp. */
    graceEndsAt: string | null;
    /**
     * Dni do końca DOSTĘPU, nie okresu: przy ACTIVE liczy się z karencją po końcu
     * okresu, w karencji do `graceEndsAt`, w okresie próbnym do jego końca. Obok
     * daty końca opłaconego okresu nie pasuje - patrz SubscriptionSettingsPage.
     */
    daysRemaining: number | null;
    /** Bieżący plan i wszystkie dziś aktywne moduły. */
    monthlyCostCents: number;
    /**
     * Cena KOLEJNEGO okresu - tyle pobierze przedłużenie: plan docelowy, gdy czeka
     * obniżenie, bez modułów z `cancelAt`. Null tylko bez planu (NO_PLAN).
     */
    nextRenewalCostCents: number | null;
    /**
     * Czy wolno teraz kupić wyższy plan albo moduł (dopłata za resztę okresu).
     * False po końcu opłaconego okresu (karencja, wygaśnięcie): najpierw przedłużenie.
     */
    canPurchaseMidPeriod: boolean;
    /**
     * Do kiedy sięgnie okres opłacony przedłużeniem zapłaconym TERAZ - liczy backend tą samą
     * funkcją co przy realizacji. Zwykle koniec okresu + 30 dni albo dziś + 30 dni; tuż po
     * karencji mniej, bo okres obejmuje wykorzystane dni karencji. Null bez planu; brak pola
     * w starszych odpowiedziach.
     */
    renewalPeriodEndsAt?: string | null;
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
    daysRemaining: number;
    periodEndsAt: string;
    explanation: string;
    /**
     * False, gdy tej zmiany nie da się teraz kupić (okres minął - najpierw
     * przedłużenie). `proratedAmountCents` jest wtedy null, ale to NIE jest okres
     * próbny. Opcjonalne tylko dla starszych odpowiedzi.
     */
    allowed?: boolean;
}

// ─── Add-On Preview ───────────────────────────────────────────────────────────

export interface AddOnPreview {
    addOnKey: AddOnKey;
    addOnName: string;
    proratedAmountCents: number | null;
    proratedAmountFormatted: string | null;
    daysRemaining: number;
    periodEndsAt: string;
    explanation: string;
    /**
     * False, gdy modułu nie da się teraz aktywować (okres minął albo moduł jest
     * jeszcze w przygotowaniu). `proratedAmountCents` jest wtedy null, ale to NIE
     * jest okres próbny. Opcjonalne tylko dla starszych odpowiedzi.
     */
    allowed?: boolean;
}

// ─── Checkout (Przelewy24) ────────────────────────────────────────────────────

export type CheckoutType = 'INITIAL_PURCHASE' | 'RENEWAL' | 'PLAN_UPGRADE' | 'ADD_ON_PURCHASE';

/**
 * PENDING          czeka na płatność
 * PAID             pieniądze przyszły i są zweryfikowane, aktywacja w toku - jeszcze NIE sukces
 * FULFILLED        zakup wprowadzony: jedyny stan sukcesu
 * EXPIRED          porzucone u nas, ale spóźniona wpłata wciąż może je przenieść do PAID
 * FAILED/CANCELLED nic nie zostało pobrane
 * REFUND_REQUIRED  pieniądze POBRANE, zakupu nie dało się wprowadzić - wsparcie zwróci środki
 */
export type PaymentOrderStatus =
    | 'PENDING'
    | 'PAID'
    | 'FULFILLED'
    | 'EXPIRED'
    | 'FAILED'
    | 'CANCELLED'
    | 'REFUND_REQUIRED';

export interface CheckoutRequest {
    type: CheckoutType;
    planKey?: PlanKey;
    addOnKeys?: AddOnKey[];
}

/**
 * paymentUrl: Przelewy24 payment page to redirect the buyer to (status PENDING).
 * The backend may hand back an EXISTING open order for the same product (same
 * orderId and paymentUrl) - only at the same price, or up to 1 grosz above a
 * fresh pro-rata recalculation for the same period. The amount is priced when the
 * order is created, not when the preview was shown, so it can still differ from
 * the preview by the time that passed in between.
 * Null together with status FULFILLED: settled immediately (zero amount). Null
 * with any other status is an error, never a success: CANCELLED = a free order
 * that could not be applied (nothing charged), REFUND_REQUIRED = settled without
 * the gateway but not applicable - see utils/checkout.
 */
export interface CheckoutResponse {
    orderId: string;
    status: PaymentOrderStatus;
    amountCents: number;
    currency: string;
    description: string;
    paymentUrl: string | null;
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
    /** Powód porażki albo zwrotu - pokazywany przy FAILED i REFUND_REQUIRED. */
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

export interface PaymentHistoryResponse {
    entries: PaymentHistoryEntry[];
    total: number;
    page: number;
    pageSize: number;
}
