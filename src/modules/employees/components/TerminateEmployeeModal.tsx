import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useTerminateEmployee } from '../hooks/useEmployees';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: ${st.bgOverlay};
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
`;

const Modal = styled.div`
    background: ${st.bgCard};
    border-radius: ${st.radius};
    box-shadow: ${st.shadowLg};
    width: 100%;
    max-width: 440px;
    overflow: hidden;
`;

const Header = styled.div`
    padding: 20px 24px;
    border-bottom: 1px solid ${st.border};
`;

const Title = styled.h2`
    margin: 0;
    font-size: ${st.fontLg};
    font-weight: 700;
    color: ${st.accentRed};
`;

const Body = styled.div`
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

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

const Footer = styled.div`
    padding: 16px 24px;
    border-top: 1px solid ${st.border};
    display: flex;
    justify-content: flex-end;
    gap: 10px;
`;

const CancelBtn = styled.button`
    padding: 9px 20px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { border-color: ${st.borderHover}; color: ${st.text}; }
`;

const TerminateBtn = styled.button`
    padding: 9px 24px;
    background: ${st.accentRed};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: #B91C1C; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
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

    if (!isOpen) return null;

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
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <Header>
                    <Title>Zwolnij pracownika</Title>
                </Header>
                <Body>
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
                </Body>
                <Footer>
                    <CancelBtn onClick={onClose}>Anuluj</CancelBtn>
                    <TerminateBtn onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending ? 'Przetwarzanie...' : 'Zwolnij pracownika'}
                    </TerminateBtn>
                </Footer>
            </Modal>
        </Overlay>
    );
};
