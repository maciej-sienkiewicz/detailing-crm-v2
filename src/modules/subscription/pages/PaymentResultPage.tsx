import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useQueryClient } from '@tanstack/react-query';
import { newSubscriptionApi } from '../api/subscriptionApi';
import { invalidateSubscriptionData } from '../api/subscriptionQueries';
import { formatCents } from '../utils/formatters';
import type { PaymentOrder } from '../types';

/**
 * Landing page the buyer returns to from Przelewy24
 * (urlReturn = /payments/result?orderId={id}).
 *
 * The P24 webhook settles the order server-side, so this page only polls the
 * order status until it flips from PENDING to PAID/FAILED. It must be reachable
 * for EXPIRED studios — the route is registered without the SubscriptionGate.
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

const PrimaryBtn = styled.button`
    padding: 12px 24px;
    border-radius: 10px;
    border: none;
    background: #0ea5e9;
    color: white;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;

    &:hover { background: #0284c7; }
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

// ─── Component ────────────────────────────────────────────────────────────────

type ViewState = 'polling' | 'paid' | 'failed' | 'timeout' | 'missing';

export function PaymentResultPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const orderId = searchParams.get('orderId');

    const [state, setState] = useState<ViewState>(orderId ? 'polling' : 'missing');
    const [order, setOrder] = useState<PaymentOrder | null>(null);
    const startedAt = useRef(Date.now());

    useEffect(() => {
        if (!orderId) return;
        let cancelled = false;

        const poll = async () => {
            try {
                const result = await newSubscriptionApi.getOrder(orderId);
                if (cancelled) return;
                setOrder(result);

                if (result.status === 'PAID') {
                    invalidateSubscriptionData(queryClient);
                    setState('paid');
                    return;
                }
                if (result.status === 'FAILED' || result.status === 'CANCELLED') {
                    setState('failed');
                    return;
                }
            } catch {
                // transient error — keep polling until timeout
            }

            if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
                setState('timeout');
                return;
            }
            setTimeout(poll, POLL_INTERVAL_MS);
        };

        poll();
        return () => { cancelled = true; };
    }, [orderId, queryClient]);

    const goToApp = () => navigate('/settings', { replace: true });

    return (
        <Wrap>
            <Card>
                {state === 'polling' && (
                    <>
                        <Spinner />
                        <Title>Przetwarzamy Twoją płatność…</Title>
                        <Text>
                            Czekamy na potwierdzenie z Przelewy24. Zwykle trwa to kilka sekund —
                            nie zamykaj tej strony.
                        </Text>
                        {order && <Amount>{order.description} — {formatCents(order.amountCents)}</Amount>}
                    </>
                )}

                {state === 'paid' && (
                    <>
                        <IconCircle $bg="#d1fae5"><CheckIcon /></IconCircle>
                        <Title>Płatność zakończona pomyślnie</Title>
                        <Text>
                            {order?.typeDisplayName}: {order?.description}. Twoje konto zostało
                            zaktualizowane — możesz wrócić do pracy.
                        </Text>
                        {order && <Amount>{formatCents(order.amountCents)}</Amount>}
                        <PrimaryBtn onClick={goToApp}>Przejdź do aplikacji</PrimaryBtn>
                    </>
                )}

                {state === 'failed' && (
                    <>
                        <IconCircle $bg="#fee2e2"><CrossIcon /></IconCircle>
                        <Title>Płatność nie powiodła się</Title>
                        <Text>
                            {order?.failureReason ?? 'Transakcja została odrzucona lub anulowana. Żadna kwota nie została pobrana — możesz spróbować ponownie.'}
                        </Text>
                        <PrimaryBtn onClick={goToApp}>Wróć do ustawień</PrimaryBtn>
                    </>
                )}

                {state === 'timeout' && (
                    <>
                        <IconCircle $bg="#fef3c7"><Spinner /></IconCircle>
                        <Title>Płatność wciąż jest przetwarzana</Title>
                        <Text>
                            Nie otrzymaliśmy jeszcze potwierdzenia z Przelewy24. Jeśli środki zostały
                            pobrane, dostęp zostanie aktywowany automatycznie w ciągu kilku minut.
                        </Text>
                        <PrimaryBtn onClick={goToApp}>Wróć do aplikacji</PrimaryBtn>
                    </>
                )}

                {state === 'missing' && (
                    <>
                        <IconCircle $bg="#fee2e2"><CrossIcon /></IconCircle>
                        <Title>Brak identyfikatora zamówienia</Title>
                        <Text>Ten adres jest niekompletny. Wróć do aplikacji i spróbuj ponownie.</Text>
                        <PrimaryBtn onClick={goToApp}>Wróć do aplikacji</PrimaryBtn>
                    </>
                )}
            </Card>
        </Wrap>
    );
}
