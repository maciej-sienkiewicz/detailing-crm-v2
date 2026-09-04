/**
 * PickerList: the one convention for "search a record, pick it, or create a new one"
 * inside a modal.
 *
 * Search-and-pick modals used to each invent their own list: a table with a header row
 * that collapsed badly on a phone, hover states that slid the row sideways, and an
 * "add new" button parked in the modal footer where it reads as the confirm action.
 * These primitives replace that with rows that are plainly rows, sized on the same
 * scale as the rest of the design system, and an add-new affordance that sits with
 * the results it belongs to.
 *
 * Layout contract: <PickerSearch> → <PickerGroup>(<PickerRow>…, <PickerAddRow>) and
 * <PickerEmpty> when there is nothing to show.
 */
import type { ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

// ─── Search field ─────────────────────────────────────────────────────────────

const SearchWrap = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:hover { border-color: #cbd5e1; }

    &:focus-within {
        border-color: var(--brand-primary, #0ea5e9);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    svg {
        width: 17px;
        height: 17px;
        color: #94a3b8;
        flex-shrink: 0;
        margin-left: 12px;
    }
`;

const SearchInput = styled.input`
    width: 100%;
    min-width: 0;
    padding: 12px 12px 12px 10px;
    border: none;
    background: transparent;
    font-family: inherit;
    font-size: 14px;
    color: #0f172a;
    line-height: 1.5;

    &:focus { outline: none; }
    &::placeholder { color: #94a3b8; }
`;

const ClearBtn = styled.button`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    margin-right: 8px;
    border: none;
    border-radius: 50%;
    background: #f1f5f9;
    color: #64748b;
    cursor: pointer;
    transition: all 150ms ease;

    &:hover { background: #e2e8f0; color: #0f172a; }
    svg { width: 13px; height: 13px; margin-left: 0; color: currentColor; }
`;

const Spinner = styled.span`
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    margin-right: 13px;
    border: 2px solid #e2e8f0;
    border-top-color: var(--brand-primary, #0ea5e9);
    border-radius: 50%;
    animation: ${spin} 700ms linear infinite;

    @media (prefers-reduced-motion: reduce) { animation-duration: 2s; }
`;

interface PickerSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    /** Shows a spinner in place of the clear button while a query is in flight. */
    loading?: boolean;
    'aria-label'?: string;
}

/** Search field for a picker modal: magnifier, one input, a clear button once typed. */
export const PickerSearch = ({ value, onChange, placeholder, autoFocus, loading, ...rest }: PickerSearchProps) => (
    <SearchWrap>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <SearchInput
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            autoComplete="off"
            aria-label={rest['aria-label'] ?? placeholder}
        />
        {loading && <Spinner aria-hidden="true" />}
        {!loading && value.length > 0 && (
            <ClearBtn type="button" onClick={() => onChange('')} aria-label="Wyczyść wyszukiwanie">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </ClearBtn>
        )}
    </SearchWrap>
);

// ─── Groups & rows ────────────────────────────────────────────────────────────

/**
 * Status line + results, kept together as one block so the caption sits tight above the
 * list instead of inheriting the modal content's larger rhythm. Give it the room that is
 * left in the modal; the list scrolls inside it.
 */
export const PickerPane = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
`;

/**
 * The results region. It claims all the space the modal has left and scrolls inside it,
 * which is what keeps the window still: one result, twenty results, a spinner or an empty
 * state all occupy exactly the same block, so nothing below the list ever moves.
 *
 * Requires a parent with a settled height - pair it with `stableHeight` on ModalShell.
 */
export const PickerResults = styled.div<{ $stale?: boolean }>`
    flex: 1;
    min-height: 0;
    /* Results for the previous query, still on screen while the next one loads. Dimmed
       rather than removed: replacing them would empty the list on every keystroke. */
    opacity: ${p => p.$stale ? 0.55 : 1};
    transition: opacity 150ms ease;
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    overscroll-behavior: contain;
    /* Room for the focus ring of the first/last row, which would otherwise be clipped. */
    padding: 2px;
    margin: -2px;

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 2px; }
    &::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
`;

/**
 * One-line caption above the results - "Znaleziono 5 klientów", "Pojazdy tego klienta".
 * Always rendered, so its line is part of the layout whether or not there is anything to
 * count, and the list below it never shifts by a line height.
 */
export const PickerStatus = styled.p`
    flex-shrink: 0;
    margin: 0;
    min-height: 16px;
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.08em;
`;

export const PickerRow = styled.button<{ $selected?: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-width: 0;
    padding: 12px 14px;
    text-align: left;
    font-family: inherit;
    background: ${p => p.$selected ? 'rgba(14, 165, 233, 0.06)' : '#ffffff'};
    border: 1.5px solid ${p => p.$selected ? 'var(--brand-primary, #0ea5e9)' : '#e2e8f0'};
    border-radius: 12px;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease;

    &:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
    }

    &:focus-visible {
        outline: none;
        border-color: var(--brand-primary, #0ea5e9);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
    }

    @media (max-width: 480px) {
        padding: 11px 12px;
        gap: 10px;
    }
`;

/** Circular initials badge on the left of a row. */
export const PickerAvatar = styled.span`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #f1f5f9;
    color: #475569;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;

    svg { width: 17px; height: 17px; }

    @media (max-width: 480px) {
        width: 32px;
        height: 32px;
        font-size: 11px;
    }
`;

/** Main text column of a row: title on top, muted detail lines under it. */
export const PickerRowMain = styled.span`
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
`;

export const PickerRowTitle = styled.span`
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.35;
    overflow-wrap: anywhere;
`;

export const PickerRowSub = styled.span`
    font-size: 12.5px;
    color: #64748b;
    line-height: 1.4;
    overflow-wrap: anywhere;
`;

/** Right-hand detail (year, plate, owner). Drops under the title on narrow screens. */
export const PickerRowMeta = styled.span`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #475569;
    font-size: 11.5px;
    font-weight: 600;
    white-space: nowrap;

    @media (max-width: 480px) {
        display: none;
    }
`;

// ─── Add-new row ──────────────────────────────────────────────────────────────

const AddRowBtn = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    flex-shrink: 0;
    min-width: 0;
    padding: 12px 14px;
    text-align: left;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
    background: transparent;
    border: 1.5px dashed #cbd5e1;
    border-radius: 12px;
    cursor: pointer;
    transition: background 150ms ease, border-color 150ms ease, color 150ms ease;

    &:hover {
        background: rgba(14, 165, 233, 0.05);
        border-color: var(--brand-primary, #0ea5e9);
        color: var(--brand-primary, #0ea5e9);
    }

    &:focus-visible {
        outline: none;
        border-color: var(--brand-primary, #0ea5e9);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
    }
`;

const AddRowIcon = styled.span`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(14, 165, 233, 0.12);
    color: var(--brand-primary, #0ea5e9);

    svg { width: 14px; height: 14px; }
`;

const AddRowHint = styled.span`
    margin-left: auto;
    font-size: 12px;
    font-weight: 500;
    color: #94a3b8;

    @media (max-width: 560px) {
        display: none;
    }
`;

interface PickerAddRowProps {
    label: string;
    hint?: string;
    onClick: () => void;
}

/**
 * "Add a new record" affordance. It lives with the results rather than in the footer:
 * a primary button in the footer of a picker reads as "confirm and close", which is
 * the opposite of what starting a new record does.
 */
export const PickerAddRow = ({ label, hint, onClick }: PickerAddRowProps) => (
    <AddRowBtn type="button" onClick={onClick}>
        <AddRowIcon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
        </AddRowIcon>
        {label}
        {hint && <AddRowHint>{hint}</AddRowHint>}
    </AddRowBtn>
);

// ─── Loading placeholder ──────────────────────────────────────────────────────

const shimmer = keyframes`
    from { background-position: 100% 0; }
    to   { background-position: -100% 0; }
`;

const SkeletonRow = styled.div`
    flex-shrink: 0;
    height: 62px;
    border: 1.5px solid #eef2f6;
    border-radius: 12px;
    background: linear-gradient(90deg, #f8fafc 25%, #eef2f6 50%, #f8fafc 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.4s linear infinite;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
        background: #f8fafc;
    }

    @media (max-width: 480px) {
        height: 56px;
    }
`;

/**
 * Placeholder rows for the first load. Shaped like real rows so the list does not
 * announce itself with a jump when the data lands.
 */
export const PickerSkeleton = ({ rows = 4 }: { rows?: number }) => (
    <>
        {Array.from({ length: rows }, (_, i) => <SkeletonRow key={i} aria-hidden="true" />)}
    </>
);

// ─── Empty / status states ────────────────────────────────────────────────────

const EmptyWrap = styled.div`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 28px 20px;
    border: 1.5px dashed #e2e8f0;
    border-radius: 12px;
    background: #f8fafc;
    text-align: center;
`;

const EmptyTitle = styled.p`
    margin: 0;
    font-size: 13.5px;
    font-weight: 600;
    color: #475569;
`;

const EmptyDescription = styled.p`
    margin: 0;
    font-size: 12.5px;
    color: #94a3b8;
    line-height: 1.5;
`;

interface PickerEmptyProps {
    title: string;
    description?: string;
    children?: ReactNode;
}

/** Placeholder shown instead of a list: nothing typed yet, searching, or no results. */
export const PickerEmpty = ({ title, description, children }: PickerEmptyProps) => (
    <EmptyWrap>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
        {children}
    </EmptyWrap>
);
