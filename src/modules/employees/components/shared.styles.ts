import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

// ─── Form primitives ──────────────────────────────────────────────────────────

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

export const FormRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;

    @media (max-width: 480px) {
        grid-template-columns: 1fr;
    }
`;

export const FormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

// ─── Buttons ──────────────────────────────────────────────────────────────────

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

export const GreenSaveBtn = styled(SaveBtn)`
    background: ${st.accentGreen};
    &:hover:not(:disabled) { background: #059669; }
`;

export const DangerSaveBtn = styled(SaveBtn)`
    background: ${st.accentRed};
    &:hover:not(:disabled) { background: #DC2626; }
`;

// Outline-style action button (matches AmendBtn aesthetic)
export const OutlineActionBtn = styled.button`
    padding: 5px 14px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: background ${st.transition}, border-color ${st.transition};
    &:hover { border-color: ${st.borderHover}; background: ${st.bgCardAlt}; }
`;

export const OutlineGreenBtn = styled.button`
    padding: 5px 14px;
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

export const OutlineRedBtn = styled.button`
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

export const OutlineBlueBtn = styled.button`
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
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

// ─── Section layout ───────────────────────────────────────────────────────────

export const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

export const TopRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
`;

export const SectionTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

// ─── Inline form box ──────────────────────────────────────────────────────────

export const FormBox = styled.div`
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 16px;
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

// ─── Feedback ─────────────────────────────────────────────────────────────────

export const ErrorMsg = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
`;

export const InfoNote = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 8px 10px;
`;

export const EmptyText = styled.p`
    margin: 0;
    padding: 32px 0;
    text-align: center;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

export const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 40px auto;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── Data table ───────────────────────────────────────────────────────────────

export const TableWrapper = styled.div`
    overflow-x: auto;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
`;

export const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

export const Thead = styled.thead`
    background: ${st.bgCardAlt};
`;

export const Th = styled.th`
    padding: 9px 14px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid ${st.border};
    white-space: nowrap;
`;

export const Tbody = styled.tbody``;

export const Tr = styled.tr`
    border-bottom: 1px solid ${st.border};
    &:last-child { border-bottom: none; }
    background: ${st.bgCard};
    transition: background ${st.transition};
    &:hover { background: ${st.bgCardAlt}; }
`;

export const Td = styled.td`
    padding: 10px 14px;
    font-size: ${st.fontSm};
    color: ${st.text};
    vertical-align: middle;
`;

export const TdMuted = styled(Td)`
    color: ${st.textMuted};
    font-size: ${st.fontXs};
`;
