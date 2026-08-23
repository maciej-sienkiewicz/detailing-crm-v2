import { Menu } from 'lucide-react';
import styled from 'styled-components';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { BOTTOM_NAV_HEIGHT } from './constants';

// Dolny pasek nawigacji – wyłącznie mobile. Zastępuje przyklejony do lewego
// górnego rogu hamburger: akcja jest ta sama (toggle menu bocznego), ale trafia
// w naturalny zasięg kciuka i nie zasłania treści na górze ekranu.
// Pasek chowa się, gdy menu boczne jest otwarte – wtedy nawigacją jest drawer,
// a zamyka się go przyciskiem X / overlayem / Escape (bez zmian w Sidebarze).
const Bar = styled.nav<{ $isHidden: boolean }>`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    /* Poniżej overlaya (99) i drawera (100) – pasek nie może przykryć menu. */
    z-index: 97;
    display: flex;
    align-items: stretch;
    justify-content: center;
    height: calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px));
    padding: 0 8px env(safe-area-inset-bottom, 0px);
    background: #0f172a;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.25);
    transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateY(${p => (p.$isHidden ? '100%' : '0')});

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        display: none;
    }
`;

const NavButton = styled.button`
    flex: 1;
    max-width: 220px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    height: ${BOTTOM_NAV_HEIGHT}px;
    padding: 0;
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 11px;
    font-weight: ${p => p.theme.fontWeights.medium};
    letter-spacing: 0.01em;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: color 150ms ease, transform 150ms ease;

    svg {
        width: 22px;
        height: 22px;
    }

    &[aria-expanded='true'] {
        color: #ffffff;
    }

    &:active {
        color: #ffffff;
        transform: scale(0.94);
    }
`;

export const BottomNav = () => {
    const { isMobileOpen, toggleMobileMenu } = useSidebar();

    return (
        <Bar $isHidden={isMobileOpen} aria-label="Nawigacja główna">
            <NavButton
                type="button"
                onClick={toggleMobileMenu}
                aria-expanded={isMobileOpen}
                aria-label="Otwórz menu"
            >
                <Menu aria-hidden="true" />
                Menu
            </NavButton>
        </Bar>
    );
};
