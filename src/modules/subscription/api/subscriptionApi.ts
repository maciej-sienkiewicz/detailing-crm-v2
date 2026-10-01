import { apiClient } from '@/core';
import type {
    EntitlementsResponse,
    MyPlanResponse,
    FeaturePlan,
    AddOnDto,
    CalculatePriceRequest,
    CalculatePriceResponse,
    PlanChangePreview,
    AddOnPreview,
    AddOnKey,
    PlanKey,
    PaymentHistoryResponse,
    CheckoutRequest,
    CheckoutResponse,
    PaymentOrder,
} from '../types';

const BASE = '/v1/subscription';

export const newSubscriptionApi = {
    // ── Feature gating ──────────────────────────────────────────────────────────
    getEntitlements: async (): Promise<EntitlementsResponse> => {
        const res = await apiClient.get<EntitlementsResponse>('/v1/me/entitlements');
        return res.data;
    },

    // ── My plan ─────────────────────────────────────────────────────────────────
    getMyPlan: async (): Promise<MyPlanResponse> => {
        const res = await apiClient.get<MyPlanResponse>(`${BASE}/my-plan`);
        return res.data;
    },

    // ── Catalog ─────────────────────────────────────────────────────────────────
    getFeaturePlans: async (): Promise<FeaturePlan[]> => {
        const res = await apiClient.get<FeaturePlan[]>(`${BASE}/feature-plans`);
        return res.data;
    },

    getAddOns: async (): Promise<AddOnDto[]> => {
        const res = await apiClient.get<AddOnDto[]>(`${BASE}/add-ons`);
        return res.data;
    },

    // ── Price calculator ─────────────────────────────────────────────────────────
    calculatePrice: async (body: CalculatePriceRequest): Promise<CalculatePriceResponse> => {
        const res = await apiClient.post<CalculatePriceResponse>(`${BASE}/calculate-price`, body);
        return res.data;
    },

    // ── Previews ─────────────────────────────────────────────────────────────────
    // `options.skipErrorToast`: ekran, który sam mówi o nieudanej wycenie (toast
    // z tytułem w Abonamencie), wyłącza toast interceptora - inaczej to samo
    // zdanie pojawiało się dwa razy. Bez opcji zachowanie jest jak dawniej.
    previewPlanChange: async (newPlanKey: PlanKey, options?: { skipErrorToast?: boolean }): Promise<PlanChangePreview> => {
        const res = await apiClient.post<PlanChangePreview>(
            `${BASE}/preview-plan-change`,
            { newPlanKey },
            { skipErrorToast: options?.skipErrorToast },
        );
        return res.data;
    },

    previewAddOn: async (addOnKey: AddOnKey, options?: { skipErrorToast?: boolean }): Promise<AddOnPreview> => {
        const res = await apiClient.post<AddOnPreview>(
            `${BASE}/preview-add-on`,
            { addOnKey },
            { skipErrorToast: options?.skipErrorToast },
        );
        return res.data;
    },

    // ── Checkout (Przelewy24) ────────────────────────────────────────────────────
    // Every paid operation (first purchase, renewal, upgrade, module purchase)
    // creates a payment order. When paymentUrl is returned, redirect the browser
    // there; the webhook fulfils the order and the /payments/result page picks
    // the buyer up on return. Read the response through utils/checkout.
    //
    // Zawsze `skipErrorToast`: każdy ekran zamówienia mówi o błędzie sam (okno
    // w dialogu, toast z tytułem, komunikat przy planach) - interceptor dokładał
    // do tego gołe zdanie z backendu, a 503 „płatności niedostępne" i tak pomijał.
    checkout: async (body: CheckoutRequest): Promise<CheckoutResponse> => {
        const res = await apiClient.post<CheckoutResponse>(`${BASE}/checkout`, body, { skipErrorToast: true });
        return res.data;
    },

    getOrder: async (orderId: string): Promise<PaymentOrder> => {
        const res = await apiClient.get<PaymentOrder>(`${BASE}/orders/${orderId}`);
        return res.data;
    },

    // ── Free mutations (no payment) ──────────────────────────────────────────────
    /**
     * Schedules a downgrade at period end. Upgrades must go through checkout.
     * Okno zmiany planu mówi o błędzie samo - także o 409 DOWNGRADE_ALREADY_PAID
     * (obniżenie zamrożone opłaconym okresem), którego goły toast nie tłumaczył.
     */
    changePlan: async (planKey: PlanKey): Promise<EntitlementsResponse> => {
        const res = await apiClient.post<EntitlementsResponse>(`${BASE}/change-plan`, { planKey }, { skipErrorToast: true });
        return res.data;
    },

    /**
     * Wyłączenie modułu z końcem opłaconego okresu: moduł działa do `cancelAt`
     * (widać je w my-plan po odświeżeniu) i nie wchodzi do ceny przedłużenia.
     * Bez trwającego opłaconego okresu (okres próbny, karencja) znika od razu.
     */
    deactivateAddOn: async (addOnKey: AddOnKey): Promise<EntitlementsResponse> => {
        const res = await apiClient.delete<EntitlementsResponse>(`${BASE}/add-ons/${addOnKey}`, { skipErrorToast: true });
        return res.data;
    },

    /** Odwołuje zaplanowane wyłączenie modułu, bez opłaty. 404 = moduł nie jest już aktywny. */
    resumeAddOn: async (addOnKey: AddOnKey): Promise<EntitlementsResponse> => {
        const res = await apiClient.post<EntitlementsResponse>(`${BASE}/add-ons/${addOnKey}/resume`, undefined, { skipErrorToast: true });
        return res.data;
    },

    startTrial: async (): Promise<void> => {
        await apiClient.post(`${BASE}/start-trial`);
    },

    // 404 (nic już nie czeka) i 409 DOWNGRADE_ALREADY_PAID tłumaczy baner zmiany
    // planu własnym toastem z tytułem - interceptor dawał tylko gołe zdanie.
    cancelPendingPlanChange: async (): Promise<void> => {
        await apiClient.delete(`${BASE}/pending-plan-change`, { skipErrorToast: true });
    },

    // ── Payment history ──────────────────────────────────────────────────────────
    getPaymentHistory: async (page = 0, pageSize = 20): Promise<PaymentHistoryResponse> => {
        const res = await apiClient.get<PaymentHistoryResponse>(`${BASE}/payment-history`, {
            params: { page, pageSize },
        });
        return res.data;
    },
};
