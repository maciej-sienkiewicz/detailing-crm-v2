import styled from 'styled-components';
import { Link } from 'react-router-dom';

// ─── Dark Sidebar Tokens ──────────────────────────────────────────────────────
const S = {
    bg:           '#0f172a',
    bgHover:      'rgba(255, 255, 255, 0.04)',
    bgActive:     'rgba(14, 165, 233, 0.11)',
    border:       'rgba(255, 255, 255, 0.07)',
    text:         '#cbd5e1',
    textHover:    '#f1f5f9',
    textActive:   '#38bdf8',
    iconActive:   '#38bdf8',
    accent:       '#0ea5e9',
    sectionLabel: '#64748b',
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
        z-index: 99;
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
    z-index: 100;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08);

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
    padding: 20px 16px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    border-bottom: 1px solid ${S.border};

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        padding: ${p => p.$isCollapsed ? '18px 14px' : '20px 16px 18px'};
        justify-content: ${p => p.$isCollapsed ? 'center' : 'space-between'};
    }
`;

export const Logo = styled.div<{ $isCollapsed: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    overflow: hidden;
    flex: 1;
    min-width: 0;
`;

export const LogoIcon = styled.div`
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.5px;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.35);
`;

export const LogoText = styled.span<{ $isCollapsed: boolean }>`
    color: #f1f5f9;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.3px;
    white-space: nowrap;
    overflow: hidden;
    line-height: 1.1;
    display: block;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        opacity: ${p => p.$isCollapsed ? 0 : 1};
        max-width: ${p => p.$isCollapsed ? '0px' : '160px'};
        transition: opacity 220ms ease, max-width 260ms cubic-bezier(0.4, 0, 0.2, 1);
    }
`;

export const LogoSub = styled.span<{ $isCollapsed: boolean }>`
    color: #64748b;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.02em;
    white-space: nowrap;
    overflow: hidden;
    display: block;
    margin-top: 2px;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        opacity: ${p => p.$isCollapsed ? 0 : 1};
        max-width: ${p => p.$isCollapsed ? '0px' : '160px'};
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
    color: ${S.sectionLabel};
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
    color: ${S.sectionLabel};
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

// ─── SMS Credits Widget ───────────────────────────────────────────────────────

export const SmsCreditsWidget = styled.div<{ $isCollapsed: boolean }>`
    margin: 0 8px;
    padding: 10px 12px;
    background: rgba(14, 165, 233, 0.08);
    border: 1px solid rgba(14, 165, 233, 0.18);
    border-radius: 10px;
    flex-shrink: 0;
    overflow: hidden;
    cursor: pointer;
    transition: all 260ms cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        background: rgba(14, 165, 233, 0.15);
        border-color: rgba(14, 165, 233, 0.35);
    }

    &:active {
        background: rgba(14, 165, 233, 0.22);
    }

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        padding: ${p => p.$isCollapsed ? '10px 0' : '10px 12px'};
        margin: ${p => p.$isCollapsed ? '0 auto' : '0 8px'};
        width: ${p => p.$isCollapsed ? '40px' : 'auto'};
        display: flex;
        align-items: center;
        justify-content: ${p => p.$isCollapsed ? 'center' : 'flex-start'};
        gap: ${p => p.$isCollapsed ? '0' : '10px'};
    }
`;

export const SmsCreditsIcon = styled.div`
    width: 28px;
    height: 28px;
    background: rgba(14, 165, 233, 0.15);
    border-radius: 7px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #38bdf8;
    flex-shrink: 0;

    svg { width: 14px; height: 14px; }
`;

export const SmsCreditsInfo = styled.div<{ $isCollapsed: boolean }>`
    overflow: hidden;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        opacity: ${p => p.$isCollapsed ? 0 : 1};
        max-width: ${p => p.$isCollapsed ? '0px' : '160px'};
        transition: opacity 200ms ease, max-width 260ms cubic-bezier(0.4, 0, 0.2, 1);
    }
`;

export const SmsCreditsLabel = styled.div`
    font-size: 10px;
    font-weight: 600;
    color: ${S.sectionLabel};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
`;

export const SmsCreditsValue = styled.div<{ $isEmpty?: boolean }>`
    font-size: ${p => p.$isEmpty ? '11px' : '15px'};
    font-weight: 800;
    color: ${p => p.$isEmpty ? '#8c8b8b' : '#38bdf8'};
    line-height: 1.2;
    white-space: nowrap;
    letter-spacing: -0.3px;
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
    padding: 0 12px 4px;
    color: ${S.sectionLabel};
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
    overflow: hidden;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        opacity: ${p => p.$isCollapsed ? 0 : 1};
        max-height: ${p => p.$isCollapsed ? '0px' : '24px'};
        padding-bottom: ${p => p.$isCollapsed ? '0' : '4px'};
        transition: opacity 200ms ease, max-height 260ms ease, padding-bottom 260ms ease;
    }
`;

// ─── Menu Item ────────────────────────────────────────────────────────────────

export const MenuItemLink = styled(Link)<{ $isActive: boolean; $isCollapsed: boolean }>`
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 9px 12px;
    margin-bottom: 1px;
    color: ${p => p.$isActive ? S.textActive : S.text};
    text-decoration: none;
    border-radius: 10px;
    transition: background-color 180ms ease, color 180ms ease;
    position: relative;
    cursor: pointer;
    background-color: ${p => p.$isActive ? S.bgActive : 'transparent'};
    font-size: 13px;
    font-weight: ${p => p.$isActive ? 600 : 500};
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

    /* Left accent indicator — sits at the container's left edge */
    &::before {
        content: '';
        position: absolute;
        left: -8px;
        top: 50%;
        transform: translateY(-50%);
        height: 22px;
        width: 3px;
        background: ${S.accent};
        border-radius: 0 3px 3px 0;
        opacity: ${p => p.$isActive ? 1 : 0};
        transition: opacity 180ms ease;
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
    transition: color 180ms ease;

    svg { width: 17px; height: 17px; stroke-width: 1.75; }
`;

export const MenuItemText = styled.span<{ $isCollapsed: boolean }>`
    font-size: 13px;
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

export const MenuItemBadge = styled.span<{ $isCollapsed: boolean; $isActive?: boolean }>`
    margin-left: auto;
    padding: 2px 7px;
    background: ${p => p.$isActive ? 'rgba(14, 165, 233, 0.25)' : 'rgba(239, 68, 68, 0.22)'};
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 700;
    color: ${p => p.$isActive ? '#7dd3fc' : '#fca5a5'};
    line-height: 1.5;
    flex-shrink: 0;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        display: ${p => p.$isCollapsed ? 'none' : 'inline-block'};
    }
`;

// ─── User Profile Footer ───────────────────────────────────────────────────────

export const UserProfile = styled.div<{ $isCollapsed: boolean }>`
    padding: 12px;
    border-top: 1px solid ${S.border};
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    overflow: hidden;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        justify-content: ${p => p.$isCollapsed ? 'center' : 'flex-start'};
    }
`;

export const UserAvatar = styled.div`
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, #10b981, #0ea5e9);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: -0.3px;
    flex-shrink: 0;
    user-select: none;
`;

export const UserInfo = styled.div<{ $isCollapsed: boolean }>`
    flex: 1;
    min-width: 0;
    overflow: hidden;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        opacity: ${p => p.$isCollapsed ? 0 : 1};
        max-width: ${p => p.$isCollapsed ? '0px' : '120px'};
        transition: opacity 200ms ease, max-width 260ms cubic-bezier(0.4, 0, 0.2, 1);
    }
`;

export const UserName = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #f1f5f9;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const UserRole = styled.div`
    font-size: 11px;
    color: ${S.sectionLabel};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
`;

export const UserLogoutButton = styled.button<{ $isCollapsed: boolean }>`
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 150ms ease;
    margin-left: auto;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        display: ${p => p.$isCollapsed ? 'none' : 'flex'};
    }

    svg { width: 14px; height: 14px; stroke-width: 1.75; }

    &:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #f1f5f9;
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
    color: ${S.sectionLabel};
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
    color: #94a3b8;
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
