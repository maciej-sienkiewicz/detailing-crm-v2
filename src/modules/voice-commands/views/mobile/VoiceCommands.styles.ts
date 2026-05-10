// src/modules/voice-commands/views/mobile/VoiceCommands.styles.ts

import styled, { keyframes, css } from 'styled-components';

// ─── Design tokens ────────────────────────────────────────────────────────────

const c = {
    bg:           '#F8FAFC',
    surface:      '#FFFFFF',
    border:       '#E2E8F0',
    borderStrong: '#CBD5E1',
    text:         '#0F172A',
    textSub:      '#64748B',
    textMuted:    '#94A3B8',
    accent:       '#0284C7',
    accentLight:  '#E0F2FE',
    accentRing:   'rgba(14, 165, 233, 0.22)',
    success:      '#059669',
    successLight: '#ECFDF5',
    error:        '#DC2626',
    errorLight:   '#FEF2F2',
} as const;

// ─── Animations ───────────────────────────────────────────────────────────────

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
`;

const toastIn = keyframes`
    from { opacity: 0; transform: translateX(-50%) translateY(8px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0);   }
`;

// Breathing pulse rings around the microphone during recording
const pulseRing1 = keyframes`
    0%   { transform: scale(1);    opacity: 0.45; }
    50%  { transform: scale(1.18); opacity: 0.12; }
    100% { transform: scale(1);    opacity: 0.45; }
`;

const pulseRing2 = keyframes`
    0%   { transform: scale(1);    opacity: 0.25; }
    50%  { transform: scale(1.38); opacity: 0.04; }
    100% { transform: scale(1);    opacity: 0.25; }
`;

// ─── Root container ───────────────────────────────────────────────────────────

export const Container = styled.div`
    min-height: 100dvh;
    background: ${c.bg};
    color: ${c.text};
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
`;

// ─── Loading ──────────────────────────────────────────────────────────────────

export const LoadingWrap = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    padding: 32px;
`;

export const Spinner = styled.div`
    width: 40px;
    height: 40px;
    border: 3px solid ${c.border};
    border-top-color: ${c.accent};
    border-radius: 50%;
    animation: ${spin} 0.75s linear infinite;
    flex-shrink: 0;
`;

export const SpinnerSm = styled.div`
    width: 18px;
    height: 18px;
    border: 2px solid rgba(2, 132, 199, 0.25);
    border-top-color: ${c.accent};
    border-radius: 50%;
    animation: ${spin} 0.75s linear infinite;
    flex-shrink: 0;
`;

export const LoadingText = styled.p`
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: ${c.textSub};
`;

// ─── Error screen ─────────────────────────────────────────────────────────────

export const ErrorWrap = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    text-align: center;
    padding: 40px 32px;
`;

export const ErrorIconWrap = styled.div`
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: ${c.errorLight};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-bottom: 8px;

    svg { width: 32px; height: 32px; color: ${c.error}; }
`;

export const ErrorTitle = styled.h1`
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: ${c.text};
    letter-spacing: -0.3px;
`;

export const ErrorMessage = styled.p`
    margin: 0;
    font-size: 15px;
    color: ${c.textSub};
    line-height: 1.55;
    max-width: 280px;
`;

// ─── Screen layout ────────────────────────────────────────────────────────────

export const ScreenBody = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    animation: ${fadeUp} 0.18s ease-out;
`;

export const ScreenContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px 20px 0;
    gap: 16px;
    min-height: 0;
`;

// ─── Screen header ────────────────────────────────────────────────────────────

export const ScreenHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 0;
    min-height: 56px;
    flex-shrink: 0;
`;

export const BackBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: inherit;
    font-size: 16px;
    font-weight: 500;
    color: ${c.accent};
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px 4px;
    margin: -8px -4px;
    border-radius: 8px;
    min-height: 44px;
    transition: opacity 0.15s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    svg { width: 20px; height: 20px; flex-shrink: 0; }
    &:active { opacity: 0.6; }
`;

export const ModeBadge = styled.span<{ $mode: 'lead' | 'note' }>`
    padding: 5px 14px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;

    ${p => p.$mode === 'lead' && css`
        background: ${c.accentLight};
        color: ${c.accent};
    `}
    ${p => p.$mode === 'note' && css`
        background: #F3F0FF;
        color: #7C3AED;
    `}
`;

// ─── Screen 1: Home — two floating squircle cards ────────────────────────────

export const FloatLayout = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: max(24px, env(safe-area-inset-top, 24px)) 20px max(24px, env(safe-area-inset-bottom, 24px));
    background: #ECEAE6;
`;

export const FloatCard = styled.button<{ $accent: 'blue' | 'violet' }>`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 20px;
    background: #FFFFFF;
    border: none;
    border-radius: 28px;
    cursor: pointer;
    font-family: inherit;
    box-shadow:
        0 1px 2px rgba(0, 0, 0, 0.04),
        0 8px 24px rgba(0, 0, 0, 0.08),
        0 28px 52px rgba(0, 0, 0, 0.06);
    transition:
        transform 0.18s cubic-bezier(0.34, 1.4, 0.64, 1),
        box-shadow 0.18s ease;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;

    &:active {
        transform: scale(0.965);
        box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.04),
            0 4px 10px rgba(0, 0, 0, 0.07);
    }
`;

export const FloatIcon = styled.div<{ $accent: 'blue' | 'violet' }>`
    width: 76px;
    height: 76px;
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;

    svg { width: 36px; height: 36px; }

    ${p => p.$accent === 'blue' && css`
        background: #EFF8FF;
        color: #0369A1;
    `}
    ${p => p.$accent === 'violet' && css`
        background: #F5F3FF;
        color: #6D28D9;
    `}
`;

export const FloatLabel = styled.span`
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.4px;
    color: #0F172A;
`;

// ─── Screen title (phone / edit screens) ──────────────────────────────────────

export const ScreenTitle = styled.h2`
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: ${c.text};
    letter-spacing: -0.4px;
    line-height: 1.2;
`;

// ─── Form elements ────────────────────────────────────────────────────────────

export const FormLabel = styled.label`
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: ${c.textSub};
    letter-spacing: 0.02em;
    text-transform: uppercase;
`;

export const FormField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const PhoneInput = styled.input`
    width: 100%;
    padding: 15px 18px;
    background: ${c.surface};
    border: 1.5px solid ${c.border};
    border-radius: 14px;
    font-size: 20px;
    font-weight: 400;
    color: ${c.text};
    outline: none;
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);

    &::placeholder { color: ${c.textMuted}; }
    &:focus {
        border-color: ${c.accent};
        box-shadow: 0 0 0 3px ${c.accentRing};
    }
`;

// ─── Microphone / recording UI ────────────────────────────────────────────────

export const MicArea = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 20px 24px;
    flex-shrink: 0;
    gap: 16px;
`;

export const MicRingWrap = styled.div`
    position: relative;
    width: 96px;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: center;
`;

export const MicRing = styled.div<{ $delay?: string }>`
    position: absolute;
    inset: -16px;
    border-radius: 50%;
    border: 2px solid rgba(14, 165, 233, 0.35);
    animation: ${pulseRing1} 2s ease-in-out infinite;
    animation-delay: ${p => p.$delay ?? '0s'};
`;

export const MicRingOuter = styled.div`
    position: absolute;
    inset: -32px;
    border-radius: 50%;
    border: 1.5px solid rgba(14, 165, 233, 0.18);
    animation: ${pulseRing2} 2s ease-in-out infinite;
    animation-delay: 0.4s;
`;

export const MicCircle = styled.div<{ $active: boolean }>`
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: ${p => p.$active ? c.accent : c.surface};
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.3s ease, box-shadow 0.3s ease;
    box-shadow: ${p => p.$active
        ? `0 8px 24px rgba(14, 165, 233, 0.30), 0 2px 8px rgba(14, 165, 233, 0.20)`
        : `0 2px 8px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.05)`
    };
    border: ${p => p.$active ? 'none' : `1.5px solid ${c.border}`};
    flex-shrink: 0;
    position: relative;
    z-index: 1;

    svg { width: 38px; height: 38px; color: ${p => p.$active ? '#FFFFFF' : c.textSub}; }
`;

export const MicStatus = styled.p<{ $active: boolean }>`
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: ${p => p.$active ? c.accent : c.textSub};
    letter-spacing: 0.01em;
    text-align: center;
`;

// ─── Transcript / dictation area ──────────────────────────────────────────────

export const TranscriptCard = styled.div`
    flex: 1;
    min-height: 100px;
    background: ${c.surface};
    border: 1.5px solid ${c.border};
    border-radius: 16px;
    padding: 16px 18px;
    font-size: 17px;
    color: ${c.text};
    line-height: 1.6;
    overflow-y: auto;
    word-break: break-word;
    white-space: pre-wrap;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.05);

    &::-webkit-scrollbar { width: 3px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: ${c.border}; border-radius: 2px; }
`;

// Legacy alias used by recording mode display
export const TranscriptDisplay = TranscriptCard;

export const Placeholder = styled.span`
    color: ${c.textMuted};
    pointer-events: none;
    font-weight: 400;
`;

export const InterimText = styled.span`
    color: ${c.textSub};
    font-style: italic;
`;

export const TranscriptTextarea = styled.textarea`
    flex: 1;
    min-height: 100px;
    width: 100%;
    padding: 16px 18px;
    background: ${c.surface};
    border: 1.5px solid ${c.border};
    border-radius: 16px;
    font-size: 17px;
    font-weight: 400;
    color: ${c.text};
    font-family: inherit;
    line-height: 1.6;
    resize: none;
    outline: none;
    box-shadow: 0 1px 4px rgba(15, 23, 42, 0.05);
    transition: border-color 0.15s, box-shadow 0.15s;

    &::placeholder { color: ${c.textMuted}; }
    &:focus {
        border-color: ${c.accent};
        box-shadow: 0 0 0 3px ${c.accentRing};
    }
`;

// ─── Permission error ─────────────────────────────────────────────────────────

export const PermissionError = styled.div`
    padding: 14px 16px;
    background: ${c.errorLight};
    border: 1px solid rgba(220, 38, 38, 0.20);
    border-radius: 12px;
    color: ${c.error};
    font-size: 14px;
    line-height: 1.5;
    font-weight: 500;
`;

// ─── Buttons ──────────────────────────────────────────────────────────────────

export const PrimaryBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 56px;
    padding: 16px 24px;
    background: ${c.accent};
    color: white;
    border: none;
    border-radius: 16px;
    font-family: inherit;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(2, 132, 199, 0.28);
    transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    line-height: 1;

    &:active:not(:disabled) {
        transform: scale(0.97);
        box-shadow: 0 1px 4px rgba(2, 132, 199, 0.20);
    }
    &:disabled {
        opacity: 0.40;
        cursor: not-allowed;
        box-shadow: none;
    }
`;

export const SecondaryBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 52px;
    padding: 14px 24px;
    background: ${c.surface};
    color: ${c.textSub};
    border: 1.5px solid ${c.border};
    border-radius: 16px;
    font-family: inherit;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, transform 0.12s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    line-height: 1;

    &:active:not(:disabled) {
        background: ${c.bg};
        color: ${c.text};
        transform: scale(0.97);
    }
    &:disabled { opacity: 0.40; cursor: not-allowed; }
`;

export const LinkBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: ${c.accent};
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    min-height: 44px;
    transition: opacity 0.15s;
    -webkit-tap-highlight-color: transparent;

    svg { width: 15px; height: 15px; flex-shrink: 0; }
    &:active { opacity: 0.6; }
`;

// ─── Bottom action bar ────────────────────────────────────────────────────────

export const BottomBar = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px 20px;
    padding-bottom: max(20px, env(safe-area-inset-bottom, 20px));
    background: ${c.bg};
    border-top: 1px solid ${c.border};
`;

// ─── Screen 4: Send states ────────────────────────────────────────────────────

export const SendBody = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    text-align: center;
    padding: 40px 32px;
`;

export const SendIconWrap = styled.div<{ $type: 'success' | 'error' | 'sending' }>`
    width: 88px;
    height: 88px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-bottom: 4px;

    ${p => p.$type === 'success' && css`
        background: ${c.successLight};
        svg { width: 40px; height: 40px; color: ${c.success}; }
    `}
    ${p => p.$type === 'error' && css`
        background: ${c.errorLight};
        svg { width: 40px; height: 40px; color: ${c.error}; }
    `}
`;

export const SendTitle = styled.p`
    margin: 0;
    font-size: 26px;
    font-weight: 700;
    color: ${c.text};
    letter-spacing: -0.4px;
`;

export const SendMessage = styled.p`
    margin: 0;
    font-size: 15px;
    color: ${c.textSub};
    line-height: 1.55;
    max-width: 260px;
`;

// ─── Toast notification ───────────────────────────────────────────────────────

export const Toast = styled.div<{ $visible: boolean }>`
    position: fixed;
    bottom: calc(max(20px, env(safe-area-inset-bottom, 20px)) + 76px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color: white;
    padding: 11px 22px;
    border-radius: 9999px;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    z-index: 200;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    transition: opacity 0.18s ease;
    opacity: ${p => p.$visible ? 1 : 0};

    ${p => p.$visible && css`animation: ${toastIn} 0.18s ease;`}
`;
