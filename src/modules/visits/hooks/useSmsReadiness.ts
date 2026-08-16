import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCapability } from '@/modules/subscription';
import { useSmsCreditBalance } from '@/modules/settings/hooks/useSmsCredits';
import { fetchAutomationConfig } from '@/modules/sms-campaigns/api/smsCampaignsApi';
import { MESSAGES } from '@/modules/message-templates';
import type { MessageKey } from '@/modules/message-templates';
import type { CapabilityUpsellOption } from '@/modules/subscription/types';

/**
 * Everything standing between the studio and one SMS, answered in one go.
 *
 * Sending used to reveal its requirements one refusal at a time: buy the module,
 * come back, enable a template, come back, top up credits. Each answer was correct
 * and each arrived too late to plan around. This resolves the whole set up front
 * from data the app already holds, so a caller can show the full cost of getting
 * to "send" before anyone spends a minute on the first step.
 *
 * Order matters on the wire, not in the result: the credits and template endpoints
 * are themselves gated on the module, so they are only queried once it is active.
 * Until then those requirements read as `unknown` rather than `missing` — we have
 * not checked them, and saying otherwise would just be a different wrong answer.
 */
export type SmsRequirementId = 'module' | 'template' | 'credits' | 'phone';

export type SmsRequirementStatus =
    /** Satisfied. */
    | 'ok'
    /** Blocks sending and can be resolved from the wizard. */
    | 'missing'
    /** Satisfied for now, but about to bite — low credit balance. */
    | 'warning'
    /** Not checked yet, because an earlier requirement gates the check. */
    | 'unknown';

export interface SmsRequirement {
    id: SmsRequirementId;
    status: SmsRequirementStatus;
    /** Short name of the thing that is needed. */
    label: string;
    /** The current state, in the studio's terms — "0 szt.", "39 zł/mies.". */
    detail: string;
    /** Whether the activation wizard can fix this itself. */
    fixable: boolean;
}

export interface SmsReadiness {
    /** True when nothing blocks sending. */
    ready: boolean;
    /** True while the answer is still being assembled — render nothing, not a lock. */
    isLoading: boolean;
    requirements: SmsRequirement[];
    /** Blocking requirements, in the order the wizard should resolve them. */
    blocking: SmsRequirement[];
    /** Non-blocking heads-up (low balance), worth showing inside the send form. */
    warnings: SmsRequirement[];
    moduleEnabled: boolean;
    /** Add-ons that would satisfy the missing module, straight from entitlements. */
    upsell: CapabilityUpsellOption[];
    capabilityDisplayName: string;
    availableCredits: number | null;
}

export interface UseSmsReadinessOptions {
    /** Skips every query — for modals that are closed. */
    enabled?: boolean;
    /** The recipient's number; absent means this particular send cannot happen. */
    customerPhone?: string | null;
    /**
     * Set when the text comes from a saved template. The per-visit reminder writes its
     * own body, so it leaves this out and the template requirement drops off the list.
     */
    templateKey?: MessageKey;
}

/** Below this the balance is worth flagging before it stops a send mid-week. */
const LOW_CREDIT_THRESHOLD = 5;

const SMS_AUTOMATION_KEY = ['sms-automation'] as const;

export function useSmsReadiness({
    enabled = true,
    customerPhone,
    templateKey,
}: UseSmsReadinessOptions = {}): SmsReadiness {
    const comms = useCapability('COMM_SEND_TRANSACTIONAL');
    const moduleEnabled = comms.enabled;

    const balanceQuery = useSmsCreditBalance({ enabled: enabled && moduleEnabled });

    const templatesQuery = useQuery({
        queryKey: SMS_AUTOMATION_KEY,
        queryFn: fetchAutomationConfig,
        enabled: enabled && moduleEnabled && !!templateKey,
    });

    const templateSpec = useMemo(
        () => (templateKey ? MESSAGES.find(m => m.key === templateKey) ?? null : null),
        [templateKey],
    );

    return useMemo<SmsReadiness>(() => {
        const isLoading =
            comms.isLoading
            || (moduleEnabled && balanceQuery.isLoading)
            || (moduleEnabled && !!templateKey && templatesQuery.isLoading);

        const requirements: SmsRequirement[] = [];

        // ── Module ────────────────────────────────────────────────────────────
        const moduleName = comms.missingFeatures.map(f => f.displayName).join(', ');
        const modulePrice = comms.upsell.find(u => u.monthlyPriceGrossCents != null)?.monthlyPriceGrossCents;
        requirements.push({
            id: 'module',
            status: moduleEnabled ? 'ok' : 'missing',
            label: moduleEnabled
                ? 'Moduł wysyłki wiadomości'
                : `Moduł ${moduleName || 'wysyłki wiadomości'}`,
            detail: moduleEnabled
                ? 'aktywny'
                : modulePrice != null
                    ? `${(modulePrice / 100).toFixed(2).replace('.', ',')} zł/mies.`
                    : 'wymagany',
            fixable: true,
        });

        // ── Template ──────────────────────────────────────────────────────────
        if (templateKey && templateSpec?.sms) {
            const rule = templatesQuery.data?.[templateSpec.sms.ruleKey];
            // Mirrors the backend's `sendable`: switched on AND actually has text.
            const sendable = !!rule?.enabled && (rule?.messageTemplate ?? '').trim().length > 0;
            requirements.push({
                id: 'template',
                status: !moduleEnabled ? 'unknown' : sendable ? 'ok' : 'missing',
                label: `Szablon „${templateSpec.name}"`,
                detail: !moduleEnabled
                    ? 'sprawdzimy po aktywacji modułu'
                    : sendable ? 'włączony'
                    : rule?.enabled ? 'włączony, ale pusty — nic nie wyśle'
                    : 'wyłączony',
                fixable: true,
            });
        }

        // ── Credits ───────────────────────────────────────────────────────────
        const credits = moduleEnabled ? balanceQuery.data?.availableCredits ?? null : null;
        requirements.push({
            id: 'credits',
            status: !moduleEnabled ? 'unknown'
                : credits === null ? 'unknown'
                : credits <= 0 ? 'missing'
                : credits <= LOW_CREDIT_THRESHOLD ? 'warning'
                : 'ok',
            label: 'Kredyty SMS',
            detail: !moduleEnabled ? 'sprawdzimy po aktywacji modułu'
                : credits === null ? '—'
                : `${credits} szt.`,
            fixable: true,
        });

        // ── Recipient ─────────────────────────────────────────────────────────
        // Not a studio setting — nothing here can buy a phone number, so the wizard
        // sends the user to the customer instead of pretending to fix it.
        if (customerPhone !== undefined) {
            const hasPhone = !!customerPhone && customerPhone.trim().length > 0;
            requirements.push({
                id: 'phone',
                status: hasPhone ? 'ok' : 'missing',
                label: 'Numer telefonu klienta',
                detail: hasPhone ? customerPhone!.trim() : 'brak w kartotece',
                fixable: false,
            });
        }

        const blocking = requirements.filter(r => r.status === 'missing');
        const warnings = requirements.filter(r => r.status === 'warning');

        return {
            ready: !isLoading && blocking.length === 0,
            isLoading,
            requirements,
            blocking,
            warnings,
            moduleEnabled,
            upsell: comms.upsell,
            capabilityDisplayName: comms.displayName,
            availableCredits: credits,
        };
    }, [
        comms.isLoading, comms.missingFeatures, comms.upsell, comms.displayName,
        moduleEnabled, balanceQuery.isLoading, balanceQuery.data,
        templatesQuery.isLoading, templatesQuery.data,
        templateKey, templateSpec, customerPhone,
    ]);
}
