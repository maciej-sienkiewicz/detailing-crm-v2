// src/modules/appointments/components/RecurrenceEditScopeModal.tsx
import { useState } from 'react';
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
import type { RecurrenceEditScope, RecurrenceInfo } from '../types';

// ─── Styled ───────────────────────────────────────────────────────────────────

const OptionList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const OptionRow = styled.label<{ $disabled?: boolean }>`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 10px;
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$disabled ? 0.45 : 1};
    transition: background 140ms ease;

    &:hover {
        background: ${p => p.$disabled ? 'transparent' : 'rgba(59,130,246,0.06)'};
    }
`;

const RadioInput = styled.input.attrs({ type: 'radio' })`
    width: 16px;
    height: 16px;
    margin-top: 2px;
    accent-color: #3B82F6;
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

const InfoBanner = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: rgba(234, 179, 8, 0.08);
    border: 1px solid rgba(234, 179, 8, 0.3);
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 12px;
    font-size: 12px;
    color: #92400E;
    line-height: 1.5;
`;

const Subtitle = styled.div`
    font-size: 13px;
    color: #64748B;
    margin-bottom: 12px;
`;

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecurrenceEditScopeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (scope: RecurrenceEditScope) => void;
    recurrenceInfo: RecurrenceInfo;
    isDateChanged: boolean;
    isSubmitting: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const RecurrenceEditScopeModal = ({
    isOpen,
    onClose,
    onConfirm,
    recurrenceInfo,
    isDateChanged,
    isSubmitting,
}: RecurrenceEditScopeModalProps) => {
    const [scope, setScope] = useState<RecurrenceEditScope>('THIS');

    if (!isOpen) return null;

    const idx = recurrenceInfo.recurrenceIndex + 1;
    const total = recurrenceInfo.totalInSeries;
    const future = total - recurrenceInfo.recurrenceIndex;

    const handleConfirm = () => onConfirm(scope);

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="480px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Edycja wizyty cyklicznej</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Subtitle>
                    Ta wizyta należy do serii ({idx} z {total}). Co chcesz zmienić?
                </Subtitle>

                {isDateChanged && (
                    <InfoBanner>
                        ⚠ Zmiana daty/godziny dotyczy tylko tej jednej wizyty — pozostałe opcje są niedostępne.
                    </InfoBanner>
                )}

                <OptionList>
                    <OptionRow
                        $disabled={false}
                        onClick={() => !isDateChanged && setScope('THIS')}
                    >
                        <RadioInput
                            name="scope"
                            checked={scope === 'THIS'}
                            onChange={() => setScope('THIS')}
                            disabled={false}
                        />
                        <OptionText>
                            <OptionTitle>Tylko tę wizytę</OptionTitle>
                            <OptionDesc>
                                Pozostałe {total - 1} {total - 1 === 1 ? 'wizyta' : 'wizyty/wizyt'} w serii pozostanie bez zmian.
                                {!recurrenceInfo.isDetached && ' Wizyta zostanie odłączona od serii.'}
                            </OptionDesc>
                        </OptionText>
                    </OptionRow>

                    <OptionRow
                        $disabled={isDateChanged}
                        onClick={() => !isDateChanged && setScope('THIS_AND_FUTURE')}
                    >
                        <RadioInput
                            name="scope"
                            checked={scope === 'THIS_AND_FUTURE'}
                            onChange={() => setScope('THIS_AND_FUTURE')}
                            disabled={isDateChanged}
                        />
                        <OptionText>
                            <OptionTitle>Tę i wszystkie następne wizyty</OptionTitle>
                            <OptionDesc>
                                Zmiana dotyczy tej i {future - 1} {future - 1 === 1 ? 'kolejnej wizyty' : 'kolejnych wizyt'} w serii.
                                Wizyty indywidualnie edytowane zostaną pominięte.
                            </OptionDesc>
                        </OptionText>
                    </OptionRow>

                    <OptionRow
                        $disabled={isDateChanged}
                        onClick={() => !isDateChanged && setScope('ALL')}
                    >
                        <RadioInput
                            name="scope"
                            checked={scope === 'ALL'}
                            onChange={() => setScope('ALL')}
                            disabled={isDateChanged}
                        />
                        <OptionText>
                            <OptionTitle>Wszystkie wizyty w serii</OptionTitle>
                            <OptionDesc>
                                Zmieni wszystkie {total} wizyty. Wizyty indywidualnie edytowane oraz przekonwertowane zostaną pominięte.
                            </OptionDesc>
                        </OptionText>
                    </OptionRow>
                </OptionList>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
                    Anuluj
                </SharedButton>
                <SharedButton $variant="primary" type="button" onClick={handleConfirm} disabled={isSubmitting}>
                    {isSubmitting ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
