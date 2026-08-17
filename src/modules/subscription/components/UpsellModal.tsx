import styled from 'styled-components';
import { usePermissions } from '@/core/permissions/usePermissions';
import { useCapability } from '../hooks/useCapability';
import { useFeature } from '../hooks/useFeature';
import { useAddOnUnlock } from '../hooks/useAddOnUnlock';
import { AddOnActivationDialog } from './PlanChangeDialog';
import { ModuleGateCard } from './ModuleGate';
import type { AddOnKey, CapabilityKey, FeatureKey } from '../types';

type UpsellModalProps = { onClose: () => void } & (
    /** A capability locked per useCapability — the sanctioned gate for business actions. */
    | { capability: CapabilityKey; feature?: never }
    /** A whole feature/module locked per useFeature (e.g. SMS_EMAIL). */
    | { feature: FeatureKey; capability?: never }
);

/**
 * The one modal every "click the lock" surface should open — QuickEventModal,
 * visit editing, the pickup-ready dialog, the visit card modal, etc. Reuses the
 * same ModuleGateCard as the full-page ModuleGate and the global 402 dialog, so
 * every "module missing" surface still looks identical, just reachable earlier
 * (on click, not only after a rejected action).
 */
export function UpsellModal({ onClose, ...props }: UpsellModalProps) {
    const { isOwner } = usePermissions();
    const unlock = useAddOnUnlock();

    const capabilityStatus = useCapability(props.capability ?? 'COMM_SEND_TRANSACTIONAL');
    const featureStatus = useFeature(props.feature ?? 'SMS_EMAIL');

    const option = props.capability
        ? capabilityStatus.upsell.find(o => o.isAvailable) ?? capabilityStatus.upsell[0] ?? null
        : featureStatus.upsell;
    const missingNames = props.capability ? capabilityStatus.missingFeatures.map(f => f.displayName) : [];
    const title = (props.capability ? capabilityStatus.displayName : '') || option?.addOnName || 'Funkcja dodatkowa';

    const handleUnlock = () => {
        if (!option?.isAvailable || !option.addOnKey) return;
        void unlock.openUnlockDialog(option.addOnKey as AddOnKey, option.addOnName ?? '');
    };

    return (
        <>
            <Backdrop onClick={onClose}>
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
                                'Ta funkcja nie jest dostępna w Twoim pakiecie.'
                            )
                        }
                        addOnKey={(option?.addOnKey as AddOnKey) ?? null}
                        priceCents={option?.monthlyPriceGrossCents ?? null}
                        isAvailable={option?.isAvailable ?? false}
                        isOwner={isOwner}
                        onUnlock={handleUnlock}
                    />
                    <DismissLink type="button" onClick={onClose}>
                        Nie teraz
                    </DismissLink>
                </CardWrap>
            </Backdrop>

            {unlock.dialogOpen && unlock.pendingKey && (
                <AddOnActivationDialog
                    addOnKey={unlock.pendingKey}
                    addOnName={unlock.pendingName}
                    preview={unlock.preview}
                    isLoadingPreview={unlock.loadingPreview}
                    onClose={() => { unlock.closeDialog(); onClose(); }}
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
