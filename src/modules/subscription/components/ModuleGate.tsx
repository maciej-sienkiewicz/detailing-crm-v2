import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { usePermissions } from '@/core/permissions/usePermissions';
import { canPurchaseHere } from '@/core/native/platform';
import { useFeature } from '../hooks/useFeature';
import { useAddOnUnlock } from '../hooks/useAddOnUnlock';
import { useAddOns, useEntitlements } from '../api/subscriptionQueries';
import { AddOnActivationDialog } from './PlanChangeDialog';
import { DemoQueryClient } from './demoQueryClient';
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

// ─── Reusable sales card ──────────────────────────────────────────────────────

export interface ModuleGateCardProps {
    /** Big heading: module or capability name. */
    title: string;
    /** One-paragraph explanation of what is locked and why. */
    subtitle: React.ReactNode;
    /** Optional checklist of what the module offers. */
    benefits?: string[];
    addOnKey: AddOnKey | null;
    priceCents: number | null;
    isAvailable: boolean;
    isOwner: boolean;
    /** W okresie próbnym moduł włącza się bez opłat - sama cena sugerowała płatność. */
    trial?: boolean;
    onUnlock: () => void;
}

/**
 * THE one styled paywall card of the application. Used full-page by [ModuleGate]
 * and inside the global 402 dialog by PaywallListener; every "module missing"
 * surface must look identical, so new variants should reuse this component
 * instead of building their own.
 */
export function ModuleGateCard({
    title,
    subtitle,
    benefits,
    addOnKey,
    priceCents,
    isAvailable,
    isOwner,
    trial,
    onUnlock,
}: ModuleGateCardProps) {
    // W aplikacji ze sklepu karta tylko mówi, że modułu nie ma: bez ceny, listy korzyści,
    // „Odblokuj" i odsyłania do pakietu FULL (App Store 3.1.1, Google Play). Każda
    // powierzchnia „brak modułu" stoi na tej karcie, więc wystarczy ten jeden warunek.
    if (!canPurchaseHere()) {
        return (
            <GateCard>
                <LockBadge><LockSvg /></LockBadge>
                <GateTitle>{title}</GateTitle>
                <GateSubtitle>Ten moduł nie jest włączony na Twoim koncie.</GateSubtitle>
            </GateCard>
        );
    }

    return (
        <GateCard>
            <LockBadge><LockSvg /></LockBadge>
            <GateEyebrow>Moduł dodatkowy</GateEyebrow>
            <GateTitle>{title}</GateTitle>
            <GateSubtitle>{subtitle}</GateSubtitle>

            {benefits && benefits.length > 0 && (
                <BenefitList>
                    {benefits.map(benefit => (
                        <BenefitItem key={benefit}>
                            <CheckSvg />
                            {benefit}
                        </BenefitItem>
                    ))}
                </BenefitList>
            )}

            {priceCents != null && (
                <PriceRow>
                    <PriceAmount>{formatCents(priceCents)}</PriceAmount>
                    <PricePer>brutto / mies.{trial ? ', w okresie próbnym bez opłat' : ''}</PricePer>
                </PriceRow>
            )}

            {isOwner ? (
                <>
                    <UnlockButton onClick={onUnlock} disabled={!addOnKey || !isAvailable}>
                        <ZapSvg />
                        {trial ? 'Włącz bezpłatnie' : 'Odblokuj moduł'}
                    </UnlockButton>
                    <FullHint>
                        Albo przejdź na pakiet <a href="/settings?tab=plan">FULL</a>:
                        wszystkie moduły taniej niż osobno.
                    </FullHint>
                </>
            ) : (
                <OwnerOnlyNote>
                    Moduł może dokupić tylko właściciel studia. Poproś go o to.
                </OwnerOnlyNote>
            )}
        </GateCard>
    );
}

// ─── Full-page gate ───────────────────────────────────────────────────────────

interface Props {
    /** Feature the wrapped view belongs to. */
    featureKey: FeatureKey;
    /** What the user loses without this module, shown as a checklist. */
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
 * by RequirePermission before this component ever renders; the demo layer is
 * primarily the owner's sales surface.
 */
export function ModuleGate({ featureKey, benefits, title, children }: Props) {
    // To samo źródło co reszta modułu - dawniej `user.role === 'OWNER'` rozjeżdżało się
    // z nim przy rolach zapisanych inną wielkością liter.
    const { isOwner } = usePermissions();
    const feature = useFeature(featureKey);
    const { isLoading, data: entitlements } = useEntitlements();
    // Katalog dodatków jest potrzebny tylko na karcie odblokowania.
    const { data: addOns } = useAddOns({ enabled: !feature.enabled && !isLoading });
    const unlock = useAddOnUnlock();
    const [demoClient] = useState(() => new DemoQueryClient());

    // Do wczytania uprawnień nic: wyrenderowany widok zdążyłby wysłać swoje zapytania,
    // a dla niekupionego modułu każde kończyło się 402.
    if (isLoading) return null;

    if (feature.enabled) {
        return <>{children}</>;
    }

    // Prefer the entitlements upsell (already mapped server-side); fall back to
    // the add-on catalog in case the upsell payload is missing.
    const catalogAddOn = addOns?.find(a => a.features.includes(featureKey));
    const addOnKey = (feature.upsell?.addOnKey ?? catalogAddOn?.key ?? null) as AddOnKey | null;
    const addOnName = feature.upsell?.addOnName ?? catalogAddOn?.name ?? title ?? '';
    const priceCents = feature.upsell?.monthlyPriceGrossCents ?? catalogAddOn?.monthlyPriceGrossCents ?? null;
    const isAvailable = feature.upsell?.isAvailable ?? catalogAddOn?.isAvailable ?? false;

    const handleUnlock = () => {
        if (!addOnKey || !isAvailable) return;
        unlock.openUnlockDialog(addOnKey, addOnName);
    };

    return (
        <GatePage>
            <DemoLayer aria-hidden="true">
                {/* Podgląd bez serwera - opis w demoQueryClient.ts. */}
                <QueryClientProvider client={demoClient}>
                    {children}
                </QueryClientProvider>
            </DemoLayer>

            <GateOverlay>
                <ModuleGateCard
                    title={title ?? addOnName}
                    subtitle={
                        <>
                            Ten widok jest w module <strong>{addOnName}</strong>, którego nie masz
                            w pakiecie. Poniżej podgląd tego, co zyskasz po odblokowaniu:
                        </>
                    }
                    benefits={benefits}
                    addOnKey={addOnKey}
                    priceCents={priceCents}
                    isAvailable={isAvailable}
                    isOwner={isOwner}
                    trial={entitlements?.billingStatus === 'TRIALING'}
                    onUnlock={handleUnlock}
                />
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
