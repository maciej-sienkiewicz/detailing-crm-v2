import styled from 'styled-components';
import { X } from 'lucide-react';
import {
    ModalShell,
    ModalContent,
    ModalFooter,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';

// ─── Wizard-specific header (icon + title + progress bar) ─────────────────────

const WizardHeader = styled.div`
    padding: 20px 28px 16px;
    border-bottom: 1px solid #f1f5f9;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;

    @media (max-width: 640px) {
        padding: 16px 18px 12px;
        gap: 10px;
    }

    @media (max-height: 480px) {
        padding-top: 12px;
        padding-bottom: 10px;
        gap: 8px;
    }
`;

const HeaderTop = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const IconWrap = styled.div`
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    svg { width: 15px; height: 15px; }
`;

const TitleGroup = styled.div`
    flex: 1;
    min-width: 0;
`;

const WizardTitle = styled.h2`
    margin: 0;
    font-family: 'Inter', sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.2px;
    line-height: 1.2;
    overflow-wrap: anywhere;

    @media (max-width: 400px) { font-size: 16px; }
`;

const WizardSubtitle = styled.p`
    margin: 2px 0 0;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: #64748b;
    font-weight: 400;
`;

const CloseButton = styled.button`
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 50%;
    cursor: pointer;
    color: #64748b;
    transition: all 150ms ease;

    &:hover {
        background: #e2e8f0;
        color: #0f172a;
        border-color: #cbd5e1;
    }
`;

const ProgressRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const ProgressBar = styled.div`
    flex: 1;
    height: 3px;
    background: #e2e8f0;
    border-radius: 999px;
    overflow: hidden;
`;

const ProgressFill = styled.div<{ $pct: number }>`
    height: 100%;
    width: ${p => p.$pct}%;
    background: #3b82f6;
    transition: width 0.3s ease;
`;

const StepLabel = styled.span`
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    white-space: nowrap;
`;

// ─── Footer ──────────────────────────────────────────────────────────────────
//
// Wizard labels are long ("Wymaga poprawek" + "Zatwierdź jakość", "Zatwierdź i
// wydaj pojazd"). Side by side they overrun a phone-width footer, so below
// 560px the footer becomes a stack with the primary action on top — reachable
// with the thumb, and never clipped.

const WizardFooter = styled(ModalFooter)`
    @media (max-width: 560px) {
        flex-direction: column-reverse;
        align-items: stretch;

        > button { width: 100%; }
    }
`;

const FooterLeft = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;

    @media (max-width: 560px) {
        flex: none;
        width: 100%;

        > button { flex: 1; min-width: 0; }
    }
`;

// ─── Component ────────────────────────────────────────────────────────────────

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
    const pct = (currentStep / totalSteps) * 100;
    const isLast = currentStep === totalSteps;

    const handlePrimary = () => {
        if (isLast && onFinish) onFinish();
        else if (onNext) onNext();
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="md">
            <WizardHeader>
                <HeaderTop>
                    {icon && <IconWrap>{icon}</IconWrap>}
                    <TitleGroup>
                        <WizardTitle>{title}</WizardTitle>
                        {subtitle && <WizardSubtitle>{subtitle}</WizardSubtitle>}
                    </TitleGroup>
                    <CloseButton onClick={onClose} title="Zamknij">
                        <X size={15} strokeWidth={2.5} />
                    </CloseButton>
                </HeaderTop>
                <ProgressRow>
                    <ProgressBar>
                        <ProgressFill $pct={pct} />
                    </ProgressBar>
                    <StepLabel>{currentStep} / {totalSteps}</StepLabel>
                </ProgressRow>
            </WizardHeader>

            <ModalContent>
                {children}
            </ModalContent>

            <WizardFooter>
                <FooterLeft>
                    {onBack && (
                        <SharedButton $variant="secondary" type="button" onClick={onBack} disabled={isProcessing}>
                            {backLabel}
                        </SharedButton>
                    )}
                    {onSkip && (
                        <SharedButton $variant="ghost" type="button" onClick={onSkip} disabled={isProcessing}>
                            {skipLabel}
                        </SharedButton>
                    )}
                </FooterLeft>
                {(onNext || onFinish) && (
                    <SharedButton
                        $variant="primary"
                        type="button"
                        onClick={handlePrimary}
                        disabled={disableNext || isProcessing}
                    >
                        {isProcessing ? 'Przetwarzanie…' : isLast ? finishLabel : nextLabel}
                    </SharedButton>
                )}
            </WizardFooter>
        </ModalShell>
    );
};
