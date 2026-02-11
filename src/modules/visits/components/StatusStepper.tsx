import styled from 'styled-components';
import type { VisitStatus } from '../types';

const StepperContainer = styled.div`
    background: white;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: ${props => props.theme.radii.lg};
    padding: ${props => props.theme.spacing.lg};
    margin-bottom: ${props => props.theme.spacing.lg};
`;

const StepsList = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
`;

const ProgressLine = styled.div<{ $progress: number }>`
    position: absolute;
    top: 20px;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => props.theme.colors.border};
    z-index: 0;

    &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: ${props => props.$progress}%;
        background: linear-gradient(90deg, var(--brand-primary) 0%, #10b981 100%);
        transition: width 0.5s ease;
    }
`;

const Step = styled.div<{ $isActive: boolean; $isCompleted: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${props => props.theme.spacing.sm};
    position: relative;
    z-index: 1;
    flex: 1;
    max-width: 200px;
`;

const StepCircle = styled.div<{ $isActive: boolean; $isCompleted: boolean }>`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: ${props => props.theme.fontSizes.sm};
    transition: all 0.3s ease;
    box-shadow: ${props => props.theme.shadows.md};

    ${props => {
    if (props.$isCompleted) {
        return `
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
            `;
    }
    if (props.$isActive) {
        return `
                background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
                color: white;
                animation: pulse 2s infinite;

                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.7); }
                    50% { box-shadow: 0 0 0 10px rgba(14, 165, 233, 0); }
                }
            `;
    }
    return `
            background: white;
            color: ${props.theme.colors.textMuted};
            border: 2px solid ${props.theme.colors.border};
        `;
}}
`;

const StepLabel = styled.span<{ $isActive: boolean }>`
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.$isActive ? 600 : 500};
    color: ${props => props.$isActive ? props.theme.colors.text : props.theme.colors.textMuted};
    text-align: center;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.sm};
    }
`;


interface StatusStepperProps {
    currentStatus: VisitStatus;
}

const steps = [
    { status: 'IN_PROGRESS', label: 'W realizacji', icon: '🔧' },
    { status: 'READY_FOR_PICKUP', label: 'Do odbioru', icon: '✅' },
    { status: 'COMPLETED', label: 'Zakończona', icon: '🚗' },
];

const getStepIndex = (status: VisitStatus): number => {
    if (status === 'DRAFT' || status === 'REJECTED' || status === 'ARCHIVED') return -1;
    return steps.findIndex(step => step.status === status);
};

const calculateProgress = (currentIndex: number): number => {
    if (currentIndex === -1) return 0;
    if (currentIndex === 0) return 0;
    return ((currentIndex) / (steps.length - 1)) * 100;
};

export const StatusStepper = ({ currentStatus }: StatusStepperProps) => {
    const currentIndex = getStepIndex(currentStatus);
    const progress = calculateProgress(currentIndex);

    if (currentStatus === 'DRAFT') {
        return (
            <StepperContainer>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <span style={{ fontSize: '48px' }}>📝</span>
                    <h3 style={{ margin: '16px 0 4px', fontSize: '18px', fontWeight: 600 }}>
                        Wizyta w przygotowaniu
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
                        Wizyta oczekuje na potwierdzenie i podpisanie dokumentów
                    </p>
                </div>
            </StepperContainer>
        );
    }

    if (currentStatus === 'REJECTED') {
        return (
            <StepperContainer>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <span style={{ fontSize: '48px' }}>🚫</span>
                    <h3 style={{ margin: '16px 0 4px', fontSize: '18px', fontWeight: 600 }}>
                        Wizyta odrzucona
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
                        Ta wizyta została odrzucona
                    </p>
                </div>
            </StepperContainer>
        );
    }

    if (currentStatus === 'ARCHIVED') {
        return (
            <StepperContainer>
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <span style={{ fontSize: '48px' }}>📦</span>
                    <h3 style={{ margin: '16px 0 4px', fontSize: '18px', fontWeight: 600 }}>
                        Wizyta zarchiwizowana
                    </h3>
                    <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
                        Ta wizyta została przeniesiona do archiwum
                    </p>
                </div>
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
                        <Step
                            key={step.status}
                            $isActive={isActive}
                            $isCompleted={isCompleted}
                        >
                            <StepCircle $isActive={isActive} $isCompleted={isCompleted}>
                                {isCompleted ? '✓' : step.icon}
                            </StepCircle>
                            <StepLabel $isActive={isActive}>
                                {step.label}
                            </StepLabel>
                        </Step>
                    );
                })}
            </StepsList>
        </StepperContainer>
    );
};
