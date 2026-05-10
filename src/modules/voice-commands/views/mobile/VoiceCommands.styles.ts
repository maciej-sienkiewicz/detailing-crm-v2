// src/modules/voice-commands/views/mobile/VoiceCommands.styles.ts
// Standalone styled components — no theme provider, values consistent with
// MobilePhotoUpload.styles.ts and the shared design system (theme.ts).

import styled, { keyframes, css } from 'styled-components';

// ─── Animations ───────────────────────────────────────────────────────────────

export const spin = keyframes`
    to { transform: rotate(360deg); }
`;

export const pulseDot = keyframes`
    0%, 100% { opacity: 1;   transform: scale(1);    }
    50%       { opacity: 0.4; transform: scale(0.75); }
`;

export const fadeUp = keyframes`
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
`;

export const toastIn = keyframes`
    from { opacity: 0; transform: translateX(-50%) translateY(12px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0);    }
`;

// ─── Root container — matches MobileContainer from MobilePhotoUpload.styles.ts ─

export const Container = styled.div`
    min-height: 100dvh;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: white;
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

// ─── Loading — from LoadingScreen.tsx ─────────────────────────────────────────

export const LoadingWrap = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 24px;
    text-align: center;
    padding: 32px;
`;

export const Spinner = styled.div`
    width: 48px;
    height: 48px;
    border: 4px solid rgba(255, 255, 255, 0.10);
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
    flex-shrink: 0;
`;

export const SpinnerSm = styled.div`
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.20);
    border-top-color: white;
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
    flex-shrink: 0;
`;

export const LoadingText = styled.p`
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    color: white;
`;

// ─── Error screen — from ErrorScreen.tsx ──────────────────────────────────────

export const ErrorWrap = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    text-align: center;
    padding: 32px;
`;

export const ErrorIconWrap = styled.div`
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(220, 38, 38, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg { width: 40px; height: 40px; color: #fca5a5; }
`;

export const ErrorTitle = styled.h1`
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: white;
`;

export const ErrorMessage = styled.p`
    margin: 0;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.70);
    line-height: 1.5;
    max-width: 300px;
`;

// ─── Screen layout ────────────────────────────────────────────────────────────

export const ScreenBody = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    animation: ${fadeUp} 0.2s ease;
`;

export const ScreenContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px 16px 0;
    gap: 16px;
    min-height: 0;
`;

// ─── Screen header (back + badge) ─────────────────────────────────────────────

export const ScreenHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 16px 0;
    min-height: 52px;
    flex-shrink: 0;
`;

export const BackBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    color: #0ea5e9;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    margin: -8px;
    border-radius: 12px;
    min-height: 44px;
    transition: color 0.15s ease;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    svg { width: 18px; height: 18px; flex-shrink: 0; }
    &:active { color: #0284c7; }
`;

export const ModeBadge = styled.span<{ $mode: 'lead' | 'note' }>`
    margin-left: auto;
    padding: 4px 12px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;

    ${p => p.$mode === 'lead' && css`
        background: rgba(14, 165, 233, 0.12);
        border: 1px solid rgba(14, 165, 233, 0.30);
        color: #38bdf8;
    `}
    ${p => p.$mode === 'note' && css`
        background: rgba(139, 92, 246, 0.12);
        border: 1px solid rgba(139, 92, 246, 0.30);
        color: #a78bfa;
    `}
`;

// ─── Screen 1: Home ───────────────────────────────────────────────────────────

export const HomeHeader = styled.div`
    padding: 48px 16px 16px;
    flex-shrink: 0;
`;

export const HomeGreeting = styled.h1`
    margin: 0 0 4px;
    font-size: 24px;
    font-weight: 700;
    color: white;
    letter-spacing: -0.4px;
`;

export const HomeSubtitle = styled.p`
    margin: 0;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.60);
`;

export const TilesGrid = styled.div`
    flex: 1;
    display: grid;
    grid-template-rows: 1fr 1fr;
    gap: 16px;
    padding: 0 16px 32px;
    min-height: 0;
`;

export const Tile = styled.button<{ $mode: 'lead' | 'note' }>`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 28px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 16px;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: background 0.2s ease, border-color 0.2s ease, transform 0.1s ease;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;

    &:active {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.18);
        transform: scale(0.98);
    }
`;

export const TileIcon = styled.div<{ $mode: 'lead' | 'note' }>`
    width: 52px;
    height: 52px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;

    svg { width: 28px; height: 28px; }

    ${p => p.$mode === 'lead' && css`
        background: rgba(14, 165, 233, 0.12);
        color: #38bdf8;
    `}
    ${p => p.$mode === 'note' && css`
        background: rgba(139, 92, 246, 0.12);
        color: #a78bfa;
    `}
`;

export const TileTitle = styled.div`
    font-size: 20px;
    font-weight: 700;
    color: white;
    letter-spacing: -0.2px;
    margin-bottom: 4px;
`;

export const TileSubtitle = styled.div`
    font-size: 14px;
    color: rgba(255, 255, 255, 0.60);
    line-height: 1.4;
`;

// ─── Screen title ─────────────────────────────────────────────────────────────

export const ScreenTitle = styled.h2<{ $recording?: boolean }>`
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: white;
    letter-spacing: -0.4px;
    line-height: 1.2;
    display: flex;
    align-items: center;
    gap: 10px;

    ${p => p.$recording && css`
        &::before {
            content: '';
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #ef4444;
            flex-shrink: 0;
            animation: ${pulseDot} 1.4s ease infinite;
        }
    `}
`;

// ─── Form elements — consistent with sharedFormStyles.ts (dark adaptation) ────

export const FormLabel = styled.label`
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.60);
    letter-spacing: 0.01em;
    line-height: 1;
`;

export const FormField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const PhoneInput = styled.input`
    width: 100%;
    padding: 14px 18px;
    background: rgba(255, 255, 255, 0.05);
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    font-size: 18px;
    font-weight: 400;
    color: white;
    outline: none;
    font-family: inherit;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &::placeholder { color: rgba(255, 255, 255, 0.28); }
    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14);
    }
`;

// ─── Dictation area ───────────────────────────────────────────────────────────

export const TranscriptDisplay = styled.div`
    flex: 1;
    min-height: 160px;
    padding: 14px 18px;
    background: rgba(255, 255, 255, 0.05);
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    font-size: 16px;
    color: white;
    line-height: 1.6;
    overflow-y: auto;
    word-break: break-word;
    white-space: pre-wrap;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
`;

export const Placeholder = styled.span`
    color: rgba(255, 255, 255, 0.28);
    pointer-events: none;
`;

export const InterimText = styled.span`
    color: rgba(255, 255, 255, 0.38);
    font-style: italic;
`;

export const TranscriptTextarea = styled.textarea`
    flex: 1;
    min-height: 160px;
    width: 100%;
    padding: 14px 18px;
    background: rgba(255, 255, 255, 0.05);
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    font-size: 16px;
    font-weight: 400;
    color: white;
    font-family: inherit;
    line-height: 1.6;
    resize: none;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &::placeholder { color: rgba(255, 255, 255, 0.28); }
    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14);
    }
`;

// ─── Permission error — from MobilePhotoUpload.styles.ts InfoCard pattern ─────

export const PermissionError = styled.div`
    padding: 14px 16px;
    background: rgba(220, 38, 38, 0.10);
    border: 1px solid rgba(220, 38, 38, 0.28);
    border-radius: 12px;
    color: #fca5a5;
    font-size: 13px;
    line-height: 1.5;
`;

// ─── Buttons — consistent with sharedButtonStyles.ts + Btn from MobilePhotoUpload ─

export const PrimaryBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 54px;
    padding: 16px 24px;
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    color: white;
    border: none;
    border-radius: 9999px;
    font-family: inherit;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(14, 165, 233, 0.28);
    transition: opacity 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    line-height: 1;

    &:hover:not(:disabled) { box-shadow: 0 4px 14px rgba(14, 165, 233, 0.38); transform: translateY(-1px); }
    &:active:not(:disabled) { transform: scale(0.98); }
    &:disabled { opacity: 0.38; cursor: not-allowed; transform: none; box-shadow: none; }
`;

export const SecondaryBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    min-height: 54px;
    padding: 14px 24px;
    background: rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.75);
    border: 1.5px solid rgba(255, 255, 255, 0.15);
    border-radius: 9999px;
    font-family: inherit;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, transform 0.1s ease;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    line-height: 1;

    &:active { background: rgba(255, 255, 255, 0.13); transform: scale(0.98); }
    &:disabled { opacity: 0.38; cursor: not-allowed; }
`;

export const LinkBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: #0ea5e9;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    padding: 0;
    min-height: 44px;
    transition: color 0.15s ease;
    -webkit-tap-highlight-color: transparent;

    svg { width: 16px; height: 16px; flex-shrink: 0; }
    &:active { color: #0284c7; }
`;

// ─── Bottom action bar ────────────────────────────────────────────────────────

export const BottomBar = styled.div`
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    padding-bottom: max(16px, env(safe-area-inset-bottom, 16px));
`;

// ─── Screen 4: Send states ────────────────────────────────────────────────────

export const SendBody = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    text-align: center;
    padding: 32px;
`;

export const SendIconWrap = styled.div<{ $type: 'success' | 'error' | 'sending' }>`
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    ${p => p.$type === 'success' && css`background: rgba(34, 197, 94, 0.12);`}
    ${p => p.$type === 'error'   && css`background: rgba(220, 38,  38,  0.12);`}

    svg { width: 40px; height: 40px; }
    ${p => p.$type === 'success' && css`svg { color: #86efac; }`}
    ${p => p.$type === 'error'   && css`svg { color: #fca5a5; }`}
`;

export const SendTitle = styled.p`
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: white;
    letter-spacing: -0.4px;
`;

export const SendMessage = styled.p`
    margin: 0;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.60);
    line-height: 1.5;
    max-width: 280px;
`;

// ─── Toast notification ───────────────────────────────────────────────────────

export const Toast = styled.div<{ $visible: boolean }>`
    position: fixed;
    bottom: calc(max(16px, env(safe-area-inset-bottom, 16px)) + 72px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(15, 23, 42, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    color: white;
    padding: 11px 20px;
    border-radius: 9999px;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    z-index: 200;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
    transition: opacity 0.2s ease;
    opacity: ${p => p.$visible ? 1 : 0};

    ${p => p.$visible && css`animation: ${toastIn} 0.2s ease;`}
`;
