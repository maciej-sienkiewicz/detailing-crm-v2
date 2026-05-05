import { ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../context/AuthContext';
import { useToast } from '@/common/components/Toast';
import {
    useSubscriptionStatus,
    useSubscriptionPlans,
    usePurchaseSubscription,
} from '@/modules/settings/hooks/useSubscription';
import type { SubscriptionPlanType } from '@/modules/settings/api/subscriptionApi';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatPrice(amount: number, currency: string): string {
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(amount);
}

// ─── Styled ───────────────────────────────────────────────────────────────────

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
`;

const Card = styled.div`
    background: white;
    border-radius: 20px;
    padding: 40px;
    max-width: 640px;
    width: 100%;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
    display: flex;
    flex-direction: column;
    gap: 28px;
`;

const Head = styled.div`
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
`;

const IconWrap = styled.div`
    width: 64px;
    height: 64px;
    background: #fef2f2;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const Title = styled.h2`
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #0f172a;
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: 14px;
    color: #64748b;
    line-height: 1.6;
    max-width: 460px;
`;

const PlansGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;

    @media (max-width: 500px) {
        grid-template-columns: 1fr;
    }
`;

const PlanCard = styled.button<{ $highlighted: boolean; $disabled: boolean }>`
    position: relative;
    background: ${p => p.$highlighted ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : '#f8fafc'};
    border: 2px solid ${p => p.$highlighted ? '#0ea5e9' : '#e2e8f0'};
    border-radius: 14px;
    padding: 20px;
    text-align: left;
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$disabled ? 0.6 : 1};
    transition: all 160ms;
    font-family: inherit;
    display: flex;
    flex-direction: column;
    gap: 8px;

    &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px ${p => p.$highlighted ? 'rgba(14,165,233,0.3)' : 'rgba(15,23,42,0.1)'};
    }
`;

const SaveBadge = styled.div`
    position: absolute;
    top: -1px;
    right: 14px;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    background: #f59e0b;
    color: white;
    padding: 3px 9px;
    border-radius: 0 0 8px 8px;
`;

const PlanName = styled.div<{ $light: boolean }>`
    font-size: 13px;
    font-weight: 700;
    color: ${p => p.$light ? 'rgba(255,255,255,0.85)' : '#64748b'};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const PlanAmount = styled.div<{ $light: boolean }>`
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.8px;
    color: ${p => p.$light ? 'white' : '#0f172a'};
    line-height: 1;
`;

const PlanPer = styled.div<{ $light: boolean }>`
    font-size: 12px;
    color: ${p => p.$light ? 'rgba(255,255,255,0.65)' : '#94a3b8'};
`;

const PlanTotal = styled.div<{ $light: boolean }>`
    font-size: 11px;
    color: ${p => p.$light ? 'rgba(255,255,255,0.55)' : '#94a3b8'};
    margin-top: 2px;
`;

const PurchaseBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 13px 20px;
    border-radius: 10px;
    border: none;
    background: #0ea5e9;
    color: white;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;

    &:hover { background: #0284c7; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const OwnerNote = styled.div`
    text-align: center;
    font-size: 12px;
    color: #94a3b8;
    padding: 12px 0 0;
    border-top: 1px solid #f1f5f9;
`;

const BtnSpinner = styled.div`
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;

// ─── Component ────────────────────────────────────────────────────────────────

interface SubscriptionGateProps {
    children: ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
    const { user, isLoading: authLoading } = useAuth();
    const { showSuccess, showError } = useToast();
    const { status, isLoading: statusLoading } = useSubscriptionStatus();
    const { plans } = useSubscriptionPlans();
    const purchase = usePurchaseSubscription();

    const isOwner = user?.role === 'OWNER';

    // while auth or subscription is loading, just render children (ProtectedRoute already shows a loader)
    if (authLoading || statusLoading || !status) {
        return <>{children}</>;
    }

    // subscription is still valid
    if (status.isAccessible) {
        return <>{children}</>;
    }

    const monthlyPlan = plans.find(p => p.type === 'MONTHLY');
    const yearlyPlan  = plans.find(p => p.type === 'YEARLY');

    const handlePurchase = async (planType: SubscriptionPlanType) => {
        if (!isOwner) return;
        try {
            await purchase.mutateAsync(planType);
            showSuccess('Subskrypcja aktywowana', 'Miłego korzystania z systemu!');
        } catch {
            showError('Błąd płatności', 'Nie udało się aktywować subskrypcji. Spróbuj ponownie.');
        }
    };

    return (
        <>
            {children}
            <Overlay>
                <Card>
                    <Head>
                        <IconWrap>
                            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </IconWrap>
                        <Title>Twoja subskrypcja wygasła</Title>
                        <Subtitle>
                            Aby kontynuować korzystanie z systemu, wybierz jeden z poniższych planów i odnów dostęp. Wszystkie Twoje dane są bezpieczne.
                        </Subtitle>
                    </Head>

                    <PlansGrid>
                        {monthlyPlan && (
                            <PlanCard
                                $highlighted={false}
                                $disabled={!isOwner || purchase.isPending}
                                disabled={!isOwner || purchase.isPending}
                                onClick={() => handlePurchase('MONTHLY')}
                            >
                                <PlanName $light={false}>{monthlyPlan.name}</PlanName>
                                <PlanAmount $light={false}>
                                    {formatPrice(monthlyPlan.priceGross, monthlyPlan.currency)}
                                </PlanAmount>
                                <PlanPer $light={false}>/ miesiąc</PlanPer>
                            </PlanCard>
                        )}

                        {yearlyPlan && (
                            <PlanCard
                                $highlighted={true}
                                $disabled={!isOwner || purchase.isPending}
                                disabled={!isOwner || purchase.isPending}
                                onClick={() => handlePurchase('YEARLY')}
                            >
                                <SaveBadge>Najlepsza oferta</SaveBadge>
                                <PlanName $light={true}>{yearlyPlan.name}</PlanName>
                                <PlanAmount $light={true}>
                                    {formatPrice(yearlyPlan.pricePerMonth, yearlyPlan.currency)}
                                </PlanAmount>
                                <PlanPer $light={true}>/ miesiąc</PlanPer>
                                <PlanTotal $light={true}>
                                    {formatPrice(yearlyPlan.priceGross, yearlyPlan.currency)} / rok
                                </PlanTotal>
                            </PlanCard>
                        )}
                    </PlansGrid>

                    {purchase.isPending && (
                        <PurchaseBtn disabled>
                            <BtnSpinner />
                            Przetwarzanie płatności…
                        </PurchaseBtn>
                    )}

                    {!isOwner && (
                        <OwnerNote>
                            Odnowienie subskrypcji jest możliwe wyłącznie przez właściciela studia. Skontaktuj się z właścicielem, aby odblokować dostęp.
                        </OwnerNote>
                    )}
                </Card>
            </Overlay>
        </>
    );
}
