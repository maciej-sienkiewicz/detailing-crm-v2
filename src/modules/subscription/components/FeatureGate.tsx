import { useState } from 'react';
import { useFeature } from '../hooks/useFeature';
import { newSubscriptionApi } from '../api/subscriptionApi';
import { AddOnActivationDialog } from './PlanChangeDialog';
import type { FeatureKey, AddOnKey, AddOnPreview } from '../types';
import { formatCents } from '../utils/formatters';
import {
    GateWrap,
    DemoContent,
    Overlay,
    OverlayCard,
    LockIcon,
    OverlayTitle,
    PriceHint,
    UnlockBtn,
    WaitlistBtn,
    UpgradeHint,
    SoonBadge,
} from './FeatureGate.styles';

interface Props {
    featureKey: FeatureKey;
    children: React.ReactNode;
    demoContent?: React.ReactNode;
}

const LockSvg = () => (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const ZapIcon = () => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
);

export function FeatureGate({ featureKey, children, demoContent }: Props) {
    const feature = useFeature(featureKey);

    const [addOnPreview, setAddOnPreview] = useState<AddOnPreview | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pendingAddOnKey, setPendingAddOnKey] = useState<AddOnKey | null>(null);
    const [pendingAddOnName, setPendingAddOnName] = useState('');

    if (feature.enabled) {
        return <>{children}</>;
    }

    const upsell = feature.upsell;

    const handleUnlock = async () => {
        if (!upsell?.addOnKey || !upsell.isAvailable) return;

        const key = upsell.addOnKey as AddOnKey;
        setPendingAddOnKey(key);
        setPendingAddOnName(upsell.addOnName ?? '');
        setLoadingPreview(true);
        setDialogOpen(true);

        try {
            const preview = await newSubscriptionApi.previewAddOn(key);
            setAddOnPreview(preview);
        } catch {
            setAddOnPreview(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setAddOnPreview(null);
        setPendingAddOnKey(null);
    };

    return (
        <>
            <GateWrap>
                <DemoContent>
                    {demoContent ?? children}
                </DemoContent>

                <Overlay>
                    <OverlayCard>
                        <LockIcon><LockSvg /></LockIcon>

                        <OverlayTitle>
                            Ten moduł wymaga rozszerzenia
                            {upsell?.addOnName && (
                                <><br /><span style={{ color: '#0284c7' }}>{upsell.addOnName}</span></>
                            )}
                        </OverlayTitle>

                        {upsell?.isAvailable === false && (
                            <SoonBadge>Wkrótce dostępny</SoonBadge>
                        )}

                        {upsell?.monthlyPriceGrossCents != null && upsell.isAvailable && (
                            <PriceHint>
                                Dodaj za {formatCents(upsell.monthlyPriceGrossCents)}/mies.
                            </PriceHint>
                        )}

                        {upsell?.isAvailable ? (
                            <UnlockBtn onClick={handleUnlock}>
                                <ZapIcon />
                                Odblokuj moduł
                            </UnlockBtn>
                        ) : (
                            <WaitlistBtn
                                onClick={() => {
                                    window.location.href = `mailto:hello@detailboost.pl?subject=Lista oczekujących — ${upsell?.addOnName ?? 'moduł'}`;
                                }}
                            >
                                Zapisz się na listę oczekujących
                            </WaitlistBtn>
                        )}

                        <UpgradeHint>
                            Lub przejdź na pakiet <a href="/settings?tab=plan">FULL</a> (299,00 PLN/mies.)
                            i zyskaj dostęp do wszystkich modułów.
                        </UpgradeHint>
                    </OverlayCard>
                </Overlay>
            </GateWrap>

            {dialogOpen && pendingAddOnKey && (
                <AddOnActivationDialog
                    addOnKey={pendingAddOnKey}
                    addOnName={pendingAddOnName}
                    preview={addOnPreview}
                    isLoadingPreview={loadingPreview}
                    onClose={handleCloseDialog}
                />
            )}
        </>
    );
}
