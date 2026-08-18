import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { usePermissions } from '@/core/permissions/usePermissions';
import { useAddOnUnlock } from '../hooks/useAddOnUnlock';
import { AddOnActivationDialog } from './PlanChangeDialog';
import { ModuleGateCard } from './ModuleGate';
import type { AddOnKey, PaywallErrorResponse } from '../types';

/**
 * Global safety net for the HTTP 402 MODULE_REQUIRED contract.
 *
 * Mounted once (App). Fires ONLY for mutations; background reads fail silently
 * (see apiClient) so simply visiting a view never pops a paywall. When a
 * deliberate action is rejected because the studio lacks a module, this dialog
 * turns the dead end into a purchase path using the same styled card as the
 * full-page ModuleGate: every "module missing" surface looks identical.
 */
export function PaywallListener() {
    const [payload, setPayload] = useState<PaywallErrorResponse | null>(null);
    const { isOwner } = usePermissions();
    const unlock = useAddOnUnlock();

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<PaywallErrorResponse>).detail;
            if (detail?.code === 'MODULE_REQUIRED') setPayload(detail);
        };
        window.addEventListener('api:paywall', handler);
        return () => window.removeEventListener('api:paywall', handler);
    }, []);

    if (!payload) return null;

    const close = () => setPayload(null);

    // The card sells ONE module; for cross-module rules the first purchasable
    // option is offered and the subtitle names every missing module.
    const option = payload.upsell.find(o => o.isAvailable) ?? payload.upsell[0] ?? null;
    const missingNames = payload.missingFeatures.map(f => f.displayName);
    const title = payload.capabilityDisplayName ?? option?.addOnName ?? 'Funkcja dodatkowa';

    const handleUnlock = () => {
        if (!option?.isAvailable) return;
        void unlock.openUnlockDialog(option.addOnKey as AddOnKey, option.addOnName);
    };

    return (
        <>
            <Backdrop onClick={close}>
                <CardWrap onClick={event => event.stopPropagation()}>
                    <ModuleGateCard
                        title={title}
                        subtitle={
                            missingNames.length > 0 ? (
                                <>
                                    Ta funkcja jest częścią modułu{missingNames.length > 1 ? 'ów' : ''}{' '}
                                    <strong>{missingNames.join(', ')}</strong>, który nie jest aktywny
                                    w Twoim pakiecie.
                                </>
                            ) : (
                                payload.message
                            )
                        }
                        addOnKey={(option?.addOnKey as AddOnKey) ?? null}
                        priceCents={option?.monthlyPriceGrossCents ?? null}
                        isAvailable={option?.isAvailable ?? false}
                        isOwner={isOwner}
                        onUnlock={handleUnlock}
                    />
                    <DismissLink type="button" onClick={close}>
                        Nie teraz, wróć do pracy
                    </DismissLink>
                </CardWrap>
            </Backdrop>

            {unlock.dialogOpen && unlock.pendingKey && (
                <AddOnActivationDialog
                    addOnKey={unlock.pendingKey}
                    addOnName={unlock.pendingName}
                    preview={unlock.preview}
                    isLoadingPreview={unlock.loadingPreview}
                    onClose={() => { unlock.closeDialog(); close(); }}
                />
            )}
        </>
    );
}

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
`;

const CardWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    max-width: 480px;
    width: 100%;
`;

const DismissLink = styled.button`
    border: none;
    background: none;
    font-size: 13px;
    color: #e2e8f0;
    cursor: pointer;
    font-family: inherit;

    &:hover { text-decoration: underline; }
`;
