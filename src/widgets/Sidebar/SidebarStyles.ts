import styled from 'styled-components';
import { Link } from 'react-router-dom';

export const Overlay = styled.div<{ $isVisible: boolean }>`
    display: none;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: ${props => props.$isVisible ? 'block' : 'none'};
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.4);
        z-index: 999;
        animation: fadeIn 200ms ease;

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    }
`;

export const SidebarContainer = styled.aside<{ $isCollapsed: boolean; $isMobileOpen: boolean }>`
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    background-color: #ffffff;
    border-right: 1px solid #e5e7eb;
    z-index: 1000;
    display: flex;
    flex-direction: column;

    /* Desktop */
    @media (min-width: ${props => props.theme.breakpoints.md}) {
        width: ${props => props.$isCollapsed ? '64px' : '240px'};
        transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Mobile */
    @media (max-width: ${props => props.theme.breakpoints.md}) {
        width: 280px;
        transform: ${props => props.$isMobileOpen ? 'translateX(0)' : 'translateX(-100%)'};
        transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: ${props => props.$isMobileOpen ? '2px 0 8px rgba(0, 0, 0, 0.1)' : 'none'};
    }
`;

export const SidebarHeader = styled.div<{ $isCollapsed: boolean }>`
    height: 64px;
    padding: 0 20px;
    border-bottom: 1px solid #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 0 ${props => props.$isCollapsed ? '16px' : '20px'};
        justify-content: ${props => props.$isCollapsed ? 'center' : 'space-between'};
    }
`;

export const Logo = styled.div<{ $isCollapsed: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    color: #111827;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
`;

export const LogoIcon = styled.div`
    width: 32px;
    height: 32px;
    background-color: #111827;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
    flex-shrink: 0;
`;

export const LogoText = styled.span<{ $isCollapsed: boolean }>`
    @media (min-width: ${props => props.theme.breakpoints.md}) {
        display: ${props => props.$isCollapsed ? 'none' : 'block'};
    }
`;

export const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

export const CollapseButton = styled.button<{ $isCollapsed: boolean }>`
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    color: #6b7280;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    transition: all 150ms ease;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        display: ${props => props.$isCollapsed ? 'none' : 'flex'};
    }

    &:hover {
        background-color: #f9fafb;
        border-color: #d1d5db;
        color: #374151;
    }

    &:active {
        background-color: #f3f4f6;
    }
`;

export const CloseButton = styled.button`
    width: 32px;
    height: 32px;
    padding: 0;
    background: transparent;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    color: #6b7280;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    transition: all 150ms ease;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        display: none;
    }

    &:hover {
        background-color: #f9fafb;
        border-color: #d1d5db;
        color: #374151;
    }

    &:active {
        background-color: #f3f4f6;
        transform: scale(0.95);
    }
`;

export const MenuContainer = styled.nav`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 8px;
    -webkit-overflow-scrolling: touch;

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        padding: 12px;
    }

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: #e5e7eb;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #d1d5db;
    }
`;

export const MenuSection = styled.div`
    padding: 16px 0 8px 0;

    &:first-child {
        padding-top: 8px;
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        padding: 20px 0 12px 0;

        &:first-child {
            padding-top: 12px;
        }
    }
`;

export const MenuSectionTitle = styled.div<{ $isCollapsed: boolean }>`
    padding: 0 12px 8px 12px;
    color: #9ca3af;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        display: ${props => props.$isCollapsed ? 'none' : 'block'};
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        font-size: 12px;
        padding: 0 16px 12px 16px;
    }
`;

export const MenuItemLink = styled(Link)<{ $isActive: boolean; $isCollapsed: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    margin-bottom: 2px;
    color: ${props => props.$isActive ? '#111827' : '#6b7280'};
    text-decoration: none;
    border-radius: 6px;
    transition: all 150ms ease;
    position: relative;
    cursor: pointer;
    background-color: ${props => props.$isActive ? '#f9fafb' : 'transparent'};
    font-size: 14px;
    font-weight: ${props => props.$isActive ? '500' : '400'};
    min-height: 44px;
    -webkit-tap-highlight-color: transparent;
    user-select: none;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        padding: 8px 12px;
        min-height: auto;
        justify-content: ${props => props.$isCollapsed ? 'center' : 'flex-start'};
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        padding: 12px 16px;
        font-size: 15px;
        margin-bottom: 4px;
    }

    &:hover {
        background-color: ${props => props.$isActive ? '#f3f4f6' : '#f9fafb'};
        color: #111827;
    }

    &:active {
        background-color: #f3f4f6;
        transform: scale(0.98);
    }
`;

export const MenuItemIcon = styled.span<{ $isActive: boolean }>`
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
    opacity: ${props => props.$isActive ? '1' : '0.6'};

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        width: 24px;
        height: 24px;
        font-size: 18px;
    }
`;

export const MenuItemText = styled.span<{ $isCollapsed: boolean }>`
    font-size: 14px;
    white-space: nowrap;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        display: ${props => props.$isCollapsed ? 'none' : 'block'};
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        font-size: 15px;
    }
`;

export const MenuItemBadge = styled.span<{ $isCollapsed: boolean }>`
    margin-left: auto;
    padding: 3px 8px;
    background-color: #ef4444;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    color: white;
    line-height: 1.2;
    min-width: 20px;
    text-align: center;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        display: ${props => props.$isCollapsed ? 'none' : 'block'};
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        font-size: 12px;
        padding: 4px 9px;
    }
`;

export const SidebarFooter = styled.div<{ $isCollapsed: boolean }>`
    padding: 16px 20px;
    border-top: 1px solid #f3f4f6;
    color: #9ca3af;
    font-size: 11px;
    flex-shrink: 0;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        display: ${props => props.$isCollapsed ? 'none' : 'block'};
    }

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        font-size: 12px;
    }
`;

export const ExpandButton = styled.button`
    position: absolute;
    right: -12px;
    top: 72px;
    width: 24px;
    height: 24px;
    padding: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 50%;
    color: #6b7280;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    transition: all 150ms ease;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);

    @media (max-width: ${props => props.theme.breakpoints.md}) {
        display: none;
    }

    &:hover {
        background-color: #f9fafb;
        border-color: #d1d5db;
        color: #374151;
    }

    &:active {
        background-color: #f3f4f6;
    }
`;

export const MobileMenuButton = styled.button`
    position: fixed;
    top: 16px;
    left: 16px;
    width: 44px;
    height: 44px;
    padding: 0;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    color: #374151;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    z-index: 998;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    transition: all 150ms ease;
    -webkit-tap-highlight-color: transparent;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        display: none;
    }

    &:active {
        background-color: #f9fafb;
        transform: scale(0.95);
    }
`;