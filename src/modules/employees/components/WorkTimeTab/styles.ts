/**
 * WorkTimeTab — styled-components library.
 * No logic here; purely visual primitives consumed by the TSX files.
 */

import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Layout ───────────────────────────────────────────────────────────────────

export const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
`;

export const TabHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0 16px 0;
    flex-wrap: wrap;
    gap: 8px;
`;

export const SectionTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

// ─── Monthly period table ─────────────────────────────────────────────────────

export const PeriodTable = styled.div`
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    overflow: hidden;
    /* As a flex item inside Section, min-width: auto would let this element
       grow to its max-content width, overriding the parent's overflow-x: hidden.
       Setting min-width: 0 ensures it never expands beyond the available space. */
    min-width: 0;
`;

export const PeriodTableHead = styled.div`
    display: grid;
    grid-template-columns: 1fr 130px 160px 100px;
    background: ${st.bgCardAlt};
    border-bottom: 1px solid ${st.border};
    padding: 9px 16px;
`;

export const PeriodTh = styled.span`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

export const PeriodRow = styled.div<{ $even: boolean }>`
    display: grid;
    grid-template-columns: 1fr 130px 160px 100px;
    align-items: center;
    padding: 14px 16px;
    background: ${({ $even }) => ($even ? st.bgCard : st.bgCardAlt)};
    border-bottom: 1px solid ${st.border};
    transition: background ${st.transition};

    &:last-child { border-bottom: none; }
`;

export const PeriodName = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

export const PeriodNameMain = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

export const PeriodHours = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    font-variant-numeric: tabular-nums;
`;

export const PeriodHoursLoading = styled.span`
    display: inline-block;
    width: 60px;
    height: 14px;
    background: ${st.border};
    border-radius: 4px;
    opacity: 0.6;
`;

/** Status badge — variant colours driven by TimesheetStatus */
export const StatusBadge = styled.span<{ $status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | string }>`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 600;
    white-space: nowrap;

    ${({ $status }) => {
        switch ($status) {
            case 'APPROVED':
                return `background: rgba(16,185,129,0.12); color: #059669;`;
            case 'SUBMITTED':
                return `background: rgba(245,158,11,0.12); color: #D97706;`;
            default: // DRAFT or unknown
                return `background: ${st.bgCardAlt}; color: ${st.textMuted}; border: 1px solid ${st.border};`;
        }
    }}
`;

export const OpenBtn = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    background: none;
    border: 1px solid ${({ $active }) => ($active ? st.accentBlue : st.border)};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${({ $active }) => ($active ? st.accentBlue : st.textSecondary)};
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
        background: ${st.accentBlueDim};
    }
`;

// ─── Expanded month detail panel ──────────────────────────────────────────────

export const ExpandedPanel = styled.div`
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    &:last-child { border-bottom: none; }
`;

export const ExpandedPanelHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
`;

export const ExpandedPanelTitle = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

export const ExpandedPanelTitleMain = styled.span`
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

export const ExpandedPanelTitleSub = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

export const AddBenefitBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    background: ${st.bgCard};
    border: 1.5px solid ${st.accentBlue};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentBlue};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover {
        background: ${st.accentBlueDim};
    }
`;

/** Row of action buttons (Save / Discard) shown below the day grid. */
export const PanelActions = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

export const SaveBtn = styled.button`
    display: inline-flex;
    align-items: center;
    padding: 8px 20px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: opacity ${st.transition};

    &:hover:not(:disabled) { opacity: 0.85; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const DiscardBtn = styled.button`
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover:not(:disabled) {
        border-color: ${st.borderHover};
        color: ${st.text};
    }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─── Day grid (scrollable timesheet) ─────────────────────────────────────────

/** Wrapper that enables horizontal scroll while keeping label and total columns sticky. */
export const GridScrollWrapper = styled.div`
    overflow-x: auto;
    /* min-width: 0 ensures this flex item never exceeds its parent width,
       which is required for overflow-x: auto to create a scroll container
       instead of expanding the whole page. */
    min-width: 0;
    width: 100%;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    background: ${st.bgCard};

    /* Custom thin scrollbar */
    &::-webkit-scrollbar { height: 6px; }
    &::-webkit-scrollbar-track { background: ${st.bgCardAlt}; }
    &::-webkit-scrollbar-thumb { background: ${st.border}; border-radius: 3px; }
`;

export const GridTable = styled.table`
    border-collapse: collapse;
    min-width: max-content;
    width: 100%;
    font-size: ${st.fontXs};
`;

export const GridThead = styled.thead`
    background: ${st.bgCardAlt};
`;

export const GridTbody = styled.tbody``;

// Label cell — sticky on the left
export const LabelCell = styled.td`
    position: sticky;
    left: 0;
    z-index: 2;
    background: inherit;
    min-width: 160px;
    max-width: 160px;
    padding: 8px 12px;
    font-weight: 600;
    color: ${st.textSecondary};
    border-right: 2px solid ${st.border};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const LabelTh = styled.th`
    position: sticky;
    left: 0;
    z-index: 3;
    background: ${st.bgCardAlt};
    min-width: 160px;
    max-width: 160px;
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-right: 2px solid ${st.border};
    border-bottom: 1px solid ${st.border};
    white-space: nowrap;
`;

// Total cell — sticky on the right
export const TotalCell = styled.td`
    position: sticky;
    right: 0;
    z-index: 2;
    background: inherit;
    min-width: 72px;
    padding: 8px 10px;
    font-weight: 700;
    color: ${st.text};
    text-align: right;
    border-left: 2px solid ${st.border};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

export const TotalTh = styled.th`
    position: sticky;
    right: 0;
    z-index: 3;
    background: ${st.bgCardAlt};
    min-width: 72px;
    padding: 8px 10px;
    text-align: right;
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.4px;
    border-left: 2px solid ${st.border};
    border-bottom: 1px solid ${st.border};
    white-space: nowrap;
`;

// Per-day header cell
export const DayTh = styled.th<{
    $weekend: boolean;
    $holiday: boolean;
    $today: boolean;
}>`
    min-width: 52px;
    max-width: 52px;
    padding: 6px 4px;
    text-align: center;
    border-right: 1px solid ${st.border};
    border-bottom: 1px solid ${st.border};
    font-weight: 600;
    color: ${({ $holiday, $weekend, $today }) =>
        $holiday ? '#B45309' : $today ? st.accentBlue : $weekend ? st.textMuted : st.textSecondary};
    background: ${({ $holiday, $today, $weekend }) =>
        $holiday
            ? 'rgba(245,158,11,0.10)'
            : $today
            ? 'rgba(59,130,246,0.08)'
            : $weekend
            ? st.bgCardAlt
            : 'transparent'};
`;

export const DayNumber = styled.div`
    font-size: 13px;
    line-height: 1.2;
`;

export const DayName = styled.div`
    font-size: 10px;
    font-weight: 400;
    opacity: 0.75;
    margin-top: 1px;
`;

export const HolidayDot = styled.div`
    width: 4px;
    height: 4px;
    background: #B45309;
    border-radius: 50%;
    margin: 2px auto 0;
`;

// Per-day data cell
export const DayTd = styled.td<{
    $weekend: boolean;
    $holiday: boolean;
    $today: boolean;
}>`
    min-width: 52px;
    max-width: 52px;
    padding: 4px 3px;
    text-align: center;
    border-right: 1px solid ${st.border};
    border-bottom: 1px solid ${st.border};
    background: ${({ $holiday, $today, $weekend }) =>
        $holiday
            ? 'rgba(245,158,11,0.05)'
            : $today
            ? 'rgba(59,130,246,0.04)'
            : $weekend
            ? st.bgCardAlt
            : 'transparent'};
    vertical-align: middle;
`;

/** Editable hour input inside a DayTd */
export const HoursInput = styled.input<{ $saving?: boolean; $saved?: boolean }>`
    width: 44px;
    padding: 4px 2px;
    border: 1px solid ${({ $saving, $saved }) =>
        $saving ? st.accentAmber : $saved ? st.accentGreen : 'transparent'};
    border-radius: 4px;
    font-size: ${st.fontXs};
    font-weight: 600;
    text-align: center;
    color: ${st.text};
    background: transparent;
    outline: none;
    transition: border-color ${st.transition};
    font-variant-numeric: tabular-nums;

    /* Remove native number spinners */
    -moz-appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }

    &:focus {
        border-color: ${st.accentBlue};
        background: ${st.bgCard};
        box-shadow: ${st.shadowBlue};
    }

    &:disabled {
        color: ${st.textSecondary};
        background: transparent;
        border-color: transparent;
        cursor: default;
    }
`;

/** Read-only hours value (benefits row or approved month) */
export const HoursValue = styled.span`
    display: block;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    font-variant-numeric: tabular-nums;
`;

export const EmptyDash = styled.span`
    display: block;
    color: ${st.border};
    font-size: 13px;
`;

// Total row
export const TotalRow = styled.tr`
    background: ${st.bgCardAlt};

    ${LabelCell} {
        background: ${st.bgCardAlt};
        color: ${st.text};
        border-top: 2px solid ${st.border};
    }

    ${TotalCell} {
        background: ${st.bgCardAlt};
        border-top: 2px solid ${st.border};
    }

    td {
        border-top: 2px solid ${st.border};
    }
`;

/** Label cell for benefit rows — extends LabelCell with flex layout for the remove button. */
export const BenefitLabelCell = styled(LabelCell)`
    display: flex;
    align-items: center;
    gap: 6px;
`;

/** Small × button shown in the benefit-row label cell. */
export const RowRemoveBtn = styled.button`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    margin-left: auto;
    border-radius: 50%;
    border: 1px solid ${st.border};
    background: none;
    color: ${st.textMuted};
    font-size: 13px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    transition: all ${st.transition};

    &:hover:not(:disabled) {
        background: ${st.accentRedDim};
        border-color: ${st.accentRed};
        color: ${st.accentRed};
    }

    &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }
`;

// ─── Benefits section ─────────────────────────────────────────────────────────

export const BenefitsSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const BenefitsSectionTitle = styled.h4`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

export const BenefitCard = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

export const BenefitCardInfo = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

export const BenefitCardName = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

export const BenefitCardMeta = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

export const BenefitCardHours = styled.span`
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
`;

export const BenefitDeleteBtn = styled.button`
    padding: 4px 10px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    color: ${st.accentRed};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover { background: ${st.accentRedDim}; border-color: ${st.accentRed}; }
    &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

export const BenefitStatusBadge = styled.span<{ $status: string }>`
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    ${({ $status }) => {
        if ($status === 'APPROVED') return 'background: rgba(16,185,129,0.12); color: #059669;';
        if ($status === 'REJECTED') return 'background: rgba(239,68,68,0.10); color: #DC2626;';
        return 'background: rgba(245,158,11,0.12); color: #D97706;';
    }}
`;

// ─── Misc ─────────────────────────────────────────────────────────────────────

export const Spinner = styled.div`
    width: 28px;
    height: 28px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 24px auto;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

export const EmptyText = styled.p`
    margin: 0;
    padding: 24px 0;
    text-align: center;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

export const ErrorText = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
    padding: 8px 12px;
    background: ${st.accentRedDim};
    border-radius: ${st.radiusSm};
`;
