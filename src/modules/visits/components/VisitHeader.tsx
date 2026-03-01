import styled from 'styled-components';
import type { Visit } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const HeaderContainer = styled.header`
    position: sticky;
    top: 0;
    z-index: 100;
    background: ${st.bgCard};
    border-bottom: 1px solid ${st.border};
    box-shadow: ${st.shadowMd};
`;

const HeaderContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 24px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding: 14px 32px;
    }
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
`;

const VisitNumber = styled.h1`
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: ${st.text};
    letter-spacing: -0.3px;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: 20px;
    }
`;

const LicensePlateBadge = styled.div`
    display: inline-flex;
    align-items: center;
    padding: 6px 14px 6px 22px;
    background: linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%);
    border: 2px solid #1a1a1a;
    border-radius: 5px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: #000000;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9);
    position: relative;
    text-transform: uppercase;

    &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 18px;
        background: linear-gradient(180deg, #003399 0%, #002266 100%);
        border-right: 1px solid #111;
        border-radius: 3px 0 0 3px;
    }

    &::after {
        content: 'PL';
        position: absolute;
        left: 3px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 7px;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: 0.2px;
    }
`;

const VehicleName = styled.span`
    font-size: 13px;
    color: ${st.textMuted};
    font-weight: 500;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: 14px;
    }
`;

const HeaderActions = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: ${st.radiusFull};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;
    border: 1px solid transparent;

    ${props => {
        switch (props.$variant) {
            case 'primary':
                return `
                    background: ${st.accentGreen};
                    color: white;
                    border-color: ${st.accentGreen};
                    box-shadow: ${st.shadowSm};

                    &:hover:not(:disabled) {
                        background: #059669;
                        box-shadow: ${st.shadowMd};
                        transform: translateY(-1px);
                    }
                `;
            case 'danger':
                return `
                    background: transparent;
                    color: ${st.accentRed};
                    border-color: ${st.accentRed}66;

                    &:hover:not(:disabled) {
                        background: ${st.accentRedDim};
                        border-color: ${st.accentRed};
                    }
                `;
            default:
                return `
                    background: ${st.bgCard};
                    color: ${st.textSecondary};
                    border-color: ${st.border};
                    box-shadow: ${st.shadowXs};

                    &:hover:not(:disabled) {
                        background: ${st.bg};
                        border-color: ${st.borderHover};
                        color: ${st.text};
                    }
                `;
        }
    }}

    &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }

    svg {
        width: 15px;
        height: 15px;
    }
`;

interface VisitHeaderProps {
    visit: Visit;
    onCompleteVisit: () => void;
    onPrintProtocol: () => void;
    onCancelVisit: () => void;
}

export const VisitHeader = ({
    visit,
    onCompleteVisit,
    onPrintProtocol,
    onCancelVisit,
}: VisitHeaderProps) => {
    const isCompleted = visit.status === 'COMPLETED';
    const isRejected = visit.status === 'REJECTED';
    const isArchived = visit.status === 'ARCHIVED';
    const isInProgress = visit.status === 'IN_PROGRESS';
    const isReady = visit.status === 'READY_FOR_PICKUP';

    const getCompleteButtonText = () => {
        if (isInProgress) return 'Oznacz jako gotowe';
        if (isReady) return 'Wydaj pojazd';
        return 'Zakończ wizytę';
    };

    const isDisabled = isCompleted || isRejected || isArchived;

    return (
        <HeaderContainer>
            <HeaderContent>
                <HeaderLeft>
                    <VisitNumber>{visit.visitNumber}</VisitNumber>
                    {visit.vehicle.licensePlate && (
                        <LicensePlateBadge>{visit.vehicle.licensePlate}</LicensePlateBadge>
                    )}
                    <VehicleName>
                        {visit.vehicle.brand} {visit.vehicle.model}
                        {visit.vehicle.yearOfProduction ? ` · ${visit.vehicle.yearOfProduction}` : ''}
                    </VehicleName>
                </HeaderLeft>

                <HeaderActions>
                    <ActionButton
                        $variant="primary"
                        onClick={onCompleteVisit}
                        disabled={isDisabled}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {getCompleteButtonText()}
                    </ActionButton>

                    <ActionButton
                        $variant="danger"
                        onClick={onCancelVisit}
                        disabled={isDisabled}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        Odrzuć wizytę
                    </ActionButton>
                </HeaderActions>
            </HeaderContent>
        </HeaderContainer>
    );
};
