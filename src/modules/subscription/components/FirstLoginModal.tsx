import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/common/components/Toast';
import { useFeaturePlans, useStartTrial, useChangePlan } from '../api/subscriptionQueries';
import type { FeaturePlan, PlanKey } from '../types';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function planFeatureSummary(plan: FeaturePlan): string {
    const all = plan.features.map(featureLabel);
    if (all.length <= 3) return all.join(', ');
    return `${all.slice(0, 3).join(', ')} +${all.length - 3} więcej`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    trialUsed: boolean;
}

type Phase = 'idle' | 'pending-trial' | 'pending-plan' | 'done';

export function FirstLoginModal({ trialUsed }: Props) {
    const { showError } = useToast();
    const { data: plans, isLoading: plansLoading } = useFeaturePlans();
    const startTrial = useStartTrial();
    const changePlan = useChangePlan();

    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState<string | null>(null);

    const isPending = phase === 'pending-trial' || phase === 'pending-plan';

    const handleStartTrial = async () => {
        if (isPending) return;
        setError(null);
        setPhase('pending-trial');
        try {
            await startTrial.mutateAsync();
            setPhase('done');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg ?? 'Nie udało się aktywować okresu próbnego. Spróbuj ponownie.');
            showError('Błąd aktywacji triala', msg ?? 'Spróbuj ponownie.');
            setPhase('idle');
        }
    };

    const handleSelectPlan = async (planKey: PlanKey) => {
        if (isPending) return;
        setError(null);
        setPhase('pending-plan');
        try {
            await changePlan.mutateAsync(planKey);
            setPhase('done');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg ?? 'Nie udało się aktywować planu. Spróbuj ponownie.');
            showError('Błąd aktywacji planu', msg ?? 'Spróbuj ponownie.');
            setPhase('idle');
        }
    };

    const sortedPlans = (plans ?? []).slice().sort((a, b) => a.displayOrder - b.displayOrder);

    return createPortal(
        <Overlay>
            <Card>
                <CardHeader>
                    <LogoWrap>
                        <LogoIcon />
                    </LogoWrap>
                    <WelcomeTitle>Witaj w DetailBoost!</WelcomeTitle>
                    <WelcomeSub>
                        Twoje konto jest gotowe. Wybierz jak chcesz zacząć — możesz wypróbować system bezpłatnie lub od razu wybrać plan.
                    </WelcomeSub>
                </CardHeader>

                {/* ── Loading plans ──────────────────────────────────────── */}
                {plansLoading && (
                    <LoadingOverlay>
                        <Spinner />
                        Ładowanie planów…
                    </LoadingOverlay>
                )}

                {/* ── Pending action ─────────────────────────────────────── */}
                {!plansLoading && isPending && (
                    <LoadingOverlay>
                        <Spinner />
                        {phase === 'pending-trial'
                            ? 'Aktywowanie okresu próbnego…'
                            : 'Aktywowanie planu…'}
                    </LoadingOverlay>
                )}

                {/* ── Main content ───────────────────────────────────────── */}
                {!plansLoading && !isPending && (
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
                                <TrialCard
                                    $disabled={false}
                                    onClick={handleStartTrial}
                                >
                                    <TrialIconWrap>
                                        <GiftIcon />
                                    </TrialIconWrap>
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

                        {/* Divider between trial and paid */}
                        {!trialUsed && sortedPlans.length > 0 && (
                            <Divider>lub wybierz plan</Divider>
                        )}

                        {/* Plan selection */}
                        {sortedPlans.length > 0 && (
                            <TrialSection>
                                <SectionLabel>
                                    {trialUsed
                                        ? 'Wybierz plan'
                                        : 'Kup od razu'}
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
                    </CardBody>
                )}

                <CardFooter>
                    Bezpieczne płatności. Możliwość anulowania w dowolnym momencie.
                    <br />
                    Masz pytania? Napisz do nas: <strong>pomoc@detailboost.pl</strong>
                </CardFooter>
            </Card>
        </Overlay>,
        document.body
    );
}
