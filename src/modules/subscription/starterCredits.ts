import type { PlanKey } from './types';

/**
 * SMS credits granted when the communication module becomes active.
 *
 * Mirrors CommunicationOnboardingService.STARTER_CREDITS on the backend, which is
 * what actually credits the account; this copy exists so the purchase guide can
 * promise the right number before the payment happens. Keep both in step.
 */
export const STARTER_CREDITS: Record<PlanKey, number> = {
    BASIC: 30,
    FULL: 150,
};
