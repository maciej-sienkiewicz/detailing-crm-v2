// src/modules/comms/components/LeadLostReasonDialog.tsx
// Pytanie o powód przegranej - jedyne miejsce, w którym system nie pozwala
// przestawić statusu jednym kliknięciem.
//
// Powody są zamkniętym słownikiem ze słownika studia, a nie polem tekstowym:
// „za drogo" wpisane na dwadzieścia sposobów nie da się policzyć, a właśnie
// policzenie tych powodów jest jedynym sensem ich zbierania. Notatka zostaje
// dla tego jednego zdania, którego słownik nie przewidzi.
import { useState } from 'react';
import styled from 'styled-components';
import { useToast } from '@/common/components/Toast';
import { useChangeLeadStatus, useLeadDictionaries } from '../hooks/useLeads';
import { IconButton, PrimaryButton } from './shared';

const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    /* Ponad oknem szczegółów (ModalOverlay ma 1000) - pytanie o powód przegranej
       pada właśnie z tamtego okna i musi być nad nim, a nie za nim. */
    z-index: 1100;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 23, 42, 0.45);
    padding: 16px;
`;

const Card = styled.div`
    background: ${p => p.theme.colors.surface};
    border-radius: ${p => p.theme.radii.xl};
    box-shadow: ${p => p.theme.shadows.xl};
    padding: 20px;
    width: 380px;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;

    h4 { margin: 0; font-size: 15px; color: ${p => p.theme.colors.text}; }
    textarea {
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.md};
        padding: 8px 10px;
        font-size: 13px;
        font-family: inherit;
        resize: vertical;
        min-height: 60px;
        outline: none;
        &:focus { border-color: ${p => p.theme.colors.primary}; }
    }
`;

const ReasonOption = styled.button<{ $active: boolean }>`
    border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
    background: ${({ $active }) => ($active ? 'rgba(14, 165, 233, 0.06)' : 'transparent')};
    color: ${p => p.theme.colors.textSecondary};
    border-radius: ${p => p.theme.radii.md};
    padding: 9px 12px;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
`;

interface LeadLostReasonDialogProps {
    leadId: string;
    onClose: () => void;
}

/**
 * Okno jest otwarte dokładnie wtedy, gdy jest zamontowane - wybrany powód żyje
 * więc tyle, co jedno otwarcie, i nie trzeba go kasować efektem przy następnym.
 */
export function LeadLostReasonDialog({ leadId, onClose }: LeadLostReasonDialogProps) {
    const [reason, setReason] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const { data: dictionaries } = useLeadDictionaries();
    const changeStatus = useChangeLeadStatus();
    const { showError } = useToast();

    const confirm = () => {
        if (!reason) return;
        changeStatus.mutate(
            { leadId, status: 'LOST', lostReasonCode: reason, lostNote: note || undefined },
            {
                onSuccess: onClose,
                onError: (error) => {
                    const message =
                        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    showError('Nie udało się zamknąć leada', message ?? 'Spróbuj ponownie');
                },
            }
        );
    };

    return (
        <Backdrop onClick={onClose}>
            <Card onClick={(event) => event.stopPropagation()}>
                <h4>Dlaczego przegraliśmy to zapytanie?</h4>
                {(dictionaries?.lostReasons ?? []).map((option) => (
                    <ReasonOption
                        key={option.code}
                        $active={reason === option.code}
                        onClick={() => setReason(option.code)}
                    >
                        {option.label}
                    </ReasonOption>
                ))}
                <textarea
                    placeholder="Notatka (opcjonalnie)"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <IconButton onClick={onClose}>Anuluj</IconButton>
                    <PrimaryButton disabled={!reason || changeStatus.isPending} onClick={confirm}>
                        Zamknij jako przegrany
                    </PrimaryButton>
                </div>
            </Card>
        </Backdrop>
    );
}
