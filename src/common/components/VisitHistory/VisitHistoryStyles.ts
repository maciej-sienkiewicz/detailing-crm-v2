// src/common/components/VisitHistory/VisitHistoryStyles.ts
// Shared styled components used by CustomerVisitHistory and VehicleVisitHistory.

import styled from 'styled-components';

/* ─── Container / Header ─────────────────────────────── */

export const Container = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    overflow: hidden;
    display: flex;
    flex-direction: column;
`;

export const Header = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${props => props.theme.spacing.lg};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

export const Title = styled.h3`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

export const Subtitle = styled.p`
    margin: 4px 0 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

/* ─── Filter Bar ─────────────────────────────────────── */

export const FilterBar = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    background: #f8fafc;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    flex-wrap: wrap;
`;

export const SearchInput = styled.div`
    position: relative;
    flex: 1;
    min-width: 180px;

    svg {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        color: ${props => props.theme.colors.textMuted};
        pointer-events: none;
    }

    input {
        width: 100%;
        padding: 8px 12px 8px 34px;
        border: 1px solid ${props => props.theme.colors.border};
        border-radius: ${props => props.theme.radii.md};
        font-size: ${props => props.theme.fontSizes.sm};
        background: white;
        color: ${props => props.theme.colors.text};
        box-sizing: border-box;
        transition: border-color 0.2s ease;

        &:focus {
            outline: none;
            border-color: var(--brand-primary);
            box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }

        &::placeholder { color: ${props => props.theme.colors.textMuted}; }
    }
`;

export const FilterSelect = styled.select`
    padding: 8px 32px 8px 12px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    background: white;
    color: ${props => props.theme.colors.text};
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    transition: border-color 0.2s ease;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
    }
`;

export const ResultCount = styled.span`
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
    white-space: nowrap;
    padding: 0 ${props => props.theme.spacing.xs};
`;

/* ─── Entry List / Row ───────────────────────────────── */

export const VisitList = styled.div`
    flex: 1;
    overflow-y: auto;
`;

/** Outer wrapper — provides hover context for RowActions. */
export const EntryWrapper = styled.div<{ $isAbandoned?: boolean }>`
    border-bottom: 1px solid ${props => props.theme.colors.border};
    background: ${props => props.$isAbandoned ? '#fff5f5' : 'transparent'};

    &:last-child {
        border-bottom: none;
    }
`;

/** Inner grid row: accent stripe | content | actions | right */
export const VisitRow = styled.div<{ $isAbandoned?: boolean }>`
    display: grid;
    grid-template-columns: 4px 1fr auto auto;
    gap: 0;
    align-items: center;
    transition: background 0.15s ease;
    cursor: default;

    &:hover {
        background: ${props => props.$isAbandoned ? '#fee2e2' : '#f8fafc'};
    }
`;

export const VisitAccent = styled.div<{ $status: string }>`
    align-self: stretch;
    background: ${props => {
        const s = props.$status;
        if (s === 'scheduled' || s === 'CREATED' || s === 'created') return '#f59e0b';
        if (s === 'in-progress' || s === 'in_progress') return 'var(--brand-primary)';
        if (s === 'completed' || s === 'CONVERTED') return '#10b981';
        if (s === 'cancelled' || s === 'CANCELLED' || s === 'ABANDONED') return '#ef4444';
        return '#94a3b8';
    }};
`;

export const VisitContent = styled.div`
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
`;

export const VisitTitleRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
`;

/** "Wizyta" / "Rezerwacja" kind badge — same style in both history views. */
export const VisitTypeBadge = styled.span<{ $isReservation?: boolean }>`
    display: inline-flex;
    padding: 2px 8px;
    border-radius: ${props => props.theme.radii.sm};
    font-size: 11px;
    font-weight: 500;
    background: ${props => props.$isReservation ? '#ede9fe' : '#dbeafe'};
    color: ${props => props.$isReservation ? '#5b21b6' : '#1e40af'};
    text-transform: uppercase;
    letter-spacing: 0.3px;
    flex-shrink: 0;
`;

export const VisitDetails = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    font-size: ${props => props.theme.fontSizes.xs};
    color: ${props => props.theme.colors.textMuted};
`;

/* ─── Row Actions (revealed on hover) ────────────────── */

export const RowActions = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 ${props => props.theme.spacing.md};
    opacity: 0;
    pointer-events: none;
    transform: translateX(4px);
    transition: opacity 0.15s ease, transform 0.15s ease;

    ${EntryWrapper}:hover & {
        opacity: 1;
        pointer-events: all;
        transform: translateX(0);
    }
`;

export const ActionBtn = styled.button<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 11px;
    border-radius: ${props => props.theme.radii.md};
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.15s ease;

    ${props => props.$primary ? `
        background: var(--brand-primary);
        color: white;
        border: 1px solid var(--brand-primary);
        &:hover { opacity: 0.85; }
    ` : `
        background: white;
        color: ${props.theme.colors.textSecondary};
        border: 1px solid ${props.theme.colors.border};
        &:hover {
            border-color: var(--brand-primary);
            color: var(--brand-primary);
            background: rgba(14, 165, 233, 0.04);
        }
    `}

    svg {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
    }
`;

/* ─── Right Column ───────────────────────────────────── */

export const VisitRight = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: center;
    padding: ${props => props.theme.spacing.md} ${props => props.theme.spacing.lg};
    gap: 4px;
`;

export const VisitCost = styled.span`
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

export const VisitStatusBadge = styled.span<{ $status: string }>`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: ${props => props.theme.radii.full};
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;

    ${props => {
        const s = props.$status;
        if (s === 'completed' || s === 'CONVERTED') return 'background: #dcfce7; color: #166534;';
        if (s === 'in-progress' || s === 'in_progress') return 'background: #dbeafe; color: #1e40af;';
        if (s === 'scheduled' || s === 'CREATED' || s === 'created') return 'background: #fef3c7; color: #92400e;';
        if (s === 'cancelled' || s === 'CANCELLED' || s === 'ABANDONED') return 'background: #fee2e2; color: #991b1b;';
        return 'background: #f3f4f6; color: #6b7280;';
    }}
`;

/* ─── Empty State ────────────────────────────────────── */

export const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: ${props => props.theme.spacing.xxl} ${props => props.theme.spacing.lg};
    text-align: center;
    color: ${props => props.theme.colors.textMuted};
    min-height: 200px;
`;

export const EmptyIcon = styled.div`
    width: 56px;
    height: 56px;
    border-radius: ${props => props.theme.radii.full};
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: ${props => props.theme.spacing.md};
    font-size: 24px;
`;

export const EmptyTitle = styled.p`
    margin: 0 0 4px;
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 600;
    color: ${props => props.theme.colors.textSecondary};
`;

export const EmptyText = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
`;
