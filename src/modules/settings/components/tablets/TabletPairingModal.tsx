import { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import {
    Overlay, ModalCard, ModalHead, ModalTitle, ModalSubtitle, ModalCloseBtn, ModalBody,
} from '../rbacShared.styles';
import { useGeneratePairingCode } from '../../hooks/useTablets';

interface Props {
    onClose: () => void;
}

function formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function TabletPairingModal({ onClose }: Props) {
    const generateCode = useGeneratePairingCode();
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);

    const requestCode = () => {
        generateCode.mutate(undefined, {
            onSuccess: (data) => {
                setExpiresAt(data.expiresAt);
            },
        });
    };

    useEffect(() => {
        requestCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!expiresAt) return;
        const tick = () => {
            const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
            setSecondsLeft(diff);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [expiresAt]);

    const expired = expiresAt !== null && secondsLeft === 0;
    const code = generateCode.data?.code ?? null;

    const codeLeft  = code ? code.slice(0, 3) : '';
    const codeRight = code ? code.slice(3)    : '';

    return (
        <Overlay onClick={onClose}>
            <ModalCard $maxWidth={420} onClick={e => e.stopPropagation()}>
                <ModalHead>
                    <div>
                        <ModalTitle>Sparuj tablet</ModalTitle>
                        <ModalSubtitle>Wpisz kod na stronie tablet.detailboost.pl</ModalSubtitle>
                    </div>
                    <ModalCloseBtn onClick={onClose} aria-label="Zamknij">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </ModalCloseBtn>
                </ModalHead>

                <ModalBody>
                    {generateCode.isPending && (
                        <LoadingWrap>
                            <Spinner />
                            <LoadingText>Generowanie kodu…</LoadingText>
                        </LoadingWrap>
                    )}

                    {generateCode.isError && !generateCode.isPending && (
                        <ErrorWrap>
                            <ErrorIcon />
                            <ErrorMsg>Nie udało się wygenerować kodu.</ErrorMsg>
                            <RetryBtn onClick={requestCode}>Spróbuj ponownie</RetryBtn>
                        </ErrorWrap>
                    )}

                    {code && !generateCode.isPending && (
                        <>
                            {expired ? (
                                <ExpiredWrap>
                                    <ExpiredIcon />
                                    <ExpiredTitle>Kod wygasł</ExpiredTitle>
                                    <ExpiredDesc>Kod był ważny 5 minut. Wygeneruj nowy, aby kontynuować.</ExpiredDesc>
                                    <RetryBtn onClick={requestCode}>Generuj nowy kod</RetryBtn>
                                </ExpiredWrap>
                            ) : (
                                <CodeWrap>
                                    <CodeRow>
                                        <CodeGroup>{codeLeft}</CodeGroup>
                                        <CodeSep />
                                        <CodeGroup>{codeRight}</CodeGroup>
                                    </CodeRow>
                                    <TimerRow>
                                        <TimerDot $urgent={secondsLeft < 60} />
                                        <TimerText $urgent={secondsLeft < 60}>
                                            Kod ważny przez {formatCountdown(secondsLeft)}
                                        </TimerText>
                                    </TimerRow>
                                </CodeWrap>
                            )}

                            <Instructions>
                                <InstructionStep>
                                    <StepNum>1</StepNum>
                                    <span>Otwórz <strong>tablet.detailboost.pl</strong> na tablecie</span>
                                </InstructionStep>
                                <InstructionStep>
                                    <StepNum>2</StepNum>
                                    <span>Wpisz powyższy kod parowania</span>
                                </InstructionStep>
                                <InstructionStep>
                                    <StepNum>3</StepNum>
                                    <span>To okno zamknie się automatycznie po sparowaniu</span>
                                </InstructionStep>
                            </Instructions>
                        </>
                    )}
                </ModalBody>
            </ModalCard>
        </Overlay>
    );
}

// ─── Animations ──────────────────────────────────────────────────────────────

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

const pulse = keyframes`
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
`;

// ─── Styled ──────────────────────────────────────────────────────────────────

const LoadingWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px 0;
`;

const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid #e2e8f0;
    border-top-color: #0ea5e9;
    border-radius: 50%;
    animation: ${spin} 0.7s linear infinite;
`;

const LoadingText = styled.span`
    font-size: 13px;
    color: #94a3b8;
`;

const ErrorWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 32px 0;
    text-align: center;
`;

const ErrorMsg = styled.span`
    font-size: 13px;
    color: #64748b;
`;

function ErrorIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}

const RetryBtn = styled.button`
    margin-top: 4px;
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    background: #0ea5e9;
    color: #fff;
    border: none;
    border-radius: 9px;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 150ms;
    &:hover { opacity: 0.9; }
`;

const CodeWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 24px 0 8px;
`;

const CodeRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const CodeGroup = styled.span`
    font-size: 52px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #0ea5e9;
    font-variant-numeric: tabular-nums;
    line-height: 1;
`;

const CodeSep = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #cbd5e1;
    flex-shrink: 0;
    margin-bottom: 2px;
`;

const TimerRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

const TimerDot = styled.span<{ $urgent: boolean }>`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${p => p.$urgent ? '#f59e0b' : '#22c55e'};
    animation: ${pulse} 1.8s ease-in-out infinite;
    flex-shrink: 0;
`;

const TimerText = styled.span<{ $urgent: boolean }>`
    font-size: 12px;
    font-weight: 600;
    color: ${p => p.$urgent ? '#d97706' : '#16a34a'};
`;

const ExpiredWrap = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 24px 0 8px;
    text-align: center;
`;

const ExpiredTitle = styled.p`
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
`;

const ExpiredDesc = styled.p`
    margin: 0;
    font-size: 13px;
    color: #64748b;
    max-width: 280px;
    line-height: 1.5;
`;

function ExpiredIcon() {
    return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

const Instructions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px;
    margin-top: 4px;
`;

const InstructionStep = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    color: #475569;
    line-height: 1.4;
    strong { color: #0f172a; }
`;

const StepNum = styled.span`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #e2e8f0;
    color: #475569;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
`;
