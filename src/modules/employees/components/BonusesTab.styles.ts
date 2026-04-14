import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { BonusStatus } from '../types';

// Re-export shared primitives used by this tab
export {
    Field,
    Label,
    Input,
    Textarea,
    CancelBtn,
    ErrorMsg,
    Spinner,
    Overlay,
    ModalBox,
    ModalTitle,
    FormActions,
    Section,
    TopRow,
    SectionTitle,
    EmptyText,
    OutlineGreenBtn,
    OutlineRedBtn,
    TableWrapper,
    Table,
    Thead,
    Th,
    Tbody,
    Tr,
    Td,
    TdMuted,
} from './shared.styles';

// ─── Top toolbar ──────────────────────────────────────────────────────────────

export const Actions = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
`;

export const PeriodInput = styled.input`
    padding: 6px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    &:focus { border-color: ${st.accentBlue}; }
`;

// ─── Table cells ──────────────────────────────────────────────────────────────

export const AmountCell = styled.span<{ $negative: boolean }>`
    font-weight: 700;
    color: ${({ $negative }) => ($negative ? st.accentRed : st.accentGreen)};
    white-space: nowrap;
`;

export const StatusBadge = styled.span<{ $status: BonusStatus }>`
    padding: 2px 8px;
    border-radius: ${st.radiusFull};
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    ${({ $status }) =>
        $status === 'PENDING'
            ? `background: ${st.accentAmberDim}; color: #D97706;`
            : `background: ${st.accentBlueDim}; color: #2563EB;`}
`;

export const DeleteBtn = styled.button`
    padding: 4px 10px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    color: ${st.accentRed};
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: ${st.accentRedDim}; border-color: ${st.accentRed}; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export const NotesCell = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-style: italic;
`;

// ─── Modal save button (green for bonus, red for deduction) ───────────────────

export const SaveBonusBtn = styled.button<{ $danger?: boolean }>`
    padding: 7px 16px;
    background: ${({ $danger }) => ($danger ? st.accentRed : st.accentGreen)};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    &:disabled { opacity: 0.6; cursor: not-allowed; }
    &:hover:not(:disabled) { opacity: 0.9; }
`;
