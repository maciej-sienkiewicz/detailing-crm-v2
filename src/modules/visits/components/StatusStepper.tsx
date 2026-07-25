import styled, { keyframes, css } from 'styled-components';
import type { VisitStatus } from '../types';

const BRAND = '#0ea5e9';
const BRAND_DARK = '#0284c7';

const pulseRing = keyframes`
    0%, 100% { box-shadow: 0 0 0 0 rgba(14, 165, 233, 0.55); }
    50%       { box-shadow: 0 0 0 9px rgba(14, 165, 233, 0); }
`;

// ─── Container ────────────────────────────────────────────────────────────────

const StepperContainer = styled.div`
    position: relative;
    overflow: hidden;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0c1f35 100%);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
    padding: 18px 28px 20px;
    margin-bottom: 14px;
    box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 6px 20px rgba(0,0,0,0.18);

    &::before {
        content: '';
        position: absolute;
        top: -80px;
        right: -40px;
        width: 220px;
        height: 220px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(14,165,233,0.18) 0%, transparent 65%);
        pointer-events: none;
    }

    @media (max-width: 640px) {
        padding: 14px 16px 16px;
        border-radius: 12px;
    }
`;

// ─── Status label row (above steps) ──────────────────────────────────────────

const StatusLabelRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
`;

const StatusHeading = styled.span`
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(148, 163, 184, 0.55);
`;

const CurrentStatusPill = styled.span<{ $color: string; $bg: string }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px 3px 7px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.02em;
    background: ${p => p.$bg};
    color: ${p => p.$color};
    border: 1px solid ${p => p.$color}33;
`;

const PillDot = styled.span<{ $color: string; $pulse?: boolean }>`
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
    ${p => p.$pulse && css`animation: ${pulseRing} 2s infinite;`}
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
    top: 16px;
    left: 0;
    right: 0;
    height: 2px;
    background: rgba(255, 255, 255, 0.08);
    z-index: 0;
`;

const ProgressFill = styled.div<{ $progress: number }>`
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => props.$progress}%;
    background: linear-gradient(90deg, ${BRAND} 0%, ${BRAND_DARK} 100%);
    transition: width 0.5s ease;
    border-radius: 2px;
    box-shadow: 0 0 8px rgba(14, 165, 233, 0.5);
`;

const Step = styled.div`
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
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 12px;
    transition: all 0.3s ease;

    ${props => {
        if (props.$isCompleted) return css`
            background: rgba(16, 185, 129, 0.2);
            color: #6ee7b7;
            border: 1.5px solid rgba(16, 185, 129, 0.4);
            box-shadow: 0 0 10px rgba(16, 185, 129, 0.2);
        `;
        if (props.$isActive) return css`
            background: ${BRAND};
            color: #fff;
            border: 1.5px solid rgba(14, 165, 233, 0.5);
            box-shadow: 0 2px 12px rgba(14, 165, 233, 0.45);
            animation: ${pulseRing} 2s infinite;
        `;
        return css`
            background: rgba(255, 255, 255, 0.04);
            color: rgba(148, 163, 184, 0.45);
            border: 1.5px solid rgba(255, 255, 255, 0.1);
        `;
    }}
`;

const StepLabel = styled.span<{ $isActive: boolean; $isCompleted: boolean }>`
    font-size: 11px;
    font-weight: ${props => props.$isActive ? 700 : 500};
    text-align: center;
    white-space: nowrap;
    letter-spacing: 0.01em;

    color: ${props =>
        props.$isActive    ? '#e0f2fe' :
        props.$isCompleted ? 'rgba(110, 231, 183, 0.85)' :
                             'rgba(148, 163, 184, 0.45)'
    };

    @media (min-width: 768px) {
        font-size: 12px;
    }
`;

// ─── Special statuses ─────────────────────────────────────────────────────────

const SpecialRow = styled.div`
    display: flex;
    align-items: center;
    gap: 14px;
`;

const SpecialIconWrap = styled.div<{ $color: string; $bg: string }>`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: ${p => p.$bg};
    border: 1.5px solid ${p => p.$color}44;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    flex-shrink: 0;
    color: ${p => p.$color};
    box-shadow: 0 0 12px ${p => p.$color}22;
`;

const SpecialTitle = styled.h3`
    margin: 0 0 3px;
    font-size: 14px;
    font-weight: 700;
    color: #f1f5f9;
`;

const SpecialDesc = styled.p`
    margin: 0;
    font-size: 12px;
    color: rgba(148, 163, 184, 0.6);
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
    return steps.findIndex(step => step.status === status);
};

const calculateProgress = (idx: number): number =>
    idx <= 0 ? 0 : (idx / (steps.length - 1)) * 100;

const CheckSvg = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <polyline points="20 6 9 17 4 12"/>
    </svg>
);

const STATUS_PILL: Record<string, { label: string; color: string; bg: string; pulse?: boolean }> = {
    IN_PROGRESS:      { label: 'W realizacji', color: BRAND,      bg: 'rgba(14,165,233,0.12)', pulse: true },
    READY_FOR_PICKUP: { label: 'Do odbioru',   color: '#f59e0b',  bg: 'rgba(245,158,11,0.12)' },
    COMPLETED:        { label: 'Zakończona',   color: '#10b981',  bg: 'rgba(16,185,129,0.12)' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const StatusStepper = ({ currentStatus }: StatusStepperProps) => {
    const currentIndex = getStepIndex(currentStatus);
    const progress = calculateProgress(currentIndex);
    const pill = STATUS_PILL[currentStatus];

    if (currentStatus === 'DRAFT') {
        return (
            <StepperContainer>
                <SpecialRow>
                    <SpecialIconWrap $color="#f59e0b" $bg="rgba(245,158,11,0.12)">✏️</SpecialIconWrap>
                    <div>
                        <SpecialTitle>Wizyta w przygotowaniu</SpecialTitle>
                        <SpecialDesc>Wizyta oczekuje na potwierdzenie i podpisanie dokumentów</SpecialDesc>
                    </div>
                </SpecialRow>
            </StepperContainer>
        );
    }

    if (currentStatus === 'REJECTED') {
        return (
            <StepperContainer>
                <SpecialRow>
                    <SpecialIconWrap $color="#ef4444" $bg="rgba(239,68,68,0.12)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
                    <SpecialIconWrap $color="rgba(148,163,184,0.6)" $bg="rgba(255,255,255,0.05)">📦</SpecialIconWrap>
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
            {pill && (
                <StatusLabelRow>
                    <StatusHeading>Status wizyty</StatusHeading>
                    <CurrentStatusPill $color={pill.color} $bg={pill.bg}>
                        <PillDot $color={pill.color} $pulse={pill.pulse} />
                        {pill.label}
                    </CurrentStatusPill>
                </StatusLabelRow>
            )}

            <StepsList>
                <ProgressTrack>
                    <ProgressFill $progress={progress} />
                </ProgressTrack>
                {steps.map((step, index) => {
                    const isCompleted = index < currentIndex;
                    const isActive = index === currentIndex;
                    return (
                        <Step key={step.status}>
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
