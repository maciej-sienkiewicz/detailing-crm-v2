import { useNavigate, useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Button } from '@/common/components/ui';
import { usePaymentOrderPolling } from '../hooks/usePaymentOrderPolling';
import { formatCents } from '../utils/formatters';

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
    border-top-color: #0ea5e9;
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
    const { order, outcome, delayed, checking, checkNow } = usePaymentOrderPolling(orderId);

    const goToApp = () => navigate('/settings', { replace: true });

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
                        <Title>{outcome === 'activating' ? 'Płatność przyjęta, włączamy dostęp…' : 'Sprawdzamy płatność…'}</Title>
                        <Text>
                            {outcome === 'activating'
                                ? 'Przelewy24 potwierdziły płatność. Jeszcze chwila, nie zamykaj tej strony.'
                                : 'Czekamy na potwierdzenie z Przelewy24. Zwykle trwa to kilka sekund, nie zamykaj tej strony.'}
                        </Text>
                        {order && <Amount>{order.description}: {formatCents(order.amountCents)}</Amount>}
                    </>
                )}

                {waiting && delayed && (
                    <>
                        <IconCircle $bg="#fef3c7"><ClockIcon /></IconCircle>
                        <Title>
                            {outcome === 'activating' ? 'Płatność przyjęta, dostęp jeszcze się włącza' : 'Płatność jeszcze nie potwierdzona'}
                        </Title>
                        <Text>
                            {outcome === 'activating'
                                ? 'Pieniądze dotarły, a dostęp włączy się sam w ciągu kilku minut.'
                                : 'Przelewy24 jeszcze nie przysłały potwierdzenia. Jeśli pieniądze zeszły z konta, dostęp włączy się sam w ciągu kilku minut.'}
                        </Text>
                        <Text>Sprawdzamy dalej w tle, a ta strona sama pokaże wynik. Możesz też wrócić do aplikacji.</Text>
                        {order && <Amount>{order.description}: {formatCents(order.amountCents)}</Amount>}
                        <Actions>
                            <Button variant="primary" size="lg" onClick={checkNow} disabled={checking}>
                                {checking ? 'Sprawdzam…' : 'Sprawdź ponownie'}
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
                            {order?.typeDisplayName}: {order?.description}. Wszystko gotowe, możesz
                            wracać do pracy.
                        </Text>
                        {order && <Amount>{formatCents(order.amountCents)}</Amount>}
                        <Button variant="primary" size="lg" onClick={goToApp}>Przejdź do aplikacji</Button>
                    </>
                )}

                {outcome === 'refund' && (
                    <>
                        <IconCircle $bg="#fef3c7"><ClockIcon /></IconCircle>
                        <Title>Płatność przyjęta, ale zakupu nie da się włączyć</Title>
                        <Text>
                            {order?.failureReason ?? 'Stan pakietu zmienił się w trakcie płatności.'} Zwrócimy
                            pieniądze na konto, z którego przyszła płatność, nic nie musisz robić.
                        </Text>
                        {order && <Amount>{formatCents(order.amountCents)}</Amount>}
                        <Button variant="primary" size="lg" onClick={goToApp}>Wróć do ustawień</Button>
                    </>
                )}

                {outcome === 'failed' && (
                    <>
                        <IconCircle $bg="#fee2e2"><CrossIcon /></IconCircle>
                        <Title>Płatność nie powiodła się</Title>
                        <Text>
                            {order?.failureReason ?? 'Płatność odrzucona albo anulowana. Nie pobraliśmy pieniędzy, spróbuj jeszcze raz.'}
                        </Text>
                        <Button variant="primary" size="lg" onClick={goToApp}>Wróć do ustawień</Button>
                    </>
                )}
            </Card>
        </Wrap>
    );
}
