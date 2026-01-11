import styled from 'styled-components';
import { Button, ButtonGroup } from '@/common/components/Button';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: ${props => props.theme.spacing.md};
`;

const WizardContainer = styled.div`
    background: white;
    border-radius: ${props => props.theme.radii.xl};
    box-shadow: ${props => props.theme.shadows.xl};
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.3s ease-out;

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
`;

const WizardHeader = styled.div`
    padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
    border-bottom: 1px solid ${props => props.theme.colors.border};
`;

const HeaderTop = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: ${props => props.theme.spacing.md};
`;

const HeaderLeft = styled.div`
    flex: 1;
`;

const WizardTitle = styled.h2`
    margin: 0 0 ${props => props.theme.spacing.xs};
    font-size: ${props => props.theme.fontSizes.xl};
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

const WizardSubtitle = styled.p`
    margin: 0;
    font-size: ${props => props.theme.fontSizes.sm};
    color: ${props => props.theme.colors.textMuted};
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    font-size: ${props => props.theme.fontSizes.xl};
    color: ${props => props.theme.colors.textMuted};
    cursor: pointer;
    padding: ${props => props.theme.spacing.xs};
    line-height: 1;
    transition: color ${props => props.theme.transitions.fast};

    &:hover {
        color: ${props => props.theme.colors.text};
    }
`;

const ProgressBar = styled.div`
    width: 100%;
    height: 4px;
    background: ${props => props.theme.colors.surfaceAlt};
    border-radius: ${props => props.theme.radii.full};
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
    height: 100%;
    width: ${props => props.$progress}%;
    background: linear-gradient(90deg, var(--brand-primary) 0%, #10b981 100%);
    transition: width 0.3s ease;
`;

const StepIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: ${props => props.theme.spacing.xs};
    margin-top: ${props => props.theme.spacing.sm};
`;

const StepDot = styled.div<{ $active: boolean; $completed: boolean }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => {
    if (props.$completed) return '#10b981';
    if (props.$active) return 'var(--brand-primary)';
    return props.theme.colors.border;
}};
    transition: all 0.3s ease;
`;

const WizardBody = styled.div`
    padding: ${props => props.theme.spacing.xl};
    overflow-y: auto;
    flex: 1;
`;

const WizardFooter = styled.div`
    padding: ${props => props.theme.spacing.lg} ${props => props.theme.spacing.xl};
    border-top: 1px solid ${props => props.theme.colors.border};
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
`;

const IconWrapper = styled.div`
    width: 48px;
    height: 48px;
    border-radius: ${props => props.theme.radii.lg};
    background: linear-gradient(135deg, var(--brand-primary) 0%, #0284c7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: ${props => props.theme.spacing.md};
    box-shadow: ${props => props.theme.shadows.md};

    svg {
        width: 24px;
        height: 24px;
        color: white;
    }
`;

interface WizardLayoutProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    currentStep: number;
    totalSteps: number;
    onBack?: () => void;
    onNext?: () => void;
    onFinish?: () => void;
    nextLabel?: string;
    backLabel?: string;
    finishLabel?: string;
    isProcessing?: boolean;
    disableNext?: boolean;
    children: React.ReactNode;
}

export const WizardLayout = ({
                                 isOpen,
                                 onClose,
                                 title,
                                 subtitle,
                                 icon,
                                 currentStep,
                                 totalSteps,
                                 onBack,
                                 onNext,
                                 onFinish,
                                 nextLabel = 'Kontynuuj',
                                 backLabel = 'Wstecz',
                                 finishLabel = 'Zakończ',
                                 isProcessing = false,
                                 disableNext = false,
                                 children,
                             }: WizardLayoutProps) => {
    if (!isOpen) return null;

    const progress = (currentStep / totalSteps) * 100;
    const isLastStep = currentStep === totalSteps;

    const handlePrimaryAction = () => {
        if (isLastStep && onFinish) {
            onFinish();
        } else if (onNext) {
            onNext();
        }
    };

    return (
        <Overlay onClick={onClose}>
            <WizardContainer onClick={(e) => e.stopPropagation()}>
                <WizardHeader>
                    <HeaderTop>
                        <HeaderLeft>
                            {icon && <IconWrapper>{icon}</IconWrapper>}
                            <WizardTitle>{title}</WizardTitle>
                            {subtitle && <WizardSubtitle>{subtitle}</WizardSubtitle>}
                        </HeaderLeft>
                        <CloseButton onClick={onClose}>×</CloseButton>
                    </HeaderTop>
                    <ProgressBar>
                        <ProgressFill $progress={progress} />
                    </ProgressBar>
                    <StepIndicator>
                        {Array.from({ length: totalSteps }, (_, i) => (
                            <StepDot
                                key={i}
                                $active={i + 1 === currentStep}
                                $completed={i + 1 < currentStep}
                            />
                        ))}
                    </StepIndicator>
                </WizardHeader>

                <WizardBody>{children}</WizardBody>

                <WizardFooter>
                    <ButtonGroup>
                        {currentStep > 1 && onBack && (
                            <Button
                                onClick={onBack}
                                disabled={isProcessing}
                                $variant="secondary"
                            >
                                {backLabel}
                            </Button>
                        )}
                        <Button
                            onClick={handlePrimaryAction}
                            disabled={disableNext || isProcessing}
                            $variant="primary"
                            $fullWidth={currentStep === 1}
                        >
                            {isProcessing
                                ? 'Przetwarzanie...'
                                : isLastStep
                                    ? finishLabel
                                    : nextLabel
                            }
                        </Button>
                    </ButtonGroup>
                </WizardFooter>
            </WizardContainer>
        </Overlay>
    );
};