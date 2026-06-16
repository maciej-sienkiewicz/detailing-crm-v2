import { useState } from 'react';
import {
    Overlay, ModalCard, ModalHead, ModalTitle, ModalSubtitle, ModalCloseBtn,
    ModalBody, ModalFooter, FormField, FieldLabel, FieldInput, FieldTextarea,
    ErrorMsg, CancelBtn, DangerBtn,
} from '../rbacShared.styles';
import type { TerminateEmployeeRequest } from '../../teamTypes';

export interface TerminateEmployeeModalProps {
    employeeName: string;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (payload: TerminateEmployeeRequest) => void;
}

export function TerminateEmployeeModal({ employeeName, isSaving, onClose, onSubmit }: TerminateEmployeeModalProps) {
    const [terminationDate, setTerminationDate] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        if (!terminationDate) {
            setError('Data zakończenia jest wymagana.');
            return;
        }
        onSubmit({
            terminationDate,
            reason: reason.trim() === '' ? null : reason.trim(),
        });
    };

    return (
        <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
            <ModalCard $maxWidth={440}>
                <ModalHead>
                    <div>
                        <ModalTitle>Zakończ zatrudnienie</ModalTitle>
                        <ModalSubtitle>{employeeName}</ModalSubtitle>
                    </div>
                    <ModalCloseBtn onClick={onClose} aria-label="Zamknij">
                        <CloseIcon />
                    </ModalCloseBtn>
                </ModalHead>

                <ModalBody>
                    <FormField>
                        <FieldLabel>Data zakończenia<span>*</span></FieldLabel>
                        <FieldInput
                            type="date"
                            value={terminationDate}
                            onChange={e => { setTerminationDate(e.target.value); setError(null); }}
                            $error={!!error}
                            autoFocus
                        />
                        {error && <ErrorMsg>{error}</ErrorMsg>}
                    </FormField>

                    <FormField>
                        <FieldLabel>Powód (opcjonalnie)</FieldLabel>
                        <FieldTextarea
                            placeholder="np. Rezygnacja pracownika"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </FormField>
                </ModalBody>

                <ModalFooter>
                    <CancelBtn onClick={onClose} disabled={isSaving}>Anuluj</CancelBtn>
                    <DangerBtn onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Przetwarzanie…' : 'Zakończ zatrudnienie'}
                    </DangerBtn>
                </ModalFooter>
            </ModalCard>
        </Overlay>
    );
}

const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);
