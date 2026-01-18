// src/common/components/Stepper/Stepper.tsx

import styled from 'styled-components';

const StepperContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: ${props => props.theme.spacing.xl};
    padding: ${props => props.theme.spacing.lg};
    background-color: ${props => props.theme.colors.surface};
    border-radius: ${props => props.theme.radii.lg};
    box-shadow: ${props => props.theme.shadows.sm};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        margin-bottom: ${props => props.theme.spacing.xxl};
        padding: ${props => props.theme.spacing.xl};
    }
`;

const StepWrapper = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    position: relative;

    &:not(:last-child)::after {
        content: '';
        position: absolute;
        top: 20px;
        left: 50%;
        width: 100%;
        height: 2px;
        background-color: ${props => props.theme.colors.border};
        z-index: 0;

        @media (min-width: ${props => props.theme.breakpoints.md}) {
            top: 24px;
        }
    }
`;

const StepCircle = styled.div<{ $active: boolean; $completed: boolean }>`
    width: 40px;
    height: 40px;
    border-radius: ${props => props.theme.radii.full};
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: ${props => props.theme.fontWeights.semibold};
    font-size: ${props => props.theme.fontSizes.md};
    position: relative;
    z-index: 1;
    transition: all ${props => props.theme.transitions.normal};

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        width: 48px;
        height: 48px;
        font-size: ${props => props.theme.fontSizes.lg};
    }

    ${props => {
    if (props.$completed) {
        return `
                background: linear-gradient(135deg, ${props.theme.colors.primary} 0%, #0284c7 100%);
                color: white;
                box-shadow: ${props.theme.shadows.md};
            `;
    }
    if (props.$active) {
        return `
                background: linear-gradient(135deg, ${props.theme.colors.primary} 0%, #0284c7 100%);
                color: white;
                box-shadow: ${props.theme.shadows.lg};
                transform: scale(1.1);
            `;
    }
    return `
            background-color: ${props.theme.colors.surfaceAlt};
            color: ${props.theme.colors.textMuted};
            border: 2px solid ${props.theme.colors.border};
        `;
}}
`;

const StepLabel = styled.div<{ $active: boolean }>`
    margin-top: ${props => props.theme.spacing.sm};
    font-size: ${props => props.theme.fontSizes.xs};
    font-weight: ${props => props.$active ? props.theme.fontWeights.semibold : props.theme.fontWeights.medium};
    color: ${props => props.$active ? props.theme.colors.text : props.theme.colors.textMuted};
    text-align: center;

    @media (min-width: ${props => props.theme.breakpoints.md}) {
        font-size: ${props => props.theme.fontSizes.sm};
        margin-top: ${props => props.theme.spacing.md};
    }
`;

const CheckIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

interface Step {
    id: string;
    label: string;
}

interface StepperProps {
    steps: Step[];
    currentStepId: string;
    completedSteps: string[];
}

export const Stepper = ({ steps, currentStepId, completedSteps }: StepperProps) => {
    return (
        <StepperContainer>
            {steps.map((step, index) => {
                const isActive = step.id === currentStepId;
                const isCompleted = completedSteps.includes(step.id);

                return (
                    <StepWrapper key={step.id}>
                        <StepCircle $active={isActive} $completed={isCompleted}>
                            {isCompleted ? <CheckIcon /> : index + 1}
                        </StepCircle>
                        <StepLabel $active={isActive}>{step.label}</StepLabel>
                    </StepWrapper>
                );
            })}
        </StepperContainer>
    );
};
