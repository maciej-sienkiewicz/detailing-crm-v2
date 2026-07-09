import { useAuth } from '@/core/context/AuthContext';
import { useFeature } from '../hooks/useFeature';
import { useAddOnUnlock } from '../hooks/useAddOnUnlock';
import { useAddOns, useEntitlements } from '../api/subscriptionQueries';
import { AddOnActivationDialog } from './PlanChangeDialog';
import { formatCents } from '../utils/formatters';
import type { AddOnKey, FeatureKey } from '../types';
import {
    GatePage,
    DemoLayer,
    GateOverlay,
    GateCard,
    LockBadge,
    GateEyebrow,
    GateTitle,
    GateSubtitle,
    BenefitList,
    BenefitItem,
    PriceRow,
    PriceAmount,
    PricePer,
    UnlockButton,
    FullHint,
    OwnerOnlyNote,
} from './ModuleGate.styles';

const LockSvg = () => (
    <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const CheckSvg = () => (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#10b981"
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

const ZapSvg = () => (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
);

interface Props {
    /** Feature the wrapped view belongs to. */
    featureKey: FeatureKey;
    /** What the user loses without this module — shown as a checklist. */
    benefits: string[];
    /** Overrides the module name from the catalog (optional). */
    title?: string;
    children: React.ReactNode;
}

/**
 * Full-page module gate. When the studio owns the feature, renders the view
 * untouched. When it doesn't, the view stays visible as a blurred, inert
 * demonstration layer with an overlay explaining what the module offers,
 * its price, and a one-click unlock that goes through Przelewy24 checkout.
 *
 * Only the studio owner can purchase; employees see a "ask your owner" note.
 * Note: employees whose role permissions are feature-filtered are redirected
 * by RequirePermission before this component ever renders — the demo layer is
 * primarily the owner's sales surface.
 */
export function ModuleGate({ featureKey, benefits, title, children }: Props) {
    const { user } = useAuth();
    const feature = useFeature(featureKey);
    const { isLoading } = useEntitlements();
    const { data: addOns } = useAddOns();
    const unlock = useAddOnUnlock();

    if (feature.enabled || isLoading) {
        return <>{children}</>;
    }

    const isOwner = user?.role === 'OWNER';

    // Prefer the entitlements upsell (already mapped server-side); fall back to
    // the add-on catalog in case the upsell payload is missing.
    const catalogAddOn = addOns?.find(a => a.features.includes(featureKey));
    const addOnKey = feature.upsell?.addOnKey ?? catalogAddOn?.key ?? null;
    const addOnName = feature.upsell?.addOnName ?? catalogAddOn?.name ?? title ?? '';
    const priceCents = feature.upsell?.monthlyPriceGrossCents ?? catalogAddOn?.monthlyPriceGrossCents ?? null;
    const isAvailable = feature.upsell?.isAvailable ?? catalogAddOn?.isAvailable ?? false;

    const handleUnlock = () => {
        if (!addOnKey || !isAvailable) return;
        unlock.openUnlockDialog(addOnKey as AddOnKey, addOnName);
    };

    return (
        <GatePage>
            <DemoLayer aria-hidden="true">
                {children}
            </DemoLayer>

            <GateOverlay>
                <GateCard>
                    <LockBadge><LockSvg /></LockBadge>
                    <GateEyebrow>Moduł dodatkowy</GateEyebrow>
                    <GateTitle>{title ?? addOnName}</GateTitle>
                    <GateSubtitle>
                        Ten widok jest częścią modułu <strong>{addOnName}</strong>, który nie jest
                        aktywny w Twoim pakiecie. Poniżej podgląd tego, co zyskasz po odblokowaniu:
                    </GateSubtitle>

                    <BenefitList>
                        {benefits.map(benefit => (
                            <BenefitItem key={benefit}>
                                <CheckSvg />
                                {benefit}
                            </BenefitItem>
                        ))}
                    </BenefitList>

                    {priceCents != null && (
                        <PriceRow>
                            <PriceAmount>{formatCents(priceCents)}</PriceAmount>
                            <PricePer>/ miesiąc</PricePer>
                        </PriceRow>
                    )}

                    {isOwner ? (
                        <>
                            <UnlockButton onClick={handleUnlock} disabled={!addOnKey || !isAvailable}>
                                <ZapSvg />
                                Odblokuj moduł
                            </UnlockButton>
                            <FullHint>
                                Lub przejdź na pakiet <a href="/settings?tab=subscription">FULL</a> i
                                zyskaj dostęp do wszystkich modułów w niższej cenie niż suma pojedynczych.
                            </FullHint>
                        </>
                    ) : (
                        <OwnerOnlyNote>
                            Moduły może dokupić wyłącznie właściciel studia.
                            Poproś właściciela o odblokowanie tej funkcji.
                        </OwnerOnlyNote>
                    )}
                </GateCard>
            </GateOverlay>

            {unlock.dialogOpen && unlock.pendingKey && (
                <AddOnActivationDialog
                    addOnKey={unlock.pendingKey}
                    addOnName={unlock.pendingName}
                    preview={unlock.preview}
                    isLoadingPreview={unlock.loadingPreview}
                    onClose={unlock.closeDialog}
                />
            )}
        </GatePage>
    );
}
