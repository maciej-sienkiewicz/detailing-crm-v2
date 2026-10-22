// src/common/components/PhonePage/PhonePage.tsx
//
// Wspólny wygląd stron telefonu otwieranych z kodu QR albo skrótu (skaner produktów,
// import kontaktów, notatki głosowe). Ten sam jasny motyw i ten sam głęboki błękit co
// aplikacja i strona zdjęć (/m/upload), jeden nagłówek i jeden zestaw ekranów końcowych:
// zielony „gotowe", szary „zakończono na komputerze", czerwony „link nieważny".
//
// Strony działają bez ThemeProvidera i bez logowania, więc kolory biorą wprost z `ui`.

import type { ReactNode } from 'react';
import styled from 'styled-components';
import { ui } from '@/common/components/ui/tokens';

export const PhonePage = styled.main`
    min-height: 100vh;
    min-height: 100dvh;
    box-sizing: border-box;
    background: ${ui.bg};
    color: ${ui.ink};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: max(16px, env(safe-area-inset-top, 0px)) 16px max(28px, env(safe-area-inset-bottom, 0px));
    display: flex;
    flex-direction: column;
    gap: 14px;

    > * { width: 100%; max-width: 480px; margin-left: auto; margin-right: auto; }
`;

const HeaderWrap = styled.header`
    padding: 8px 2px 4px;
`;

const Eyebrow = styled.div`
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${ui.textMuted};
`;

const HeaderTitle = styled.h1`
    margin: 0;
    font-size: 24px;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${ui.ink};
`;

const HeaderSub = styled.p`
    margin: 6px 0 0;
    font-size: 15px;
    line-height: 1.5;
    color: ${ui.textSecondary};
`;

/** Studio (albo DetailBoost), tytuł i jedno zdanie, co tu zrobić. */
export const PhoneHeader = ({ eyebrow, title, children }: { eyebrow?: string | null; title: string; children?: ReactNode }) => (
    <HeaderWrap>
        <Eyebrow>{eyebrow || 'DetailBoost'}</Eyebrow>
        <HeaderTitle>{title}</HeaderTitle>
        {children && <HeaderSub>{children}</HeaderSub>}
    </HeaderWrap>
);

export const PhoneCard = styled.section`
    background: ${ui.surface};
    border: 1px solid ${ui.line};
    border-radius: 16px;
    padding: 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

export const PhoneText = styled.p`
    margin: 0;
    font-size: 14px;
    line-height: 1.55;
    color: ${ui.textSecondary};
`;

type Tone = 'ok' | 'warn' | 'danger' | 'info';

const toneColors: Record<Tone, { fg: string; bg: string; line: string }> = {
    ok: { fg: ui.okInk, bg: ui.okTint, line: ui.okLine },
    warn: { fg: ui.warnInk, bg: ui.warnTint, line: ui.warnLine },
    danger: { fg: ui.dangerInk, bg: ui.dangerTint, line: ui.dangerLine },
    info: { fg: ui.brandInk, bg: ui.brandTint, line: ui.brandLineSoft },
};

/** Krótki komunikat w treści (wysłano, brak sieci, błąd). */
export const PhoneNote = styled.div<{ $tone: Tone }>`
    padding: 11px 14px;
    border-radius: 12px;
    font-size: 14px;
    line-height: 1.5;
    font-weight: 500;
    color: ${p => toneColors[p.$tone].fg};
    background: ${p => toneColors[p.$tone].bg};
    border: 1px solid ${p => toneColors[p.$tone].line};
`;

const buttonBase = `
    width: 100%;
    box-sizing: border-box;
    padding: 15px 16px;
    border-radius: 14px;
    font-family: inherit;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: background 0.15s, transform 0.1s;

    &:active { transform: scale(0.98); }
    &:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }

    svg { width: 20px; height: 20px; flex-shrink: 0; }
`;

export const PhonePrimaryButton = styled.button`
    ${buttonBase}
    border: 1px solid ${ui.brand};
    background: ${ui.brand};
    color: #ffffff;
    box-shadow: 0 8px 20px -10px rgba(3, 105, 161, 0.7);

    &:active { background: ${ui.brandStrong}; }
`;

export const PhoneSecondaryButton = styled.button`
    ${buttonBase}
    border: 1px solid ${ui.line};
    background: ${ui.surface};
    color: ${ui.inkSoft};

    &:active { background: ${ui.surfaceAlt}; }
`;

const EndWrap = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 14px;
    padding: 24px 12px;
    min-height: 60vh;
`;

const EndIcon = styled.div<{ $tone: 'ok' | 'neutral' | 'danger' }>`
    width: 68px;
    height: 68px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${p => p.$tone === 'ok' ? ui.okTint : p.$tone === 'danger' ? ui.dangerTint : ui.surfaceAlt};
    color: ${p => p.$tone === 'ok' ? ui.okInk : p.$tone === 'danger' ? ui.dangerInk : ui.textSecondary};

    svg { width: 32px; height: 32px; }
`;

const EndTitle = styled.h2`
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${ui.ink};
`;

const EndText = styled.p`
    margin: 0;
    max-width: 320px;
    font-size: 15px;
    line-height: 1.6;
    color: ${ui.textSecondary};
`;

const EndActions = styled.div`
    width: 100%;
    max-width: 300px;
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const icons = {
    ok: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    neutral: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
    ),
    danger: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
};

interface EndScreenProps {
    /** ok - gotowe; neutral - zakończono na komputerze; danger - link nieważny. */
    tone: 'ok' | 'neutral' | 'danger';
    title: string;
    children: ReactNode;
    actions?: ReactNode;
}

/** Jedyny sposób, w jaki strona telefonu mówi „to koniec". */
export const PhoneEndScreen = ({ tone, title, children, actions }: EndScreenProps) => (
    <EndWrap role="status">
        <EndIcon $tone={tone}>{icons[tone]}</EndIcon>
        <EndTitle>{title}</EndTitle>
        <EndText>{children}</EndText>
        {actions && <EndActions>{actions}</EndActions>}
    </EndWrap>
);

export const PhoneSpinner = styled.div`
    width: 34px;
    height: 34px;
    border: 3px solid ${ui.line};
    border-top-color: ${ui.brand};
    border-radius: 50%;
    animation: phone-page-spin 0.8s linear infinite;

    @keyframes phone-page-spin { to { transform: rotate(360deg); } }
`;

export const PhoneLoading = ({ children }: { children: ReactNode }) => (
    <EndWrap role="status">
        <PhoneSpinner />
        <EndText>{children}</EndText>
    </EndWrap>
);
