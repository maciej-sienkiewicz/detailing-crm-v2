import React from 'react';
import styled from 'styled-components';
import { LockedSection } from '../../../common/components/LockedSection';
import { useCapability } from '../hooks/useCapability';
import type { CapabilityKey } from '../types';

/**
 * The single sanctioned wrapper for capability-gating UI fragments.
 *
 * Modes (per the product policy for missing-module UX):
 *  - 'hide':    technical configuration of a module the studio does not own
 *                (configuring the invisible only confuses users),
 *  - 'disable': inline actions inside a workflow: visible, inert, with a
 *                tooltip naming the missing module (a precise sales signal),
 *  - 'upsell':  section-level sales surface (blur + lock overlay linking to
 *                the plan settings), for content worth advertising.
 *
 * IMPORTANT: 'disable' makes children inert but does NOT rewrite their state.
 * Form values that could be submitted (e.g. a default-true checkbox) must be
 * neutralized by the owning component; see MarkReadyDialog for the pattern.
 * The backend rejects such requests with 402 anyway; this is UX, not security.
 *
 * Fail-closed: while entitlements load, content renders in its locked mode.
 */
interface Props {
    capability: CapabilityKey;
    mode: 'hide' | 'disable' | 'upsell';
    /** Overrides the default overlay message in 'upsell' mode. */
    message?: string;
    children: React.ReactNode;
}

const DisabledWrap = styled.span`
    display: contents;

    & > * {
        pointer-events: none;
        opacity: 0.45;
        filter: saturate(0.4);
        user-select: none;
    }
`;

export function RequireCapability({ capability, mode, message, children }: Props) {
    const cap = useCapability(capability);

    if (cap.enabled) return <>{children}</>;

    switch (mode) {
        case 'hide':
            return null;
        case 'disable':
            return (
                <span title={cap.lockReason ?? 'Funkcja niedostępna w Twoim planie'} aria-disabled="true">
                    <DisabledWrap>{children}</DisabledWrap>
                </span>
            );
        case 'upsell':
            return (
                <LockedSection
                    locked
                    message={message ?? cap.lockReason ?? 'Ta funkcja wymaga dodatkowego modułu'}
                    settingsTab="plan"
                >
                    {children}
                </LockedSection>
            );
    }
}
