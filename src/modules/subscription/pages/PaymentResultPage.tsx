import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/common/components/ui';
import { newSubscriptionApi } from '../api/subscriptionApi';
import { invalidateSubscriptionData } from '../api/subscriptionQueries';
import { formatCents } from '../utils/formatters';
import type { PaymentOrder, PaymentOrderStatus } from '../types';

/**
 * Landing page the buyer returns to from Przelewy24
 * (urlReturn = /payments/result?orderId={id}).
 *
 * The P24 webhook settles the order server-side, so this page only polls the
 * order status. It must be reachable for EXPIRED studios: the route is
 * registered without the SubscriptionGate.
 *
 * Stany zamówienia, a nie „zapłacone albo nie":
 *  - PENDING, EXPIRED - czekamy dalej. EXPIRED nie jest końcem: spóźniona wpłata
 *    wciąż przenosi zamówienie do PAID. Dawniej każdy stan inny niż PENDING kończył
 *    odpytywanie, więc kupujący, który zapłacił po czasie, widział porażkę;
 *  - PAID - pieniądze są, aktywacja trwa. To jeszcze NIE sukces: odświeżenie danych
 *    abonamentu w tym momencie wczytywało stare uprawnienia i stary status, a strona
 *    ogłaszała „konto zaktualizowane", zanim cokolwiek się zmieniło;
 *  - FULFILLED - jedyny sukces i jedyny moment na odświeżenie danych;
 *  - FAILED, CANCELLED - koniec, nic nie zostało pobrane;
 *  - REFUND_REQUIRED - koniec, ale pieniądze POBRANO: zakupu nie dało się wprowadzić,
 *    wsparcie zwróci środki. Tu nigdy nie wolno napisać „nic nie zostało pobrane".
 */

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 90_000;

// ─── Styled ───────────────────────────────────────────────────────────────────

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

const Wrap = styled.div`
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef2f7;
    padding: 24px 16px;
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

    @media (max-width: 480px) { padding: 28px 20px; }
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

/**
 * Tytuł i opis stanu jako jeden komunikat dla czytnika ekranu. Strona przechodzi
 * od spinnera do wyniku bez udziału użytkownika - bez regionu na żywo osoba
 * niewidoma nie dowiadywała się ani o porażce, ani o tym, że pieniądze pobrano
 * i wrócą. Porażka i zwrot to `alert`, oczekiwanie to `status`.
 */
const Message = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    width: 100%;
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

const Reason = styled.p`
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid #fcd34d;
    background: #fffbeb;
    color: #78350f;
    font-size: 13px;
    line-height: 1.5;
    width: 100%;
`;

const Amount = styled.div`
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
`;

const Actions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
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

const AlertIcon = () => (
    <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#d97706"
        strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

type ViewState =
    | 'polling'             // PENDING / EXPIRED / jeszcze bez odpowiedzi
    | 'activating'          // PAID: pieniądze są, aktywacja trwa
    | 'fulfilled'           // FULFILLED: sukces
    | 'failed'              // FAILED / CANCELLED: nic nie pobrano
    | 'refund'              // REFUND_REQUIRED: pobrano, zwrot przez wsparcie
    | 'timeout'             // limit czasu bez potwierdzenia wpłaty
    | 'activation-timeout'  // limit czasu w PAID: wpłata POTWIERDZONA, aktywacja się przeciąga
    | 'missing';

/** Stan widoku dla statusu zamówienia albo null, gdy trzeba pytać dalej. */
function terminalView(status: PaymentOrderStatus): ViewState | null {
    switch (status) {
        case 'FULFILLED': return 'fulfilled';
        case 'FAILED':
        case 'CANCELLED': return 'failed';
        case 'REFUND_REQUIRED': return 'refund';
        default: return null;
    }
}

export function PaymentResultPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const orderId = searchParams.get('orderId');

    const [state, setState] = useState<ViewState>(orderId ? 'polling' : 'missing');
    const [order, setOrder] = useState<PaymentOrder | null>(null);
    // Start odliczania ustawia efekt, nie render - render ma być czysty (react-hooks/purity).
    const startedAt = useRef(0);

    useEffect(() => {
        if (!orderId) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        let lastStatus: PaymentOrderStatus | null = null;
        startedAt.current = Date.now();

        const poll = async () => {
            try {
                const result = await newSubscriptionApi.getOrder(orderId);
                if (cancelled) return;
                setOrder(result);
                lastStatus = result.status;

                const terminal = terminalView(result.status);
                if (terminal) {
                    // Dane abonamentu odświeżamy dopiero przy FULFILLED - wcześniej
                    // backend oddałby jeszcze stare uprawnienia i stary status.
                    if (terminal === 'fulfilled') invalidateSubscriptionData(queryClient);
                    setState(terminal);
                    return;
                }
                setState(result.status === 'PAID' ? 'activating' : 'polling');
            } catch {
                // transient error, keep polling until timeout
            }
            if (cancelled) return;

            if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
                setState(lastStatus === 'PAID' ? 'activation-timeout' : 'timeout');
                return;
            }
            timer = setTimeout(poll, POLL_INTERVAL_MS);
        };

        poll();
        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [orderId, queryClient]);

    const goToApp = () => navigate('/settings', { replace: true });
    const reload = () => window.location.reload();

    return (
        <Wrap>
            <Card>
                {state === 'polling' && (
                    <>
                        <Spinner />
                        <Message role="status">
                            <Title>Czekamy na potwierdzenie płatności</Title>
                            <Text>
                                Przelewy24 potwierdza wpłatę zwykle w kilka sekund. Nie zamykaj tej strony.
                            </Text>
                        </Message>
                        {order && <Amount>{order.description}: {formatCents(order.amountCents)}</Amount>}
                    </>
                )}

                {state === 'activating' && (
                    <>
                        <Spinner />
                        <Message role="status">
                            <Title>Płatność przyjęta, aktywujemy zmiany</Title>
                            <Text>
                                Wpłata dotarła. Wprowadzamy zakup na Twoje konto, to potrwa jeszcze chwilę.
                            </Text>
                        </Message>
                        {order && <Amount>{order.description}: {formatCents(order.amountCents)}</Amount>}
                    </>
                )}

                {state === 'fulfilled' && (
                    <>
                        <IconCircle $bg="#d1fae5"><CheckIcon /></IconCircle>
                        <Message role="status">
                            <Title>Płatność zakończona, zmiany są aktywne</Title>
                            <Text>
                                {order?.typeDisplayName}: {order?.description}. Twoje konto zostało
                                zaktualizowane, możesz wrócić do pracy.
                            </Text>
                        </Message>
                        {order && <Amount>{formatCents(order.amountCents)}</Amount>}
                        <Actions>
                            <Button variant="primary" size="lg" block onClick={goToApp}>Przejdź do aplikacji</Button>
                        </Actions>
                    </>
                )}

                {state === 'failed' && (
                    <>
                        <IconCircle $bg="#fee2e2"><CrossIcon /></IconCircle>
                        <Message role="alert">
                            <Title>Płatność nie powiodła się</Title>
                            <Text>{order?.failureReason ?? 'Transakcja została odrzucona lub anulowana.'}</Text>
                            <Text>Żadna kwota nie została pobrana, możesz spróbować ponownie.</Text>
                        </Message>
                        <Actions>
                            <Button variant="primary" size="lg" block onClick={goToApp}>Wróć do ustawień</Button>
                        </Actions>
                    </>
                )}

                {state === 'refund' && (
                    <>
                        <IconCircle $bg="#fef3c7"><AlertIcon /></IconCircle>
                        <Message role="alert">
                            <Title>Płatność przyjęta, ale zakupu nie udało się wprowadzić</Title>
                            <Text>
                                Pobraliśmy {order ? formatCents(order.amountCents) : 'kwotę'}, ale tego zakupu nie dało się
                                dodać do Twojego konta. Zwrócimy pieniądze, nie musisz nic robić. W razie pytań napisz
                                do nas: pomoc@detailboost.pl, podając numer zamówienia {order?.orderId ?? orderId}.
                            </Text>
                            {order?.failureReason && <Reason>Powód: {order.failureReason}</Reason>}
                        </Message>
                        <Actions>
                            <Button variant="primary" size="lg" block onClick={goToApp}>Wróć do ustawień</Button>
                        </Actions>
                    </>
                )}

                {state === 'timeout' && (
                    <>
                        <IconCircle $bg="#fef3c7"><Spinner /></IconCircle>
                        <Message role="status">
                            <Title>Płatność wciąż jest przetwarzana</Title>
                            <Text>
                                Nie otrzymaliśmy jeszcze potwierdzenia z Przelewy24. Jeśli środki zostały
                                pobrane, dostęp zostanie aktywowany automatycznie w ciągu kilku minut.
                            </Text>
                        </Message>
                        <Actions>
                            <Button variant="primary" size="lg" block onClick={goToApp}>Wróć do aplikacji</Button>
                        </Actions>
                    </>
                )}

                {state === 'activation-timeout' && (
                    <>
                        <IconCircle $bg="#fef3c7"><Spinner /></IconCircle>
                        <Message role="status">
                            <Title>Płatność przyjęta, aktywacja trwa dłużej niż zwykle</Title>
                            <Text>
                                Wpłata jest potwierdzona, nie płać drugi raz. Zmiany pojawią się na koncie
                                automatycznie. Odśwież tę stronę za chwilę, żeby sprawdzić stan zamówienia.
                            </Text>
                        </Message>
                        {order && <Amount>{order.description}: {formatCents(order.amountCents)}</Amount>}
                        <Actions>
                            <Button variant="primary" size="lg" block onClick={reload}>Odśwież stan zamówienia</Button>
                            <Button variant="ghost" size="md" block onClick={goToApp}>Wróć do aplikacji</Button>
                        </Actions>
                    </>
                )}

                {state === 'missing' && (
                    <>
                        <IconCircle $bg="#fee2e2"><CrossIcon /></IconCircle>
                        <Message role="alert">
                            <Title>Brak identyfikatora zamówienia</Title>
                            <Text>Ten adres jest niekompletny. Wróć do aplikacji i spróbuj ponownie.</Text>
                        </Message>
                        <Actions>
                            <Button variant="primary" size="lg" block onClick={goToApp}>Wróć do aplikacji</Button>
                        </Actions>
                    </>
                )}
            </Card>
        </Wrap>
    );
}
