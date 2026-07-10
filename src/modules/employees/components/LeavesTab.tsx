import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { useToast } from '@/common/components/Toast';
import { useLeaves, useAddLeave, useDeleteLeave } from '../hooks/useLeaves';
import type { LeaveType, AddLeavePayload, EmployeeLeave } from '../types';

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const SectionTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const TopRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const AddBtn = styled.button`
    padding: 7px 16px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    &:hover { background: #1D4ED8; }
`;

const Table = styled.table`
    width: 100%;
    border-collapse: collapse;
    font-size: ${st.fontSm};
`;

const Th = styled.th`
    padding: 9px 12px;
    text-align: left;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.4px;
    background: ${st.bgCardAlt};
    border-bottom: 1px solid ${st.border};
`;

const Td = styled.td`
    padding: 11px 12px;
    color: ${st.textSecondary};
    border-bottom: 1px solid ${st.border};
`;

const TypeBadge = styled.span<{ $type: LeaveType }>`
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    ${({ $type }) => {
        if ($type === 'SICK') return 'background: rgba(239,68,68,0.10); color: #DC2626;';
        if ($type === 'UNPAID') return 'background: rgba(100,116,139,0.10); color: #64748B;';
        return 'background: rgba(16,185,129,0.12); color: #059669;';
    }}
`;

const DeleteBtn = styled.button`
    padding: 3px 10px;
    border: 1px solid ${st.accentRed};
    background: none;
    border-radius: ${st.radiusSm};
    font-size: 11px;
    font-weight: 600;
    color: ${st.accentRed};
    cursor: pointer;
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const EmptyText = styled.p`
    margin: 0;
    padding: 32px 0;
    text-align: center;
    color: ${st.textMuted};
    font-size: ${st.fontSm};
`;

const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid ${st.border};
    border-top-color: ${st.accentBlue};
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 32px auto;
    @keyframes spin { to { transform: rotate(360deg); } }
`;

const FormBox = styled.div`
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const FormTitle = styled.h4`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const Label = styled.label`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const Input = styled.input`
    padding: 8px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    &:focus { border-color: ${st.accentBlue}; }
`;

const Select = styled.select`
    padding: 8px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    &:focus { border-color: ${st.accentBlue}; }
`;

const FormActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const CancelBtn = styled.button`
    padding: 7px 14px;
    background: none;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
    cursor: pointer;
`;

const SaveBtn = styled.button`
    padding: 7px 16px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
`;

const NoteText = styled.span`
    color: ${st.textMuted};
    font-size: ${st.fontXs};
`;

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
    ANNUAL: 'Urlop wypoczynkowy',
    SICK: 'Zwolnienie lekarskie',
    UNPAID: 'Urlop bezpłatny',
    SPECIAL: 'Urlop okolicznościowy',
    PARENTAL: 'Urlop rodzicielski',
    CARE: 'Opieka nad dzieckiem',
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm = (): AddLeavePayload => ({
    leaveType: 'ANNUAL',
    startDate: todayISO(),
    endDate: todayISO(),
    note: null,
});

interface Props { employeeId: string; }

export const LeavesTab = ({ employeeId }: Props) => {
    const { showSuccess } = useToast();
    const { leaves, isLoading } = useLeaves(employeeId);
    const addMutation = useAddLeave(employeeId);
    const deleteMutation = useDeleteLeave(employeeId);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<AddLeavePayload>(emptyForm);
    const [formError, setFormError] = useState('');
    const [pendingDelete, setPendingDelete] = useState<EmployeeLeave | null>(null);

    const handleAdd = async () => {
        if (!form.startDate || !form.endDate) {
            setFormError('Daty od i do są wymagane.');
            return;
        }
        if (form.endDate < form.startDate) {
            setFormError('Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.');
            return;
        }
        setFormError('');
        try {
            await addMutation.mutateAsync(form);
            showSuccess('Urlop dodany');
            setShowForm(false);
            setForm(emptyForm());
        } catch {
            setFormError('Wystąpił błąd. Spróbuj ponownie.');
        }
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        try {
            await deleteMutation.mutateAsync(pendingDelete.id);
            showSuccess('Urlop usunięty');
        } finally {
            setPendingDelete(null);
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <Section>
            <TopRow>
                <SectionTitle>Urlopy</SectionTitle>
                {!showForm && (
                    <AddBtn onClick={() => setShowForm(true)}>+ Dodaj urlop</AddBtn>
                )}
            </TopRow>

            {showForm && (
                <FormBox>
                    <FormTitle>Nowy urlop</FormTitle>
                    <Field>
                        <Label>Typ urlopu</Label>
                        <Select
                            value={form.leaveType}
                            onChange={e => setForm(p => ({ ...p, leaveType: e.target.value as LeaveType }))}
                        >
                            {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map(t => (
                                <option key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</option>
                            ))}
                        </Select>
                    </Field>
                    <Row>
                        <Field>
                            <Label>Od *</Label>
                            <Input
                                type="date"
                                value={form.startDate}
                                onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                            />
                        </Field>
                        <Field>
                            <Label>Do *</Label>
                            <Input
                                type="date"
                                value={form.endDate}
                                onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                            />
                        </Field>
                    </Row>
                    <Field>
                        <Label>Notatka</Label>
                        <Input
                            type="text"
                            placeholder="Opcjonalna notatka"
                            value={form.note ?? ''}
                            onChange={e => setForm(p => ({ ...p, note: e.target.value || null }))}
                            maxLength={500}
                        />
                    </Field>
                    {formError && <ErrorMsg>{formError}</ErrorMsg>}
                    <FormActions>
                        <CancelBtn onClick={() => { setShowForm(false); setFormError(''); }}>Anuluj</CancelBtn>
                        <SaveBtn onClick={handleAdd} disabled={addMutation.isPending}>
                            {addMutation.isPending ? 'Zapisywanie…' : 'Dodaj urlop'}
                        </SaveBtn>
                    </FormActions>
                </FormBox>
            )}

            {leaves.length === 0 ? (
                <EmptyText>Brak zarejestrowanych urlopów.</EmptyText>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Typ</Th>
                                <Th>Od</Th>
                                <Th>Do</Th>
                                <Th>Dni</Th>
                                <Th>Notatka</Th>
                                <Th>Akcje</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaves.map(l => (
                                <tr key={l.id}>
                                    <Td><TypeBadge $type={l.leaveType}>{LEAVE_TYPE_LABELS[l.leaveType]}</TypeBadge></Td>
                                    <Td>{new Date(l.startDate).toLocaleDateString('pl-PL')}</Td>
                                    <Td>{new Date(l.endDate).toLocaleDateString('pl-PL')}</Td>
                                    <Td>{l.daysCount}</Td>
                                    <Td>{l.note ? <NoteText>{l.note}</NoteText> : '—'}</Td>
                                    <Td>
                                        <DeleteBtn
                                            onClick={() => setPendingDelete(l)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            Usuń
                                        </DeleteBtn>
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!pendingDelete}
                title="Usunąć urlop?"
                message={pendingDelete
                    ? `Urlop ${new Date(pendingDelete.startDate).toLocaleDateString('pl-PL')} – ${new Date(pendingDelete.endDate).toLocaleDateString('pl-PL')} zostanie trwale usunięty.`
                    : ''}
                variant="danger"
                confirmText="Usuń"
                onConfirm={handleDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </Section>
    );
};
