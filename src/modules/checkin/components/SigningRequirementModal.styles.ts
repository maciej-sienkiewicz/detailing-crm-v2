import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

export const ModalContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
`;

export const DocumentList = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
    max-height: 500px;
    overflow-y: auto;
`;

export const DocumentRow = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    padding: 12px 14px;
    background: #F8FAFC;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    transition: all ${st.transition};

    &:hover {
        background: #FFFFFF;
        border-color: ${st.accentBlue};
    }
`;

export const DocumentIcon = styled.div`
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${st.accentBlueDim};
    border-radius: ${st.radiusSm};
    color: ${st.accentBlue};
    flex-shrink: 0;

    svg {
        width: 20px;
        height: 20px;
    }
`;

export const DocumentInfo = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

export const DocumentName = styled.div`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;


export const ActionButtons = styled.div`
    display: flex;
    gap: 6px;
    align-items: center;
    flex-shrink: 0;
`;

export const IconButton = styled.button<{ $active?: boolean }>`
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid ${st.border};
    background: ${props => props.$active ? st.accentBlueDim : '#F8FAFC'};
    border-radius: ${st.radiusSm};
    color: ${props => props.$active ? st.accentBlue : st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};

    &:hover:not(:disabled) {
        background: ${st.accentBlueDim};
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
    }

    &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

export const FooterActions = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding-top: ${props => props.theme.spacing.md};
    border-top: 1px solid ${st.border};
`;

export const PrimaryActionGroup = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    justify-content: flex-end;
`;

export const CancelBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    background: ${st.bgCard};
    color: ${st.textSecondary};
    border: 1.5px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    &:hover:not(:disabled) {
        border-color: ${st.borderHover};
        color: ${st.text};
        background: ${st.bgCardAlt};
    }

    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
`;

export const ConfirmBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 22px;
    background: ${st.accentBlue};
    color: #fff;
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    box-shadow: 0 1px 4px rgba(37, 99, 235, 0.25);

    &:hover:not(:disabled) {
        background: #1D4ED8;
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    }

    &:disabled {
        background: ${st.textMuted};
        box-shadow: none;
        cursor: not-allowed;
        transform: none;
    }
`;


const spin = keyframes`
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
`;

export const Spinner = styled.div`
    width: 36px;
    height: 36px;
    border: 3px solid ${st.bgCardAlt};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
    flex-shrink: 0;
`;

export const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: ${props => props.theme.spacing.xxl} 0;
    color: ${st.textSecondary};
    font-size: ${st.fontSm};
    font-weight: 500;
`;

export const EmptyState = styled.div`
    text-align: center;
    padding: ${props => props.theme.spacing.xl};
    color: ${props => props.theme.colors.textMuted};
    font-size: ${st.fontSm};
`;
