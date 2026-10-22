import styled, { keyframes, css } from 'styled-components';
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
        /* Gest przewijania palcem po overlayu nie może pociągnąć treści pod nim
           – overlay łapie touch i wygasza go, zamiast pozwolić przeglądarce
           scrollować viewport. */
        touch-action: none;
        overscroll-behavior: contain;
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
    /* 100dvh adjusts dynamically when mobile browser chrome (address bar, bottom bar) shows/hides.
       100vh fallback for browsers that don't support dvh yet. */
    height: 100vh;
    height: 100dvh;
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
    position: relative;
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

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        /* Push header content below the status bar / notch on iOS */
        padding-top: max(20px, env(safe-area-inset-top, 20px));
    }
`;

/**
 * Logo DetailBoost na środku nagłówka, nazwa studia pod nim. W zwiniętym menu (64 px)
 * całość ustępuje sygnetowi (CollapsedMark).
 */
export const LogoStack = styled.div<{ $isCollapsed: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
    /* Miejsce na przycisk w rogu: logotyp nie może na niego wjechać. */
    padding: 0 26px;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        display: ${p => (p.$isCollapsed ? 'none' : 'flex')};
    }
`;

/** Poziomy logotyp (sygnet + napis): szerokość kolumny, wysokość z proporcji pliku. */
export const BrandWordmark = styled.img`
    display: block;
    width: 100%;
    max-width: 176px;
    height: auto;
`;

/**
 * Nazwa studia pod logo: drobniej i ciszej niż logo, do dwóch linii na środku. Jedna
 * linia z wielokropkiem ucinała nazwy z rejestru w pół słowa.
 *
 * Pismo idzie za logotypem: rozstrzelone wersaliki w jego ciepłej bieli (#F2F1EE),
 * przygaszonej do 60%. Zwykłe małe litery w zimnej, niebieskawej szarości paska
 * wyglądały pod znakiem jak doklejony podpis, a nie część jednego nagłówka.
 */
export const LogoCaption = styled.span`
    color: rgba(242, 241, 238, 0.6);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    line-height: 1.6;
    text-align: center;
    /* Odstęp liter dokłada się też za ostatnią literą wiersza - bez wyrównania
       wyśrodkowana nazwa stałaby o 2 px w lewo od osi logo. */
    padding-left: 0.2em;
    max-width: 100%;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
`;

/** Sygnet widoczny tylko w zwiniętym menu na desktopie, w miejscu ukrytego logotypu. */
export const CollapsedMark = styled.div<{ $isCollapsed: boolean }>`
    display: none;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        display: ${p => (p.$isCollapsed ? 'flex' : 'none')};
    }
`;

export const BrandMark = styled.img`
    display: block;
    width: 32px;
    height: 32px;
`;

export const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
`;

/**
 * Przyciski zwijania (desktop) i zamykania (telefon) w nagłówku z logo: prawy górny róg,
 * poza osią logo i nazwy.
 */
export const LogoCornerActions = styled.div<{ $isCollapsed: boolean }>`
    position: absolute;
    top: 10px;
    right: 10px;

    @media (max-width: ${p => p.theme.breakpoints.md}) {
        top: max(10px, env(safe-area-inset-top, 10px));
    }

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        display: ${p => (p.$isCollapsed ? 'none' : 'block')};
    }
`;

export const CollapseButton = styled.button<{ $isCollapsed: boolean }>`
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
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

// ─── Menu ─────────────────────────────────────────────────────────────────────

export const MenuContainer = styled.nav`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px 8px;
    /* Doscrollowanie do końca listy nie może przekazać ruchu do tła
       (scroll chaining na iOS/Android potrafi wtedy poruszyć viewportem). */
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar { width: 3px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 2px;
    }
`;

/** Sekcja przyklejona do dołu: nie przewija się razem z resztą menu. */
export const PinnedMenuContainer = styled.nav`
    flex-shrink: 0;
    padding: 0 8px 6px;
    border-top: 1px solid ${S.border};

    & > div { padding-top: 8px; }
`;

export const MenuSection = styled.div`
    padding: 14px 0 2px;

    &:first-child { padding-top: 6px; }
`;

/* Zwykłe zdanie zamiast wersalików 10 px z rozstrzeleniem: pięć takich etykiet
   (GŁÓWNE, BAZA KLIENTÓW, STUDIO, ADMINISTRACJA, PORTAL) robiło z menu formularz
   urzędowy — to ten sam wzorzec, który CLAUDE.md §2 wycofał z treści. */
export const MenuSectionTitle = styled.div<{ $isCollapsed: boolean }>`
    padding: 0 12px 5px;
    color: ${S.sectionLabel};
    font-size: 11.5px;
    font-weight: 600;
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

const pulseAlertBg = keyframes`
    0%, 100% { background-color: rgba(220, 38, 38, 0.0); }
    50%       { background-color: rgba(220, 38, 38, 0.18); }
`;

const pulseBadge = keyframes`
    0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
    50%       { box-shadow: 0 0 0 4px rgba(220, 38, 38, 0); }
`;

export const MenuItemLink = styled(Link)<{ $isActive: boolean; $isCollapsed: boolean; $hasAlert?: boolean }>`
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

    /* Left accent indicator: sits at the container's left edge */
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

    ${p => p.$hasAlert && !p.$isActive && css`
        animation: ${pulseAlertBg} 1.6s ease-in-out infinite;
        color: #fca5a5;
        &:hover { animation: none; }
    `}
`;

export const MenuItemButton = styled.button<{ $isCollapsed: boolean }>`
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
    padding: 9px 12px;
    margin-bottom: 1px;
    border: none;
    background: transparent;
    color: ${S.text};
    text-decoration: none;
    border-radius: 10px;
    transition: background-color 180ms ease, color 180ms ease;
    position: relative;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: 500;
    text-align: left;
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

    &:hover {
        background-color: ${S.bgHover};
        color: ${S.textHover};
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

export const MenuItemBadge = styled.span<{ $isCollapsed: boolean; $isActive?: boolean; $hasAlert?: boolean; $neutral?: boolean }>`
    margin-left: auto;
    padding: 2px 7px;
    /* Biały licznik informacyjny ($neutral) nie woła o uwagę jak czerwony. */
    background: ${p => p.$isActive ? 'rgba(14, 165, 233, 0.25)' : p.$neutral ? 'rgba(255, 255, 255, 0.14)' : 'rgba(239, 68, 68, 0.22)'};
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 700;
    color: ${p => p.$isActive ? '#7dd3fc' : p.$neutral ? '#f8fafc' : '#fca5a5'};
    line-height: 1.5;
    flex-shrink: 0;

    ${p => p.$hasAlert && !p.$isActive && css`
        animation: ${pulseBadge} 1.6s ease-in-out infinite;
    `}

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        display: ${p => p.$isCollapsed ? 'none' : 'inline-block'};
    }
`;

// ─── User Profile Footer ───────────────────────────────────────────────────────

export const UserProfile = styled.div<{ $isCollapsed: boolean }>`
    padding: 12px;
    /* On devices with home indicator (iPhone X+), push content above it */
    padding-bottom: max(12px, env(safe-area-inset-bottom, 0px));
    border-top: 1px solid ${S.border};
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    overflow: hidden;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        justify-content: ${p => p.$isCollapsed ? 'center' : 'flex-start'};
        padding-bottom: 12px;
    }
`;

/* Neutralny krążek: zielono-niebieski gradient był drugą, INNĄ barwą marki na dole
   menu i przeciągał wzrok z pozycji aktywnej na własne inicjały. */
export const UserAvatar = styled.div`
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: #1e293b;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
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

export const UserActions = styled.div<{ $isCollapsed: boolean }>`
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: auto;
    flex-shrink: 0;

    @media (min-width: ${p => p.theme.breakpoints.md}) {
        display: ${p => p.$isCollapsed ? 'none' : 'flex'};
    }
`;

const iconBtn = () => `
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
    svg { width: 14px; height: 14px; stroke-width: 1.75; }
    &:hover { background: rgba(255, 255, 255, 0.06); color: #f1f5f9; }
`;

export const UserSwitchButton = styled.button`${iconBtn()}`;

export const UserLogoutButton = styled.button`${iconBtn()}`;

// ─── Expand / Mobile Buttons ──────────────────────────────────────────────────

export const ExpandButton = styled.button`
    position: fixed;
    left: 51px;
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
    z-index: 101;

    svg { width: 13px; height: 13px; }

    @media (max-width: ${p => p.theme.breakpoints.md}) { display: none; }

    &:hover {
        background: #334155;
        color: ${S.textHover};
    }
`;


