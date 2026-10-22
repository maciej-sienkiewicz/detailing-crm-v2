// src/modules/checkin/views/mobile/MobilePhotoUpload.styles.ts
//
// Strona telefonu otwierana z kodu QR (/m/upload): zdjęcia przyjęcia, mapa uszkodzeń,
// pliki wizyty, VIN. Działa bez ThemeProvidera, więc kolory bierze wprost z `ui` -
// ten sam jasny wygląd i ten sam głęboki błękit co aplikacja, a nie osobny ciemny
// motyw z jaskrawym niebieskim, który z aplikacji już zniknął.

import styled, { keyframes, css } from 'styled-components';
import { ui } from '@/common/components/ui/tokens';

// ─── Animations ───────────────────────────────────────────────────────────────

export const spin = keyframes`
    to { transform: rotate(360deg); }
`;

export const pulse = keyframes`
    0%   { transform: translate(-50%, -50%) scale(1);    box-shadow: 0 0 0 0   rgba(220, 38, 38, 0.55); }
    70%  { transform: translate(-50%, -50%) scale(1.05); box-shadow: 0 0 0 12px rgba(220, 38, 38, 0);   }
    100% { transform: translate(-50%, -50%) scale(1);    box-shadow: 0 0 0 0   rgba(220, 38, 38, 0);   }
`;

const font = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ─── Layout ───────────────────────────────────────────────────────────────────

export const MobileContainer = styled.div`
    min-height: 100vh;
    min-height: 100dvh;
    background: ${ui.bg};
    padding: 16px;
    padding-top: max(16px, env(safe-area-inset-top, 0px));
    padding-bottom: max(32px, env(safe-area-inset-bottom, 0px));
    color: ${ui.ink};
    font-family: ${font};
    box-sizing: border-box;

    > * { max-width: 560px; margin-left: auto; margin-right: auto; }
`;

/** Nagłówek: studio, tytuł i auto - żeby było jasne, do czego trafiają zdjęcia. */
export const Header = styled.header`
    padding: 8px 2px 16px;
    margin-bottom: 4px;
`;

/** Nazwa studia nad tytułem. */
export const Logo = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 700;
    color: ${ui.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;

    svg { width: 15px; height: 15px; color: ${ui.brand}; flex-shrink: 0; }
`;

export const Title = styled.h1`
    margin: 0;
    font-size: 24px;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: ${ui.ink};
`;

/** Auto, którego dotyczy sesja („BMW X3 · WJ79814"). */
export const Subject = styled.p`
    margin: 6px 0 0;
    font-size: 14px;
    font-weight: 500;
    color: ${ui.textSecondary};
`;

// ─── Tab navigation ───────────────────────────────────────────────────────────

export const TabBar = styled.div`
    display: flex;
    background: ${ui.surfaceAlt};
    border: 1px solid ${ui.line};
    border-radius: 14px;
    padding: 4px;
    margin-bottom: 16px;
    gap: 4px;
`;

export const Tab = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 11px 8px;
    border-radius: 10px;
    border: none;
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    white-space: nowrap;

    background: ${props => props.$active ? ui.surface : 'transparent'};
    color: ${props => props.$active ? ui.brandInk : ui.textSecondary};
    box-shadow: ${props => props.$active ? '0 1px 3px rgba(15, 23, 42, 0.12)' : 'none'};

    svg { width: 18px; height: 18px; flex-shrink: 0; }

    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }
`;

export const TabBadge = styled.span`
    background: ${ui.brandTintHover};
    color: ${ui.brandInk};
    border-radius: 99px;
    padding: 2px 7px;
    font-size: 11px;
    font-weight: 700;
    min-width: 20px;
    text-align: center;
    line-height: 1.4;
`;

// ─── Banners & cards ──────────────────────────────────────────────────────────

export const OfflineBanner = styled.div<{ $visible: boolean }>`
    background: ${ui.warnTint};
    border: 1px solid ${ui.warnLine};
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 14px;
    font-size: 13px;
    font-weight: 500;
    color: ${ui.warnInk};
    display: ${props => props.$visible ? 'flex' : 'none'};
    align-items: center;
    gap: 8px;
`;

export const InfoCard = styled.div`
    background: ${ui.surface};
    border: 1px solid ${ui.line};
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 14px;
    font-size: 14px;
    color: ${ui.textSecondary};
    line-height: 1.5;
`;

export const AllDoneCard = styled.div`
    background: ${ui.okTint};
    border: 1px solid ${ui.okLine};
    border-radius: 12px;
    padding: 14px 16px;
    text-align: center;
    color: ${ui.okInk};
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 12px;
`;

// ─── Save status ──────────────────────────────────────────────────────────────

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

const saveColors: Record<SaveStatus, { fg: string; bg: string; border: string }> = {
    saved:   { fg: ui.okInk,     bg: ui.okTint,     border: ui.okLine     },
    saving:  { fg: ui.brandInk,  bg: ui.brandTint,  border: ui.brandLineSoft },
    error:   { fg: ui.dangerInk, bg: ui.dangerTint, border: ui.dangerLine },
    offline: { fg: ui.warnInk,   bg: ui.warnTint,   border: ui.warnLine   },
    idle:    { fg: 'transparent', bg: 'transparent', border: 'transparent' },
};

export const SaveStatusBadge = styled.div<{ $status: SaveStatus }>`
    display: ${props => props.$status === 'idle' ? 'none' : 'flex'};
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    padding: 8px 12px;
    border-radius: 8px;
    margin-bottom: 12px;
    color:      ${props => saveColors[props.$status].fg};
    background: ${props => saveColors[props.$status].bg};
    border: 1px solid ${props => saveColors[props.$status].border};
`;

// ─── Progress ─────────────────────────────────────────────────────────────────

export const ProgressBar = styled.div`
    background: ${ui.line};
    border-radius: 8px;
    height: 6px;
    overflow: hidden;
    margin-bottom: 6px;
`;

export const ProgressFill = styled.div<{ $pct: number }>`
    height: 100%;
    width: ${props => props.$pct}%;
    background: ${ui.brand};
    border-radius: 8px;
    transition: width 0.4s ease;
`;

export const ProgressLabel = styled.div`
    font-size: 12px;
    color: ${ui.textMuted};
    margin-bottom: 16px;
    text-align: center;
`;

// ─── Photo cards ──────────────────────────────────────────────────────────────

export const PhotoList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
`;

export const PhotoCard = styled.div<{ $status: 'pending' | 'uploading' | 'done' | 'failed' }>`
    background: ${ui.surface};
    border: 1.5px solid ${props => {
        switch (props.$status) {
            case 'done':      return ui.okLine;
            case 'failed':    return ui.dangerLine;
            case 'uploading': return ui.brandLine;
            default:          return ui.line;
        }
    }};
    border-radius: 14px;
    overflow: hidden;
    transition: border-color 0.3s;
`;

export const PhotoImg = styled.img`
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    display: block;
    background: ${ui.surfaceAlt};
`;

export const PhotoCardBody = styled.div`
    padding: 12px 14px;
`;

export const PhotoCardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
`;

export const PhotoCardTitle = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

export const StatusBadge = styled.span<{ $status: 'pending' | 'uploading' | 'done' | 'failed' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
    background: ${props => {
        switch (props.$status) {
            case 'done':      return ui.okTint;
            case 'failed':    return ui.dangerTint;
            case 'uploading': return ui.brandTint;
            default:          return ui.surfaceAlt;
        }
    }};
    color: ${props => {
        switch (props.$status) {
            case 'done':      return ui.okInk;
            case 'failed':    return ui.dangerInk;
            case 'uploading': return ui.brandInk;
            default:          return ui.textSecondary;
        }
    }};
`;

export const ErrorMsg = styled.div`
    font-size: 12px;
    color: ${ui.dangerInk};
    margin-top: 6px;
`;

export const ActionRow = styled.div`
    display: flex;
    gap: 8px;
`;

// ─── Buttons ──────────────────────────────────────────────────────────────────

export const Btn = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
    flex: 1;
    padding: 12px 10px;
    border-radius: ${ui.radiusControl};
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    &:active { transform: scale(0.97); }
    &:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }

    background: ${props => {
        switch (props.$variant) {
            case 'secondary': return ui.surface;
            case 'danger':    return ui.dangerTint;
            default:          return ui.brand;
        }
    }};
    color: ${props => {
        switch (props.$variant) {
            case 'secondary': return ui.inkSoft;
            case 'danger':    return ui.dangerInk;
            default:          return '#ffffff';
        }
    }};
    border: 1px solid ${props => {
        switch (props.$variant) {
            case 'secondary': return ui.line;
            case 'danger':    return ui.dangerLine;
            default:          return ui.brand;
        }
    }};
`;

export const CameraBtn = styled.label`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 16px;
    background: ${ui.brand};
    color: #ffffff;
    border: 1px solid ${ui.brand};
    border-radius: 14px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    box-shadow: 0 6px 18px -8px rgba(3, 105, 161, 0.6);
    margin-bottom: 12px;
    -webkit-tap-highlight-color: transparent;
    box-sizing: border-box;
    touch-action: manipulation;

    &:active { transform: scale(0.98); background: ${ui.brandStrong}; }
    &:focus-within { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }

    svg { width: 22px; height: 22px; flex-shrink: 0; }
`;

export const HiddenInput = styled.input`
    display: none;
`;

/** Camera + gallery side by side - one tap each, no hidden picker menu. */
export const CaptureRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 12px;

    > * {
        margin-bottom: 0;
        padding: 15px 10px;
        font-size: 15px;
        text-align: center;
    }

    @media (max-width: 330px) {
        grid-template-columns: 1fr;
    }
`;

/** Secondary variant of [CameraBtn] used for the gallery picker. */
export const GalleryBtn = styled(CameraBtn)`
    background: ${ui.surface};
    color: ${ui.inkSoft};
    border: 1px solid ${ui.line};
    box-shadow: none;

    &:active { background: ${ui.surfaceAlt}; }
`;

export const PreparingLabel = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 13px;
    color: ${ui.textMuted};
`;

// ─── End screens: loading, expired, done, ended ───────────────────────────────

const endScreen = css`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 62vh;
    text-align: center;
    padding: 20px;
    gap: 14px;
`;

const endIcon = css`
    width: 68px;
    height: 68px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    svg { width: 32px; height: 32px; }
`;

const endTitle = css`
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 0;
    color: ${ui.ink};
`;

const endText = css`
    font-size: 15px;
    color: ${ui.textSecondary};
    margin: 0;
    max-width: 320px;
    line-height: 1.6;
`;

export const ExpiredScreen = styled.div`${endScreen}`;

export const ExpiredIcon = styled.div`
    ${endIcon}
    background: ${ui.dangerTint};
    svg { color: ${ui.dangerInk}; }
`;

export const ExpiredTitle = styled.h2`${endTitle}`;
export const ExpiredText = styled.p`${endText}`;

export const LoadingWrap = styled.div`
    ${endScreen}
    color: ${ui.textMuted};
    font-size: 14px;
`;

export const Spinner = styled.div`
    width: 36px;
    height: 36px;
    border: 3px solid ${ui.line};
    border-top-color: ${ui.brand};
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
`;

// ─── Damage mapper ────────────────────────────────────────────────────────────

export const DamageMapperWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

export const DiagramCard = styled.div`
    background: ${ui.surface};
    border: 1px solid ${ui.line};
    border-radius: 16px;
    overflow: hidden;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
`;

/** Obrazek i warstwa znaczników - znaczniki liczone w % samego obrazka, bez podpisu. */
export const DiagramCanvas = styled.div`
    position: relative;
`;

/** Podpis pod schematem - pod obrazkiem, nie na nim, żeby nic go nie zasłaniało. */
export const DiagramHint = styled.div`
    border-top: 1px solid ${ui.lineFaint};
    background: ${ui.surfaceSoft};
    padding: 9px 14px;
    font-size: 12.5px;
    color: ${ui.textSecondary};
    text-align: center;
    pointer-events: none;
    font-weight: 500;
`;

export const VehicleImage = styled.img`
    width: 100%;
    height: auto;
    display: block;
    object-fit: contain;
    -webkit-user-drag: none;
    -webkit-touch-callout: none;
`;

export const OverlayLayer = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    cursor: crosshair;
`;

export const DamageMarker = styled.div<{ $isLast: boolean; $isActive: boolean }>`
    position: absolute;
    width: 34px;
    height: 34px;
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 13px;
    filter: drop-shadow(0 3px 8px rgba(15, 23, 42, 0.3));
    transform: translate(-50%, -50%);
    cursor: pointer;
    z-index: 10;
    border: 2px solid rgba(255, 255, 255, 0.85);
    transition: transform 0.15s, border-color 0.15s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    ${props => props.$isLast && css`
        animation: ${pulse} 2s infinite;
    `}

    ${props => props.$isActive && css`
        transform: translate(-50%, -50%) scale(1.25) !important;
        z-index: 20;
        border-color: white;
        animation: none;
    `}
`;

export const VehicleTypeSelectorRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

export const VehicleTypeLabel = styled.label`
    font-size: 13px;
    font-weight: 500;
    color: ${ui.textSecondary};
    white-space: nowrap;
    flex-shrink: 0;
`;

export const VehicleTypeSelect = styled.select`
    flex: 1;
    padding: 10px 32px 10px 12px;
    border-radius: ${ui.radiusControl};
    border: 1px solid ${ui.line};
    background: ${ui.surface}
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")
        no-repeat right 10px center;
    appearance: none;
    color: ${ui.ink};
    font-size: 15px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: ${ui.brandLine};
        box-shadow: 0 0 0 3px ${ui.brandTintHover};
    }
`;

export const DamageControlRow = styled.div`
    display: flex;
    gap: 10px;
`;

export const DamageControlBtn = styled.button`
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid ${ui.line};
    background: ${ui.surface};
    color: ${ui.inkSoft};
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    &:disabled { opacity: 0.4; }
    &:active:not(:disabled) { background: ${ui.surfaceAlt}; }

    svg { width: 18px; height: 18px; flex-shrink: 0; }
`;

export const DamageList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const DamageItem = styled.div<{ $isActive: boolean }>`
    background: ${props => props.$isActive ? ui.brandTint : ui.surface};
    border: 1.5px solid ${props => props.$isActive ? ui.brandLine : ui.line};
    border-radius: 14px;
    overflow: hidden;
    transition: background 0.2s, border-color 0.2s;
`;

export const DamageItemHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
`;

export const DamageNumber = styled.div`
    width: 32px;
    height: 32px;
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
`;

export const DamageItemLabel = styled.span`
    flex: 1;
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
    color: ${ui.ink};
`;

export const DamageDeleteBtn = styled.button`
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: ${ui.textFaint};
    cursor: pointer;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    &:active {
        background: ${ui.dangerTint};
        color: ${ui.dangerInk};
    }

    svg { width: 20px; height: 20px; }
`;

export const DamageNoteInput = styled.textarea`
    width: 100%;
    padding: 12px 14px;
    border: none;
    border-top: 1px solid ${ui.lineSoft};
    background: ${ui.surface};
    color: ${ui.ink};
    font-size: 15px;
    font-family: inherit;
    resize: none;
    min-height: 60px;
    box-sizing: border-box;
    line-height: 1.5;

    &::placeholder { color: ${ui.textFaint}; }
    &:focus { outline: none; background: ${ui.surfaceSoft}; }
`;

export const EmptyDamageState = styled.div`
    background: ${ui.surface};
    border: 1.5px dashed ${ui.line};
    border-radius: 14px;
    padding: 28px 20px;
    text-align: center;
    color: ${ui.textMuted};
    font-size: 14px;
    line-height: 1.6;

    strong {
        display: block;
        font-size: 15px;
        margin-bottom: 4px;
        color: ${ui.inkSoft};
    }
`;

// ─── Done / Locked screens ────────────────────────────────────────────────────

export const DoneScreen = styled.div`${endScreen}`;

export const DoneIcon = styled.div`
    ${endIcon}
    background: ${ui.okTint};
    svg { color: ${ui.okInk}; }
`;

export const DoneTitle = styled.h2`${endTitle}`;
export const DoneText = styled.p`${endText}`;

export const DoneActions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 280px;
    margin-top: 8px;
`;

/**
 * Koniec ustalony na komputerze. `ok` - praca dotarła (wizyta utworzona, zakończono),
 * `neutral` - nic tu już nie zrobisz (przerwano, zastąpiono, okno zamknięte).
 */
export const LockedScreen = styled.div`${endScreen}`;

export const LockedIcon = styled.div<{ $tone?: 'ok' | 'neutral' }>`
    ${endIcon}
    background: ${p => p.$tone === 'neutral' ? ui.surfaceAlt : ui.okTint};
    svg { color: ${p => p.$tone === 'neutral' ? ui.textSecondary : ui.okInk}; }
`;

export const LockedTitle = styled.h2`${endTitle}`;
export const LockedText = styled.p`${endText}`;

// ─── "Gotowe" footer bar (shown in active view) ───────────────────────────────

export const GotowFooter = styled.div`
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 0 max(4px, env(safe-area-inset-bottom, 0px));
    margin-top: 16px;
    background: linear-gradient(0deg, ${ui.bg} 70%, rgba(238, 242, 247, 0));
`;

export const GotowHint = styled.p`
    margin: 8px 0 0;
    font-size: 12.5px;
    color: ${ui.textMuted};
    text-align: center;
`;

export const GotowBtn = styled.button`
    width: 100%;
    padding: 15px;
    border-radius: 14px;
    border: 1px solid ${ui.brand};
    background: ${ui.brand};
    color: white;
    font-family: inherit;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow: 0 8px 20px -10px rgba(3, 105, 161, 0.7);
    transition: background 0.15s, transform 0.1s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    &:active { transform: scale(0.98); background: ${ui.brandStrong}; }
    &:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 2px; }

    svg { width: 20px; height: 20px; flex-shrink: 0; }
`;

export const CofnijBtn = styled.button`
    padding: 13px 22px;
    border-radius: 12px;
    border: 1px solid ${ui.line};
    background: ${ui.surface};
    color: ${ui.inkSoft};
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: background 0.15s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    &:active { background: ${ui.surfaceAlt}; }

    svg { width: 18px; height: 18px; flex-shrink: 0; }
`;

export const SectionTitle = styled.h3`
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 700;
    color: ${ui.ink};
`;

export const SectionSubtitle = styled.p`
    margin: 0;
    font-size: 14px;
    color: ${ui.textSecondary};
    line-height: 1.5;
`;

// ─── Damage photos (per damage point) ─────────────────────────────────────────

export const DamagePhotoRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    padding: 10px 14px 6px;
    -webkit-overflow-scrolling: touch;
`;

export const DamagePhotoThumb = styled.button<{ $failed?: boolean }>`
    position: relative;
    width: 68px;
    height: 68px;
    flex-shrink: 0;
    border-radius: 10px;
    overflow: hidden;
    border: 1.5px solid ${p => p.$failed ? ui.dangerLine : ui.line};
    background: ${ui.surfaceAlt};
    padding: 0;
    cursor: pointer;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        ${p => p.$failed && 'opacity: 0.45;'}
    }
`;

export const DamagePhotoThumbOverlay = styled.div`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.35);
    color: #fff;

    svg {
        width: 20px;
        height: 20px;
    }
`;

export const DamagePhotoBadge = styled.span`
    position: absolute;
    bottom: 3px;
    right: 3px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${ui.brand};
    color: #fff;

    svg {
        width: 11px;
        height: 11px;
    }
`;

export const DamagePhotoRemoveBtn = styled.span`
    position: absolute;
    top: 3px;
    right: 3px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(220, 38, 38, 0.92);
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
`;

export const DamageAddPhotoBtn = styled.label`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    width: 68px;
    height: 68px;
    flex-shrink: 0;
    border-radius: 10px;
    border: 1.5px dashed ${ui.lineStrong};
    background: ${ui.surface};
    color: ${ui.textSecondary};
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;

    svg {
        width: 18px;
        height: 18px;
    }

    &:active {
        background: ${ui.brandTint};
        border-color: ${ui.brandLine};
        color: ${ui.brandInk};
    }
`;

export const DamagePhotoHint = styled.div`
    font-size: 12px;
    line-height: 1.45;
    color: ${ui.textMuted};
    padding: 0 14px 12px;
`;
