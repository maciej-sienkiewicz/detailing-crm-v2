import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { EmploymentMode } from '../../types';

// ─── Tab Container ────────────────────────────────────────────────────────────

export const TabContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

export const TabHeaderRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

export const TabTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

// ─── Contract Card ────────────────────────────────────────────────────────────

export const ContractCardWrapper = styled.div<{ $active: boolean }>`
    background: ${st.bgCard};
    border: 1px solid ${({ $active }) => ($active ? 'rgba(16,185,129,0.3)' : st.border)};
    border-radius: ${st.radius};
    border-left: 3px solid ${({ $active }) => ($active ? '#10B981' : '#CBD5E1')};
    box-shadow: ${({ $active }) =>
        $active
            ? '0 2px 12px rgba(16,185,129,0.08), 0 1px 4px rgba(0,0,0,0.04)'
            : st.shadowSm};
    overflow: hidden;
    transition: box-shadow ${st.transition};
`;

export const ContractCardHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px 20px;
    gap: 12px;
    flex-wrap: wrap;
`;

export const ContractHeaderLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const ContractBadgeRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

export const ContractTypeBadge = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
    letter-spacing: -0.01em;
`;

export const ContractStatusPill = styled.span<{ $active: boolean }>`
    padding: 2px 9px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    ${({ $active }) =>
        $active
            ? 'background: rgba(16,185,129,0.12); color: #059669;'
            : 'background: rgba(100,116,139,0.10); color: #64748B;'}
`;

export const ContractDateRange = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
`;

export const ContractEtatInfo = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

export const CardActionGroup = styled.div`
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    flex-wrap: wrap;
`;

export const AmendBtn = styled.button`
    padding: 5px 14px;
    background: none;
    border: 1px solid ${st.accentBlue};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentBlue};
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: ${st.accentBlueDim}; }
`;

export const EndBtn = styled.button`
    padding: 5px 14px;
    background: none;
    border: 1px solid ${st.accentRed};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentRed};
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: ${st.accentRedDim}; }
`;

// ─── Active Contract Body ─────────────────────────────────────────────────────

export const ContractBody = styled.div`
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 0;
    border-top: 1px solid ${st.border};

    @media (max-width: 720px) {
        grid-template-columns: 1fr;
    }
`;

// ─── Salary Section (left column) ────────────────────────────────────────────

export const SalarySection = styled.div`
    padding: 16px 20px;
    border-right: 1px solid ${st.border};
    display: flex;
    flex-direction: column;
    gap: 10px;

    @media (max-width: 720px) {
        border-right: none;
        border-bottom: 1px solid ${st.border};
    }
`;

export const SalarySectionLabel = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

export const SalaryAmountBlock = styled.div`
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
`;

export const SalaryAmountValue = styled.p`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    line-height: 1.2;
`;

export const SalaryAmountLabel = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    font-weight: 500;
`;

export const SalaryMetaList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const SalaryMetaRow = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
`;

export const SalaryMetaLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    white-space: nowrap;
`;

export const SalaryMetaValue = styled.span`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    text-align: right;
`;

export const ModeBadge = styled.span<{ $mode: EmploymentMode }>`
    display: inline-block;
    padding: 2px 8px;
    border-radius: ${st.radiusSm};
    font-size: 10px;
    font-weight: 700;
    background: ${p => (p.$mode === 'SALARY' ? '#EFF6FF' : '#F0FDF4')};
    color: ${p => (p.$mode === 'SALARY' ? '#1D4ED8' : '#16A34A')};
`;

// ─── Components Section (right column) ───────────────────────────────────────

export const ComponentsSection = styled.div`
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

export const ComponentsSectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

export const ComponentsSectionLabel = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.6px;
`;

export const AddComponentBtn = styled.button`
    padding: 3px 10px;
    background: none;
    border: 1px dashed ${st.accentBlue};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentBlue};
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: ${st.accentBlueDim}; }
`;

export const ComponentRow = styled.div<{ $inactive?: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid ${st.border};
    opacity: ${p => (p.$inactive ? 0.45 : 1)};
    &:last-child { border-bottom: none; }
`;

export const ComponentDot = styled.span<{ $active: boolean }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${p => (p.$active ? '#10B981' : '#CBD5E1')};
`;

export const ComponentInfo = styled.div`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

export const ComponentName = styled.span`
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const ComponentMeta = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
`;

export const ComponentValueBadge = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.accentBlue};
    white-space: nowrap;
    flex-shrink: 0;
`;

export const TypePill = styled.span`
    padding: 1px 6px;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 600;
    background: rgba(99, 102, 241, 0.1);
    color: #6366F1;
    white-space: nowrap;
    flex-shrink: 0;
`;

export const ComponentActionGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
`;

export const ToggleBtn = styled.button<{ $active: boolean }>`
    padding: 2px 7px;
    border-radius: ${st.radiusSm};
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid ${p => (p.$active ? '#10B981' : st.border)};
    background: ${p => (p.$active ? 'rgba(16,185,129,0.08)' : 'transparent')};
    color: ${p => (p.$active ? '#10B981' : st.textMuted)};
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const DeleteComponentBtn = styled.button`
    padding: 2px 7px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: 10px;
    color: ${st.accentRed};
    background: none;
    cursor: pointer;
    &:hover { background: rgba(239, 68, 68, 0.08); }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export const ComponentsEmpty = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-style: italic;
    padding: 4px 0;
`;

// ─── Inactive Contract Summary ────────────────────────────────────────────────

export const InactiveSummary = styled.div`
    padding: 8px 20px 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
`;

export const InactiveSalarySummary = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

export const TerminationInfo = styled.span`
    font-size: ${st.fontXs};
    color: #B45309;
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.2);
    border-radius: ${st.radiusSm};
    padding: 2px 8px;
`;

// ─── Amendment History ────────────────────────────────────────────────────────

export const HistorySection = styled.div`
    border-top: 1px solid ${st.border};
    padding: 0 20px;
`;

export const HistoryToggle = styled.button`
    display: flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    padding: 10px 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: color ${st.transition};
    &:hover { color: ${st.text}; }
`;

export const HistoryToggleIcon = styled.span<{ $open: boolean }>`
    display: inline-block;
    transition: transform 0.15s ease;
    transform: ${p => (p.$open ? 'rotate(90deg)' : 'rotate(0deg)')};
    font-size: 10px;
`;

export const HistoryList = styled.div`
    display: flex;
    flex-direction: column;
    padding-bottom: 12px;
`;

export const HistoryRow = styled.div<{ $current?: boolean }>`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 0;
    border-bottom: 1px solid ${st.border};
    &:last-child { border-bottom: none; }
    opacity: ${p => (p.$current ? 1 : 0.55)};
`;

export const HistoryRowLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

export const HistorySep = styled.span`
    color: ${st.textMuted};
    font-size: ${st.fontXs};
    flex-shrink: 0;
`;

export const HistoryAmountText = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
`;

export const HistoryPeriod = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

export const CurrentTag = styled.span`
    font-size: 10px;
    font-weight: 700;
    color: #10B981;
    background: rgba(16, 185, 129, 0.1);
    border-radius: 9999px;
    padding: 1px 6px;
`;

// ─── Inline Forms ─────────────────────────────────────────────────────────────

export const InlineFormWrapper = styled.div`
    border-top: 1px solid ${st.border};
    background: ${st.bgCardAlt};
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

export const FormTitle = styled.h4`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

export const FormSectionLabel = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

export const FormSeparator = styled.div`
    height: 1px;
    background: ${st.border};
`;

export const FormRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;

    @media (max-width: 480px) {
        grid-template-columns: 1fr;
    }
`;

export const FormRow3 = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;

    @media (max-width: 620px) {
        grid-template-columns: 1fr 1fr;
    }

    @media (max-width: 400px) {
        grid-template-columns: 1fr;
    }
`;

export const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const Label = styled.label`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
`;

export const Input = styled.input`
    padding: 8px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    &:focus { border-color: ${st.accentBlue}; }
`;

export const Select = styled.select`
    padding: 8px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    cursor: pointer;
    &:focus { border-color: ${st.accentBlue}; }
`;

export const Textarea = styled.textarea`
    padding: 8px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    resize: vertical;
    min-height: 56px;
    &:focus { border-color: ${st.accentBlue}; }
`;

export const ModeToggle = styled.div`
    display: flex;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    overflow: hidden;
`;

export const ModeButton = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 8px 0;
    border: none;
    background: ${p => (p.$active ? st.accentBlue : 'transparent')};
    color: ${p => (p.$active ? '#fff' : st.textSecondary)};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: background ${st.transition}, color ${st.transition};
    &:hover {
        background: ${p => (p.$active ? '#1D4ED8' : st.bgCardAlt)};
    }
`;

export const CalcPreview = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

export const CalcLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
`;

export const CalcValue = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.accentBlue};
`;

export const FormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

export const CancelBtn = styled.button`
    padding: 7px 14px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    &:hover { border-color: ${st.borderHover}; }
`;

export const SaveBtn = styled.button`
    padding: 7px 16px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    &:disabled { opacity: 0.6; cursor: not-allowed; }
    &:hover:not(:disabled) { background: #1D4ED8; }
`;

export const DangerSaveBtn = styled(SaveBtn)`
    background: ${st.accentRed};
    &:hover:not(:disabled) { background: #DC2626; }
`;

export const ErrorMsg = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
`;

export const HintText = styled.p`
    margin: 0;
    font-size: 11px;
    color: ${st.textMuted};
    font-style: italic;
`;

// ─── Modal ────────────────────────────────────────────────────────────────────

export const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
`;

export const ModalBox = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 24px;
    width: 100%;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-height: 90vh;
    overflow-y: auto;
`;

export const ModalTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

// ─── Global Tab Form (new contract) ───────────────────────────────────────────

export const GlobalFormWrapper = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

// ─── Misc ──────────────────────────────────────────────────────────────────────

export const AddContractBtn = styled.button`
    padding: 8px 18px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: #1D4ED8; }
`;

export const EmptyState = styled.div`
    text-align: center;
    padding: 48px 24px;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

export const EmptyStateAction = styled.p`
    margin: 8px 0 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

export const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 40px auto;
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

export const TwoCol = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
`;
