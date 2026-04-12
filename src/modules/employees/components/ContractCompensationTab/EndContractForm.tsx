import { useState } from 'react';
import type { EndContractPayload } from '../../types';
import {
    InlineFormWrapper, FormTitle, FormRow,
    Field, Label, Input,
    FormActions, CancelBtn, DangerSaveBtn,
    ErrorMsg,
} from './styles';

interface Props {
    onSave: (payload: EndContractPayload) => Promise<void>;
    onCancel: () => void;
    isPending: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export const EndContractForm = ({ onSave, onCancel, isPending }: Props) => {
    const [terminationDate, setTerminationDate] = useState(today());
    const [terminationReason, setTerminationReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!terminationDate) { setError('Data zakończenia jest wymagana.'); return; }
        setError('');
        try {
            await onSave({
                terminationDate,
                terminationReason: terminationReason.trim() || null,
            });
        } catch {
            setError('Wystąpił błąd. Spróbuj ponownie.');
        }
    };

    return (
        <InlineFormWrapper>
            <FormTitle>Zakończ umowę</FormTitle>

            <FormRow>
                <Field>
                    <Label>Data zakończenia *</Label>
                    <Input
                        type="date"
                        value={terminationDate}
                        onChange={e => setTerminationDate(e.target.value)}
                    />
                </Field>
                <Field>
                    <Label>Powód (opcjonalnie)</Label>
                    <Input
                        type="text"
                        value={terminationReason}
                        onChange={e => setTerminationReason(e.target.value)}
                        placeholder="np. Porozumienie stron"
                    />
                </Field>
            </FormRow>

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <FormActions>
                <CancelBtn onClick={onCancel}>Anuluj</CancelBtn>
                <DangerSaveBtn onClick={handleSubmit} disabled={isPending}>
                    {isPending ? 'Przetwarzanie...' : 'Zakończ umowę'}
                </DangerSaveBtn>
            </FormActions>
        </InlineFormWrapper>
    );
};
