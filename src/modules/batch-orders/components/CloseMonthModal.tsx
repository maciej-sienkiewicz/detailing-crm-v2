import { useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import type { CloseMode } from '../types';

const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`;
const slideUp = keyframes`from { opacity: 0; transform: translate(-50%, calc(-50% + 12px)); } to { opacity: 1; transform: translate(-50%, -50%); }`;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(0, 0, 0, 0.45);
    animation: ${fadeIn} 180ms ease;
`;

const Modal = styled.div`
    position: fixed;
    left: 50%;
    top: 50%;
    z-index: 2001;
    transform: translate(-50%, -50%);
    width: 480px;
    max-width: calc(100vw - 32px);
    background: ${p => p.theme.colors.surface};
    border-radius: 16px;
    box-shadow:
        0 0 0 1px rgba(0,0,0,0.08),
        0 24px 64px rgba(0,0,0,0.2),
        0 4px 12px rgba(0,0,0,0.1);
    overflow: hidden;
    animation: ${slideUp} 220ms cubic-bezier(0.22, 1, 0.36, 1);
`;

const ModalHead = styled.div`
    padding: 20px 24px 0;
`;

const ModalTitle = styled.h2`
    margin: 0 0 4px;
    font-size: 17px;
    font-weight: 700;
    color: ${p => p.theme.colors.text};
    letter-spacing: -0.3px;
`;

const ModalSubtitle = styled.p`
    margin: 0 0 20px;
    font-size: 13px;
    color: ${p => p.theme.colors.textMuted};
    line-height: 1.5;
`;

const Divider = styled.div`
    height: 1px;
    background: ${p => p.theme.colors.border};
    margin: 0 24px;
`;

const Body = styled.div`
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const Label = styled.label`
    font-size: 12px;
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.06em;
`;

const DateRow = styled.div`
    display: flex;
    gap: 10px;
`;

const Input = styled.input`
    flex: 1;
    height: 38px;
    padding: 0 12px;
    border: 1.5px solid ${p => p.theme.colors.border};
    border-radius: 10px;
    font-size: 14px;
    font-family: inherit;
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.text};
    outline: none;
    transition: border-color 150ms, box-shadow 150ms;

    &:focus {
        border-color: ${p => p.theme.colors.primary};
        box-shadow: 0 0 0 3px rgba(14,165,233,0.15);
    }
`;

const EmailInput = styled(Input)`
    width: 100%;
    box-sizing: border-box;
    flex: none;
`;

const ModeGroup = styled.div`
    display: flex;
    gap: 8px;
`;

const ModeOption = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1.5px solid ${p => p.$active ? p.theme.colors.primary : p.theme.colors.border};
    background: ${p => p.$active ? 'rgba(14,165,233,0.06)' : p.theme.colors.surface};
    color: ${p => p.$active ? p.theme.colors.primary : p.theme.colors.textMuted};
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: all 150ms;

    &:hover:not(:disabled) {
        border-color: ${p => p.theme.colors.primary};
        color: ${p => p.theme.colors.primary};
    }
`;

const ModeLabel = styled.div`
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 2px;
`;

const ModeDesc = styled.div`
    font-size: 11px;
    font-weight: 400;
    opacity: 0.8;
    line-height: 1.4;
`;

const EmailHint = styled.p`
    margin: 4px 0 0;
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
`;

const Footer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 24px 20px;
`;

const CancelBtn = styled.button`
    padding: 9px 18px;
    border-radius: 9999px;
    border: 1px solid ${p => p.theme.colors.border};
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 150ms;

    &:hover { background: ${p => p.theme.colors.surfaceAlt}; color: ${p => p.theme.colors.text}; }
`;

const ConfirmBtn = styled.button`
    padding: 9px 22px;
    border-radius: 9999px;
    border: none;
    background: ${p => p.theme.colors.primary};
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 150ms;

    &:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

interface Props {
    contractorName: string;
    onClose: () => void;
    onConfirm: (from: string, to: string, mode: CloseMode, emailTo?: string) => Promise<void>;
}

export function CloseMonthModal({ contractorName, onClose, onConfirm }: Props) {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const [from, setFrom] = useState(fmt(firstDay));
    const [to, setTo] = useState(fmt(lastDay));
    const [mode, setMode] = useState<CloseMode>('NEW_ONLY');
    const [emailTo, setEmailTo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleConfirm() {
        if (!from || !to) { setError('Wybierz zakres dat.'); return; }
        setLoading(true);
        setError('');
        try {
            await onConfirm(from, to, mode, emailTo.trim() || undefined);
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Wystąpił błąd. Spróbuj ponownie.');
        } finally {
            setLoading(false);
        }
    }

    return createPortal(
        <>
            <Overlay onClick={onClose} />
            <Modal onClick={e => e.stopPropagation()}>
                <ModalHead>
                    <ModalTitle>Zamknij okres</ModalTitle>
                    <ModalSubtitle>
                        Zestawienie dla: <strong>{contractorName}</strong>
                    </ModalSubtitle>
                </ModalHead>

                <Divider />

                <Body>
                    <FieldGroup>
                        <Label>Zakres dat</Label>
                        <DateRow>
                            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
                            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
                        </DateRow>
                    </FieldGroup>

                    <FieldGroup>
                        <Label>Tryb zamknięcia</Label>
                        <ModeGroup>
                            <ModeOption $active={mode === 'NEW_ONLY'} onClick={() => setMode('NEW_ONLY')}>
                                <ModeLabel>Tylko nowe</ModeLabel>
                                <ModeDesc>Zamknij wpisy, które nie były jeszcze zamknięte</ModeDesc>
                            </ModeOption>
                            <ModeOption $active={mode === 'ALL'} onClick={() => setMode('ALL')}>
                                <ModeLabel>Wszystkie</ModeLabel>
                                <ModeDesc>Zamknij wszystkie wpisy w wybranym okresie</ModeDesc>
                            </ModeOption>
                        </ModeGroup>
                    </FieldGroup>

                    <FieldGroup>
                        <Label>Email (opcjonalnie)</Label>
                        <EmailInput
                            type="email"
                            placeholder="kontrahent@firma.pl"
                            value={emailTo}
                            onChange={e => setEmailTo(e.target.value)}
                        />
                        <EmailHint>Zestawienie PDF zostanie wysłane na podany adres.</EmailHint>
                    </FieldGroup>

                    {error && (
                        <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 500 }}>{error}</div>
                    )}
                </Body>

                <Footer>
                    <CancelBtn onClick={onClose}>Anuluj</CancelBtn>
                    <ConfirmBtn onClick={handleConfirm} disabled={loading}>
                        {loading ? 'Zamykanie…' : 'Zamknij okres'}
                    </ConfirmBtn>
                </Footer>
            </Modal>
        </>,
        document.body,
    );
}
