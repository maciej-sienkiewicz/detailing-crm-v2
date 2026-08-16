export type BillingStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED';

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
    | 'STATISTICS';

export type AddOnKey =
    | 'AI_LEAD_ASSISTANT'
    | 'INSTAGRAM_MONITORING'
    | 'CLIENT_COMMUNICATION'
    | 'MARKETING_CAMPAIGNS'
    | 'E_SIGNATURES'
    | 'FINANCE_MODULE'
    | 'STATISTICS_MODULE';

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
 * The frontend must never re-evaluate these expressions — it only renders the
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
    /** Exactly which features are missing — drives the "requires module X" copy. */
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
}

// ─── Paywall (HTTP 402 contract) ──────────────────────────────────────────────

/** Machine-readable codes carried by every HTTP 402 body. Branch on code, never on message. */
export const PAYWALL_CODE_MODULE_REQUIRED = 'MODULE_REQUIRED';
export const PAYWALL_CODE_INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS';

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
    monthlyPriceGrossCents: number;
}

export interface PendingDowngrade {
    toPlanKey: PlanKey;
    toPlanName: string;
    effectiveAt: string;
}

export interface MyPlanResponse {
    billingStatus: BillingStatus;
    plan: PlanRef;
    activeAddOns: ActiveAddOn[];
    pendingDowngrade: PendingDowngrade | null;
    periodEndsAt: string;
    trialEndsAt: string | null;
    daysRemaining: number;
    monthlyCostCents: number;
    nextRenewalCostCents: number;
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
}

// ─── Checkout (Przelewy24) ────────────────────────────────────────────────────

export type CheckoutType = 'INITIAL_PURCHASE' | 'RENEWAL' | 'PLAN_UPGRADE' | 'ADD_ON_PURCHASE';

export type PaymentOrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';

export interface CheckoutRequest {
    type: CheckoutType;
    planKey?: PlanKey;
    addOnKeys?: AddOnKey[];
}

/**
 * paymentUrl — Przelewy24 payment page to redirect the buyer to.
 * Null when the order needed no payment (trial / zero amount) and was fulfilled
 * immediately — in that case status is already PAID.
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
