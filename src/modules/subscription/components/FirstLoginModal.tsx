import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/common/components/Toast';
import { Button, Notice, StatusPill } from '@/common/components/ui';
import { acquireScrollLock } from '@/common/utils/scrollLock';
import { useFeaturePlans, useAddOns, useStartTrial, useCheckout } from '../api/subscriptionQueries';
import { newSubscriptionApi } from '../api/subscriptionApi';
import type { FeaturePlan, AddOnDto, AddOnKey, PlanKey, CalculatePriceResponse, CheckoutRequest } from '../types';
import { formatCents, featureLabel } from '../utils/formatters';
import { checkoutOutcome, describeCheckoutError } from '../utils/checkout';
import { useLogout } from '@/modules/auth';
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
    Divider,
    PlansGrid,
    PlanBtn,
    PlanBtnHead,
    PlanBtnName,
    PlanBtnPrice,
    PlanBtnPer,
    PlanBtnFeatures,
    LoadingOverlay,
    Spinner,
    CardFooter,
    LogoutRow,
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
    const { showError } = useToast();

    const { data: plans, isLoading: plansLoading } = useFeaturePlans();
    const { data: addOns } = useAddOns();
    const startTrial = useStartTrial();
    const checkout = useCheckout();

    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState<string | null>(null);

    const [customOpen, setCustomOpen] = useState(false);
    const logout = useLogout();
    const [selectedAddOns, setSelectedAddOns] = useState<Set<AddOnKey>>(new Set());
    const [customPrice, setCustomPrice] = useState<CalculatePriceResponse | null>(null);
    const [priceLoading, setPriceLoading] = useState(false);

    const isPending = phase !== 'idle';
    const sortedPlans = (plans ?? []).slice().sort((a, b) => a.displayOrder - b.displayOrder);
    const availableAddOns: AddOnDto[] = addOns ?? [];

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

    // Pełnoekranowa nakładka poza ModalShell: tło nie może przewijać się pod nią.
    // Blokada przez jedynego jej właściciela (CLAUDE.md §3); okno żyje, dopóki jest pokazane.
    useEffect(() => acquireScrollLock(), []);

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

    // Pierwszy zakup. Przy FULFILLED (zakup bez kwoty) useCheckout odświeża status,
    // a bramka sama zdejmuje to okno - spinner zostaje do tego momentu. Brak adresu
    // płatności przy innym statusie to błąd: dawniej okno zostawało wtedy na zawsze
    // w „Przekierowywanie do płatności…".
    const purchase = async (body: CheckoutRequest, nextPhase: Phase) => {
        if (isPending) return;
        setError(null);
        setPhase(nextPhase);
        try {
            const outcome = checkoutOutcome(await checkout.mutateAsync(body));
            if (outcome.kind === 'redirect') {
                window.location.assign(outcome.url);
                return;
            }
            if (outcome.kind === 'fulfilled') return;
            setError(outcome.copy.message);
            showError(outcome.copy.title, outcome.copy.message);
            setPhase('idle');
        } catch (err: unknown) {
            const copy = describeCheckoutError(err, 'Nie udało się aktywować planu');
            setError(copy.message);
            showError(copy.title, copy.message);
            setPhase('idle');
        }
    };

    const handleSelectPlan = (planKey: string) => purchase(
        { type: 'INITIAL_PURCHASE', planKey: planKey as PlanKey, addOnKeys: [] },
        'pending-plan',
    );

    const handleCustomConfirm = () => purchase(
        { type: 'INITIAL_PURCHASE', planKey: 'BASIC', addOnKeys: Array.from(selectedAddOns) },
        'pending-custom',
    );

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

    return createPortal(
        <>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            <Overlay>
                <Card>
                    <CardHeader>
                        <LogoWrap><LogoIcon /></LogoWrap>
                        <WelcomeTitle>Witaj w DetailBoost!</WelcomeTitle>
                        <WelcomeSub>
                            Twoje konto jest gotowe. Wybierz jak chcesz zacząć: możesz wypróbować system bezpłatnie lub od razu wybrać plan dopasowany do potrzeb studia.
                        </WelcomeSub>
                    </CardHeader>

                    {isPending && (
                        <LoadingOverlay>
                            <Spinner />
                            {phase === 'pending-trial' && 'Aktywowanie okresu próbnego...'}
                            {phase === 'pending-plan' && 'Przekierowywanie do płatności...'}
                            {phase === 'pending-custom' && 'Przekierowywanie do płatności...'}
                        </LoadingOverlay>
                    )}

                    {!isPending && plansLoading && (
                        <LoadingOverlay>
                            <Spinner />
                            Ładowanie planów...
                        </LoadingOverlay>
                    )}

                    {!isPending && !plansLoading && (
                        <CardBody>
                            {/* role="alert": błąd pojawia się tuż po zniknięciu spinnera, kiedy
                                fokus przepadł razem z klikniętym przyciskiem - bez ogłoszenia
                                czytnik ekranu nie mówi nic. */}
                            {error && <Notice tone="danger" role="alert">{error}</Notice>}

                            {!trialUsed && (
                                <TrialSection>
                                    <SectionLabel>Zacznij bez zobowiązań</SectionLabel>
                                    <TrialCard $disabled={false} onClick={handleStartTrial}>
                                        <TrialIconWrap><GiftIcon /></TrialIconWrap>
                                        <TrialInfo>
                                            <TrialTitle>Wypróbuj przez 60 dni, bezpłatnie</TrialTitle>
                                            <TrialDesc>
                                                Pełny dostęp do wszystkich funkcji. Bez karty kredytowej, bez zobowiązań.
                                            </TrialDesc>
                                        </TrialInfo>
                                        <StatusPill $tone="ok">Gratis</StatusPill>
                                    </TrialCard>
                                </TrialSection>
                            )}

                            {!trialUsed && sortedPlans.length > 0 && (
                                <Divider>lub wybierz plan od razu</Divider>
                            )}

                            {sortedPlans.length > 0 && (
                                <TrialSection>
                                    <SectionLabel>
                                        {trialUsed ? 'Wybierz plan' : 'Gotowe pakiety'}
                                    </SectionLabel>
                                    {/* Plan polecany wyróżnia obwódka marki i plakietka, nie
                                        wypełnienie: wypełniony gradient był drugim (a przy otwartym
                                        własnym pakiecie trzecim) nasyconym blokiem w oknie i udawał,
                                        że krokiem następnym jest zakup FULL - choć obok stoi
                                        bezpłatny okres próbny (CLAUDE.md §2). */}
                                    <PlansGrid>
                                        {sortedPlans.map(plan => {
                                            const isHighlighted = plan.key === 'FULL';
                                            return (
                                                <PlanBtn
                                                    key={plan.key}
                                                    type="button"
                                                    $highlighted={isHighlighted}
                                                    $disabled={false}
                                                    onClick={() => handleSelectPlan(plan.key)}
                                                >
                                                    <PlanBtnHead>
                                                        <PlanBtnName>{plan.name}</PlanBtnName>
                                                        {isHighlighted && <StatusPill $tone="info">Polecany</StatusPill>}
                                                    </PlanBtnHead>
                                                    <PlanBtnPrice>
                                                        {formatCents(plan.monthlyPriceGrossCents)}
                                                    </PlanBtnPrice>
                                                    <PlanBtnPer>/ miesiąc</PlanBtnPer>
                                                    <PlanBtnFeatures>
                                                        {planFeatureSummary(plan)}
                                                    </PlanBtnFeatures>
                                                </PlanBtn>
                                            );
                                        })}
                                    </PlansGrid>
                                </TrialSection>
                            )}

                            {availableAddOns.length > 0 && (
                                <>
                                    <CustomToggle onClick={() => setCustomOpen(o => !o)} type="button">
                                        <span>Zbuduj własny pakiet</span>
                                        <ChevronDown open={customOpen} />
                                    </CustomToggle>

                                    {customOpen && (
                                        <CustomPanel>
                                            <CustomPanelHeader>Wybierz składniki pakietu</CustomPanelHeader>

                                            <BasePlanRow>
                                                <BasePlanCheck><CheckSmall /></BasePlanCheck>
                                                <AddOnMeta>
                                                    <AddOnName>Pakiet BASIC</AddOnName>
                                                    <AddOnDesc>Kalendarz i rezerwacje, baza klientów i pojazdów z pełną historią wizyt</AddOnDesc>
                                                </AddOnMeta>
                                                <AddOnPrice>
                                                    {basePriceCents != null
                                                        ? formatCents(basePriceCents)
                                                        : '99,00 zł'}/mies.
                                                </AddOnPrice>
                                            </BasePlanRow>

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

                                            <CustomSummary>
                                                <SummaryPrice>
                                                    <SummaryLabel>
                                                        Łącznie miesięcznie
                                                        {customPrice?.savingsWithFullCents != null && customPrice.savingsWithFullCents > 0 && (
                                                            <span style={{ display: 'block', fontSize: 11, color: '#d97706', fontWeight: 600 }}>
                                                                Pakiet FULL byłby tańszy o {formatCents(customPrice.savingsWithFullCents)}/mies.
                                                            </span>
                                                        )}
                                                    </SummaryLabel>
                                                    <SummaryAmount>
                                                        {priceLoading
                                                            ? '...'
                                                            : totalPriceCents != null
                                                                ? formatCents(totalPriceCents)
                                                                : 'Cena do ustalenia'}
                                                    </SummaryAmount>
                                                </SummaryPrice>
                                                {/* Otwarty panel własnego pakietu przejmuje okno: jego
                                                    „Przejdź do płatności" jest wtedy krokiem następnym
                                                    i jedynym wypełnieniem. */}
                                                <Button
                                                    variant="primary"
                                                    onClick={handleCustomConfirm}
                                                    disabled={priceLoading}
                                                >
                                                    Przejdź do płatności
                                                </Button>
                                            </CustomSummary>
                                        </CustomPanel>
                                    )}
                                </>
                            )}
                        </CardBody>
                    )}

                    <CardFooter>
                        Bezpieczne płatności online obsługuje Przelewy24. Możliwość anulowania w dowolnym momencie.
                        <br />
                        Masz pytania? Napisz do nas: <strong>pomoc@detailboost.pl</strong>
                        {/* Okno zasłania całą aplikację, razem z menu i jego „Wyloguj". Bez
                            wypełnienia - nie konkuruje z wyborem planu. */}
                        <LogoutRow>
                            <Button variant="ghost" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
                                Wyloguj
                            </Button>
                        </LogoutRow>
                    </CardFooter>
                </Card>
            </Overlay>
        </>,
        document.body
    );
}
