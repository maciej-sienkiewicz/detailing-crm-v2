import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { Loader2 } from 'lucide-react';
import { ui } from '@/common/components/ui';
import { acquireScrollLock } from '@/common/utils/scrollLock';
import type { LoginRedirect } from '../../hooks/useAccounts';

/**
 * Okno „Przechodzę do Facebooka/Google" między kliknięciem „Połącz" a stroną logowania.
 *
 * Od kliknięcia do przejścia na stronę Meta mijało kilka sekund bez żadnego znaku życia:
 * użytkownik klikał ponownie, przechodził do innej zakładki albo zamykał kartę w połowie.
 * Okno zasłania cały CRM i połyka klawiaturę (także skróty 1-4 i litery), bo każda akcja
 * w tej chwili i tak przepadnie razem ze stroną. Nie ma przycisku zamknięcia - znika samo,
 * gdy żądanie się nie uda albo strona wróci przyciskiem „Wstecz".
 */

const COPY: Record<LoginRedirect, { title: string; text: string }> = {
    meta: {
        title: 'Przechodzę do Facebooka',
        text: 'Za chwilę otworzy się logowanie Meta. Zaloguj się kontem, które zarządza Instagramem studia.',
    },
    google: {
        title: 'Przechodzę do Google',
        text: 'Za chwilę otworzy się logowanie Google. Zaloguj się kontem, które zarządza wizytówką studia.',
    },
};

const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
    animation: ${fadeIn} 0.15s ease-out;
    cursor: progress;
`;

const Panel = styled.div`
    width: 100%;
    max-width: 380px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 28px 24px 24px;
    border-radius: 16px;
    background: ${ui.surface};
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.22), 0 2px 6px rgba(15, 23, 42, 0.08);
    text-align: center;
    outline: none;

    > svg {
        width: 36px;
        height: 36px;
        color: ${ui.brand};
        animation: ${spin} 0.9s linear infinite;
    }

    @media (prefers-reduced-motion: reduce) {
        > svg { animation-duration: 2.4s; }
    }
`;

const Title = styled.h2`
    margin: 6px 0 0;
    font-size: 17px;
    font-weight: 650;
    color: ${ui.ink};
`;

const Text = styled.p`
    margin: 0;
    font-size: 13.5px;
    line-height: 1.5;
    color: ${ui.textSecondary};
`;

interface Props {
    leavingFor: LoginRedirect | null;
}

export const LoginRedirectOverlay = ({ leavingFor }: Props) => {
    const open = Boolean(leavingFor);
    const panelRef = useRef<HTMLDivElement>(null);

    // Blokada przewijania tła w osobnym efekcie zależnym tylko od `open` (CLAUDE.md §3).
    useEffect(() => {
        if (!open) return;
        return acquireScrollLock();
    }, [open]);

    // Fokus zabrany z przycisku pod spodem, a każdy klawisz zatrzymany w fazie przechwytywania,
    // zanim dotrze do skrótów globalnych i do formularzy pod oknem.
    useEffect(() => {
        if (!open) return;
        panelRef.current?.focus();
        const swallow = (event: KeyboardEvent) => {
            // Skróty przeglądarki (odświeżenie, nowa karta) zostają - CRM i tak ich nie obsługuje.
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            event.preventDefault();
            event.stopPropagation();
        };
        window.addEventListener('keydown', swallow, true);
        return () => window.removeEventListener('keydown', swallow, true);
    }, [open]);

    if (!leavingFor) return null;
    const copy = COPY[leavingFor];

    return createPortal(
        <Backdrop>
            <Panel
                ref={panelRef}
                role="alertdialog"
                aria-modal="true"
                aria-busy="true"
                aria-labelledby="login-redirect-title"
                aria-describedby="login-redirect-text"
                tabIndex={-1}
            >
                <Loader2 aria-hidden="true" />
                <Title id="login-redirect-title">{copy.title}</Title>
                <Text id="login-redirect-text">{copy.text}</Text>
            </Panel>
        </Backdrop>,
        document.body,
    );
};
