import styled, { keyframes } from 'styled-components';

// ─── Animations ─────────────────────────────────────────────────────────────
export const shimmer = keyframes`
    0%   { background-position: -200% 0; }
    100% { background-position:  200% 0; }
`;

// ─── Layout ─────────────────────────────────────────────────────────────────
export const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

/**
 * Nagłówek kolumny tabeli: zdaniem, 12.5px, półgruby. Był 11px wersalikami w szarości -
 * etykieta, która była jedyną ramą listy (CLAUDE.md §2, wycofane).
 */
export const ColLabel = styled.span`
    font-size: 12.5px;
    font-weight: 600;
    color: #64748b;
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
    font-size: 12.5px;
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
    font-size: 12.5px;
    color: #64748b;
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
    font-size: 12.5px;
    font-family: inherit;
    font-weight: ${p => (p.$active ? 700 : 500)};
    border-radius: 7px;
    border: 1px solid ${p => (p.$active ? 'rgba(3, 105, 161, 0.3)' : '#e2e8f0')};
    background: ${p => (p.$active ? 'rgba(3, 105, 161, 0.08)' : 'white')};
    color: ${p => (p.$active ? '#0369a1' : '#475569')};
    cursor: pointer;
    transition: all 150ms;

    &:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─── Form ───────────────────────────────────────────────────────────────────
export const FormGrid = styled.div<{ $cols?: number }>`
    display: grid;
    grid-template-columns: repeat(${p => p.$cols ?? 2}, minmax(0, 1fr));
    gap: 14px;

    /* Dwa pola obok siebie na telefonie to dwa pola po 150px, w których nie mieści się adres e-mail. */
    @media (max-width: 640px) { grid-template-columns: minmax(0, 1fr); }
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
        border-color: ${p => (p.$error ? '#ef4444' : '#0369a1')};
        box-shadow: 0 0 0 3px ${p => (p.$error ? 'rgba(239,68,68,0.12)' : 'rgba(3, 105, 161, 0.14)')};
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
        border-color: #0369a1;
        box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.14);
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

    &:focus { border-color: #0369a1; box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.14); }
    &:disabled { background-color: #f8fafc; color: #94a3b8; cursor: not-allowed; }
`;

export const ErrorMsg = styled.span`
    font-size: 12px;
    color: #ef4444;
`;

export const HintText = styled.span`
    font-size: 12px;
    color: #64748b;
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
/**
 * Wiersz pola wyboru. Renderuj go jako `<CheckRow as="button" role="checkbox"
 * aria-checked=…>`: jako `<div onClick>` nie dało się go zaznaczyć klawiaturą,
 * a czytnik ekranu nie wiedział, że to pole wyboru. Reset stylów przycisku poniżej
 * jest dla `div` obojętny.
 */
export const CheckRow = styled.div<{ $disabled?: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: ${p => (p.$disabled ? 'not-allowed' : 'pointer')};
    user-select: none;
    opacity: ${p => (p.$disabled ? 0.6 : 1)};
    min-height: 20px;

    &:focus-visible { outline: 2px solid #8ebbd5; outline-offset: 3px; border-radius: 6px; }
`;

export const CheckBox = styled.span<{ $checked: boolean }>`
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    margin-top: 1px;
    border-radius: 5px;
    border: 1.5px solid ${p => (p.$checked ? '#0369a1' : '#cbd5e1')};
    background: ${p => (p.$checked ? '#0369a1' : 'white')};
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    transition: all 150ms;
`;
