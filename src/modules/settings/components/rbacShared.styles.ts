import styled, { keyframes } from 'styled-components';

// ─── Animations ─────────────────────────────────────────────────────────────
export const shimmer = keyframes`
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
`;

export const expandDown = keyframes`
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
`;

export const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

export const scaleIn = keyframes`
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);   }
`;

// ─── Layout ─────────────────────────────────────────────────────────────────
export const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

export const Toolbar = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

export const SearchWrap = styled.div`
    position: relative;
    flex: 1;
    min-width: 180px;
`;

export const SearchIconWrap = styled.div`
    position: absolute;
    left: 11px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    display: flex;
    pointer-events: none;
`;

export const SearchInput = styled.input`
    width: 100%;
    box-sizing: border-box;
    height: 38px;
    padding: 0 12px 0 34px;
    font-size: 13px;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    background: white;
    color: #0f172a;
    outline: none;
    font-family: inherit;
    transition: border-color 180ms, box-shadow 180ms;

    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.14);
    }
    &::placeholder { color: #94a3b8; }
`;

export const ToggleFilterBtn = styled.button<{ $on: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 14px;
    font-size: 13px;
    font-weight: ${p => (p.$on ? 600 : 500)};
    background: ${p => (p.$on ? 'rgba(14,165,233,0.08)' : 'white')};
    color: ${p => (p.$on ? '#0ea5e9' : '#475569')};
    border: 1.5px solid ${p => (p.$on ? 'rgba(14,165,233,0.4)' : '#e2e8f0')};
    border-radius: 9px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    font-family: inherit;
    transition: all 150ms;

    &:hover { border-color: #0ea5e9; color: #0ea5e9; }
`;

export const AddButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    height: 38px;
    padding: 0 18px;
    font-size: 13px;
    font-weight: 600;
    background: #0ea5e9;
    color: #fff;
    border: none;
    border-radius: 9px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    font-family: inherit;
    transition: opacity 150ms, transform 100ms;

    &:hover:not(:disabled) { opacity: 0.9; }
    &:active { transform: scale(0.98); }
    &:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
`;

export const StatsRow = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 18px;
`;

export const StatText = styled.span`
    font-size: 11px;
    color: #94a3b8;

    strong { color: #0f172a; font-weight: 700; }
`;

// ─── Card / list ────────────────────────────────────────────────────────────
export const Card = styled.div`
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
`;

export const ColLabel = styled.span`
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

// ─── Badges ─────────────────────────────────────────────────────────────────
export const Badge = styled.span<{ $variant?: 'green' | 'amber' | 'red' | 'blue' | 'gray' }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 9px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 9999px;
    white-space: nowrap;
    ${p => {
        switch (p.$variant) {
            case 'green': return 'background: rgba(16,185,129,0.1); color: #059669;';
            case 'amber': return 'background: rgba(245,158,11,0.12); color: #d97706;';
            case 'red':   return 'background: rgba(239,68,68,0.1); color: #dc2626;';
            case 'blue':  return 'background: rgba(14,165,233,0.1); color: #0284c7;';
            default:      return 'background: #f1f5f9; color: #64748b;';
        }
    }}
`;

export const Dot = styled.span<{ $color: string }>`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${p => p.$color};
`;

// ─── Empty state ────────────────────────────────────────────────────────────
export const EmptyWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    gap: 10px;
    text-align: center;
`;

export const EmptyTitle = styled.p`
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    color: #475569;
`;

export const EmptyDesc = styled.p`
    margin: 0;
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.6;
    max-width: 360px;
`;

// ─── Skeleton ───────────────────────────────────────────────────────────────
export const SkeletonBox = styled.div<{ $w?: string }>`
    height: 13px;
    width: ${p => p.$w ?? '100%'};
    background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s infinite;
    border-radius: 4px;
`;

// ─── Pagination ─────────────────────────────────────────────────────────────
export const Pager = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-top: 1px solid #f1f5f9;
    background: #fafbfc;
`;

export const PagerInfo = styled.span`
    font-size: 11px;
    color: #94a3b8;
`;

export const PagerControls = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

export const PagerBtn = styled.button<{ $active?: boolean }>`
    min-width: 30px;
    height: 30px;
    padding: 0 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-family: inherit;
    font-weight: ${p => (p.$active ? 700 : 500)};
    border-radius: 7px;
    border: 1px solid ${p => (p.$active ? 'rgba(14,165,233,0.3)' : '#e2e8f0')};
    background: ${p => (p.$active ? 'rgba(14,165,233,0.08)' : 'white')};
    color: ${p => (p.$active ? '#0ea5e9' : '#475569')};
    cursor: pointer;
    transition: all 150ms;

    &:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─── Modal ──────────────────────────────────────────────────────────────────
export const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.44);
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: ${fadeIn} 180ms ease;
`;

export const ModalCard = styled.div<{ $maxWidth?: number }>`
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: ${p => p.$maxWidth ?? 560}px;
    max-height: min(90vh, 860px);
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 64px rgba(15, 23, 42, 0.22), 0 4px 16px rgba(15, 23, 42, 0.1);
    animation: ${scaleIn} 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
    overflow: hidden;
`;

export const ModalHead = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    flex-shrink: 0;
`;

export const ModalTitle = styled.h3`
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
`;

export const ModalSubtitle = styled.p`
    font-size: 12px;
    color: #94a3b8;
    margin: 2px 0 0;
`;

export const ModalCloseBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    color: #64748b;
    cursor: pointer;
    transition: all 150ms;
    flex-shrink: 0;

    &:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
`;

export const ModalBody = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

export const ModalFooter = styled.div`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 14px 20px;
    border-top: 1px solid #f1f5f9;
    background: #fafbfc;
    flex-shrink: 0;
`;

// ─── Form ───────────────────────────────────────────────────────────────────
export const FormGrid = styled.div<{ $cols?: number }>`
    display: grid;
    grid-template-columns: repeat(${p => p.$cols ?? 2}, 1fr);
    gap: 14px;
`;

export const FormField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
`;

export const FieldLabel = styled.label`
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #334155;

    span { color: #ef4444; margin-left: 2px; }
`;

export const FieldInput = styled.input<{ $error?: boolean }>`
    width: 100%;
    box-sizing: border-box;
    height: 38px;
    padding: 0 12px;
    font-size: 13px;
    font-family: inherit;
    border: 1.5px solid ${p => (p.$error ? '#ef4444' : '#e2e8f0')};
    border-radius: 9px;
    background: white;
    color: #0f172a;
    outline: none;
    transition: border-color 180ms, box-shadow 180ms;

    &:focus {
        border-color: ${p => (p.$error ? '#ef4444' : '#0ea5e9')};
        box-shadow: 0 0 0 3px ${p => (p.$error ? 'rgba(239,68,68,0.12)' : 'rgba(14,165,233,0.14)')};
    }
    &::placeholder { color: #94a3b8; }
    &:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
`;

export const FieldTextarea = styled.textarea<{ $error?: boolean }>`
    width: 100%;
    box-sizing: border-box;
    min-height: 72px;
    padding: 10px 12px;
    font-size: 13px;
    font-family: inherit;
    border: 1.5px solid ${p => (p.$error ? '#ef4444' : '#e2e8f0')};
    border-radius: 9px;
    background: white;
    color: #0f172a;
    outline: none;
    resize: vertical;
    transition: border-color 180ms, box-shadow 180ms;

    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14,165,233,0.14);
    }
    &::placeholder { color: #94a3b8; }
`;

export const FieldSelect = styled.select`
    width: 100%;
    box-sizing: border-box;
    height: 38px;
    padding: 0 36px 0 12px;
    font-size: 13px;
    font-family: inherit;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    background: white;
    color: #0f172a;
    outline: none;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    transition: border-color 180ms, box-shadow 180ms;

    &:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.14); }
    &:disabled { background-color: #f8fafc; color: #94a3b8; cursor: not-allowed; }
`;

export const ErrorMsg = styled.span`
    font-size: 11px;
    color: #ef4444;
`;

export const HintText = styled.span`
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.5;
`;

// ─── Buttons ────────────────────────────────────────────────────────────────
export const CancelBtn = styled.button`
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 500;
    background: white;
    color: #334155;
    border: 1px solid #e2e8f0;
    border-radius: 9px;
    cursor: pointer;
    font-family: inherit;
    transition: background 150ms;

    &:hover:not(:disabled) { background: #f8fafc; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const SubmitBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    background: #0ea5e9;
    color: #fff;
    border: none;
    border-radius: 9px;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 150ms, transform 100ms;

    &:hover:not(:disabled) { opacity: 0.9; }
    &:active:not(:disabled) { transform: scale(0.98); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const SecondaryBtn = styled.button<{ $variant?: 'default' | 'danger' }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 600;
    background: white;
    color: ${p => (p.$variant === 'danger' ? '#dc2626' : '#334155')};
    border: 1.5px solid ${p => (p.$variant === 'danger' ? 'rgba(239,68,68,0.3)' : '#e2e8f0')};
    border-radius: 9px;
    cursor: pointer;
    font-family: inherit;
    transition: all 150ms;

    &:hover:not(:disabled) {
        background: ${p => (p.$variant === 'danger' ? 'rgba(239,68,68,0.06)' : '#f8fafc')};
        border-color: ${p => (p.$variant === 'danger' ? 'rgba(239,68,68,0.5)' : '#cbd5e1')};
    }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const DangerBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 700;
    background: #ef4444;
    color: #fff;
    border: none;
    border-radius: 9px;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 150ms;

    &:hover:not(:disabled) { opacity: 0.9; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─── Checkbox ───────────────────────────────────────────────────────────────
export const CheckRow = styled.label<{ $disabled?: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    cursor: ${p => (p.$disabled ? 'not-allowed' : 'pointer')};
    user-select: none;
    opacity: ${p => (p.$disabled ? 0.6 : 1)};
`;

export const CheckBox = styled.span<{ $checked: boolean }>`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin-top: 1px;
    border-radius: 5px;
    border: 1.5px solid ${p => (p.$checked ? '#0ea5e9' : '#cbd5e1')};
    background: ${p => (p.$checked ? '#0ea5e9' : 'white')};
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    transition: all 150ms;
`;
