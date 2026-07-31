import { useState } from 'react';
import styled from 'styled-components';
import type { BatchContractor, CloseMode, CloseMonthRequest } from '../types';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
`;

const Modal = styled.div`
    background: ${p => p.theme.colors.surface};
    border-radius: 16px;
    padding: 28px;
    width: 100%;
    max-width: 480px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const Title = styled.h2`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.lg};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

const Subtitle = styled.p`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.textMuted};
    line-height: 1.5;
`;

const WarningBox = styled.div`
    border: 1px solid #f59e0b;
    border-radius: 10px;
    padding: 14px 16px;
    background: rgba(245, 158, 11, 0.06);
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const WarningTitle = styled.p`
    margin: 0;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 600;
    color: #b45309;
`;

const ModeOptions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ModeOption = styled.label<{ $active?: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid ${p => p.$active ? p.theme.colors.primary : p.theme.colors.border};
    background: ${p => p.$active ? 'rgba(14, 165, 233, 0.05)' : 'transparent'};
    cursor: pointer;
    transition: border-color 150ms ease, background 150ms ease;

    &:hover {
        border-color: ${p => p.theme.colors.primary};
    }
`;

const ModeRadio = styled.input`
    margin-top: 2px;
    accent-color: ${p => p.theme.colors.primary};
    flex-shrink: 0;
`;

const ModeLabel = styled.span`
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 600;
    color: ${p => p.theme.colors.text};
    display: block;
    line-height: 1.4;
`;

const ModeDesc = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    display: block;
    margin-top: 2px;
    line-height: 1.4;
`;

const OptionBlock = styled.div<{ $active?: boolean }>`
    border: 1px solid ${p => p.$active ? p.theme.colors.primary : p.theme.colors.border};
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: ${p => p.$active ? 'rgba(14, 165, 233, 0.04)' : 'transparent'};
    transition: border-color 150ms ease, background 150ms ease;
    cursor: pointer;

    &:hover {
        border-color: ${p => p.theme.colors.primary};
    }
`;

const CheckRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const Checkbox = styled.input`
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: ${p => p.theme.colors.primary};
    flex-shrink: 0;
`;

const CheckLabel = styled.span`
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 600;
    color: ${p => p.theme.colors.text};
    user-select: none;
`;

const CheckDescription = styled.p`
    margin: 0 0 0 26px;
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    line-height: 1.5;
`;

const EmailField = styled.div`
    margin-left: 26px;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const EmailLabel = styled.label`
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const EmailInput = styled.input`
    padding: 8px 12px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.background};
    outline: none;
    transition: border-color 150ms ease;

    &:focus {
        border-color: ${p => p.theme.colors.primary};
    }

    &::placeholder {
        color: ${p => p.theme.colors.textMuted};
    }
`;

const Actions = styled.div`
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding-top: 4px;
    border-top: 1px solid ${p => p.theme.colors.border};
`;

const Btn = styled.button<{ $variant?: 'primary' | 'outline' }>`
    padding: 8px 20px;
    border-radius: 8px;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;
    transition: opacity 150ms ease, background 150ms ease;

    &:disabled { opacity: 0.5; cursor: not-allowed; }

    ${p => p.$variant === 'primary' && `
        background: ${p.theme.colors.primary};
        border: 1px solid ${p.theme.colors.primary};
        color: #fff;
        &:hover:not(:disabled) { opacity: 0.9; }
    `}
    ${p => (!p.$variant || p.$variant === 'outline') && `
        background: transparent;
        border: 1px solid ${p.theme.colors.border};
        color: ${p.theme.colors.text};
        &:hover:not(:disabled) { background: ${p.theme.colors.surfaceAlt}; }
    `}
`;

interface Props {
    contractor: BatchContractor;
    from: string;
    to: string;
    hasPartialClose: boolean;
    onConfirm: (request: CloseMonthRequest) => Promise<void>;
    onClose: () => void;
    isLoading?: boolean;
}

export function CloseMonthModal({ contractor, from, to, hasPartialClose, onConfirm, onClose, isLoading }: Props) {
    const [mode, setMode] = useState<CloseMode>(hasPartialClose ? 'NEW_ONLY' : 'ALL');
    const [addToFinances, setAddToFinances] = useState(false);
    const [sendEmail, setSendEmail] = useState(false);
    const [email, setEmail] = useState(contractor.email ?? '');

    const periodLabel = `${new Date(from).toLocaleDateString('pl-PL')} – ${new Date(to).toLocaleDateString('pl-PL')}`;

    async function handleConfirm() {
        await onConfirm({
            from,
            to,
            addToFinances,
            sendEmail,
            emailOverride: sendEmail && email ? email : undefined,
            mode,
        });
    }

    return (
        <Overlay onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <Modal>
                <div>
                    <Title>Zamknij miesiąc</Title>
                    <Subtitle style={{ marginTop: 6 }}>
                        {contractor.name} · {periodLabel}
                    </Subtitle>
                </div>

                {hasPartialClose && (
                    <WarningBox>
                        <WarningTitle>
                            Część pozycji została zamknięta we wcześniejszym raporcie.
                        </WarningTitle>
                        <ModeOptions>
                            <ModeOption $active={mode === 'ALL'} onClick={() => setMode('ALL')}>
                                <ModeRadio
                                    type="radio"
                                    name="close-mode"
                                    checked={mode === 'ALL'}
                                    onChange={() => setMode('ALL')}
                                    onClick={e => e.stopPropagation()}
                                />
                                <div>
                                    <ModeLabel>Wszystkie pozycje</ModeLabel>
                                    <ModeDesc>Generuje zestawienie ze wszystkimi wpisami z wybranego okresu, łącznie z już zamkniętymi.</ModeDesc>
                                </div>
                            </ModeOption>
                            <ModeOption $active={mode === 'NEW_ONLY'} onClick={() => setMode('NEW_ONLY')}>
                                <ModeRadio
                                    type="radio"
                                    name="close-mode"
                                    checked={mode === 'NEW_ONLY'}
                                    onChange={() => setMode('NEW_ONLY')}
                                    onClick={e => e.stopPropagation()}
                                />
                                <div>
                                    <ModeLabel>Tylko nowo dodane</ModeLabel>
                                    <ModeDesc>Zamyka wyłącznie wpisy, które nie były jeszcze ujęte w żadnym raporcie.</ModeDesc>
                                </div>
                            </ModeOption>
                        </ModeOptions>
                    </WarningBox>
                )}

                <OptionBlock
                    $active={addToFinances}
                    onClick={() => setAddToFinances(v => !v)}
                >
                    <CheckRow>
                        <Checkbox
                            type="checkbox"
                            checked={addToFinances}
                            onChange={e => { e.stopPropagation(); setAddToFinances(e.target.checked); }}
                            onClick={e => e.stopPropagation()}
                        />
                        <CheckLabel>Dodaj wpis do finansów</CheckLabel>
                    </CheckRow>
                    <CheckDescription>
                        Tworzy dokument finansowy z sumą brutto za wybrany okres (przelew, przychód).
                    </CheckDescription>
                </OptionBlock>

                <OptionBlock
                    $active={sendEmail}
                    onClick={() => setSendEmail(v => !v)}
                >
                    <CheckRow>
                        <Checkbox
                            type="checkbox"
                            checked={sendEmail}
                            onChange={e => { e.stopPropagation(); setSendEmail(e.target.checked); }}
                            onClick={e => e.stopPropagation()}
                        />
                        <CheckLabel>Wyślij podsumowanie mailem</CheckLabel>
                    </CheckRow>
                    <CheckDescription>
                        Wysyła zestawienie za wybrany okres na adres e-mail kontrahenta.
                    </CheckDescription>
                    {sendEmail && (
                        <EmailField onClick={e => e.stopPropagation()}>
                            <EmailLabel htmlFor="close-month-email">Adres e-mail</EmailLabel>
                            <EmailInput
                                id="close-month-email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="email@firma.pl"
                                autoFocus
                            />
                            {!contractor.email && email && (
                                <span style={{ fontSize: 11, color: '#22c55e', marginTop: 2 }}>
                                    Adres zostanie zapisany do karty kontrahenta.
                                </span>
                            )}
                        </EmailField>
                    )}
                </OptionBlock>

                <Actions>
                    <Btn $variant="outline" onClick={onClose} disabled={isLoading}>Anuluj</Btn>
                    <Btn
                        $variant="primary"
                        onClick={handleConfirm}
                        disabled={isLoading || (sendEmail && !email.trim())}
                    >
                        {isLoading ? 'Zamykanie...' : 'Zamknij miesiąc'}
                    </Btn>
                </Actions>
            </Modal>
        </Overlay>
    );
}
