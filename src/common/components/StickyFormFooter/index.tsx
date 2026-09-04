// src/common/components/StickyFormFooter/index.tsx
//
// Wspólna, przyklejona stopka akcji dla pełnoekranowych formularzy (kreator
// check-inu, edycja rezerwacji). Wcześniej każdy widok miał własną kopię
// stopki i własne przyciski, przez co te same akcje wyglądały inaczej w
// zależności od ekranu. Stylistyka pochodzi z kreatora check-inu.

import React from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
// Import wprost z modułu ze stałymi, nie z barrela @/widgets/BottomNav -
// barrel reeksportuje też sam komponent BottomNav (a z nim @/modules/comms,
// uprawnienia itd.), co wciąga ten podgraf do zwykłego komponentu UI i potrafi
// zamknąć cykl importów ("Cannot access 'BOTTOM_NAV_SPACE' before initialization").
import { BOTTOM_NAV_SPACE } from '@/widgets/BottomNav/constants';

const FooterShell = styled.footer<{ $sidebarWidth: number }>`
    position: fixed;
    bottom: 0;
    left: ${p => p.$sidebarWidth}px;
    right: 0;
    background: ${st.bgCard};
    border-top: 1px solid ${st.border};
    box-shadow: 0 -4px 24px rgba(15, 23, 42, 0.08);
    z-index: 50;
    transition: left 0.2s ease;

    @media (max-width: 768px) {
        left: 0;
        /* Ponad dolnym paskiem nawigacji – przyciski muszą zostać klikalne. */
        bottom: ${BOTTOM_NAV_SPACE};
    }
`;

const FooterInner = styled.div`
    max-width: 1100px;
    margin: 0 auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;

    @media (min-width: 640px) {
        padding: 14px 24px;
        gap: 10px;
    }

    @media (min-width: 768px) {
        padding: 16px 40px;
        flex-direction: row;
        align-items: center;
        gap: 16px;
    }
`;

const FooterActions = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
    margin-left: auto;
    flex-wrap: wrap;

    @media (max-width: 767px) {
        margin-left: 0;
        width: 100%;
    }
`;

/** Akcja drugorzędna: „Wstecz”, „Anuluj”. */
export const FooterSecondaryButton = styled.button`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 18px;
    background: ${st.bgCard};
    color: ${st.textSecondary};
    border: 1.5px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover {
        border-color: ${st.borderHover};
        color: ${st.text};
        background: ${st.bgCardAlt};
    }

    svg {
        width: 14px;
        height: 14px;
    }

    @media (max-width: 767px) {
        flex: 1;
    }
`;

/** Akcja główna: „Dalej”, „Zapisz zmiany”. */
export const FooterPrimaryButton = styled.button<{ $disabled?: boolean }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 22px;
    background: ${props => props.$disabled ? '#94A3B8' : st.accentBlue};
    color: #fff;
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
    transition: all ${st.transition};
    white-space: nowrap;
    box-shadow: ${props => props.$disabled ? 'none' : '0 1px 4px rgba(37, 99, 235, 0.25)'};

    &:hover:not(:disabled) {
        background: #1D4ED8;
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }

    &:disabled {
        cursor: not-allowed;
    }

    svg {
        width: 14px;
        height: 14px;
    }

    @media (max-width: 767px) {
        flex: 1;
    }
`;

interface StickyFormFooterProps {
    /**
     * Lewa strona stopki - podpowiedź kroku, komunikat walidacji, błąd zapisu.
     * Bez niej przyciski i tak lądują po prawej (FooterActions ma margin-left:auto).
     */
    children?: React.ReactNode;
    /** Prawa strona stopki: przyciski akcji. */
    actions: React.ReactNode;
}

export const StickyFormFooter = ({ children, actions }: StickyFormFooterProps) => {
    const { isCollapsed } = useSidebar();
    const sidebarWidth = isCollapsed ? 64 : 240;

    return (
        <FooterShell $sidebarWidth={sidebarWidth}>
            <FooterInner>
                {children}
                <FooterActions>{actions}</FooterActions>
            </FooterInner>
        </FooterShell>
    );
};
