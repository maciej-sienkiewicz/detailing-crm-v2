import { useNavigate, useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Button, Notice } from '@/common/components/ui';
import { usePaymentOrderPolling } from '../hooks/usePaymentOrderPolling';
import { formatCents } from '../utils/formatters';
import { paymentReturnPath } from '../utils/paymentOrderStatus';

/**
 * Landing page the buyer returns to from Przelewy24
 * (urlReturn = /payments/result?orderId={id}).
 *
 * The P24 webhook settles the order server-side, so this page only polls the
 * order status (`usePaymentOrderPolling`) until it is settled. It must be reachable
 * for EXPIRED studios: the route is registered without the SubscriptionGate.
 *
 * Kręcące się kółko nie może być stanem końcowym: po limicie czasu kupujący widzi,
 * że płatność nie jest jeszcze potwierdzona, może sprawdzić od razu albo wrócić do
 * aplikacji, a odpytywanie trwa w tle i samo przełączy widok na wynik.
 *
 * „Odśwież" to JEDNA akcja ręczna (dawne „Sprawdź ponownie" w nią weszło): każe backendowi
 * zapytać Przelewy24, więc pomaga także wtedy, gdy notyfikacja zginęła. Dwa przyciski
 * „sprawdź bazę" i „zapytaj P24" wyglądałyby tak samo, a działał tylko jeden. Wypełnienie
 * (CLAUDE.md §2): w czasie zwykłego czekania krokiem następnym jest samo czekanie, więc
 * „Odśwież" jest obwiedzione; po limicie czasu staje się krokiem następnym i jest jedynym
 * wypełnionym, a „Wróć do aplikacji" zostaje obwiedzione.
 */

// ─── Styled ───────────────────────────────────────────────────────────────────

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

const Wrap = styled.div`
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef2f7;
    padding: 24px;
`;

const Card = styled.div`
    background: white;
    border-radius: 20px;
    padding: 40px;
    max-width: 460px;
    width: 100%;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
    text-align: center;
`;

const Spinner = styled.div`
    width: 42px;
    height: 42px;
    border: 4px solid #e2e8f0;
    border-top-color: #0369a1;
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;

const IconCircle = styled.div<{ $bg: string }>`
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: ${p => p.$bg};
    display: flex;
    align-items: center;
    justify-content: center;
`;

const Title = styled.h2`
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
`;

const Text = styled.p`
    margin: 0;
    font-size: 14px;
    color: #64748b;
    line-height: 1.6;
`;

const Amount = styled.div`
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
`;

const Actions = styled.div`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    width: 100%;
    max-width: 280px;
`;

const CheckIcon = () => (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#10b981"
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

const CrossIcon = () => (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#ef4444"
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
    </svg>
);

const ClockIcon = () => (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#d97706"
        strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
    </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentResultPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const orderId = searchParams.get('orderId');
    const { order, outcome, delayed, refreshing, refreshNote, refresh } = usePaymentOrderPolling(orderId);

    // Miejsce, z którego kupujący poszedł płacić (np. wizyta przy dokupieniu kredytów SMS),
    // a bez zapisu - ustawienia, jak dotąd. Napis przycisku idzie za celem: „Wróć do ustawień"
    // prowadzący do wizyty obiecywałby co innego, niż robi.
    const destination = (orderId && paymentReturnPath(orderId)) || '/settings';
    const goToApp = () => navigate(destination, { replace: true });
    const backLabel = destination.startsWith('/settings') ? 'Wróć do ustawień'
        : destination.startsWith('/visits/') ? 'Wróć do wizyty'
            : 'Wróć do aplikacji';
    // Kredyty SMS niczego nie „włączają": dopisują się do salda. Teksty o dostępie dotyczą
    // pakietu i modułów.
    const credits = order?.type === 'SMS_CREDITS';

    if (!orderId) {
        return (
            <Wrap>
                <Card>
                    <IconCircle $bg="#fee2e2"><CrossIcon /></IconCircle>
                    <Title>Niepełny link do płatności</Title>
                    <Text>Ten adres jest niekompletny. Wróć do aplikacji i spróbuj ponownie.</Text>
                    <Button variant="primary" size="lg" onClick={goToApp}>Wróć do aplikacji</Button>
                </Card>
            </Wrap>
        );
    }

    const waiting = outcome === 'waiting' || outcome === 'activating';

    return (
        <Wrap>
            <Card aria-live="polite">
                {waiting && !delayed && (
                    <>
                        <Spinner />
                        <Title>
                            {outcome !== 'activating' ? 'Sprawdzamy płatność…'
                                : credits ? 'Płatność przyjęta, dopisujemy kredyty…' : 'Płatność przyjęta, włączamy dostęp…'}
                        </Title>
                        <Text>
                            {outcome === 'activating'
                                ? 'Przelewy24 potwierdziły płatność. Jeszcze chwila, nie zamykaj tej strony.'
                                : 'Czekamy na potwierdzenie z Przelewy24. Zwykle trwa to kilka sekund, nie zamykaj tej strony.'}
                        </Text>
                        {order && <Amount>{order.description}: {formatCents(order.amountCents)}</Amount>}
                        {refreshNote && <Notice tone="warn">{refreshNote}</Notice>}
                        <Actions>
                            <Button variant="outline" size="lg" onClick={refresh} disabled={refreshing}>
                                {refreshing ? 'Sprawdzam w Przelewy24…' : 'Odśwież'}
                            </Button>
                        </Actions>
                    </>
                )}

                {waiting && delayed && (
                    <>
                        <IconCircle $bg="#fef3c7"><ClockIcon /></IconCircle>
                        <Title>
                            {outcome !== 'activating' ? 'Płatność jeszcze nie potwierdzona'
                                : credits ? 'Płatność przyjęta, kredyty jeszcze się dopisują' : 'Płatność przyjęta, dostęp jeszcze się włącza'}
                        </Title>
                        <Text>
                            {outcome === 'activating'
                                ? `Pieniądze dotarły, a ${credits ? 'kredyty pojawią się na koncie same' : 'dostęp włączy się sam'} w ciągu kilku minut.`
                                : `Przelewy24 jeszcze nie przysłały potwierdzenia. Jeśli pieniądze zeszły z konta, ${credits ? 'kredyty pojawią się na koncie same' : 'dostęp włączy się sam'} w ciągu kilku minut.`}
                        </Text>
                        <Text>
                            Sprawdzamy dalej w tle, a ta strona sama pokaże wynik. „Odśwież” zapyta Przelewy24
                            od razu. Możesz też wrócić do aplikacji.
                        </Text>
                        {order && <Amount>{order.description}: {formatCents(order.amountCents)}</Amount>}
                        {refreshNote && <Notice tone="warn">{refreshNote}</Notice>}
                        <Actions>
                            <Button variant="primary" size="lg" onClick={refresh} disabled={refreshing}>
                                {refreshing ? 'Sprawdzam w Przelewy24…' : 'Odśwież'}
                            </Button>
                            <Button variant="outline" size="lg" onClick={goToApp}>Wróć do aplikacji</Button>
                        </Actions>
                    </>
                )}

                {outcome === 'done' && (
                    <>
                        <IconCircle $bg="#d1fae5"><CheckIcon /></IconCircle>
                        <Title>Płatność przyjęta</Title>
                        <Text>
                            {credits
                                ? `${order?.description}. Kredyty są już na koncie, możesz wracać do pracy.`
                                : `${order?.typeDisplayName}: ${order?.description}. Wszystko gotowe, możesz wracać do pracy.`}
                        </Text>
                        {order && <Amount>{formatCents(order.amountCents)}</Amount>}
                        <Button variant="primary" size="lg" onClick={goToApp}>Przejdź do aplikacji</Button>
                    </>
                )}

                {outcome === 'refund' && (
                    <>
                        <IconCircle $bg="#fef3c7"><ClockIcon /></IconCircle>
                        <Title>
                            {credits ? 'Płatność przyjęta, ale kredytów nie da się dopisać' : 'Płatność przyjęta, ale zakupu nie da się włączyć'}
                        </Title>
                        <Text>
                            {order?.failureReason ?? (credits ? 'Pakiet kredytów zmienił się w trakcie płatności.' : 'Stan pakietu zmienił się w trakcie płatności.')} Zwrócimy
                            pieniądze na konto, z którego przyszła płatność, nic nie musisz robić.
                        </Text>
                        {order && <Amount>{formatCents(order.amountCents)}</Amount>}
                        <Button variant="primary" size="lg" onClick={goToApp}>{backLabel}</Button>
                    </>
                )}

                {outcome === 'failed' && (
                    <>
                        <IconCircle $bg="#fee2e2"><CrossIcon /></IconCircle>
                        <Title>Płatność nie powiodła się</Title>
                        <Text>
                            {order?.failureReason ?? 'Płatność odrzucona albo anulowana. Nie pobraliśmy pieniędzy, spróbuj jeszcze raz.'}
                        </Text>
                        <Button variant="primary" size="lg" onClick={goToApp}>{backLabel}</Button>
                    </>
                )}
            </Card>
        </Wrap>
    );
}
