import styled from 'styled-components';
import { Link } from 'react-router-dom';

// ─── Dark Sidebar Tokens ──────────────────────────────────────────────────────
const S = {
    bg:           '#0f172a',
    bgHover:      'rgba(255, 255, 255, 0.05)',
    bgActive:     'rgba(14, 165, 233, 0.11)',
    border:       'rgba(255, 255, 255, 0.07)',
    text:         '#64748b',
    textHover:    '#94a3b8',
    textActive:   '#e2e8f0',
    iconActive:   '#38bdf8',
    accent:       '#0ea5e9',
    sectionLabel: '#2d3f55',
} as const;

// ─── Overlay ──────────────────────────────────────────────────────────────────

export const Overlay = styled.div<{ $isVisible: boolean }>`
    display: none;

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        display: ${p => p.$isVisible ? 'block' : 'none'};
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(4px);
        z-index: 999;
        animation: fadeIn 220ms ease;

        @keyframes fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
    }
`;

// ─── Sidebar Container ────────────────────────────────────────────────────────

export const SidebarContainer = styled.aside<{ $isCollapsed: boolean; $isMobileOpen: boolean }>`
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    background-color: ${S.bg};
    z-index: 1000;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    /* Subtle right shadow to separate from content */
    box-shadow: 1px 0 0 0 ${S.border}, 4px 0 24px rgba(0, 0, 0, 0.25);

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        width: ${p => p.$isCollapsed ? '64px' : '248px'};
        transition: width 260ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        width: 272px;
        transform: ${p => p.$isMobileOpen ? 'translateX(0)' : 'translateX(-100%)'};
        transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
`;

// ─── Header ───────────────────────────────────────────────────────────────────

export const SidebarHeader = styled.div<{ $isCollapsed: boolean }>`
    height: 60px;
    padding: 0 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    border-bottom: 1px solid ${S.border};

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        padding: 0 ${p => p.$isCollapsed ? '14px' : '14px'};
        justify-content: ${p => p.$isCollapsed ? 'center' : 'space-between'};
    }
`;

export const Logo = styled.div<{ $isCollapsed: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    overflow: hidden;
    flex: 1;
    min-width: 0;
`;

export const LogoIcon = styled.div`
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.5px;
    flex-shrink: 0;
    box-shadow: 0 2px 10px rgba(14, 165, 233, 0.4), inset 0 1px 0 rgba(255,255,255,0.2);
`;

export const LogoText = styled.span<{ $isCollapsed: boolean }>`
    color: #f1f5f9;
    font-size: 14.5px;
    font-weight: 600;
    letter-spacing: -0.2px;
    white-space: nowrap;
    overflow: hidden;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        opacity: ${p => p.$isCollapsed ? 0 : 1};
        max-width: ${p => p.$isCollapsed ? '0px' : '140px'};
        transition: opacity 220ms ease, max-width 260ms cubic-bezier(0.4, 0, 0.2, 1);
    }
`;

export const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
`;

export const CollapseButton = styled.button<{ $isCollapsed: boolean }>`
    width: 28px;
    height: 28px;
    padding: 0;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid ${S.border};
    border-radius: 7px;
    color: ${S.text};
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    transition: all 150ms ease;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        display: ${p => p.$isCollapsed ? 'none' : 'flex'};
    }

    svg { width: 14px; height: 14px; }

    &:hover {
        background: rgba(255, 255, 255, 0.09);
        color: ${S.textHover};
    }
`;

export const CloseButton = styled.button`
    width: 28px;
    height: 28px;
    padding: 0;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid ${S.border};
    border-radius: 7px;
    color: ${S.text};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 150ms ease;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        display: none;
    }

    svg { width: 14px; height: 14px; }

    &:hover {
        background: rgba(255, 255, 255, 0.09);
        color: ${S.textHover};
    }
`;

// ─── Menu ─────────────────────────────────────────────────────────────────────

export const MenuContainer = styled.nav`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px 8px;

    &::-webkit-scrollbar { width: 3px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 2px;
    }
`;

export const MenuSection = styled.div`
    padding: 14px 0 2px;

    &:first-child { padding-top: 6px; }
`;

export const MenuSectionTitle = styled.div<{ $isCollapsed: boolean }>`
    padding: 0 10px 5px;
    color: ${S.sectionLabel};
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    white-space: nowrap;
    overflow: hidden;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        opacity: ${p => p.$isCollapsed ? 0 : 1};
        max-height: ${p => p.$isCollapsed ? '0px' : '24px'};
        padding-bottom: ${p => p.$isCollapsed ? '0' : '5px'};
        transition: opacity 200ms ease, max-height 260ms ease, padding-bottom 260ms ease;
    }
`;

// ─── Menu Item ────────────────────────────────────────────────────────────────

export const MenuItemLink = styled(Link)<{ $isActive: boolean; $isCollapsed: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    margin-bottom: 1px;
    color: ${p => p.$isActive ? S.textActive : S.text};
    text-decoration: none;
    border-radius: 8px;
    transition: background-color 140ms ease, color 140ms ease;
    position: relative;
    cursor: pointer;
    background-color: ${p => p.$isActive ? S.bgActive : 'transparent'};
    font-size: 13.5px;
    font-weight: ${p => p.$isActive ? 500 : 400};
    white-space: nowrap;
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
    user-select: none;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        justify-content: ${p => p.$isCollapsed ? 'center' : 'flex-start'};
    }

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        padding: 10px 12px;
        font-size: 14px;
        margin-bottom: 2px;
    }

    /* Left accent indicator */
    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 18%;
        height: 64%;
        width: 3px;
        background: ${S.accent};
        border-radius: 0 3px 3px 0;
        opacity: ${p => p.$isActive ? 1 : 0};
        transition: opacity 140ms ease;
    }

    &:hover {
        background-color: ${p => p.$isActive ? S.bgActive : S.bgHover};
        color: ${p => p.$isActive ? S.textActive : S.textHover};
    }
`;

export const MenuItemIcon = styled.span<{ $isActive: boolean }>`
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: ${p => p.$isActive ? S.iconActive : S.text};
    transition: color 140ms ease;

    svg { width: 16px; height: 16px; stroke-width: 1.75; }
`;

export const MenuItemText = styled.span<{ $isCollapsed: boolean }>`
    font-size: 13.5px;
    white-space: nowrap;
    overflow: hidden;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        opacity: ${p => p.$isCollapsed ? 0 : 1};
        max-width: ${p => p.$isCollapsed ? '0px' : '160px'};
        transition: opacity 200ms ease, max-width 260ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        font-size: 14px;
    }
`;

export const MenuItemBadge = styled.span<{ $isCollapsed: boolean }>`
    margin-left: auto;
    padding: 2px 7px;
    background: #ef4444;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 700;
    color: white;
    line-height: 1.5;
    flex-shrink: 0;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        display: ${p => p.$isCollapsed ? 'none' : 'block'};
    }
`;

// ─── Footer ───────────────────────────────────────────────────────────────────

export const SidebarFooter = styled.div<{ $isCollapsed: boolean }>`
    padding: 10px 8px;
    border-top: 1px solid ${S.border};
    flex-shrink: 0;
`;

export const VersionRow = styled.div<{ $isCollapsed: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 8px;
    overflow: hidden;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        justify-content: ${p => p.$isCollapsed ? 'center' : 'flex-start'};
    }
`;

export const StatusDot = styled.div`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #22c55e;
    flex-shrink: 0;
    box-shadow: 0 0 0 2.5px rgba(34, 197, 94, 0.2);
`;

export const VersionText = styled.span<{ $isCollapsed: boolean }>`
    font-size: 11px;
    color: #374151;
    white-space: nowrap;
    overflow: hidden;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        opacity: ${p => p.$isCollapsed ? 0 : 1};
        max-width: ${p => p.$isCollapsed ? '0px' : '120px'};
        transition: opacity 200ms ease, max-width 260ms ease;
    }
`;

// ─── Expand / Mobile Buttons ──────────────────────────────────────────────────

export const ExpandButton = styled.button`
    position: absolute;
    right: -13px;
    top: 68px;
    width: 26px;
    height: 26px;
    padding: 0;
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 50%;
    color: ${S.text};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 150ms ease;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);

    svg { width: 13px; height: 13px; }

    @media (max-width: ${p => p.theme.breakpoints.md}) { display: none; }

    &:hover {
        background: #334155;
        color: ${S.textHover};
    }
`;

export const MobileMenuButton = styled.button`
    position: fixed;
    top: 14px;
    left: 14px;
    width: 42px;
    height: 42px;
    padding: 0;
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    color: ${S.textHover};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 998;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    transition: all 150ms ease;

    svg { width: 18px; height: 18px; }

    @media (min-width: ${p => p.theme.breakpoints.md}) { display: none; }

    &:active {
        opacity: 0.8;
        transform: scale(0.95);
    }
`;
