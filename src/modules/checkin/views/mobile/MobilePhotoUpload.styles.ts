// src/modules/checkin/views/mobile/MobilePhotoUpload.styles.ts
// Standalone styled components — no theme provider, all values hardcoded.

import styled, { keyframes, css } from 'styled-components';

// ─── Animations ───────────────────────────────────────────────────────────────

export const spin = keyframes`
    to { transform: rotate(360deg); }
`;

export const pulse = keyframes`
    0%   { transform: translate(-50%, -50%) scale(1);    box-shadow: 0 0 0 0   rgba(220, 38, 38, 0.7); }
    70%  { transform: translate(-50%, -50%) scale(1.05); box-shadow: 0 0 0 12px rgba(220, 38, 38, 0);   }
    100% { transform: translate(-50%, -50%) scale(1);    box-shadow: 0 0 0 0   rgba(220, 38, 38, 0);   }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

export const MobileContainer = styled.div`
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    padding: 16px;
    padding-bottom: 48px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
`;

export const Header = styled.div`
    padding: 20px 0 16px;
    text-align: center;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    margin-bottom: 20px;
`;

export const Logo = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
    letter-spacing: 1px;
`;

export const Title = styled.h1`
    margin: 0 0 6px;
    font-size: 22px;
    font-weight: 700;
    color: white;
`;

export const Subtitle = styled.p`
    margin: 0;
    font-size: 14px;
    color: rgba(255,255,255,0.6);
`;

// ─── Tab navigation ───────────────────────────────────────────────────────────

export const TabBar = styled.div`
    display: flex;
    background: rgba(255,255,255,0.06);
    border-radius: 14px;
    padding: 4px;
    margin-bottom: 20px;
    gap: 4px;
`;

export const Tab = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 12px 8px;
    border-radius: 10px;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    white-space: nowrap;

    background: ${props => props.$active
        ? 'linear-gradient(135deg, #0ea5e9, #0284c7)'
        : 'transparent'};
    color: ${props => props.$active ? 'white' : 'rgba(255,255,255,0.5)'};
    box-shadow: ${props => props.$active ? '0 2px 12px rgba(14,165,233,0.3)' : 'none'};

    svg { width: 18px; height: 18px; flex-shrink: 0; }

    &:active { opacity: 0.85; }
`;

export const TabBadge = styled.span`
    background: rgba(255,255,255,0.2);
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
    background: rgba(234, 179, 8, 0.15);
    border: 1px solid rgba(234, 179, 8, 0.4);
    border-radius: 10px;
    padding: 12px 14px;
    margin-bottom: 14px;
    font-size: 13px;
    font-weight: 500;
    color: #fbbf24;
    display: ${props => props.$visible ? 'flex' : 'none'};
    align-items: center;
    gap: 8px;
`;

export const InfoCard = styled.div`
    background: rgba(14, 165, 233, 0.12);
    border: 1px solid rgba(14, 165, 233, 0.3);
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 16px;
    font-size: 13px;
    color: rgba(255,255,255,0.85);
    line-height: 1.5;
`;

export const AllDoneCard = styled.div`
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 12px;
    padding: 16px;
    text-align: center;
    color: #86efac;
    font-size: 14px;
    margin-bottom: 12px;
`;

// ─── Save status ──────────────────────────────────────────────────────────────

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

const saveColors: Record<SaveStatus, { fg: string; bg: string; border: string }> = {
    saved:   { fg: '#86efac', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.2)'  },
    saving:  { fg: '#7dd3fc', bg: 'rgba(14,165,233,0.08)',  border: 'rgba(14,165,233,0.2)' },
    error:   { fg: '#f87171', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'  },
    offline: { fg: '#fbbf24', bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.2)'  },
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
    margin-bottom: 14px;
    color:      ${props => saveColors[props.$status].fg};
    background: ${props => saveColors[props.$status].bg};
    border: 1px solid ${props => saveColors[props.$status].border};
`;

// ─── Progress ─────────────────────────────────────────────────────────────────

export const ProgressBar = styled.div`
    background: rgba(255,255,255,0.1);
    border-radius: 8px;
    height: 6px;
    overflow: hidden;
    margin-bottom: 6px;
`;

export const ProgressFill = styled.div<{ $pct: number }>`
    height: 100%;
    width: ${props => props.$pct}%;
    background: linear-gradient(90deg, #0ea5e9, #38bdf8);
    border-radius: 8px;
    transition: width 0.4s ease;
`;

export const ProgressLabel = styled.div`
    font-size: 12px;
    color: rgba(255,255,255,0.6);
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
    background: rgba(255,255,255,0.05);
    border: 2px solid ${props => {
        switch (props.$status) {
            case 'done':      return '#22c55e';
            case 'failed':    return '#ef4444';
            case 'uploading': return '#0ea5e9';
            default:          return 'rgba(255,255,255,0.12)';
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
`;

export const PhotoCardBody = styled.div`
    padding: 12px 14px;
`;

export const PhotoCardHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
`;

export const PhotoCardTitle = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.9);
`;

export const StatusBadge = styled.span<{ $status: 'pending' | 'uploading' | 'done' | 'failed' }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 9px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    background: ${props => {
        switch (props.$status) {
            case 'done':      return 'rgba(34,197,94,0.2)';
            case 'failed':    return 'rgba(239,68,68,0.2)';
            case 'uploading': return 'rgba(14,165,233,0.2)';
            default:          return 'rgba(255,255,255,0.1)';
        }
    }};
    color: ${props => {
        switch (props.$status) {
            case 'done':      return '#22c55e';
            case 'failed':    return '#f87171';
            case 'uploading': return '#38bdf8';
            default:          return 'rgba(255,255,255,0.6)';
        }
    }};
`;

export const ErrorMsg = styled.div`
    font-size: 12px;
    color: #f87171;
    margin-top: 6px;
`;

export const ActionRow = styled.div`
    display: flex;
    gap: 8px;
`;

// ─── Buttons ──────────────────────────────────────────────────────────────────

export const Btn = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
    flex: 1;
    padding: 13px 10px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    &:active { transform: scale(0.97); }
    &:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

    background: ${props => {
        switch (props.$variant) {
            case 'secondary': return 'rgba(255,255,255,0.1)';
            case 'danger':    return 'rgba(239,68,68,0.2)';
            default:          return 'linear-gradient(135deg, #0ea5e9, #0284c7)';
        }
    }};
    color: ${props => props.$variant === 'danger' ? '#f87171' : 'white'};
    border: ${props => props.$variant === 'danger' ? '1px solid rgba(239,68,68,0.3)' : 'none'};
`;

export const CameraBtn = styled.label`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 18px;
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    color: white;
    border-radius: 14px;
    font-size: 17px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    box-shadow: 0 4px 20px rgba(14,165,233,0.3);
    margin-bottom: 12px;
    -webkit-tap-highlight-color: transparent;
    box-sizing: border-box;
    touch-action: manipulation;

    &:active { transform: scale(0.98); }

    svg { width: 24px; height: 24px; flex-shrink: 0; }
`;

export const HiddenInput = styled.input`
    display: none;
`;

// ─── Loading / expired ────────────────────────────────────────────────────────

export const ExpiredScreen = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    padding: 20px;
    gap: 16px;
`;

export const ExpiredIcon = styled.div`
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(239,68,68,0.15);
    display: flex;
    align-items: center;
    justify-content: center;

    svg { width: 36px; height: 36px; color: #f87171; }
`;

export const ExpiredTitle = styled.h2`
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    color: white;
`;

export const ExpiredText = styled.p`
    font-size: 15px;
    color: rgba(255,255,255,0.6);
    margin: 0;
    max-width: 300px;
    line-height: 1.6;
`;

export const LoadingWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 16px;
    text-align: center;
`;

export const Spinner = styled.div`
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.15);
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
`;

// ─── Damage mapper ────────────────────────────────────────────────────────────

export const DamageMapperWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

export const DiagramCard = styled.div`
    background: #f8fafc;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.35);
    position: relative;
    user-select: none;
    -webkit-user-select: none;
`;

export const DiagramHint = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(0deg, rgba(0,0,0,0.55) 0%, transparent 100%);
    padding: 24px 14px 10px;
    font-size: 12px;
    color: rgba(255,255,255,0.9);
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
    filter: drop-shadow(0 3px 8px rgba(0,0,0,0.4));
    transform: translate(-50%, -50%);
    cursor: pointer;
    z-index: 10;
    border: 2px solid rgba(255,255,255,0.5);
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
    color: rgba(255, 255, 255, 0.65);
    white-space: nowrap;
    flex-shrink: 0;
`;

export const VehicleTypeSelect = styled.select`
    flex: 1;
    padding: 9px 32px 9px 12px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.08)
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")
        no-repeat right 10px center;
    appearance: none;
    color: rgba(255, 255, 255, 0.9);
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: rgba(255, 255, 255, 0.4);
        background-color: rgba(255, 255, 255, 0.12);
    }

    option {
        background: #1e293b;
        color: #f1f5f9;
    }
`;

export const DamageControlRow = styled.div`
    display: flex;
    gap: 10px;
`;

export const DamageControlBtn = styled.button`
    flex: 1;
    padding: 14px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.07);
    color: rgba(255,255,255,0.75);
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

    &:disabled { opacity: 0.3; }
    &:active:not(:disabled) { background: rgba(255,255,255,0.13); }

    svg { width: 18px; height: 18px; flex-shrink: 0; }
`;

export const DamageList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const DamageItem = styled.div<{ $isActive: boolean }>`
    background: ${props => props.$isActive ? 'rgba(14,165,233,0.1)' : 'rgba(255,255,255,0.04)'};
    border: 1.5px solid ${props => props.$isActive ? 'rgba(14,165,233,0.35)' : 'rgba(255,255,255,0.07)'};
    border-radius: 14px;
    overflow: hidden;
    transition: background 0.2s, border-color 0.2s;
`;

export const DamageItemHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 13px 14px;
`;

export const DamageNumber = styled.div`
    width: 34px;
    height: 34px;
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 14px;
    flex-shrink: 0;
    border: 1.5px solid rgba(255,255,255,0.25);
`;

export const DamageItemLabel = styled.span`
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    color: rgba(255,255,255,0.85);
`;

export const DamageDeleteBtn = styled.button`
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: rgba(255,255,255,0.3);
    cursor: pointer;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    &:active {
        background: rgba(239,68,68,0.15);
        color: #f87171;
    }

    svg { width: 20px; height: 20px; }
`;

export const DamageNoteInput = styled.textarea`
    width: 100%;
    padding: 12px 14px;
    border: none;
    border-top: 1px solid rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.03);
    color: rgba(255,255,255,0.88);
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    resize: none;
    min-height: 60px;
    box-sizing: border-box;
    line-height: 1.5;

    &::placeholder { color: rgba(255,255,255,0.22); }
    &:focus { outline: none; background: rgba(14,165,233,0.05); }
`;

export const EmptyDamageState = styled.div`
    background: rgba(255,255,255,0.03);
    border: 2px dashed rgba(255,255,255,0.1);
    border-radius: 14px;
    padding: 32px 20px;
    text-align: center;
    color: rgba(255,255,255,0.35);
    font-size: 14px;
    line-height: 1.6;

    strong {
        display: block;
        font-size: 15px;
        margin-bottom: 6px;
        color: rgba(255,255,255,0.5);
    }
`;

// ─── Done / Locked screens ────────────────────────────────────────────────────

export const DoneScreen = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    padding: 20px;
    gap: 16px;
`;

export const DoneIcon = styled.div`
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(34, 197, 94, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;

    svg { width: 36px; height: 36px; color: #4ade80; }
`;

export const DoneTitle = styled.h2`
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    color: white;
`;

export const DoneText = styled.p`
    font-size: 15px;
    color: rgba(255,255,255,0.6);
    margin: 0;
    max-width: 300px;
    line-height: 1.6;
`;

export const DoneActions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    max-width: 280px;
    margin-top: 8px;
`;

export const LockedScreen = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    text-align: center;
    padding: 20px;
    gap: 16px;
`;

export const LockedIcon = styled.div`
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(251, 191, 36, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;

    svg { width: 36px; height: 36px; color: #fbbf24; }
`;

export const LockedTitle = styled.h2`
    font-size: 22px;
    font-weight: 700;
    margin: 0;
    color: white;
`;

export const LockedText = styled.p`
    font-size: 15px;
    color: rgba(255,255,255,0.6);
    margin: 0;
    max-width: 300px;
    line-height: 1.6;
`;

// ─── "Gotowe" footer bar (shown in active view) ───────────────────────────────

export const GotowFooter = styled.div`
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 0 4px;
    margin-top: 16px;
`;

export const GotowBtn = styled.button`
    width: 100%;
    padding: 16px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #16a34a, #15803d);
    color: white;
    font-size: 17px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow: 0 4px 20px rgba(22, 163, 74, 0.35);
    transition: opacity 0.2s, transform 0.1s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    &:active { transform: scale(0.98); opacity: 0.9; }
    &:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

    svg { width: 22px; height: 22px; flex-shrink: 0; }
`;

export const CofnijBtn = styled.button`
    padding: 14px 24px;
    border-radius: 12px;
    border: 1.5px solid rgba(255,255,255,0.2);
    background: rgba(255,255,255,0.07);
    color: rgba(255,255,255,0.8);
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

    &:active { background: rgba(255,255,255,0.13); }

    svg { width: 18px; height: 18px; flex-shrink: 0; }
`;

export const SectionTitle = styled.h3`
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 700;
    color: white;
`;

export const SectionSubtitle = styled.p`
    margin: 0 0 14px;
    font-size: 13px;
    color: rgba(255,255,255,0.5);
    line-height: 1.5;
`;

// ─── Damage photos (per damage point) ─────────────────────────────────────────

export const DamagePhotoRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    overflow-x: auto;
    padding: 2px 0 4px;
    -webkit-overflow-scrolling: touch;
`;

export const DamagePhotoThumb = styled.button<{ $failed?: boolean }>`
    position: relative;
    width: 68px;
    height: 68px;
    flex-shrink: 0;
    border-radius: 10px;
    overflow: hidden;
    border: 1.5px solid ${p => p.$failed ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.14)'};
    background: rgba(255, 255, 255, 0.04);
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
    background: rgba(4, 8, 16, 0.35);
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
    background: rgba(14, 165, 233, 0.92);
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
    background: rgba(220, 38, 38, 0.9);
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
    border: 1.5px dashed rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.65);
    font-size: 9.5px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;

    svg {
        width: 18px;
        height: 18px;
    }

    &:active {
        background: rgba(14, 165, 233, 0.12);
        border-color: rgba(14, 165, 233, 0.5);
        color: #38bdf8;
    }
`;

export const DamagePhotoHint = styled.div`
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
    margin-top: 2px;
`;
