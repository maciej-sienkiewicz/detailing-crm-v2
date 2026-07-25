import styled, { keyframes, css } from 'styled-components';
import type { VisitStatus } from '../types';

// ─── Animations ───────────────────────────────────────────────────────────────

const pulseGlow = keyframes`
    0%, 100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.45); }
    50%       { box-shadow: 0 0 0 7px rgba(56, 189, 248, 0); }
`;

// ─── Container ────────────────────────────────────────────────────────────────

const StepperContainer = styled.div`
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0c1f35 100%);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 16px 28px 18px;
    margin-bottom: 14px;
    box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 6px 20px rgba(0,0,0,0.18);

    @media (max-width: 640px) {
        padding: 12px 16px 14px;
        border-radius: 12px;
    }
`;

// ─── Steps track ─────────────────────────────────────────────────────────────

const StepsList = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
`;

const ProgressTrack = styled.div`
    position: absolute;
    top: 5px;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    z-index: 0;
`;

const ProgressFill = styled.div<{ $progress: number }>`
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${p => p.$progress}%;
    background: linear-gradient(90deg, #38bdf8 0%, #0ea5e9 100%);
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
`;

const Step = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    position: relative;
    z-index: 1;
    flex: 1;
    max-width: 200px;
`;

const StepDot = styled.div<{ $state: 'done' | 'active' | 'future' }>`
    border-radius: 50%;
    flex-shrink: 0;
    transition: all 0.25s ease;

    ${p => p.$state === 'active' ? css`
        width: 12px;
        height: 12px;
        background: #38bdf8;
        box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.18);
        animation: ${pulseGlow} 2s ease-in-out infinite;
    ` : p.$state === 'done' ? css`
        width: 10px;
        height: 10px;
        background: rgba(52, 211, 153, 0.75);
    ` : css`
        width: 10px;
        height: 10px;
        background: rgba(255, 255, 255, 0.07);
        border: 1px solid rgba(255, 255, 255, 0.15);
    `}
`;

const StepLabel = styled.span<{ $state: 'done' | 'active' | 'future' }>`
    font-size: 12px;
    font-weight: ${p => p.$state === 'active' ? 600 : 400};
    text-align: center;
    white-space: nowrap;
    letter-spacing: 0.01em;
    transition: color 0.25s ease;

    color: ${p =>
        p.$state === 'active' ? 'rgba(255, 255, 255, 0.9)'  :
        p.$state === 'done'   ? 'rgba(52, 211, 153, 0.65)'  :
                                'rgba(148, 163, 184, 0.38)'
    };
`;

// ─── Special statuses ─────────────────────────────────────────────────────────

const SpecialRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
`;

const SpecialIconWrap = styled.div<{ $color: string; $bg: string }>`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: ${p => p.$bg};
    border: 1px solid ${p => p.$color}33;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
    color: ${p => p.$color};
`;

const SpecialTitle = styled.h3`
    margin: 0 0 2px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(241, 245, 249, 0.9);
`;

const SpecialDesc = styled.p`
    margin: 0;
    font-size: 12px;
    color: rgba(148, 163, 184, 0.5);
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface StatusStepperProps {
    currentStatus: VisitStatus;
}

const steps = [
    { status: 'IN_PROGRESS',      label: 'W realizacji' },
    { status: 'READY_FOR_PICKUP', label: 'Do odbioru'   },
    { status: 'COMPLETED',        label: 'Zakończona'   },
];

const getStepIndex = (status: VisitStatus): number => {
    if (status === 'DRAFT' || status === 'REJECTED' || status === 'ARCHIVED') return -1;
    return steps.findIndex(s => s.status === status);
};

const calculateProgress = (idx: number): number =>
    idx <= 0 ? 0 : (idx / (steps.length - 1)) * 100;

// ─── Component ────────────────────────────────────────────────────────────────

export const StatusStepper = ({ currentStatus }: StatusStepperProps) => {
    const currentIndex = getStepIndex(currentStatus);
    const progress = calculateProgress(currentIndex);

    if (currentStatus === 'DRAFT') {
        return (
            <StepperContainer>
                <SpecialRow>
                    <SpecialIconWrap $color="#f59e0b" $bg="rgba(245,158,11,0.1)">✏️</SpecialIconWrap>
                    <div>
                        <SpecialTitle>Wizyta w przygotowaniu</SpecialTitle>
                        <SpecialDesc>Oczekuje na potwierdzenie i podpisanie dokumentów</SpecialDesc>
                    </div>
                </SpecialRow>
            </StepperContainer>
        );
    }

    if (currentStatus === 'REJECTED') {
        return (
            <StepperContainer>
                <SpecialRow>
                    <SpecialIconWrap $color="#ef4444" $bg="rgba(239,68,68,0.1)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </SpecialIconWrap>
                    <div>
                        <SpecialTitle>Wizyta odrzucona</SpecialTitle>
                        <SpecialDesc>Ta wizyta została odrzucona</SpecialDesc>
                    </div>
                </SpecialRow>
            </StepperContainer>
        );
    }

    if (currentStatus === 'ARCHIVED') {
        return (
            <StepperContainer>
                <SpecialRow>
                    <SpecialIconWrap $color="rgba(148,163,184,0.5)" $bg="rgba(255,255,255,0.04)">📦</SpecialIconWrap>
                    <div>
                        <SpecialTitle>Wizyta zarchiwizowana</SpecialTitle>
                        <SpecialDesc>Ta wizyta została przeniesiona do archiwum</SpecialDesc>
                    </div>
                </SpecialRow>
            </StepperContainer>
        );
    }

    return (
        <StepperContainer>
            <StepsList>
                <ProgressTrack>
                    <ProgressFill $progress={progress} />
                </ProgressTrack>
                {steps.map((step, index) => {
                    const state: 'done' | 'active' | 'future' =
                        index < currentIndex ? 'done' :
                        index === currentIndex ? 'active' : 'future';
                    return (
                        <Step key={step.status}>
                            <StepDot $state={state} />
                            <StepLabel $state={state}>{step.label}</StepLabel>
                        </Step>
                    );
                })}
            </StepsList>
        </StepperContainer>
    );
};
