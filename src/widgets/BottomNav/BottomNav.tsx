import { Calendar, FileText, Mail, Menu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { usePermissions, ANY_FINANCE } from '@/core/permissions';
import type { PermissionRequirement } from '@/core/permissions';
import { useUnreadMailCount } from '@/modules/comms';
import { BOTTOM_NAV_HEIGHT } from './constants';

// Dolny pasek nawigacji – wyłącznie mobile. Zamiast hamburgera przyklejonego
// do lewego górnego rogu: skróty do najczęstszych widoków w zasięgu kciuka
// plus wejście do pełnego menu bocznego. Jasny, półprzezroczysty – ma być tłem
// dla treści, nie osobnym ciężkim elementem interfejsu.
// Chowa się, gdy drawer jest otwarty: wtedy nawigacją jest samo menu boczne.
const Bar = styled.nav<{ $isHidden: boolean }>`
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    /* Poniżej overlaya (99) i drawera (100) – pasek nie może przykryć menu. */
    z-index: 97;
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    height: calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px));
    padding: 0 max(4px, env(safe-area-inset-left, 0px)) env(safe-area-inset-bottom, 0px)
        max(4px, env(safe-area-inset-right, 0px));
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(16px) saturate(1.4);
    -webkit-backdrop-filter: blur(16px) saturate(1.4);
    border-top: 1px solid ${p => p.theme.colors.border};
    box-shadow: 0 -2px 16px rgba(15, 23, 42, 0.06);
    transition: transform 240ms cubic-bezier(0.4, 0, 0.2, 1);
    transform: translateY(${p => (p.$isHidden ? '100%' : '0')});

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        display: none;
    }
`;

const Item = styled.button<{ $isActive?: boolean }>`
    position: relative;
    flex: 1;
    max-width: 168px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: ${BOTTOM_NAV_HEIGHT}px;
    padding: 0;
    background: none;
    border: none;
    color: ${p => (p.$isActive ? '#0ea5e9' : p.theme.colors.textSecondary)};
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: color 150ms ease;

    &:active {
        color: #0ea5e9;
    }
`;

// Ikona w miękkiej "pigułce": aktywna zakładka dostaje delikatne tło zamiast
// twardego podkreślenia – czytelne, a nie krzykliwe.
const IconWrap = styled.span<{ $isActive?: boolean }>`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 26px;
    border-radius: 13px;
    background: ${p => (p.$isActive ? 'rgba(14, 165, 233, 0.12)' : 'transparent')};
    transition: background 150ms ease;

    svg {
        width: 21px;
        height: 21px;
        stroke-width: ${p => (p.$isActive ? 2.2 : 1.9)};
    }
`;

const Label = styled.span<{ $isActive?: boolean }>`
    font-size: 10.5px;
    font-weight: ${p => (p.$isActive ? p.theme.fontWeights.semibold : p.theme.fontWeights.medium)};
    letter-spacing: 0.01em;
    line-height: 1;
`;

const Badge = styled.span`
    position: absolute;
    top: -3px;
    right: 4px;
    min-width: 15px;
    height: 15px;
    padding: 0 4px;
    border-radius: 8px;
    background: ${p => p.theme.colors.error};
    color: white;
    font-size: 9px;
    font-weight: ${p => p.theme.fontWeights.bold};
    line-height: 15px;
    text-align: center;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
`;

interface Shortcut {
    path: string;
    label: string;
    icon: LucideIcon;
    requires?: PermissionRequirement;
    badge?: number;
}

export const BottomNav = () => {
    const { isMobileOpen, toggleMobileMenu } = useSidebar();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { can } = usePermissions();
    const unreadMail = useUnreadMailCount({ enabled: can('LEADS_MANAGE') });

    const allShortcuts: Shortcut[] = [
        { path: '/calendar',      label: 'Kalendarz', icon: Calendar, requires: 'VISITS_VIEW' },
        { path: '/communication', label: 'Poczta',    icon: Mail,     requires: 'LEADS_MANAGE', badge: unreadMail },
        { path: '/finances',      label: 'Finanse',   icon: FileText, requires: ANY_FINANCE },
    ];
    const shortcuts = allShortcuts.filter(s => !s.requires || can(s.requires));

    return (
        <Bar $isHidden={isMobileOpen} aria-label="Nawigacja główna">
            <Item type="button" onClick={toggleMobileMenu} aria-expanded={isMobileOpen} aria-label="Otwórz pełne menu">
                <IconWrap>
                    <Menu aria-hidden="true" />
                </IconWrap>
                <Label>Menu</Label>
            </Item>
            {shortcuts.map(({ path, label, icon: Icon, badge }) => {
                const isActive = pathname === path || pathname.startsWith(`${path}/`);
                return (
                    <Item
                        key={path}
                        type="button"
                        onClick={() => navigate(path)}
                        $isActive={isActive}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <IconWrap $isActive={isActive}>
                            <Icon aria-hidden="true" />
                            {badge ? <Badge>{badge > 9 ? '9+' : badge}</Badge> : null}
                        </IconWrap>
                        <Label $isActive={isActive}>{label}</Label>
                    </Item>
                );
            })}
        </Bar>
    );
};
