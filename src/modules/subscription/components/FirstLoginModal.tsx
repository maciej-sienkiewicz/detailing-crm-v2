import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/common/components/Toast';
import { canPurchaseHere } from '@/core/native/platform';
import { useFeaturePlans, useAddOns, useStartTrial, useCheckout } from '../api/subscriptionQueries';
import { newSubscriptionApi } from '../api/subscriptionApi';
import { toastCheckoutProblem, useCheckoutHandoff } from '../hooks/useCheckoutHandoff';
import { CheckoutConsent } from './CheckoutConsent';
import { useCheckoutConsent } from '../hooks/useCheckoutConsent';
import type { FeaturePlan, AddOnDto, AddOnKey, PlanKey, CalculatePriceResponse, CheckoutResponse } from '../types';
import { formatCents, featureLabel } from '../utils/formatters';
import { t } from '@/common/i18n';
import { AuthLayout } from '@/modules/auth/components/AuthLayout';
import {
    AuthAnchor, AuthAside, AuthHeading, AuthMeta, AuthPrimaryButton, AuthSecondaryButton,
} from '@/modules/auth/components/AuthUi';
import { ErrorAlert } from '@/modules/auth/components/ErrorAlert';
import {
    Screen,
    TrialNote,
    Section,
    PlanOption,
    Recommended,
    CustomToggle,
    CustomPanel,
    ModuleRow,
    CustomSummary,
    Pending,
    Spinner,
} from './FirstLoginModal.styles';

// ─── Icons ────────────────────────────────────────────────────────────────────

const ChevronDown = () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
    </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function planFeatureSummary(plan: FeaturePlan): string {
    const labels = plan.features.map(featureLabel);
    if (labels.length <= 3) return labels.join(', ');
    return `${labels.slice(0, 3).join(', ')} +${labels.length - 3} więcej`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    trialUsed: boolean;
}

type Phase = 'idle' | 'pending-trial' | 'pending-plan' | 'pending-custom';

export function FirstLoginModal({ trialUsed }: Props) {
    const { showError, showWarning } = useToast();

    const { data: plans, isLoading: plansLoading } = useFeaturePlans();
    const { data: addOns } = useAddOns();
    const startTrial = useStartTrial();
    const checkout = useCheckout();
    const handoff = useCheckoutHandoff();
    const consent = useCheckoutConsent();

    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState<string | null>(null);

    const [customOpen, setCustomOpen] = useState(false);
    const [selectedAddOns, setSelectedAddOns] = useState<Set<AddOnKey>>(new Set());
    const [customPrice, setCustomPrice] = useState<CalculatePriceResponse | null>(null);
    const [priceLoading, setPriceLoading] = useState(false);

    // W aplikacji ze sklepu nie wolno kupić pakietu (App Store 3.1.1, Google Play):
    // zostaje darmowy okres próbny, a pakiety i własny zestaw modułów znikają.
    // Studio, które próbę już wykorzystało, tu nie trafia - patrz SubscriptionGate.
    const purchasable = canPurchaseHere();
    const isPending = phase !== 'idle';
    const sortedPlans = purchasable ? (plans ?? []).slice().sort((a, b) => a.displayOrder - b.displayOrder) : [];
    const availableAddOns: AddOnDto[] = purchasable ? addOns ?? [] : [];
    // Cena BASIC z cennika, zanim przyjdzie wycena koszyka. Wcześniej stała tu kwota
    // wpisana na sztywno, która rozjeżdżała się z cennikiem.
    const basicPlanCents = sortedPlans.find(p => p.key === 'BASIC')?.monthlyPriceGrossCents ?? null;

    const recalculate = useCallback(async (keys: Set<AddOnKey>) => {
        setPriceLoading(true);
        try {
            const result = await newSubscriptionApi.calculatePrice({ addOnKeys: Array.from(keys) });
            setCustomPrice(result);
        } catch {
            // silently ignore, price display falls back
        } finally {
            setPriceLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!customOpen) return;
        const timer = setTimeout(() => recalculate(selectedAddOns), 250);
        return () => clearTimeout(timer);
    }, [selectedAddOns, customOpen, recalculate]);

    useEffect(() => {
        if (customOpen && !customPrice) {
            recalculate(selectedAddOns);
        }
    }, [customOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleStartTrial = async () => {
        if (isPending) return;
        setError(null);
        setPhase('pending-trial');
        try {
            await startTrial.mutateAsync();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg ?? 'Nie udało się włączyć okresu próbnego. Spróbuj ponownie.');
            showError('Nie udało się włączyć okresu próbnego', msg ?? 'Spróbuj ponownie.');
            setPhase('idle');
        }
    };

    /**
     * Odpowiedź checkoutu: płatność w P24, strona wyniku albo komunikat. Dawniej brak adresu
     * płatności nie robił tu nic - przycisk zostawał w „trwa…" na zawsze, także gdy backend
     * zamówienie anulował. Zrealizowany zakup odświeża dane pakietu (useCheckout), a wtedy
     * SubscriptionGate sam zdejmuje ten ekran.
     */
    const settleCheckout = (order: CheckoutResponse) => {
        const step = handoff(order);
        if (step.kind === 'redirect' || step.kind === 'track' || step.kind === 'done') return;
        setError(step.message);
        toastCheckoutProblem({ showError, showWarning }, step);
        setPhase('idle');
    };

    const handleSelectPlan = async (planKey: string) => {
        if (isPending || !consent.require()) return;
        setError(null);
        setPhase('pending-plan');
        try {
            const order = await checkout.mutateAsync({
                type: 'INITIAL_PURCHASE',
                planKey: planKey as PlanKey,
                addOnKeys: [],
                acceptTerms: true,
            });
            settleCheckout(order);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg ?? 'Nie udało się przejść do płatności. Spróbuj ponownie.');
            showError('Nie udało się przejść do płatności', msg ?? 'Spróbuj ponownie.');
            setPhase('idle');
        }
    };

    const handleCustomConfirm = async () => {
        if (isPending || !consent.require()) return;
        setError(null);
        setPhase('pending-custom');
        try {
            const order = await checkout.mutateAsync({
                type: 'INITIAL_PURCHASE',
                planKey: 'BASIC',
                addOnKeys: Array.from(selectedAddOns),
                acceptTerms: true,
            });
            settleCheckout(order);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg ?? 'Nie udało się przejść do płatności. Spróbuj ponownie.');
            showError('Nie udało się przejść do płatności', msg ?? 'Spróbuj ponownie.');
            setPhase('idle');
        }
    };

    const toggleAddOn = (key: AddOnKey) => {
        setSelectedAddOns(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const totalPriceCents = customPrice?.totalMonthlyPriceCents ?? null;
    const basePriceCents = customPrice?.basePlanMonthlyPriceCents;

    // Ekran po rejestracji stoi w tej samej bramie co logowanie i rejestracja (AuthLayout):
    // ciemny pas z warunkami po lewej, jasna kolumna z wyborem po prawej. Wypełniony jest
    // jeden przycisk - krok następny: okres próbny, a gdy już był, płatność za własny pakiet.
    const pendingLabel = phase === 'pending-trial' ? 'Włączanie okresu próbnego…' : 'Przekierowywanie do płatności…';
    const ConfirmButton = trialUsed ? AuthPrimaryButton : AuthSecondaryButton;

    return createPortal(
        <Screen>
            <AuthLayout
                wide
                statement={trialUsed ? 'Wybierz pakiet dla studia' : t.auth.gate.signup}
                points={trialUsed ? undefined : t.auth.gate.signupPoints}
            >
                <AuthHeading>
                    <h1>Witaj w DetailBoost</h1>
                    <p>
                        {!purchasable
                            ? 'Twoje konto jest gotowe. Włącz darmowy okres próbny i zacznij pracę.'
                            : trialUsed
                                ? 'Twoje konto jest gotowe. Wybierz pakiet, żeby zacząć pracę.'
                                : 'Twoje konto jest gotowe. Zacznij od okresu próbnego albo od razu wybierz pakiet.'}
                    </p>
                </AuthHeading>

                {error && <ErrorAlert message={error} />}

                {isPending || plansLoading ? (
                    <Pending role="status">
                        <Spinner aria-hidden="true" />
                        {isPending ? pendingLabel : 'Wczytywanie pakietów…'}
                    </Pending>
                ) : (
                    <>
                        {!trialUsed && (
                            <div style={{ marginTop: error ? 18 : 0 }}>
                                <AuthPrimaryButton type="button" onClick={handleStartTrial}>
                                    Wypróbuj bezpłatnie przez 3 miesiące
                                </AuthPrimaryButton>
                                <TrialNote>Pełny dostęp do wszystkich funkcji. Bez karty i bez zobowiązań.</TrialNote>
                            </div>
                        )}

                        {sortedPlans.length > 0 && (
                            <Section aria-labelledby="first-login-plans" $first={trialUsed}>
                                <h2 id="first-login-plans">{trialUsed ? 'Pakiety' : 'Albo wybierz pakiet od razu'}</h2>
                                <CheckoutConsent consent={consent} />
                                {sortedPlans.map(plan => (
                                    <PlanOption key={plan.key} type="button" onClick={() => handleSelectPlan(plan.key)}>
                                        <span className="name">
                                            {plan.name}
                                            {plan.key === 'FULL' && <Recommended>Polecany</Recommended>}
                                        </span>
                                        <span className="price">
                                            {formatCents(plan.monthlyPriceGrossCents)} <small>brutto / mies.</small>
                                        </span>
                                        <span className="features">{planFeatureSummary(plan)}</span>
                                    </PlanOption>
                                ))}

                                {availableAddOns.length > 0 && (
                                    <CustomToggle
                                        type="button"
                                        aria-expanded={customOpen}
                                        onClick={() => setCustomOpen(o => !o)}
                                    >
                                        Zbuduj własny pakiet
                                        <ChevronDown />
                                    </CustomToggle>
                                )}

                                {availableAddOns.length > 0 && customOpen && (
                                    <CustomPanel>
                                        <ModuleRow as="div">
                                            <input type="checkbox" checked readOnly disabled aria-label="Pakiet BASIC, zawsze w cenie" />
                                            <span className="meta">
                                                <span className="name">Pakiet BASIC</span>
                                                <span className="desc">
                                                    Kalendarz i rezerwacje, karty klientów i pojazdów z pełną historią wizyt
                                                </span>
                                            </span>
                                            <span className="price">
                                                {basePriceCents != null
                                                    ? `${formatCents(basePriceCents)}/mies.`
                                                    : basicPlanCents != null
                                                        ? `${formatCents(basicPlanCents)}/mies.`
                                                        : '…'}
                                            </span>
                                        </ModuleRow>

                                        {availableAddOns.map(addOn => (
                                            <ModuleRow key={addOn.key} $disabled={!addOn.isAvailable}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAddOns.has(addOn.key)}
                                                    disabled={!addOn.isAvailable}
                                                    onChange={() => addOn.isAvailable && toggleAddOn(addOn.key)}
                                                />
                                                <span className="meta">
                                                    <span className="name">
                                                        {addOn.name}
                                                        {!addOn.isAvailable && <span className="soon">wkrótce</span>}
                                                    </span>
                                                    <span className="desc">{addOn.description}</span>
                                                </span>
                                                <span className="price">
                                                    {addOn.monthlyPriceGrossCents != null
                                                        ? `+${formatCents(addOn.monthlyPriceGrossCents)}/mies.`
                                                        : 'Cena do ustalenia'}
                                                </span>
                                            </ModuleRow>
                                        ))}

                                        <CustomSummary>
                                            <div className="total">
                                                Łącznie miesięcznie (brutto)
                                                <strong>
                                                    {priceLoading
                                                        ? '…'
                                                        : totalPriceCents != null
                                                            ? formatCents(totalPriceCents)
                                                            : 'Cena do ustalenia'}
                                                </strong>
                                            </div>
                                            {customPrice?.savingsWithFullCents != null && customPrice.savingsWithFullCents > 0 && (
                                                <div className="hint">
                                                    Pakiet FULL byłby tańszy o {formatCents(customPrice.savingsWithFullCents)}/mies.
                                                </div>
                                            )}
                                            <ConfirmButton type="button" onClick={handleCustomConfirm} disabled={priceLoading}>
                                                Przejdź do płatności
                                            </ConfirmButton>
                                        </CustomSummary>
                                    </CustomPanel>
                                )}
                            </Section>
                        )}
                    </>
                )}

                <AuthAside>
                    {purchasable && <AuthMeta>Płatności obsługuje Przelewy24. Zrezygnujesz w każdej chwili.</AuthMeta>}
                    <AuthMeta>
                        Masz pytania? Napisz do nas: <AuthAnchor href="mailto:pomoc@detailboost.pl">pomoc@detailboost.pl</AuthAnchor>
                    </AuthMeta>
                </AuthAside>
            </AuthLayout>
        </Screen>,
        document.body
    );
}
