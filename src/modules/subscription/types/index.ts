export type BillingStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'EXPIRED';

export type PlanKey = 'BASIC' | 'EVERYTHING';

export type FeatureKey =
    | 'CALENDAR'
    | 'VISITS'
    | 'CUSTOMERS'
    | 'VEHICLES'
    | 'DOCUMENTS'
    | 'GALLERY'
    | 'FINANCE'
    | 'EMPLOYEES'
    | 'SMS_EMAIL';

export type AddOnKey = 'SMS_EMAIL_MODULE' | 'FINANCE_MODULE' | 'EMPLOYEES_MODULE';

export type PaymentEventType =
    | 'SUBSCRIPTION_PURCHASE'
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

export interface EntitlementsResponse {
    plan: {
        key: PlanKey;
        name: string;
        monthlyPriceGrossCents: number;
    };
    features: Record<FeatureKey, FeatureStatus>;
    activeAddOns: AddOnKey[];
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
