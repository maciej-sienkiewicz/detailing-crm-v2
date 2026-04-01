import styled, { keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const fadeIn = keyframes`
    from { opacity: 0; }
    to   { opacity: 1; }
`;

const slideUp = keyframes`
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    animation: ${fadeIn} 0.18s ease;
`;

const WizardContainer = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 520px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: ${slideUp} 0.22s ease;
`;

const WizardHeader = styled.div`
    padding: 16px 20px 14px;
    border-bottom: 1px solid ${st.border};
    background: ${st.bg};
    flex-shrink: 0;
`;

const HeaderTop = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
`;

const IconWrap = styled.div`
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: ${st.gradientBlue};
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg { width: 14px; height: 14px; }
`;

const HeaderText = styled.div`
    flex: 1;
    min-width: 0;
`;

const WizardTitle = styled.h2`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
    line-height: 1.2;
`;

const WizardSubtitle = styled.p`
    margin: 2px 0 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const CloseBtn = styled.button`
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: ${st.textMuted};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all ${st.transition};
    flex-shrink: 0;

    &:hover { background: ${st.bgCardAlt}; color: ${st.text}; }
    svg { width: 16px; height: 16px; }
`;

const ProgressRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const ProgressBar = styled.div`
    flex: 1;
    height: 3px;
    background: ${st.border};
    border-radius: ${st.radiusFull};
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number }>`
    height: 100%;
    width: ${p => p.$pct}%;
    background: ${st.accentBlue};
    transition: width 0.3s ease;
`;

const StepLabel = styled.span`
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    white-space: nowrap;
`;

const WizardBody = styled.div`
    padding: 20px;
    overflow-y: auto;
    flex: 1;
`;

const WizardFooter = styled.div`
    padding: 12px 20px;
    border-top: 1px solid ${st.border};
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-shrink: 0;
`;

const FooterBtn = styled.button<{ $primary?: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all ${st.transition};
    white-space: nowrap;

    ${p => p.$primary ? `
        background: ${st.accentBlue};
        color: white;
        border: none;
        box-shadow: ${st.shadowXs};
        &:hover:not(:disabled) { background: #2563EB; box-shadow: ${st.shadowSm}; transform: translateY(-1px); }
    ` : `
        background: transparent;
        color: ${st.textSecondary};
        border: 1px solid ${st.border};
        &:hover:not(:disabled) { border-color: ${st.accentBlue}; color: ${st.accentBlue}; background: ${st.accentBlueDim}; }
    `}

    &:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }
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
    onSkip?: () => void;
    nextLabel?: string;
    backLabel?: string;
    finishLabel?: string;
    skipLabel?: string;
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
    onSkip,
    nextLabel = 'Kontynuuj',
    backLabel = 'Wstecz',
    finishLabel = 'Zakończ',
    skipLabel = 'Pomiń',
    isProcessing = false,
    disableNext = false,
    children,
}: WizardLayoutProps) => {
    if (!isOpen) return null;

    const pct = (currentStep / totalSteps) * 100;
    const isLast = currentStep === totalSteps;

    const handlePrimary = () => {
        if (isLast && onFinish) onFinish();
        else if (onNext) onNext();
    };

    return (
        <Overlay onClick={onClose}>
            <WizardContainer onClick={e => e.stopPropagation()}>
                <WizardHeader>
                    <HeaderTop>
                        {icon && <IconWrap>{icon}</IconWrap>}
                        <HeaderText>
                            <WizardTitle>{title}</WizardTitle>
                            {subtitle && <WizardSubtitle>{subtitle}</WizardSubtitle>}
                        </HeaderText>
                        <CloseBtn onClick={onClose} title="Zamknij">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </CloseBtn>
                    </HeaderTop>
                    <ProgressRow>
                        <ProgressBar>
                            <ProgressFill $pct={pct} />
                        </ProgressBar>
                        <StepLabel>{currentStep} / {totalSteps}</StepLabel>
                    </ProgressRow>
                </WizardHeader>

                <WizardBody>{children}</WizardBody>

                <WizardFooter>
                    {currentStep > 1 && onBack && (
                        <FooterBtn onClick={onBack} disabled={isProcessing}>
                            {backLabel}
                        </FooterBtn>
                    )}
                    {onSkip && (
                        <FooterBtn onClick={onSkip} disabled={isProcessing}>
                            {skipLabel}
                        </FooterBtn>
                    )}
                    {(onNext || onFinish) && (
                        <FooterBtn
                            $primary
                            onClick={handlePrimary}
                            disabled={disableNext || isProcessing}
                        >
                            {isProcessing ? 'Przetwarzanie...' : isLast ? finishLabel : nextLabel}
                        </FooterBtn>
                    )}
                </WizardFooter>
            </WizardContainer>
        </Overlay>
    );
};
