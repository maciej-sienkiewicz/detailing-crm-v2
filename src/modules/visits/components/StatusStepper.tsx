import styled, { keyframes, css } from 'styled-components';
import type { VisitStatus } from '../types';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const BRAND = '#0ea5e9';
const BRAND_DARK = '#0284c7';

const pulseRing = keyframes`
    0%, 100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.5); }
    50% { box-shadow: 0 0 0 8px rgba(14, 165, 233, 0); }
`;

const StepperContainer = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 18px 24px;
    margin-bottom: 14px;
    box-shadow: ${st.shadowSm};

    @media (max-width: 640px) {
        padding: 14px 16px;
    }
`;

const StepsList = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
`;

const ProgressLine = styled.div<{ $progress: number }>`
    position: absolute;
    top: 17px;
    left: 0;
    right: 0;
    height: 2px;
    background: ${st.border};
    z-index: 0;

    &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: ${props => props.$progress}%;
        background: linear-gradient(90deg, ${BRAND} 0%, ${BRAND_DARK} 100%);
        transition: width 0.5s ease;
        border-radius: 2px;
    }
`;

const Step = styled.div<{ $isActive: boolean; $isCompleted: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    position: relative;
    z-index: 1;
    flex: 1;
    max-width: 200px;
`;

const StepCircle = styled.div<{ $isActive: boolean; $isCompleted: boolean }>`
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
    transition: all 0.3s ease;

    ${props => {
        if (props.$isCompleted) {
            return css`
                background: ${st.accentGreen};
                color: white;
                box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
            `;
        }
        if (props.$isActive) {
            return css`
                background: ${BRAND};
                color: white;
                box-shadow: 0 2px 8px rgba(14, 165, 233, 0.35);
                animation: ${pulseRing} 2s infinite;
            `;
        }
        return css`
            background: ${st.bgCard};
            color: ${st.textMuted};
            border: 2px solid ${st.border};
        `;
    }}
`;

const StepLabel = styled.span<{ $isActive: boolean; $isCompleted: boolean }>`
    font-size: ${st.fontXs};
    font-weight: ${props => props.$isActive ? 700 : 500};
    color: ${props => props.$isActive ? BRAND_DARK : props.$isCompleted ? st.accentGreen : st.textMuted};
    text-align: center;
    white-space: nowrap;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${st.fontSm};
    }
`;

const SpecialStatusContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const StatusIcon = styled.div<{ $color: string; $bg: string }>`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${props => props.$bg};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    color: ${props => props.$color};
`;

const StatusTitle = styled.h3`
    margin: 0 0 2px;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const StatusDesc = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textMuted};
`;

interface StatusStepperProps {
    currentStatus: VisitStatus;
}

const steps = [
    { status: 'IN_PROGRESS', label: 'W realizacji' },
    { status: 'READY_FOR_PICKUP', label: 'Do odbioru' },
    { status: 'COMPLETED', label: 'Zakończona' },
];

const getStepIndex = (status: VisitStatus): number => {
    if (status === 'DRAFT' || status === 'REJECTED' || status === 'ARCHIVED') return -1;
    return steps.findIndex(step => step.status === status);
};

const calculateProgress = (currentIndex: number): number => {
    if (currentIndex <= 0) return 0;
    return (currentIndex / (steps.length - 1)) * 100;
};

const CheckSvg = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);

export const StatusStepper = ({ currentStatus }: StatusStepperProps) => {
    const currentIndex = getStepIndex(currentStatus);
    const progress = calculateProgress(currentIndex);

    if (currentStatus === 'DRAFT') {
        return (
            <StepperContainer>
                <SpecialStatusContainer>
                    <StatusIcon $color={st.accentAmber} $bg={st.accentAmberDim}>✏️</StatusIcon>
                    <div>
                        <StatusTitle>Wizyta w przygotowaniu</StatusTitle>
                        <StatusDesc>Wizyta oczekuje na potwierdzenie i podpisanie dokumentów</StatusDesc>
                    </div>
                </SpecialStatusContainer>
            </StepperContainer>
        );
    }

    if (currentStatus === 'REJECTED') {
        return (
            <StepperContainer>
                <SpecialStatusContainer>
                    <StatusIcon $color={st.accentRed} $bg={st.accentRedDim}>✕</StatusIcon>
                    <div>
                        <StatusTitle>Wizyta odrzucona</StatusTitle>
                        <StatusDesc>Ta wizyta została odrzucona</StatusDesc>
                    </div>
                </SpecialStatusContainer>
            </StepperContainer>
        );
    }

    if (currentStatus === 'ARCHIVED') {
        return (
            <StepperContainer>
                <SpecialStatusContainer>
                    <StatusIcon $color={st.textMuted} $bg={st.bg}>📦</StatusIcon>
                    <div>
                        <StatusTitle>Wizyta zarchiwizowana</StatusTitle>
                        <StatusDesc>Ta wizyta została przeniesiona do archiwum</StatusDesc>
                    </div>
                </SpecialStatusContainer>
            </StepperContainer>
        );
    }

    return (
        <StepperContainer>
            <StepsList>
                <ProgressLine $progress={progress} />
                {steps.map((step, index) => {
                    const isCompleted = index < currentIndex;
                    const isActive = index === currentIndex;

                    return (
                        <Step key={step.status} $isActive={isActive} $isCompleted={isCompleted}>
                            <StepCircle $isActive={isActive} $isCompleted={isCompleted}>
                                {isCompleted ? <CheckSvg /> : index + 1}
                            </StepCircle>
                            <StepLabel $isActive={isActive} $isCompleted={isCompleted}>
                                {step.label}
                            </StepLabel>
                        </Step>
                    );
                })}
            </StepsList>
        </StepperContainer>
    );
};
