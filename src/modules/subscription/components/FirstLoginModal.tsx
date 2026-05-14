import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/common/components/Toast';
import { useFeaturePlans, useAddOns, useStartTrial } from '../api/subscriptionQueries';
import {
    ENTITLEMENTS_KEY,
    MY_PLAN_KEY,
    PAYMENT_HISTORY_KEY,
} from '../api/subscriptionQueries';
import { newSubscriptionApi } from '../api/subscriptionApi';
import type { FeaturePlan, AddOnDto, AddOnKey, CalculatePriceResponse } from '../types';
import { formatCents, featureLabel } from '../utils/formatters';
import {
    Overlay,
    Card,
    CardHeader,
    LogoWrap,
    WelcomeTitle,
    WelcomeSub,
    CardBody,
    TrialSection,
    SectionLabel,
    TrialCard,
    TrialIconWrap,
    TrialInfo,
    TrialTitle,
    TrialDesc,
    FreeBadge,
    Divider,
    PlansGrid,
    PlanBtn,
    RecommendedBadge,
    PlanBtnName,
    PlanBtnPrice,
    PlanBtnPer,
    PlanBtnFeatures,
    LoadingOverlay,
    Spinner,
    ErrorNote,
    CardFooter,
    CustomToggle,
    CustomPanel,
    CustomPanelHeader,
    BasePlanRow,
    BasePlanCheck,
    AddOnRow,
    AddOnCheckbox,
    AddOnMeta,
    AddOnName,
    AddOnDesc,
    AddOnPrice,
    AddOnSoonBadge,
    CustomSummary,
    SummaryPrice,
    SummaryLabel,
    SummaryAmount,
    CustomConfirmBtn,
} from './FirstLoginModal.styles';

// ─── Icons ────────────────────────────────────────────────────────────────────

const LogoIcon = () => (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="white"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    </svg>
);

const GiftIcon = () => (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="white"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M12 8V21M19 8A4 4 0 0 0 11 5a4 4 0 0 0-8 3" />
    </svg>
);

const AlertIcon = () => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const CheckSmall = () => (
    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="white"
        strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

const ChevronDown = ({ open }: { open: boolean }) => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>
        <path d="m6 9 6 6 6-6" />
    </svg>
);

const BtnSpinner = () => (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white"
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'spin 0.7s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function planFeatureSummary(plan: FeaturePlan): string {
    const labels = plan.features.map(featureLabel);
    if (labels.length <= 3) return labels.join(', ');
    return `${labels.slice(0, 3).join(', ')} +${labels.length - 3} więcej`;
}

const OLD_STATUS_KEY = ['subscription', 'status'] as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    trialUsed: boolean;
}

type Phase = 'idle' | 'pending-trial' | 'pending-plan' | 'pending-custom';

export function FirstLoginModal({ trialUsed }: Props) {
    const { showError } = useToast();
    const queryClient = useQueryClient();

    const { data: plans, isLoading: plansLoading } = useFeaturePlans();
    const { data: addOns } = useAddOns();
    const startTrial = useStartTrial();

    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState<string | null>(null);

    // Custom plan builder state
    const [customOpen, setCustomOpen] = useState(false);
    const [selectedAddOns, setSelectedAddOns] = useState<Set<AddOnKey>>(new Set());
    const [customPrice, setCustomPrice] = useState<CalculatePriceResponse | null>(null);
    const [priceLoading, setPriceLoading] = useState(false);

    const isPending = phase !== 'idle';
    const sortedPlans = (plans ?? []).slice().sort((a, b) => a.displayOrder - b.displayOrder);
    const availableAddOns: AddOnDto[] = addOns ?? [];

    // ── Real-time price calculation (debounced) ──────────────────────────────
    const recalculate = useCallback(async (keys: Set<AddOnKey>) => {
        setPriceLoading(true);
        try {
            const result = await newSubscriptionApi.calculatePrice({
                addOnKeys: Array.from(keys),
            });
            setCustomPrice(result);
        } catch {
            // silently ignore — price display falls back
        } finally {
            setPriceLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!customOpen) return;
        const timer = setTimeout(() => recalculate(selectedAddOns), 250);
        return () => clearTimeout(timer);
    }, [selectedAddOns, customOpen, recalculate]);

    // Pre-fetch price when custom section opens
    useEffect(() => {
        if (customOpen && !customPrice) {
            recalculate(selectedAddOns);
        }
    }, [customOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Cache invalidation helper ─────────────────────────────────────────────
    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: OLD_STATUS_KEY });
        queryClient.invalidateQueries({ queryKey: ENTITLEMENTS_KEY });
        queryClient.invalidateQueries({ queryKey: MY_PLAN_KEY });
        queryClient.invalidateQueries({ queryKey: PAYMENT_HISTORY_KEY });
    };

    // ── Trial ─────────────────────────────────────────────────────────────────
    const handleStartTrial = async () => {
        if (isPending) return;
        setError(null);
        setPhase('pending-trial');
        try {
            await startTrial.mutateAsync();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg ?? 'Nie udało się aktywować okresu próbnego. Spróbuj ponownie.');
            showError('Błąd aktywacji triala', msg ?? 'Spróbuj ponownie.');
            setPhase('idle');
        }
    };

    // ── Preset plan (BASIC or EVERYTHING) ─────────────────────────────────────
    const handleSelectPlan = async (planKey: string) => {
        if (isPending) return;
        setError(null);
        setPhase('pending-plan');
        try {
            // Direct API call — no intermediate cache invalidation
            await newSubscriptionApi.changePlan(planKey as 'BASIC' | 'EVERYTHING');
            invalidateAll();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg ?? 'Nie udało się aktywować planu. Spróbuj ponownie.');
            showError('Błąd aktywacji planu', msg ?? 'Spróbuj ponownie.');
            setPhase('idle');
        }
    };

    // ── Custom plan (BASIC + selected add-ons) ────────────────────────────────
    const handleCustomConfirm = async () => {
        if (isPending) return;
        setError(null);
        setPhase('pending-custom');
        try {
            // Step 1: activate BASIC (no cache invalidation yet)
            await newSubscriptionApi.changePlan('BASIC');

            // Step 2: activate each selected add-on sequentially
            for (const key of Array.from(selectedAddOns)) {
                await newSubscriptionApi.activateAddOn(key);
            }

            // Step 3: invalidate caches AFTER everything is done
            // so the gate lifts only once, with the full state
            invalidateAll();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg ?? 'Nie udało się aktywować planu. Spróbuj ponownie.');
            showError('Błąd aktywacji', msg ?? 'Spróbuj ponownie.');
            setPhase('idle');
        }
    };

    // ── Add-on toggle ─────────────────────────────────────────────────────────
    const toggleAddOn = (key: AddOnKey) => {
        setSelectedAddOns(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    // ── Price display ─────────────────────────────────────────────────────────
    const totalPriceCents = customPrice?.totalMonthlyPriceCents ?? null;
    const basePriceCents = customPrice?.basePlanMonthlyPriceCents;

    return createPortal(
        <>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <Overlay>
                <Card>
                    <CardHeader>
                        <LogoWrap><LogoIcon /></LogoWrap>
                        <WelcomeTitle>Witaj w DetailBoost!</WelcomeTitle>
                        <WelcomeSub>
                            Twoje konto jest gotowe. Wybierz jak chcesz zacząć — możesz wypróbować system bezpłatnie lub od razu wybrać plan dopasowany do potrzeb studia.
                        </WelcomeSub>
                    </CardHeader>

                    {/* ── Global pending overlay ──────────────────────────── */}
                    {isPending && (
                        <LoadingOverlay>
                            <Spinner />
                            {phase === 'pending-trial' && 'Aktywowanie okresu próbnego…'}
                            {phase === 'pending-plan' && 'Aktywowanie planu…'}
                            {phase === 'pending-custom' && 'Konfigurowanie planu…'}
                        </LoadingOverlay>
                    )}

                    {/* ── Loading plans ───────────────────────────────────── */}
                    {!isPending && plansLoading && (
                        <LoadingOverlay>
                            <Spinner />
                            Ładowanie planów…
                        </LoadingOverlay>
                    )}

                    {/* ── Main content ────────────────────────────────────── */}
                    {!isPending && !plansLoading && (
                        <CardBody>
                            {error && (
                                <ErrorNote>
                                    <AlertIcon />
                                    {error}
                                </ErrorNote>
                            )}

                            {/* Trial option */}
                            {!trialUsed && (
                                <TrialSection>
                                    <SectionLabel>Zacznij bez zobowiązań</SectionLabel>
                                    <TrialCard $disabled={false} onClick={handleStartTrial}>
                                        <TrialIconWrap><GiftIcon /></TrialIconWrap>
                                        <TrialInfo>
                                            <TrialTitle>Wypróbuj przez 60 dni — bezpłatnie</TrialTitle>
                                            <TrialDesc>
                                                Pełny dostęp do wszystkich funkcji. Bez karty kredytowej, bez zobowiązań.
                                            </TrialDesc>
                                        </TrialInfo>
                                        <FreeBadge>Gratis</FreeBadge>
                                    </TrialCard>
                                </TrialSection>
                            )}

                            {/* Divider */}
                            {!trialUsed && sortedPlans.length > 0 && (
                                <Divider>lub wybierz plan od razu</Divider>
                            )}

                            {/* Preset plans */}
                            {sortedPlans.length > 0 && (
                                <TrialSection>
                                    <SectionLabel>
                                        {trialUsed ? 'Wybierz plan' : 'Gotowe pakiety'}
                                    </SectionLabel>
                                    <PlansGrid>
                                        {sortedPlans.map(plan => {
                                            const isHighlighted = plan.key === 'EVERYTHING';
                                            return (
                                                <PlanBtn
                                                    key={plan.key}
                                                    $highlighted={isHighlighted}
                                                    $disabled={false}
                                                    onClick={() => handleSelectPlan(plan.key)}
                                                >
                                                    {isHighlighted && (
                                                        <RecommendedBadge>Polecany</RecommendedBadge>
                                                    )}
                                                    <PlanBtnName $light={isHighlighted}>
                                                        {plan.name}
                                                    </PlanBtnName>
                                                    <PlanBtnPrice $light={isHighlighted}>
                                                        {formatCents(plan.monthlyPriceGrossCents)}
                                                    </PlanBtnPrice>
                                                    <PlanBtnPer $light={isHighlighted}>
                                                        / miesiąc
                                                    </PlanBtnPer>
                                                    <PlanBtnFeatures $light={isHighlighted}>
                                                        {planFeatureSummary(plan)}
                                                    </PlanBtnFeatures>
                                                </PlanBtn>
                                            );
                                        })}
                                    </PlansGrid>
                                </TrialSection>
                            )}

                            {/* Custom plan builder */}
                            {availableAddOns.length > 0 && (
                                <>
                                    <CustomToggle
                                        onClick={() => setCustomOpen(o => !o)}
                                        type="button"
                                    >
                                        <span>Zbuduj własny pakiet</span>
                                        <ChevronDown open={customOpen} />
                                    </CustomToggle>

                                    {customOpen && (
                                        <CustomPanel>
                                            <CustomPanelHeader>
                                                Wybierz składniki pakietu
                                            </CustomPanelHeader>

                                            {/* Fixed BASIC base */}
                                            <BasePlanRow>
                                                <BasePlanCheck><CheckSmall /></BasePlanCheck>
                                                <AddOnMeta>
                                                    <AddOnName>Plan Podstawowy (BASIC)</AddOnName>
                                                    <AddOnDesc>Kalendarz, Wizyty, Klienci, Pojazdy, Dokumenty, Galeria</AddOnDesc>
                                                </AddOnMeta>
                                                <AddOnPrice>
                                                    {basePriceCents != null
                                                        ? formatCents(basePriceCents)
                                                        : '99,00 zł'}/mies.
                                                </AddOnPrice>
                                            </BasePlanRow>

                                            {/* Add-on checkboxes */}
                                            {availableAddOns.map(addOn => (
                                                <AddOnRow
                                                    key={addOn.key}
                                                    $disabled={!addOn.isAvailable}
                                                    data-disabled={!addOn.isAvailable}
                                                >
                                                    <AddOnCheckbox
                                                        type="checkbox"
                                                        checked={selectedAddOns.has(addOn.key)}
                                                        disabled={!addOn.isAvailable}
                                                        onChange={() => addOn.isAvailable && toggleAddOn(addOn.key)}
                                                    />
                                                    <AddOnMeta>
                                                        <AddOnName>
                                                            {addOn.name}
                                                            {!addOn.isAvailable && (
                                                                <> <AddOnSoonBadge>wkrótce</AddOnSoonBadge></>
                                                            )}
                                                        </AddOnName>
                                                        <AddOnDesc>{addOn.description}</AddOnDesc>
                                                    </AddOnMeta>
                                                    <AddOnPrice>
                                                        {addOn.monthlyPriceGrossCents != null
                                                            ? `+${formatCents(addOn.monthlyPriceGrossCents)}/mies.`
                                                            : 'Cena do ustalenia'}
                                                    </AddOnPrice>
                                                </AddOnRow>
                                            ))}

                                            {/* Summary + confirm */}
                                            <CustomSummary>
                                                <SummaryPrice>
                                                    <SummaryLabel>Łącznie miesięcznie</SummaryLabel>
                                                    <SummaryAmount>
                                                        {priceLoading
                                                            ? '…'
                                                            : totalPriceCents != null
                                                                ? formatCents(totalPriceCents)
                                                                : 'Cena do ustalenia'}
                                                    </SummaryAmount>
                                                </SummaryPrice>
                                                <CustomConfirmBtn
                                                    onClick={handleCustomConfirm}
                                                    disabled={priceLoading}
                                                >
                                                    Aktywuj pakiet →
                                                </CustomConfirmBtn>
                                            </CustomSummary>
                                        </CustomPanel>
                                    )}
                                </>
                            )}
                        </CardBody>
                    )}

                    <CardFooter>
                        Bezpieczne płatności. Możliwość anulowania w dowolnym momencie.
                        <br />
                        Masz pytania? Napisz do nas: <strong>pomoc@detailboost.pl</strong>
                    </CardFooter>
                </Card>
            </Overlay>
        </>,
        document.body
    );
}
