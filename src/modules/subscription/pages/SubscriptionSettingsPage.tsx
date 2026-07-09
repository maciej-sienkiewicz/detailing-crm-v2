import { useState } from 'react';
import { useAuth } from '@/core/context/AuthContext';
import {
    useMyPlan,
    useFeaturePlans,
    useAddOns,
    useCheckout,
} from '../api/subscriptionQueries';
import { useToast } from '@/common/components/Toast';
import { newSubscriptionApi } from '../api/subscriptionApi';
import { PlanChangeDialog, AddOnActivationDialog, AddOnDeactivationDialog } from '../components/PlanChangeDialog';
import { PlanCard } from '../components/PlanCard';
import { AddOnCard } from '../components/AddOnCard';
import { PendingDowngradeBanner } from '../components/PendingDowngradeBanner';
import { PaymentHistoryTable } from '../components/PaymentHistoryTable';
import type { FeaturePlan, AddOnKey, AddOnDto, PlanChangePreview, AddOnPreview } from '../types';
import { formatCents, formatDate } from '../utils/formatters';
import {
    PageWrap,
    SectionHead,
    EyeLabel,
    SectionTitle,
    SectionDesc,
    Panel,
    PanelRow,
    PlanIcon,
    PlanMeta,
    PlanMetaName,
    PlanMetaSub,
    StatusBadge,
    InfoGrid,
    InfoCell,
    InfoLabel,
    InfoValue,
    InfoSub,
    ExpiredBanner,
    TrialBanner,
    PastDueBanner,
    BannerIconWrap,
    BannerContent,
    BannerTitle,
    BannerText,
    BannerCta,
    SectionBlock,
    BlockLabel,
    PlansGrid,
    AddOnsGrid,
    ActiveAddOnRow,
    AddOnRowInfo,
    AddOnRowName,
    AddOnRowPrice,
    DeactivateBtn,
    Spinner,
    LoadingWrap,
    ErrorWrap,
    RetryBtn,
    AccessDeniedWrap,
} from './SubscriptionSettingsPage.styles';

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const CrownIcon = () => (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    </svg>
);

const AlertIcon = ({ color }: { color: string }) => (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color}
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4M12 17h.01" />
    </svg>
);

const ShieldIcon = () => (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="#cbd5e1"
        strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

// ─── Billing status helpers ────────────────────────────────────────────────────

function billingStatusColor(status: string): string {
    switch (status) {
        case 'TRIALING': return '#f59e0b';
        case 'ACTIVE': return '#10b981';
        case 'PAST_DUE': return '#f97316';
        case 'EXPIRED': return '#ef4444';
        default: return '#94a3b8';
    }
}

function billingStatusLabel(status: string): string {
    switch (status) {
        case 'TRIALING': return 'Okres próbny';
        case 'ACTIVE': return 'Aktywna';
        case 'PAST_DUE': return 'Zaległość';
        case 'EXPIRED': return 'Wygasła';
        default: return status;
    }
}

// ─── Dialog state ──────────────────────────────────────────────────────────────

type DialogState =
    | { type: 'plan'; plan: FeaturePlan; preview: PlanChangePreview | null; loading: boolean }
    | { type: 'addon-activate'; key: AddOnKey; name: string; preview: AddOnPreview | null; loading: boolean }
    | { type: 'addon-deactivate'; key: AddOnKey; name: string }
    | null;

// ─── Main component ───────────────────────────────────────────────────────────

export function SubscriptionSettingsPage() {
    const { user } = useAuth();
    const isOwner = user?.role === 'OWNER';

    const { data: myPlan, isLoading: planLoading, isError: planError, refetch: refetchPlan } = useMyPlan();
    const { data: featurePlans, isLoading: plansLoading } = useFeaturePlans();
    const { data: addOns, isLoading: addOnsLoading } = useAddOns();
    const checkout = useCheckout();
    const { showSuccess, showError } = useToast();

    const [dialog, setDialog] = useState<DialogState>(null);

    // ── Guard: only OWNER ─────────────────────────────────────────────────────
    if (!isOwner) {
        return (
            <AccessDeniedWrap>
                <ShieldIcon />
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>Brak dostępu</div>
                <div>Zarządzanie subskrypcją jest dostępne wyłącznie dla właściciela studia.</div>
            </AccessDeniedWrap>
        );
    }

    // ── Loading state ─────────────────────────────────────────────────────────
    if (planLoading) {
        return (
            <LoadingWrap>
                <Spinner />
                Ładowanie danych subskrypcji…
            </LoadingWrap>
        );
    }

    // ── Error state ───────────────────────────────────────────────────────────
    if (planError || !myPlan) {
        return (
            <ErrorWrap>
                <div>Nie udało się załadować danych subskrypcji.</div>
                <RetryBtn onClick={() => refetchPlan()}>Spróbuj ponownie</RetryBtn>
            </ErrorWrap>
        );
    }

    const isExpired = myPlan.billingStatus === 'EXPIRED';
    const isTrial = myPlan.billingStatus === 'TRIALING';
    const isPastDue = myPlan.billingStatus === 'PAST_DUE';
    const isFull = myPlan.plan.key === 'FULL';
    const isUrgent = myPlan.daysRemaining <= 7;

    // ── Renewal handler (Przelewy24) ───────────────────────────────────────────
    const handleRenew = async () => {
        if (checkout.isPending) return;
        try {
            const order = await checkout.mutateAsync({ type: 'RENEWAL' });
            if (order.paymentUrl) {
                window.location.assign(order.paymentUrl);
                return;
            }
            showSuccess('Subskrypcja przedłużona', 'Twoja subskrypcja została przedłużona o 30 dni.');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            showError('Błąd przedłużenia', msg ?? 'Nie udało się rozpocząć płatności. Spróbuj ponownie.');
        }
    };

    // ── Plan select handler ────────────────────────────────────────────────────
    const handleSelectPlan = async (plan: FeaturePlan) => {
        if (isExpired) return;
        setDialog({ type: 'plan', plan, preview: null, loading: true });

        try {
            const preview = await newSubscriptionApi.previewPlanChange(plan.key);
            if (preview.changeType === 'NO_CHANGE') {
                setDialog(null);
                return;
            }
            setDialog({ type: 'plan', plan, preview, loading: false });
        } catch {
            setDialog(null);
        }
    };

    // ── Add-on handlers ────────────────────────────────────────────────────────
    const handleActivateAddOn = async (addOn: AddOnDto) => {
        if (isExpired) return;
        setDialog({ type: 'addon-activate', key: addOn.key, name: addOn.name, preview: null, loading: true });

        try {
            const preview = await newSubscriptionApi.previewAddOn(addOn.key);
            setDialog({ type: 'addon-activate', key: addOn.key, name: addOn.name, preview, loading: false });
        } catch {
            setDialog(null);
        }
    };

    const handleDeactivateAddOn = (key: AddOnKey, name: string) => {
        if (isExpired) return;
        setDialog({ type: 'addon-deactivate', key, name });
    };

    return (
        <PageWrap>
            {/* ── Page header ──────────────────────────────────────────────── */}
            <SectionHead>
                <EyeLabel>Konto i rozliczenia</EyeLabel>
                <SectionTitle>Abonament</SectionTitle>
                <SectionDesc>
                    Zarządzaj pakietem i dodatkowymi modułami. Płatności obsługuje Przelewy24 — upgrade i dokupienie modułu wchodzą w życie natychmiast po opłaceniu, downgrade na koniec okresu rozliczeniowego.
                </SectionDesc>
            </SectionHead>

            {/* ── Billing status banners ───────────────────────────────────── */}
            {isExpired && (
                <ExpiredBanner>
                    <BannerIconWrap $bg="#fee2e2" $color="#dc2626">
                        <AlertIcon color="#dc2626" />
                    </BannerIconWrap>
                    <BannerContent>
                        <BannerTitle $color="#991b1b">Dostęp wygasł</BannerTitle>
                        <BannerText $color="#b91c1c">
                            Twoja subskrypcja wygasła. Odnów plan, aby przywrócić pełny dostęp do systemu.
                        </BannerText>
                    </BannerContent>
                    <BannerCta onClick={handleRenew} disabled={checkout.isPending}>
                        {checkout.isPending ? 'Przekierowywanie…' : 'Odnów i zapłać (P24)'}
                    </BannerCta>
                </ExpiredBanner>
            )}

            {isTrial && myPlan.trialEndsAt && (
                <TrialBanner>
                    <BannerIconWrap $bg="#fef3c7" $color="#d97706">
                        <AlertIcon color="#d97706" />
                    </BannerIconWrap>
                    <BannerContent>
                        <BannerTitle $color="#92400e">Okres próbny</BannerTitle>
                        <BannerText $color="#b45309">
                            Korzystasz z okresu próbnego. Pozostało <strong>{myPlan.daysRemaining} dni</strong> (do {formatDate(myPlan.trialEndsAt)}).
                            Wybierz plan, aby kontynuować korzystanie z systemu.
                        </BannerText>
                    </BannerContent>
                </TrialBanner>
            )}

            {isPastDue && (
                <PastDueBanner>
                    <BannerIconWrap $bg="#fed7aa" $color="#c2410c">
                        <AlertIcon color="#c2410c" />
                    </BannerIconWrap>
                    <BannerContent>
                        <BannerTitle $color="#9a3412">Problem z płatnością</BannerTitle>
                        <BannerText $color="#c2410c">
                            Wystąpił problem z ostatnią płatnością. Zaktualizuj dane płatnicze, aby uniknąć utraty dostępu.
                        </BannerText>
                    </BannerContent>
                </PastDueBanner>
            )}

            {/* ── Pending downgrade banner ─────────────────────────────────── */}
            {myPlan.pendingDowngrade && (
                <PendingDowngradeBanner pendingDowngrade={myPlan.pendingDowngrade} />
            )}

            {/* ── Current plan panel ───────────────────────────────────────── */}
            <Panel>
                <PanelRow>
                    <PlanIcon><CrownIcon /></PlanIcon>
                    <PlanMeta>
                        <PlanMetaName>{myPlan.plan.name}</PlanMetaName>
                        <PlanMetaSub>{formatCents(myPlan.plan.monthlyPriceGrossCents)}/mies.</PlanMetaSub>
                    </PlanMeta>
                    <StatusBadge $color={billingStatusColor(myPlan.billingStatus)}>
                        {billingStatusLabel(myPlan.billingStatus)}
                    </StatusBadge>
                </PanelRow>

                <InfoGrid>
                    <InfoCell>
                        <InfoLabel>Koszt miesięczny</InfoLabel>
                        <InfoValue>{formatCents(myPlan.monthlyCostCents)}</InfoValue>
                        <InfoSub>plan + moduły</InfoSub>
                    </InfoCell>

                    <InfoCell>
                        <InfoLabel>Następne odnowienie</InfoLabel>
                        <InfoValue>{formatCents(myPlan.nextRenewalCostCents)}</InfoValue>
                        <InfoSub>{formatDate(myPlan.periodEndsAt)}</InfoSub>
                    </InfoCell>

                    <InfoCell>
                        <InfoLabel>Dni do końca okresu</InfoLabel>
                        <InfoValue $urgent={isUrgent}>{myPlan.daysRemaining}</InfoValue>
                        <InfoSub>{formatDate(myPlan.periodEndsAt)}</InfoSub>
                    </InfoCell>
                </InfoGrid>

                {!isTrial && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 20px 16px' }}>
                        <button
                            onClick={handleRenew}
                            disabled={checkout.isPending}
                            style={{
                                padding: '10px 18px', borderRadius: 10, border: 'none',
                                background: '#0ea5e9', color: 'white', fontWeight: 700,
                                fontSize: 13, cursor: checkout.isPending ? 'wait' : 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            {checkout.isPending
                                ? 'Przekierowywanie do płatności…'
                                : `Przedłuż o 30 dni — ${formatCents(myPlan.monthlyCostCents)}`}
                        </button>
                    </div>
                )}
            </Panel>

            {/* ── Active add-ons ───────────────────────────────────────────── */}
            {myPlan.activeAddOns.length > 0 && !isFull && (
                <SectionBlock>
                    <BlockLabel>Aktywne moduły dodatkowe</BlockLabel>
                    {myPlan.activeAddOns.map(addOn => (
                        <ActiveAddOnRow key={addOn.key}>
                            <AddOnRowInfo>
                                <AddOnRowName>{addOn.name}</AddOnRowName>
                                <AddOnRowPrice>{formatCents(addOn.monthlyPriceGrossCents)}/mies.</AddOnRowPrice>
                            </AddOnRowInfo>
                            <DeactivateBtn
                                disabled={isExpired}
                                onClick={() => handleDeactivateAddOn(addOn.key, addOn.name)}
                            >
                                Dezaktywuj
                            </DeactivateBtn>
                        </ActiveAddOnRow>
                    ))}
                </SectionBlock>
            )}

            {/* ── Plan selection ────────────────────────────────────────────── */}
            <SectionBlock>
                <BlockLabel>Zmień plan</BlockLabel>
                {plansLoading ? (
                    <LoadingWrap style={{ minHeight: 100 }}>
                        <Spinner />
                    </LoadingWrap>
                ) : (
                    <PlansGrid>
                        {(featurePlans ?? [])
                            .sort((a, b) => a.displayOrder - b.displayOrder)
                            .map(plan => (
                                <PlanCard
                                    key={plan.key}
                                    plan={plan}
                                    currentPlanKey={myPlan.plan.key}
                                    disabled={isExpired}
                                    onSelect={handleSelectPlan}
                                />
                            ))}
                    </PlansGrid>
                )}
            </SectionBlock>

            {/* ── Available add-ons (only for BASIC plan) ──────────────────── */}
            {!isFull && (
                <SectionBlock>
                    <BlockLabel>Dostępne moduły dodatkowe</BlockLabel>
                    {addOnsLoading ? (
                        <LoadingWrap style={{ minHeight: 80 }}>
                            <Spinner />
                        </LoadingWrap>
                    ) : (
                        <AddOnsGrid>
                            {(addOns ?? []).map(addOn => {
                                const isActive = myPlan.activeAddOns.some(a => a.key === addOn.key);
                                return (
                                    <AddOnCard
                                        key={addOn.key}
                                        addOn={addOn}
                                        isActive={isActive}
                                        disabled={isExpired}
                                        onActivate={() => handleActivateAddOn(addOn)}
                                        onDeactivate={() => handleDeactivateAddOn(addOn.key, addOn.name)}
                                    />
                                );
                            })}
                        </AddOnsGrid>
                    )}
                </SectionBlock>
            )}

            {/* ── Payment history ───────────────────────────────────────────── */}
            <PaymentHistoryTable />

            {/* ── Dialogs ───────────────────────────────────────────────────── */}
            {dialog?.type === 'plan' && (
                <PlanChangeDialog
                    newPlanKey={dialog.plan.key}
                    newPlanName={dialog.plan.name}
                    currentPlanName={myPlan.plan.name}
                    preview={dialog.preview}
                    isLoadingPreview={dialog.loading}
                    onClose={() => setDialog(null)}
                />
            )}

            {dialog?.type === 'addon-activate' && (
                <AddOnActivationDialog
                    addOnKey={dialog.key}
                    addOnName={dialog.name}
                    preview={dialog.preview}
                    isLoadingPreview={dialog.loading}
                    onClose={() => setDialog(null)}
                />
            )}

            {dialog?.type === 'addon-deactivate' && (
                <AddOnDeactivationDialog
                    addOnKey={dialog.key}
                    addOnName={dialog.name}
                    onClose={() => setDialog(null)}
                />
            )}
        </PageWrap>
    );
}
