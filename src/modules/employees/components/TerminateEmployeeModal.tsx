import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
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
import { useTerminateEmployee } from '../hooks/useEmployees';

const Description = styled.p`
    margin: 0;
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    line-height: 1.5;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
`;

const Label = styled.label`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const Input = styled.input`
    padding: 9px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    transition: border-color ${st.transition};
    &:focus { border-color: ${st.accentRed}; }
`;

const Textarea = styled.textarea`
    padding: 9px 12px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    resize: vertical;
    min-height: 72px;
    font-family: inherit;
    transition: border-color ${st.transition};
    &:focus { border-color: ${st.accentRed}; }
`;

const ErrorMsg = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
`;

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employeeId: string;
    employeeName: string;
}

export const TerminateEmployeeModal = ({ isOpen, onClose, onSuccess, employeeId, employeeName }: Props) => {
    const [terminationDate, setTerminationDate] = useState(new Date().toISOString().slice(0, 10));
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const mutation = useTerminateEmployee(employeeId);

    const handleSubmit = async () => {
        if (!terminationDate) {
            setError('Data zwolnienia jest wymagana.');
            return;
        }
        setError('');
        try {
            await mutation.mutateAsync({ terminationDate, reason: reason || null });
            onSuccess();
            onClose();
        } catch {
            setError('Wystąpił błąd. Spróbuj ponownie.');
        }
    };

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="440px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Zwolnij pracownika</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Description>
                    Czy na pewno chcesz zwolnić pracownika <strong>{employeeName}</strong>?
                    Pracownik straci dostęp do systemu, a dane historyczne zostaną zachowane.
                </Description>
                <Field>
                    <Label>Data zwolnienia *</Label>
                    <Input
                        type="date"
                        value={terminationDate}
                        onChange={e => setTerminationDate(e.target.value)}
                    />
                </Field>
                <Field>
                    <Label>Powód (opcjonalnie)</Label>
                    <Textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Podaj powód zwolnienia..."
                    />
                </Field>
                {error && <ErrorMsg>{error}</ErrorMsg>}
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton $variant="danger" type="button" onClick={handleSubmit} disabled={mutation.isPending}>
                    {mutation.isPending ? 'Przetwarzanie...' : 'Zwolnij pracownika'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
