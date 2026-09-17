import { useState } from 'react';
import { LockedSection } from '@/common/components/LockedSection';
import { useCapability } from '@/modules/subscription';
import styled from 'styled-components';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import type { BatchContractor, SettlementMode, SettlementRequest } from '../types';

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
    background: ${p => p.$active ? 'color-mix(in srgb, var(--brand-primary) 6%, transparent)' : 'transparent'};
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
    background: ${p => p.$active ? 'color-mix(in srgb, var(--brand-primary) 4%, transparent)' : 'transparent'};
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
    width: 100%;
    box-sizing: border-box;

    &:focus {
        border-color: ${p => p.theme.colors.primary};
    }

    &::placeholder {
        color: ${p => p.theme.colors.textMuted};
    }

    @media (hover: none) and (pointer: coarse) {
        min-height: 44px;
    }
`;

const SavedHint = styled.span`
    font-size: 11px;
    color: ${p => p.theme.colors.success};
    margin-top: 2px;
`;

interface Props {
    contractor: BatchContractor;
    from: string;
    to: string;
    hasPartialSettlement: boolean;
    /** Kiedy zestawienie za ten okres poszło już e-mailem; null = nigdy. */
    previousEmailSentAt?: string | null;
    onConfirm: (request: SettlementRequest) => Promise<void>;
    onClose: () => void;
    isLoading?: boolean;
}

export function SettlementModal({ contractor, from, to, hasPartialSettlement, previousEmailSentAt = null, onConfirm, onClose, isLoading }: Props) {
    const [mode, setMode] = useState<SettlementMode>(hasPartialSettlement ? 'NEW_ONLY' : 'ALL');
    const [addToFinances, setAddToFinances] = useState(false);
    const comms = useCapability('COMM_SEND_TRANSACTIONAL');
    const [sendEmail, setSendEmail] = useState(false);
    const [email, setEmail] = useState(contractor.email ?? '');

    const periodLabel = `${new Date(from).toLocaleDateString('pl-PL')}-${new Date(to).toLocaleDateString('pl-PL')}`;

    async function handleConfirm() {
        await onConfirm({
            from,
            to,
            addToFinances,
            sendEmail: comms.enabled && sendEmail,
            emailOverride: comms.enabled && sendEmail && email ? email : undefined,
            mode,
        });
    }

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Rozlicz okres</ModalTitle>
                    <ModalSubtitle>{contractor.name} · {periodLabel}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {hasPartialSettlement && (
                    <WarningBox>
                        <WarningTitle>
                            Część pozycji została już rozliczona we wcześniejszym zestawieniu.
                        </WarningTitle>
                        <ModeOptions>
                            <ModeOption $active={mode === 'ALL'} onClick={() => setMode('ALL')}>
                                <ModeRadio
                                    type="radio"
                                    name="settlement-mode"
                                    checked={mode === 'ALL'}
                                    onChange={() => setMode('ALL')}
                                    onClick={e => e.stopPropagation()}
                                />
                                <div>
                                    <ModeLabel>Wszystkie pozycje</ModeLabel>
                                    <ModeDesc>Generuje zestawienie ze wszystkimi wpisami z wybranego okresu, łącznie z już rozliczonymi.</ModeDesc>
                                </div>
                            </ModeOption>
                            <ModeOption $active={mode === 'NEW_ONLY'} onClick={() => setMode('NEW_ONLY')}>
                                <ModeRadio
                                    type="radio"
                                    name="settlement-mode"
                                    checked={mode === 'NEW_ONLY'}
                                    onChange={() => setMode('NEW_ONLY')}
                                    onClick={e => e.stopPropagation()}
                                />
                                <div>
                                    <ModeLabel>Tylko nowo dodane</ModeLabel>
                                    <ModeDesc>Rozlicza wyłącznie wpisy, które nie były jeszcze ujęte w żadnym zestawieniu.</ModeDesc>
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

                <LockedSection
                    locked={!comms.enabled}
                    message="Wysyłka podsumowania e-mailem wymaga modułu Automatyzacja kontaktu z klientem."
                >
                    <OptionBlock
                        $active={sendEmail}
                        onClick={() => comms.enabled && setSendEmail(v => !v)}
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
                        {previousEmailSentAt && mode === 'ALL' && (
                            <WarningBox role="note" onClick={e => e.stopPropagation()}>
                                <WarningTitle>Zestawienie za ten okres poszło już e-mailem {new Date(previousEmailSentAt).toLocaleString('pl-PL')}.</WarningTitle>
                                Tryb „Wszystkie" obejmuje wpisy rozliczone wcześniej, więc kontrahent dostanie drugi raz to samo zestawienie. Jeśli to celowe, wyślij; jeśli nie, wybierz „Tylko nowe".
                            </WarningBox>
                        )}
                        {sendEmail && (
                            <EmailField onClick={e => e.stopPropagation()}>
                                <EmailLabel htmlFor="settlement-email">Adres e-mail</EmailLabel>
                                <EmailInput
                                    id="settlement-email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="email@firma.pl"
                                    autoFocus
                                />
                                {!contractor.email && email && (
                                    <SavedHint>Adres zostanie zapisany do karty kontrahenta.</SavedHint>
                                )}
                            </EmailField>
                        )}
                    </OptionBlock>
                </LockedSection>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
                    Anuluj
                </SharedButton>
                <SharedButton
                    $variant="primary"
                    type="button"
                    onClick={handleConfirm}
                    disabled={isLoading || (sendEmail && !email.trim())}
                >
                    {isLoading ? 'Rozliczanie...' : 'Rozlicz'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
}
