import { ReactNode, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../permissions/usePermissions';
import { SUBSCRIPTION_INACTIVE_EVENT } from '../forbidden';
import { useToast } from '@/common/components/Toast';
import { Button, Notice, SummaryStrip } from '@/common/components/ui';
import { acquireScrollLock } from '@/common/utils/scrollLock';
import { SUBSCRIPTION_QUERY_KEY, useSubscriptionStatus } from '@/modules/settings/hooks/useSubscription';
import { subscriptionApi, type SubscriptionStatusResponse } from '@/modules/settings/api/subscriptionApi';
import { invalidateSubscriptionData, useCheckout, useMyPlan } from '@/modules/subscription/api/subscriptionQueries';
import { FirstLoginModal } from '@/modules/subscription/components/FirstLoginModal';
import { formatCents, formatDate } from '@/modules/subscription/utils/formatters';
import { checkoutOutcome, describeCheckoutError } from '@/modules/subscription/utils/checkout';
import { renewalCoverage } from '@/modules/subscription/utils/renewal';
import { useLogout } from '@/modules/auth';

// ─── Styled ───────────────────────────────────────────────────────────────────

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

const GateSpinner = styled.div`
    width: 28px;
    height: 28px;
    border: 3px solid #e2e8f0;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;

const GraceNote = styled.p`
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: #64748b;
`;

// Full-screen loading used while subscription status is being fetched.
// Rendered instead of children so no protected API calls fire prematurely.
const GateLoadingScreen = styled.div`
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef2f7;
    z-index: 1;
`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    overflow-y: auto;
`;

const Card = styled.div`
    background: white;
    border-radius: 20px;
    padding: 40px;
    max-width: 560px;
    width: 100%;
    margin: auto;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
    display: flex;
    flex-direction: column;
    gap: 24px;

    @media (max-width: 480px) { padding: 28px 20px; }
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

// ─── ExpiredModal ─────────────────────────────────────────────────────────────

/**
 * Okno odnowienia wygasłego abonamentu.
 *
 * Wcześniej miało DWA wypełnione bloki: kartę pakietu w gradiencie marki (wyłączony
 * przycisk udający krok następny) i przycisk płatności - wzrok nie wiedział, co
 * kliknąć (CLAUDE.md §2). Teraz kwota leży płasko w pasku podsumowania, a jedynym
 * wypełnieniem jest „Odnów abonament i zapłać". Kwota to cena KOLEJNEGO okresu
 * (`nextRenewalCostCents`), bo tyle pobierze przedłużenie - bez modułów, których
 * wyłączenie było zaplanowane.
 *
 * Pracownik zapłacić nie może, więc nie dostaje wyłączonego przycisku płatności
 * (to był ten sam „wyłączony przycisk udający krok następny"), tylko informację, że
 * kolejny krok należy do właściciela. Okno bez wypełnienia jest w porządku - zakazany
 * jest remis, nie brak zwycięzcy.
 *
 * Najczęstsze wygaśnięcie to koniec okresu próbnego (TRIALING → EXPIRED): takie
 * studio nigdy nie miało opłaconego okresu ani karencji, więc nie mówimy mu, że
 * „opłacony okres i czas na przedłużenie minęły".
 */
function ExpiredModal({ trialOnly }: { trialOnly: boolean }) {
    // To samo źródło co ustawienia abonamentu - `user.role === 'OWNER'` rozjeżdżało
    // się z nim przy kontach, których rola ma inną wielkość liter.
    const { isOwner } = usePermissions();
    const { showError, showSuccess } = useToast();
    // my-plan jest tylko dla właściciela - pracownik dostawał 403 przy każdym otwarciu okna.
    const { data: myPlan } = useMyPlan({ enabled: isOwner });
    const checkout = useCheckout();

    // Własna nakładka poza ModalShell: blokadę scrolla tła zakłada sama, przez
    // jedynego jej właściciela (CLAUDE.md §3). Okno żyje tylko, gdy jest pokazane.
    useEffect(() => acquireScrollLock(), []);

    const renewalCents = myPlan ? (myPlan.nextRenewalCostCents ?? myPlan.monthlyCostCents) : null;
    // „plan i moduły" tylko wtedy, gdy moduł naprawdę wchodzi do odnowienia: FULL
    // ma wszystkie w cenie, a moduł z zaplanowanym wyłączeniem do niego nie wchodzi.
    // Słowa jak w Ustawieniach → Abonament („Plan Basic", „plan i moduły") - okno
    // mieszało „subskrypcję", „pakiet" i „abonament" dla jednej rzeczy.
    const renewsAddOns = !!myPlan && myPlan.plan.key !== 'FULL' && myPlan.activeAddOns.some(a => !a.cancelAt);
    // Co da zapłata teraz - datę liczy backend. Po wygaśnięciu tuż po karencji to mniej niż
    // 30 dni od dziś: okres obejmuje dni karencji wykorzystane po końcu poprzedniego.
    const coverage = myPlan ? renewalCoverage(myPlan) : null;
    const logout = useLogout();

    const handleRenew = async () => {
        if (!isOwner || checkout.isPending) return;
        try {
            const order = await checkout.mutateAsync({ type: 'RENEWAL' });
            const outcome = checkoutOutcome(order);
            if (outcome.kind === 'redirect') {
                window.location.assign(outcome.url);
                return;
            }
            if (outcome.kind === 'fulfilled') {
                // useCheckout odświeża status - bramka sama zdejmie to okno.
                showSuccess('Abonament odnowiony', coverage
                    ? `Twój plan działa do ${formatDate(coverage.endsAt)}.`
                    : 'Twój plan działa przez kolejne 30 dni.');
                return;
            }
            showError(outcome.copy.title, outcome.copy.message);
        } catch (err: unknown) {
            // Checkout idzie bez toastu interceptora - to jedyny komunikat o błędzie.
            const copy = describeCheckoutError(err);
            showError(copy.title, copy.message);
        }
    };

    return (
        <Overlay role="dialog" aria-modal="true" aria-labelledby="subscription-expired-title">
            <Card>
                <Head>
                    <IconWrap>
                        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </IconWrap>
                    <Title id="subscription-expired-title">
                        {trialOnly ? 'Okres próbny się skończył' : 'Abonament wygasł'}
                    </Title>
                    <Subtitle>
                        {trialOnly
                            ? 'Opłać abonament, żeby wrócić do pracy.'
                            : 'Opłacony okres i czas na jego przedłużenie minęły. Odnów abonament, żeby wrócić do pracy.'}
                        {' '}Płatność obsługuje Przelewy24, a wszystkie Twoje dane są bezpieczne.
                    </Subtitle>
                </Head>

                {myPlan && renewalCents != null && (
                    <SummaryStrip
                        label={`Plan ${myPlan.plan.name}`}
                        amount={formatCents(renewalCents)}
                        details={[
                            coverage ? `brutto, dostęp do ${formatDate(coverage.endsAt)}` : 'brutto za 30 dni',
                            renewsAddOns ? 'plan i moduły' : null,
                        ].filter(Boolean).join(', ')}
                    />
                )}
                {coverage?.includesUsedGrace && (
                    <GraceNote>
                        Okres obejmuje dni karencji wykorzystane po końcu poprzedniego okresu, dlatego od dziś
                        zostaje mniej niż 30 dni.
                    </GraceNote>
                )}

                {isOwner ? (
                    <Button
                        variant="primary"
                        size="lg"
                        block
                        onClick={handleRenew}
                        disabled={checkout.isPending}
                    >
                        {checkout.isPending
                            ? 'Przekierowywanie do Przelewy24…'
                            : trialOnly ? 'Opłać abonament' : 'Odnów abonament i zapłać'}
                    </Button>
                ) : (
                    <Notice tone="info" title={trialOnly ? 'Opłacić może tylko właściciel studia' : 'Odnowić może tylko właściciel studia'}>
                        {trialOnly
                            ? 'Poproś właściciela o opłacenie abonamentu.'
                            : 'Poproś właściciela o odnowienie abonamentu.'}
                    </Notice>
                )}
                {/* Okno zasłania całą aplikację, razem z menu i jego „Wyloguj" - wyjście musi
                    być tutaj. Bez wypełnienia: krokiem następnym jest zapłata. */}
                <Button variant="ghost" size="sm" block onClick={() => logout.mutate()} disabled={logout.isPending}>
                    Wyloguj
                </Button>
            </Card>
        </Overlay>
    );
}

// ─── Gate ─────────────────────────────────────────────────────────────────────

interface SubscriptionGateProps {
    children: ReactNode;
}

/**
 * Abonament wygasł w trakcie sesji: backend odpowiada 403 SUBSCRIPTION_INACTIVE
 * (patrz core/forbidden), a status bramka czyta tylko przy montowaniu - bez tego
 * studio klikało w martwe przyciski aż do przeładowania strony. Odświeżamy dane
 * abonamentu, a bramka sama pokazuje okno odnowienia.
 *
 * Seria odrzuconych zapytań z jednego widoku to jedno odświeżenie, a gdy okno już
 * stoi, nie ma czego odświeżać.
 *
 * Odświeżony status bywa jeszcze „dostępny" (uprawnienia z pamięci podręcznej
 * serwera dochodzą chwilę później niż status) - wtedy okna nie ma, interceptor
 * milczy, a wywołujący też, bo 4xx uznaje za obsłużone. Kliknięcie nie może skończyć
 * się niczym, więc mówimy jednym toastem, co się stało.
 */
function useSubscriptionInactiveListener() {
    const queryClient = useQueryClient();
    const { showInfo } = useToast();
    useEffect(() => {
        let quietUntil = 0;
        let disposed = false;
        const handler = async () => {
            const current = queryClient.getQueryData<SubscriptionStatusResponse>(SUBSCRIPTION_QUERY_KEY);
            if (current && !current.isAccessible) return;
            const now = Date.now();
            if (now < quietUntil) return;
            quietUntil = now + 5000;
            invalidateSubscriptionData(queryClient);
            let stillAccessible = true;
            try {
                // Dołącza do odświeżenia, które invalidate właśnie uruchomiło - bez drugiego zapytania.
                const fresh = await queryClient.fetchQuery({
                    queryKey: SUBSCRIPTION_QUERY_KEY,
                    queryFn: subscriptionApi.getStatus,
                });
                stillAccessible = fresh.isAccessible;
            } catch {
                // Statusu nie da się teraz odczytać - akcja i tak została odrzucona.
            }
            if (!disposed && stillAccessible) {
                showInfo(
                    'Abonament nie jest aktywny',
                    'Serwer odrzucił tę akcję, bo abonament studia nie jest aktywny. Odśwież stronę za chwilę.',
                );
            }
        };
        window.addEventListener(SUBSCRIPTION_INACTIVE_EVENT, handler);
        return () => {
            disposed = true;
            window.removeEventListener(SUBSCRIPTION_INACTIVE_EVENT, handler);
        };
    }, [queryClient, showInfo]);
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
    const { isLoading: authLoading } = useAuth();
    const { status, isLoading: statusLoading } = useSubscriptionStatus();
    useSubscriptionInactiveListener();

    // While auth or subscription status is loading, block rendering children.
    // Rendering children here would cause every mounted component to fire its
    // API queries immediately, all returning 403 for NO_PLAN/EXPIRED studios.
    if (authLoading || statusLoading) {
        return (
            <GateLoadingScreen>
                <GateSpinner />
            </GateLoadingScreen>
        );
    }

    // No plan yet: new studio on first login.
    // Block children entirely: the modal handles everything from here.
    // No children = no protected API calls fire.
    if (!status || status.status === 'NO_PLAN') {
        return <FirstLoginModal trialUsed={status?.trialUsed ?? false} />;
    }

    // Active plan: normal render.
    if (status.isAccessible) {
        return <>{children}</>;
    }

    // Expired / blocked: show renewal overlay on top of the (blurred) app shell
    // so users still see their data context while being prompted to renew.
    // Status przychodzi od bramki, a nie z drugiej subskrypcji zapytania: ta przy
    // montowaniu okna odpytywała serwer jeszcze raz (dane były już „nieświeże").
    return (
        <>
            {children}
            <ExpiredModal trialOnly={status.subscriptionEndsAt == null} />
        </>
    );
}
