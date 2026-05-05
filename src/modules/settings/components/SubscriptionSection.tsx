import styled, { keyframes } from 'styled-components';
import { useAuth } from '@/core/context/AuthContext';
import { useToast } from '@/common/components/Toast';
import {
    useSubscriptionStatus,
    useSubscriptionPlans,
    usePurchaseSubscription,
} from '../hooks/useSubscription';
import type { SubscriptionPlanType } from '../api/subscriptionApi';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

function formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(amount);
}

function statusLabel(status: string): string {
    switch (status) {
        case 'TRIAL':   return 'Okres próbny';
        case 'ACTIVE':  return 'Aktywna';
        case 'EXPIRED': return 'Wygasła';
        default:        return 'Brak subskrypcji';
    }
}

function statusColor(status: string): string {
    switch (status) {
        case 'TRIAL':   return '#f59e0b';
        case 'ACTIVE':  return '#10b981';
        case 'EXPIRED': return '#ef4444';
        default:        return '#94a3b8';
    }
}

// ─── Styled components ────────────────────────────────────────────────────────

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

const Spinner = styled.div`
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;

const SectionHead = styled.div`
    margin-bottom: 6px;
`;

const EyeLabel = styled.div`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
    margin-bottom: 4px;
`;

const SectionTitle = styled.h2`
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.4px;
    margin: 0 0 4px;
    color: ${p => p.theme.colors.text};
`;

const SectionDesc = styled.p`
    font-size: 13px;
    color: #475569;
    margin: 0;
    max-width: 680px;
    line-height: 1.55;
`;

const Panel = styled.div`
    background: white;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    overflow: hidden;
`;

const PanelRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px 22px;
    border-bottom: 1px solid #f1f5f9;

    &:last-child { border-bottom: none; }
`;

const StatusBadge = styled.span<{ $color: string }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 9999px;
    background: ${p => p.$color}18;
    color: ${p => p.$color};

    &::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: ${p => p.$color};
    }
`;

const InfoGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0;
`;

const InfoCell = styled.div`
    padding: 18px 22px;
    border-right: 1px solid #f1f5f9;

    &:last-child { border-right: none; }
`;

const InfoLabel = styled.div`
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
    margin-bottom: 6px;
`;

const InfoValue = styled.div`
    font-size: 15px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

const InfoSub = styled.div`
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
`;

const DaysLeft = styled.span<{ $urgent: boolean }>`
    color: ${p => p.$urgent ? '#ef4444' : '#0ea5e9'};
`;

const PlansGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 14px;
`;

const PlanCard = styled.div<{ $highlighted: boolean }>`
    position: relative;
    background: ${p => p.$highlighted ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : 'white'};
    border: 1.5px solid ${p => p.$highlighted ? '#0ea5e9' : p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: box-shadow 180ms;

    &:hover { box-shadow: 0 4px 16px rgba(14,165,233,0.12); }
`;

const PlanBadge = styled.div`
    position: absolute;
    top: -1px;
    right: 20px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: #f59e0b;
    color: white;
    padding: 3px 10px;
    border-radius: 0 0 8px 8px;
`;

const PlanName = styled.div<{ $light: boolean }>`
    font-size: 15px;
    font-weight: 700;
    color: ${p => p.$light ? 'white' : p.theme.colors.text};
`;

const PlanPrice = styled.div<{ $light: boolean }>`
    color: ${p => p.$light ? 'white' : p.theme.colors.text};

    .amount {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -1px;
    }
    .period {
        font-size: 13px;
        opacity: 0.7;
        margin-left: 3px;
    }
`;

const PlanNote = styled.div<{ $light: boolean }>`
    font-size: 12px;
    color: ${p => p.$light ? 'rgba(255,255,255,0.75)' : '#64748b'};
    line-height: 1.5;
`;

const PlanBtn = styled.button<{ $light: boolean; $disabled: boolean }>`
    margin-top: auto;
    padding: 10px 18px;
    border-radius: 9px;
    border: ${p => p.$light ? '1.5px solid rgba(255,255,255,0.4)' : '1.5px solid #e2e8f0'};
    background: ${p => p.$light ? 'rgba(255,255,255,0.18)' : '#f8fafc'};
    color: ${p => p.$light ? 'white' : '#334155'};
    font-size: 13px;
    font-weight: 600;
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$disabled ? 0.5 : 1};
    transition: all 150ms;
    font-family: inherit;

    &:hover:not(:disabled) {
        background: ${p => p.$light ? 'rgba(255,255,255,0.28)' : '#0ea5e9'};
        color: ${p => p.$light ? 'white' : 'white'};
        border-color: ${p => p.$light ? 'rgba(255,255,255,0.6)' : '#0ea5e9'};
    }
`;

const TrialBanner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 16px 22px;
    background: #fefce8;
    border: 1px solid #fde68a;
    border-radius: ${p => p.theme.radii.lg};
`;

const TrialText = styled.div`
    flex: 1;
    font-size: 13px;
    color: #78350f;
    line-height: 1.55;

    strong { font-weight: 700; display: block; margin-bottom: 2px; }
`;

const LoadingWrap = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 240px;
`;

const SectionWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const StarIcon = () => (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

const CalendarIcon = () => (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export function SubscriptionSection() {
    const { user } = useAuth();
    const { showSuccess, showError } = useToast();
    const { status, isLoading: statusLoading } = useSubscriptionStatus();
    const { plans, isLoading: plansLoading } = useSubscriptionPlans();
    const purchase = usePurchaseSubscription();

    const isOwner = user?.role === 'OWNER';

    const handlePurchase = async (planType: SubscriptionPlanType) => {
        if (!isOwner) return;
        try {
            await purchase.mutateAsync(planType);
            showSuccess('Subskrypcja aktywowana', 'Twój plan został pomyślnie aktywowany.');
        } catch {
            showError('Błąd płatności', 'Nie udało się aktywować subskrypcji. Spróbuj ponownie.');
        }
    };

    if (statusLoading || plansLoading) {
        return (
            <LoadingWrap>
                <Spinner />
            </LoadingWrap>
        );
    }

    const monthlyPlan = plans.find(p => p.type === 'MONTHLY');
    const yearlyPlan  = plans.find(p => p.type === 'YEARLY');

    const endsAt = status?.subscriptionEndsAt ?? status?.trialEndsAt ?? null;
    const days = status?.daysRemaining ?? null;
    const isUrgent = days !== null && days <= 7;

    return (
        <SectionWrap>
            <SectionHead>
                <EyeLabel>Konto i rozliczenia</EyeLabel>
                <SectionTitle>Abonament</SectionTitle>
                <SectionDesc>Zarządzaj swoją subskrypcją. Wybierz plan, który najlepiej odpowiada potrzebom Twojego studia.</SectionDesc>
            </SectionHead>

            {/* Status panel */}
            {status && (
                <Panel>
                    <PanelRow>
                        <StarIcon />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>
                                Status subskrypcji
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>
                                Aktualny stan Twojego konta
                            </div>
                        </div>
                        <StatusBadge $color={statusColor(status.status)}>
                            {statusLabel(status.status)}
                        </StatusBadge>
                    </PanelRow>

                    <InfoGrid>
                        <InfoCell>
                            <InfoLabel>Dostęp do systemu</InfoLabel>
                            <InfoValue style={{ color: status.isAccessible ? '#10b981' : '#ef4444' }}>
                                {status.isAccessible ? 'Aktywny' : 'Zablokowany'}
                            </InfoValue>
                        </InfoCell>

                        {days !== null && (
                            <InfoCell>
                                <InfoLabel>Dni do końca</InfoLabel>
                                <InfoValue>
                                    <DaysLeft $urgent={isUrgent}>{days} dni</DaysLeft>
                                </InfoValue>
                                {isUrgent && (
                                    <InfoSub style={{ color: '#ef4444' }}>Odnów subskrypcję wkrótce</InfoSub>
                                )}
                            </InfoCell>
                        )}

                        {endsAt && (
                            <InfoCell>
                                <InfoLabel>
                                    <CalendarIcon />
                                    {' '}
                                    {status.status === 'TRIAL' ? 'Koniec okresu próbnego' : 'Data wygaśnięcia'}
                                </InfoLabel>
                                <InfoValue style={{ fontSize: 14 }}>{formatDate(endsAt)}</InfoValue>
                            </InfoCell>
                        )}
                    </InfoGrid>
                </Panel>
            )}

            {/* Trial info (only when trial hasn't been used yet) */}
            {status && !status.trialUsed && (
                <TrialBanner>
                    <StarIcon />
                    <TrialText>
                        <strong>Darmowy okres próbny — 2 miesiące</strong>
                        Możesz aktywować bezpłatny dostęp do systemu na 2 miesiące. Okres próbny jest dostępny tylko raz i nie wymaga podania danych płatniczych.
                    </TrialText>
                </TrialBanner>
            )}

            {/* Plans */}
            <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
                    Dostępne plany
                </div>
                <PlansGrid>
                    {monthlyPlan && (
                        <PlanCard $highlighted={false}>
                            <PlanName $light={false}>{monthlyPlan.name}</PlanName>
                            <PlanPrice $light={false}>
                                <span className="amount">{formatPrice(monthlyPlan.priceGross, monthlyPlan.currency)}</span>
                                <span className="period">/ miesiąc</span>
                            </PlanPrice>
                            <PlanNote $light={false}>
                                Dostęp do wszystkich funkcji systemu rozliczany co miesiąc. Brak zobowiązania — anuluj w dowolnym momencie.
                            </PlanNote>
                            <PlanBtn
                                $light={false}
                                $disabled={!isOwner || purchase.isPending}
                                disabled={!isOwner || purchase.isPending}
                                onClick={() => handlePurchase('MONTHLY')}
                                title={!isOwner ? 'Tylko właściciel studia może zarządzać subskrypcją' : undefined}
                            >
                                {purchase.isPending ? 'Przetwarzanie…' : 'Wybierz plan miesięczny'}
                            </PlanBtn>
                        </PlanCard>
                    )}

                    {yearlyPlan && (
                        <PlanCard $highlighted={true}>
                            <PlanBadge>Oszczędzasz</PlanBadge>
                            <PlanName $light={true}>{yearlyPlan.name}</PlanName>
                            <PlanPrice $light={true}>
                                <span className="amount">{formatPrice(yearlyPlan.pricePerMonth, yearlyPlan.currency)}</span>
                                <span className="period">/ miesiąc</span>
                            </PlanPrice>
                            <PlanNote $light={true}>
                                Rozliczany rocznie — {formatPrice(yearlyPlan.priceGross, yearlyPlan.currency)} jednorazowo. Pełny dostęp do wszystkich funkcji przez cały rok.
                            </PlanNote>
                            <PlanBtn
                                $light={true}
                                $disabled={!isOwner || purchase.isPending}
                                disabled={!isOwner || purchase.isPending}
                                onClick={() => handlePurchase('YEARLY')}
                                title={!isOwner ? 'Tylko właściciel studia może zarządzać subskrypcją' : undefined}
                            >
                                {purchase.isPending ? 'Przetwarzanie…' : 'Wybierz plan roczny'}
                            </PlanBtn>
                        </PlanCard>
                    )}
                </PlansGrid>

                {!isOwner && (
                    <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
                        Zakup subskrypcji jest dostępny wyłącznie dla właściciela studia.
                    </div>
                )}
            </div>
        </SectionWrap>
    );
}
