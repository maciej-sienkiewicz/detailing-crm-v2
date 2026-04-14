import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { PayrollStatus } from '../types';

// Re-export shared primitives used by this tab
export {
    Field,
    Label,
    Input,
    CancelBtn,
    ErrorMsg,
    Spinner,
    EmptyText,
    FormActions,
    Section,
    TopRow,
    SectionTitle,
    FormBox,
    FormTitle,
    FormRow,
    InfoNote,
    TableWrapper,
    Table,
    Thead,
    Th,
    Tbody,
    Tr,
    Td,
    TdMuted,
} from './shared.styles';

// ─── Top bar button ───────────────────────────────────────────────────────────

export const GenerateBtn = styled.button`
    padding: 6px 14px;
    background: none;
    border: 1px solid ${st.accentGreen};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentGreen};
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: ${st.accentGreenDim}; }
`;

export const SaveBtn = styled.button`
    padding: 7px 16px;
    background: ${st.accentGreen};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    &:disabled { opacity: 0.6; cursor: not-allowed; }
    &:hover:not(:disabled) { background: #059669; }
`;

// ─── Table cells ──────────────────────────────────────────────────────────────

export const PeriodCell = styled.span`
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
`;

export const AmountCell = styled.span`
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
`;

export const StatusBadge = styled.span<{ $status: PayrollStatus }>`
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    ${({ $status }) => {
        if ($status === 'PAID') return `background: ${st.accentGreenDim}; color: #059669;`;
        if ($status === 'CONFIRMED') return `background: ${st.accentBlueDim}; color: #2563EB;`;
        return `background: ${st.accentAmberDim}; color: #D97706;`;
    }}
`;

export const ConfirmBtn = styled.button`
    padding: 4px 10px;
    background: none;
    border: 1px solid ${st.accentBlue};
    border-radius: ${st.radiusSm};
    font-size: 11px;
    font-weight: 600;
    color: ${st.accentBlue};
    cursor: pointer;
    white-space: nowrap;
    transition: background ${st.transition};
    &:hover { background: ${st.accentBlueDim}; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─── Breakdown (expanded sub-rows) ───────────────────────────────────────────

export const BreakdownTr = styled.tr`
    background: ${st.bgCardAlt};
    border-bottom: 1px solid ${st.border};
    &:last-child { border-bottom: none; }
`;

export const BreakdownTd = styled.td`
    padding: 4px 14px 4px 36px;
    font-size: 11px;
    color: ${st.textSecondary};
`;

export const BreakdownAmountTd = styled.td`
    padding: 4px 14px;
    font-size: 11px;
    color: ${st.textSecondary};
    white-space: nowrap;
`;

export const ExpandToggle = styled.button`
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 10px;
    color: ${st.textMuted};
    transition: color ${st.transition};
    &:hover { color: ${st.text}; }
`;
