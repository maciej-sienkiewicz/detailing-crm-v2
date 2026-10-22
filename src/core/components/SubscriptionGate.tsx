import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../context/AuthContext';
import { canPurchaseHere } from '../native/platform';
import { useToast } from '@/common/components/Toast';
import { Button } from '@/common/components/ui';
import { authApi } from '@/modules/auth/api/authApi';
import { useSubscriptionStatus } from '@/modules/settings/hooks/useSubscription';
import { useCheckout, useMyPlan } from '@/modules/subscription/api/subscriptionQueries';
import { toastCheckoutProblem, useCheckoutHandoff } from '@/modules/subscription/hooks/useCheckoutHandoff';
import { CheckoutConsent } from '@/modules/subscription/components/CheckoutConsent';
import { useCheckoutConsent } from '@/modules/subscription/hooks/useCheckoutConsent';
import { FirstLoginModal } from '@/modules/subscription/components/FirstLoginModal';
import { formatCents } from '@/modules/subscription/utils/formatters';
import { BootSplash } from './BootSplash';

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
    background: ${p => p.$highlighted ? 'linear-gradient(135deg, #0369a1 0%, #075985 100%)' : '#f8fafc'};
    border: 2px solid ${p => p.$highlighted ? '#0369a1' : '#e2e8f0'};
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
        box-shadow: 0 8px 24px ${p => p.$highlighted ? 'rgba(3, 105, 161, 0.3)' : 'rgba(15,23,42,0.1)'};
    }
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

const PurchaseBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 13px 20px;
    border-radius: 10px;
    border: none;
    background: #0369a1;
    color: white;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;

    &:hover { background: #075985; }
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

// ─── ExpiredModal ─────────────────────────────────────────────────────────────

function ExpiredModal() {
    const { user } = useAuth();
    const { showError, showWarning } = useToast();
    const { data: myPlan } = useMyPlan();
    const checkout = useCheckout();
    const handoff = useCheckoutHandoff();
    const consent = useCheckoutConsent();

    const isOwner = user?.role === 'OWNER';

    const handleRenew = async () => {
        if (!isOwner || checkout.isPending || !consent.require()) return;
        try {
            // Brak adresu płatności to NIE sukces - rozstrzyga stan zamówienia. Zrealizowane
            // odświeża status pakietu (useCheckout) i ta nakładka znika sama.
            const step = handoff(await checkout.mutateAsync({ type: 'RENEWAL', acceptTerms: true }));
            if (step.kind === 'refund' || step.kind === 'failed') toastCheckoutProblem({ showError, showWarning }, step);
        } catch {
            showError('Błąd płatności', 'Nie udało się rozpocząć płatności. Spróbuj ponownie.');
        }
    };

    return (
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
                    <Title>Twój pakiet wygasł</Title>
                    <Subtitle>
                        Przedłuż pakiet, żeby dalej pracować. Twoje dane są bezpieczne.
                    </Subtitle>
                </Head>

                {myPlan && (
                    <PlansGrid style={{ gridTemplateColumns: '1fr' }}>
                        <PlanCard $highlighted={true} $disabled={true} disabled>
                            <PlanName $light={true}>Pakiet {myPlan.plan.name}</PlanName>
                            <PlanAmount $light={true}>{formatCents(myPlan.monthlyCostCents)}</PlanAmount>
                            <PlanPer $light={true}>brutto / 30 dni (pakiet + aktywne moduły)</PlanPer>
                        </PlanCard>
                    </PlansGrid>
                )}

                {isOwner && <CheckoutConsent consent={consent} />}

                <PurchaseBtn onClick={handleRenew} disabled={!isOwner || checkout.isPending}>
                    {checkout.isPending && <BtnSpinner />}
                    {checkout.isPending ? 'Przekierowywanie do Przelewy24…' : 'Przedłuż pakiet'}
                </PurchaseBtn>

                {!isOwner && (
                    <OwnerNote>
                        Pakiet może przedłużyć tylko właściciel studia. Poproś go o to.
                    </OwnerNote>
                )}
            </Card>
        </Overlay>
    );
}

// ─── InactiveAccountScreen ────────────────────────────────────────────────────

/**
 * Konto bez aktywnego pakietu w aplikacji ze sklepu.
 *
 * App Store (3.1.1, 3.1.3(b)) i Google Play nie pozwalają tu niczego kupić ani
 * podpowiadać, gdzie to zrobić - więc zamiast „Przedłuż pakiet" jest sama informacja.
 * Jedyna akcja to wylogowanie: nakładka przykrywa całą aplikację razem z menu,
 * a bez niej nie dałoby się nawet przełączyć na inne konto.
 */
function InactiveAccountScreen() {
    const { setAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch {
            // Sesja i tak wygaśnie; ważne, żeby ten ekran zniknął.
        }
        setAuthenticated(false);
        navigate('/login');
    };

    return (
        <Overlay>
            <Card>
                <Head>
                    <IconWrap>
                        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </IconWrap>
                    <Title>Konto jest nieaktywne</Title>
                    <Subtitle>
                        To konto nie ma teraz aktywnego pakietu. Twoje dane są bezpieczne.
                        Pakietem nie można zarządzać w aplikacji.
                    </Subtitle>
                </Head>
                <Button size="lg" onClick={handleLogout}>Wyloguj się</Button>
            </Card>
        </Overlay>
    );
}

// ─── Gate ─────────────────────────────────────────────────────────────────────

interface SubscriptionGateProps {
    children: ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
    const { isLoading: authLoading } = useAuth();
    const { status, isLoading: statusLoading } = useSubscriptionStatus();

    // While auth or subscription status is loading, block rendering children.
    // Rendering children here would cause every mounted component to fire its
    // API queries immediately, all returning 403 for NO_PLAN/EXPIRED studios.
    // Ekran startowy, a nie osobny spinner: to wciąż etap startu aplikacji.
    if (authLoading || statusLoading) {
        return <BootSplash />;
    }

    // No plan yet: new studio on first login.
    // Block children entirely: the modal handles everything from here.
    // No children = no protected API calls fire.
    if (!status || status.status === 'NO_PLAN') {
        // W aplikacji ze sklepu powitanie proponuje już tylko darmowy okres próbny.
        // Gdy studio go wykorzystało, nie zostaje nic do wybrania.
        if (!canPurchaseHere() && status?.trialUsed) {
            return <InactiveAccountScreen />;
        }
        return <FirstLoginModal trialUsed={status?.trialUsed ?? false} />;
    }

    // Active plan: normal render.
    if (status.isAccessible) {
        return <>{children}</>;
    }

    // Expired / blocked: show renewal overlay on top of the (blurred) app shell
    // so users still see their data context while being prompted to renew.
    return (
        <>
            {children}
            {canPurchaseHere() ? <ExpiredModal /> : <InactiveAccountScreen />}
        </>
    );
}
