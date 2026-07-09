// src/modules/operations/components/DeleteRecurringModal.tsx
import { useState } from 'react';
import { PiiText, joinPiiName } from '@/common/pii';
import styled from 'styled-components';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import type { Operation } from '../types';
import type { RecurrenceEditScope } from '@/modules/appointments/types';

// ─── Styled ───────────────────────────────────────────────────────────────────

const Subtitle = styled.div`
    font-size: 13px;
    color: #64748B;
    margin-bottom: 14px;
    line-height: 1.5;
`;

const OptionList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const OptionRow = styled.label`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 10px;
    cursor: pointer;
    transition: background 140ms ease;

    &:hover {
        background: rgba(220, 38, 38, 0.04);
    }
`;

const RadioInput = styled.input.attrs({ type: 'radio' })`
    width: 16px;
    height: 16px;
    margin-top: 2px;
    accent-color: #DC2626;
    cursor: pointer;
    flex-shrink: 0;
`;

const OptionText = styled.div``;

const OptionTitle = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #0F172A;
    line-height: 1.4;
`;

const OptionDesc = styled.div`
    font-size: 12px;
    color: #64748B;
    margin-top: 2px;
    line-height: 1.4;
`;

const WarnNote = styled.div`
    font-size: 12px;
    color: #DC2626;
    font-weight: 500;
    margin-top: 3px;
`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface DeleteRecurringModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (scope: RecurrenceEditScope) => void;
    isDeleting: boolean;
    operation: Operation;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DeleteRecurringModal = ({
    isOpen,
    onClose,
    onConfirm,
    isDeleting,
    operation,
}: DeleteRecurringModalProps) => {
    const [scope, setScope] = useState<RecurrenceEditScope>('THIS');

    if (!isOpen) return null;

    const info = operation.recurrenceInfo!;
    const idx = info.recurrenceIndex;
    const total = info.totalInSeries;
    const future = total - idx;
    const past = idx;

    const customerName = joinPiiName(operation.customerFirstName, operation.customerLastName) ?? '';
    const title = operation.title ? `"${operation.title}"` : `rezerwacja klienta ${customerName}`;

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="480px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Usuń wizytę cykliczną</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Subtitle>
                    <PiiText value={title} kind="name" /> ({idx + 1} z {total}). Co chcesz usunąć?
                </Subtitle>

                <OptionList>
                    <OptionRow onClick={() => setScope('THIS')}>
                        <RadioInput
                            name="deleteScope"
                            checked={scope === 'THIS'}
                            onChange={() => setScope('THIS')}
                        />
                        <OptionText>
                            <OptionTitle>Tylko tę wizytę</OptionTitle>
                            <OptionDesc>
                                Pozostałe {total - 1} {total - 1 === 1 ? 'wizyta zostanie zachowana.' : 'wizyty/wizyt zostanie zachowanych.'}
                            </OptionDesc>
                        </OptionText>
                    </OptionRow>

                    <OptionRow onClick={() => setScope('THIS_AND_FUTURE')}>
                        <RadioInput
                            name="deleteScope"
                            checked={scope === 'THIS_AND_FUTURE'}
                            onChange={() => setScope('THIS_AND_FUTURE')}
                        />
                        <OptionText>
                            <OptionTitle>Tę i wszystkie następne wizyty</OptionTitle>
                            <OptionDesc>
                                Zostanie usuniętych {future} {future === 1 ? 'wizyta' : 'wizyty/wizyt'}.
                                {past > 0 && <> Wcześniejsze {past} {past === 1 ? 'wizyta zostanie zachowana.' : 'wizyty/wizyt zostanie zachowanych.'}</>}
                            </OptionDesc>
                        </OptionText>
                    </OptionRow>

                    <OptionRow onClick={() => setScope('ALL')}>
                        <RadioInput
                            name="deleteScope"
                            checked={scope === 'ALL'}
                            onChange={() => setScope('ALL')}
                        />
                        <OptionText>
                            <OptionTitle>Całą serię ({total} wizyt)</OptionTitle>
                            <OptionDesc>
                                Wszystkie wizyty z tej serii zostaną usunięte.
                                Wizyty o statusie CONVERTED nie zostaną usunięte.
                            </OptionDesc>
                            <WarnNote>⚠ Tej operacji nie można cofnąć.</WarnNote>
                        </OptionText>
                    </OptionRow>
                </OptionList>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isDeleting}>
                    Anuluj
                </SharedButton>
                <SharedButton $variant="danger" type="button" onClick={() => onConfirm(scope)} disabled={isDeleting}>
                    {isDeleting ? 'Usuwanie...' : 'Usuń'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
