// src/common/components/ui/SideDrawer.tsx
//
// Panel boczny edycji: lista zostaje widoczna obok, a nagłówek panelu mówi, czego
// dotyczy (status, nazwa, kontekst), zanim ktokolwiek zacznie pisać.
//
// Blokada przewijania tła, Escape i chowanie dolnych pasków na telefonie idą przez
// useModalViewport - te same co w każdym oknie aplikacji (CLAUDE.md §3). Pytanie
// o niezapisane zmiany zostaje po stronie wywołującego: tylko on wie, co jest
// „brudne", więc przekazuje tu `onClose`, które najpierw pyta.

import { useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { X } from 'lucide-react';
import { useModalViewport } from '@/common/hooks';
import { IconButton } from './IconButton';
import { ui } from './tokens';

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const slideIn = keyframes`from { transform: translateX(32px); opacity: 0; } to { transform: none; opacity: 1; }`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    justify-content: flex-end;
    background: rgba(15, 23, 42, 0.32);
    animation: ${fadeIn} 160ms ease;
`;

const Panel = styled.aside<{ $width: number }>`
    display: flex;
    flex-direction: column;
    width: min(${p => p.$width}px, 100%);
    height: 100%;
    background: ${ui.surface};
    box-shadow: -16px 0 40px rgba(15, 23, 42, 0.14);
    animation: ${slideIn} 220ms cubic-bezier(0.22, 1, 0.36, 1);
`;

const Header = styled.header`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px 16px 24px;
    border-bottom: 1px solid ${ui.lineSoft};

    @media (max-width: 639px) { padding: calc(14px + env(safe-area-inset-top)) 12px 14px 16px; }
`;

const HeaderText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

export const DrawerMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 13px;
    color: ${ui.textMuted};
`;

const Title = styled.h2`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin: 0;
    font-size: 21px;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: ${ui.ink};
`;

export const DrawerBody = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 20px 24px 28px;

    @media (max-width: 639px) { padding: 16px 16px 24px; }
`;

const Footer = styled.footer`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 24px;
    border-top: 1px solid ${ui.lineSoft};
    background: ${ui.surface};

    @media (max-width: 639px) { padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); }
`;

/** Odpycha resztę stopki w prawo: „Usuń" po lewej, „Anuluj / Zapisz" po prawej. */
export const DrawerFooterSpacer = styled.span`
    margin-left: auto;
`;

interface Props {
    /** Zamknięcie z krzyżyka, tła i Escape - wywołujący sam pyta o niezapisane zmiany. */
    onClose: () => void;
    /** false, gdy nad panelem stoi okno potwierdzenia: Escape należy wtedy do niego. */
    escapeEnabled?: boolean;
    title: ReactNode;
    titleId: string;
    /** Linia nad tytułem: plakietka stanu, data. */
    status?: ReactNode;
    /** Linia pod tytułem: kontekst („Wizyta VIS-2026-00412", nazwa kontrahenta). */
    subtitle?: ReactNode;
    footer?: ReactNode;
    width?: number;
    /** Ciało panelu - zwykle <DrawerBody>, żeby wywołujący mógł trzymać do niego ref. */
    children: ReactNode;
    /** Okna potwierdzeń, które mają stać nad panelem. */
    overlays?: ReactNode;
}

export function SideDrawer({
    onClose, escapeEnabled = true, title, titleId, status, subtitle, footer, width = 560, children, overlays,
}: Props) {
    const overlayRef = useRef<HTMLDivElement>(null);
    useModalViewport(true, overlayRef, escapeEnabled ? onClose : undefined);

    return createPortal(
        <Overlay
            ref={overlayRef}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <Panel role="dialog" aria-modal="true" aria-labelledby={titleId} $width={width}>
                <Header>
                    <HeaderText>
                        {status && <DrawerMeta>{status}</DrawerMeta>}
                        <Title id={titleId}>{title}</Title>
                        {subtitle && <DrawerMeta>{subtitle}</DrawerMeta>}
                    </HeaderText>
                    <IconButton label="Zamknij" size="lg" onClick={onClose}><X /></IconButton>
                </Header>
                {children}
                {footer && <Footer>{footer}</Footer>}
            </Panel>
            {overlays}
        </Overlay>,
        document.body,
    );
}
