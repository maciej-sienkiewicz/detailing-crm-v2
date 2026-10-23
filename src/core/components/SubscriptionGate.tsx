import { ReactNode } from 'react';
import styled from 'styled-components';
import { useAuth } from '../context/AuthContext';
import { canPurchaseHere } from '../native/platform';
import { usePermissions } from '../permissions';
import { Button } from '@/common/components/ui';
import { useSubscriptionStatus } from '@/modules/settings/hooks/useSubscription';
import { useEntitlements } from '@/modules/subscription/api/subscriptionQueries';
import { FirstLoginModal } from '@/modules/subscription/components/FirstLoginModal';
import { useLogoutToLogin } from '@/modules/subscription/hooks/useLogoutToLogin';
import { BootSplash } from './BootSplash';

// ─── Styled ───────────────────────────────────────────────────────────────────

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

// ─── ExpiredScreen ────────────────────────────────────────────────────────────

/**
 * Pakiet (albo okres próbny) się skończył: ten sam ekran wyboru pakietu co po rejestracji,
 * z dotychczasowym pakietem i modułami zaznaczonymi na start.
 *
 * Dawniej było tu okno z jednym przyciskiem „Przedłuż pakiet": dotychczasowy pakiet ze
 * wszystkimi modułami (także tymi z okresu próbnego) albo nic - zejść na niższy pakiet
 * czy zrezygnować z modułu się nie dało, choć serwer na to pozwala. Nie było też
 * „Wyloguj", a okno przykrywało menu.
 */
function ExpiredScreen({ neverPaid }: { neverPaid: boolean }) {
    const { isOwner } = usePermissions();
    const { data: entitlements, isLoading } = useEntitlements();

    if (isLoading) return <BootSplash />;

    return (
        <FirstLoginModal
            trialUsed
            expired={{
                planKey: entitlements?.plan.key ?? 'BASIC',
                addOnKeys: entitlements?.activeAddOns ?? [],
                afterTrial: neverPaid,
                canPurchase: isOwner,
            }}
        />
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
    const logout = useLogoutToLogin();

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
                <Button size="lg" onClick={() => void logout()}>Wyloguj się</Button>
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

    // Expired / blocked: pełnoekranowy wybór pakietu, jak przy pierwszym logowaniu.
    // Bez widoku aplikacji pod spodem - każde jego zapytanie i tak kończyło się 403.
    return canPurchaseHere()
        ? <ExpiredScreen neverPaid={!status.subscriptionEndsAt} />
        : <InactiveAccountScreen />;
}
