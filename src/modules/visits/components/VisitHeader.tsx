import styled from 'styled-components';
import type { Visit } from '../types';

const HeaderContainer = styled.header`
    position: sticky;
    top: 0;
    z-index: 100;
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-bottom: 1px solid ${props => props.theme.colors.border};
    box-shadow: ${props => props.theme.shadows.md};
`;

const HeaderContent = styled.div`
    display: flex;
    flex-direction: column;
    gap: ${props => props.theme.spacing.md};
    padding: ${props => props.theme.spacing.lg};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
    }
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.md};
    flex-wrap: wrap;
`;

const VisitNumber = styled.h1`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.lg};
    font-weight: 700;
    color: ${props => props.theme.colors.text};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.xl};
    }
`;

const LicensePlateBadge = styled.div`
    display: inline-flex;
    align-items: center;
    padding: 8px 16px;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    color: white;
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.md};
    font-weight: 700;
    letter-spacing: 2px;
    box-shadow: ${props => props.theme.shadows.md};
    border: 2px solid #475569;
`;

const VehicleName = styled.span`
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
    font-weight: 500;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.md};
    }
`;

const HeaderActions = styled.div`
    display: flex;
    gap: ${props => props.theme.spacing.sm};
    flex-wrap: wrap;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.md};
    font-size: ${props => props.theme.fontSizes.sm};
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    ${props => {
    switch (props.$variant) {
        case 'primary':
            return `
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    border-color: #10b981;
                    box-shadow: ${props.theme.shadows.sm};

                    &:hover:not(:disabled) {
                        box-shadow: ${props.theme.shadows.md};
                        transform: translateY(-1px);
                    }
                `;
        case 'danger':
            return `
                    background: white;
                    color: ${props.theme.colors.error};
                    border-color: ${props.theme.colors.error};

                    &:hover:not(:disabled) {
                        background: ${props.theme.colors.error};
                        color: white;
                    }
                `;
        default:
            return `
                    background: white;
                    color: ${props.theme.colors.text};

                    &:hover:not(:disabled) {
                        background: ${props.theme.colors.surfaceHover};
                        border-color: var(--brand-primary);
                    }
                `;
    }
}}

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    svg {
        width: 16px;
        height: 16px;
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
                    <LicensePlateBadge>{visit.vehicle.licensePlate}</LicensePlateBadge>
                    <VehicleName>
                        {visit.vehicle.brand} {visit.vehicle.model} ({visit.vehicle.yearOfProduction})
                    </VehicleName>
                </HeaderLeft>

                <HeaderActions>
                    <ActionButton
                        $variant="primary"
                        onClick={onCompleteVisit}
                        disabled={isDisabled}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        {getCompleteButtonText()}
                    </ActionButton>

                    <ActionButton onClick={onPrintProtocol}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 6 2 18 2 18 9"/>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                            <rect x="6" y="14" width="12" height="8"/>
                        </svg>
                        Drukuj protokół
                    </ActionButton>

                    <ActionButton
                        $variant="danger"
                        onClick={onCancelVisit}
                        disabled={isDisabled}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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