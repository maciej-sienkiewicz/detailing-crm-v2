import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';

/**
 * Click-to-Call handoff (/call?number=...&name=...).
 *
 * Opened by the Service Worker when the user taps the call notification.
 * It exists because a Service Worker cannot reach the dialer on its own:
 * Clients.openWindow() and WindowClient.navigate() reject any non-HTTP(S)
 * scheme, so `openWindow('tel:...')` fails silently and the tap looks dead.
 *
 * A normal document has no such restriction, so this page navigates to the
 * tel: URL as soon as it mounts. Browsers may still refuse that navigation
 * when they judge the page to lack user activation, which is why the big
 * button below is a plain anchor: tapping it is unambiguously a user gesture
 * and always opens the dialer.
 *
 * Deliberately public — no session required. The number travels in the URL
 * written by our own Service Worker, and gating this page behind the auth
 * check would risk bouncing the user to /login mid-handoff, losing the number
 * exactly when they are trying to place a call.
 */

const Screen = styled.main`
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    padding: 32px 24px;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    text-align: center;
`;

const Caller = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const Name = styled.p`
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: #f1f5f9;
`;

const Number = styled.p`
    margin: 0;
    font-size: 17px;
    font-weight: 500;
    color: rgba(148, 163, 184, 0.85);
    letter-spacing: 0.02em;
`;

const CallBtn = styled.a`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 18px 34px;
    border-radius: 999px;
    background: #16a34a;
    color: #ffffff;
    font-size: 17px;
    font-weight: 700;
    text-decoration: none;
    box-shadow: 0 8px 24px rgba(22, 163, 74, 0.35);

    svg { width: 20px; height: 20px; }
    &:active { transform: scale(0.98); }
`;

const Hint = styled.p`
    margin: 0;
    max-width: 300px;
    font-size: 13px;
    line-height: 1.6;
    color: rgba(148, 163, 184, 0.6);
`;

const PhoneIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.59 1.22h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
);

export const CallHandoffView = () => {
    const [params] = useSearchParams();
    const attempted = useRef(false);

    // The number arrives from our own Service Worker, but it lands here through
    // the URL bar, so it is sanitised like any other untrusted input: a tel:
    // URL may hold digits and a leading plus, nothing else.
    const number = (params.get('number') ?? '').replace(/[^+\d]/g, '');
    const name = params.get('name');
    const telUrl = `tel:${number}`;

    useEffect(() => {
        if (!number || attempted.current) return;
        attempted.current = true;
        window.location.href = telUrl;
    }, [number, telUrl]);

    if (!number) {
        return (
            <Screen>
                <Caller>
                    <Name>Brak numeru</Name>
                    <Hint>To okno otwiera się z powiadomienia o połączeniu. Wróć do CRM-a i kliknij numer ponownie.</Hint>
                </Caller>
            </Screen>
        );
    }

    return (
        <Screen>
            <Caller>
                <Name>{name || 'Połączenie'}</Name>
                <Number>{number}</Number>
            </Caller>

            <CallBtn href={telUrl}>
                <PhoneIcon />
                Zadzwoń
            </CallBtn>

            <Hint>Jeśli dialer nie otworzył się sam, dotknij przycisku powyżej.</Hint>
        </Screen>
    );
};
