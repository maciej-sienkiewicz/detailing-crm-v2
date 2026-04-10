import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useWorkTime, useWorkTimeSummary, useLogWorkTime, useApproveWorkTime } from '../hooks/useWorkTime';
import type { WorkTimeEntryType, LogWorkTimePayload } from '../types';

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const TopRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
`;

const SectionTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const Controls = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const MonthInput = styled.input`
    padding: 7px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    &:focus { border-color: ${st.accentBlue}; }
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

const SummaryGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
`;

const SummaryCard = styled.div`
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusSm};
    padding: 12px;
    text-align: center;
`;

const SummaryLabel = styled.p`
    margin: 0 0 4px 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const SummaryValue = styled.p`
    margin: 0;
    font-size: ${st.fontLg};
    font-weight: 700;
    color: ${st.text};
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

const StatusBadge = styled.span<{ $status: string }>`
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    ${({ $status }) => {
        if ($status === 'APPROVED') return 'background: rgba(16,185,129,0.12); color: #059669;';
        if ($status === 'REJECTED') return 'background: rgba(239,68,68,0.10); color: #DC2626;';
        return 'background: rgba(245,158,11,0.12); color: #D97706;';
    }}
`;

const ActionBtn = styled.button<{ $approve?: boolean }>`
    padding: 3px 10px;
    border: 1px solid ${({ $approve }) => ($approve ? st.accentGreen : st.accentRed)};
    background: none;
    border-radius: ${st.radiusSm};
    font-size: 11px;
    font-weight: 600;
    color: ${({ $approve }) => ($approve ? st.accentGreen : st.accentRed)};
    cursor: pointer;
    margin-right: 4px;
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
    grid-template-columns: 1fr 1fr 1fr;
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

const ENTRY_TYPE_LABELS: Record<WorkTimeEntryType, string> = {
    REGULAR: 'Normalny',
    OVERTIME_150: 'Nadgodziny 150%',
    OVERTIME_200: 'Nadgodziny 200%',
    HOLIDAY_WORK: 'Praca świąteczna',
    NIGHT_WORK: 'Praca nocna',
};

const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

interface Props { employeeId: string; }

export const WorkTimeTab = ({ employeeId }: Props) => {
    const [period, setPeriod] = useState(currentMonth());
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<LogWorkTimePayload>({
        date: new Date().toISOString().slice(0, 10),
        startTime: '08:00',
        endTime: '16:00',
        breakMinutes: 30,
        entryType: 'REGULAR',
        notes: null,
    });
    const [formError, setFormError] = useState('');

    const from = `${period}-01`;
    const lastDay = new Date(parseInt(period.split('-')[0]), parseInt(period.split('-')[1]), 0).getDate();
    const to = `${period}-${String(lastDay).padStart(2, '0')}`;

    const { entries, isLoading } = useWorkTime(employeeId, from, to);
    const { summary } = useWorkTimeSummary(employeeId, period);
    const logMutation = useLogWorkTime(employeeId);
    const approveMutation = useApproveWorkTime();

    const handleLog = async () => {
        if (!form.date || !form.startTime || !form.endTime) {
            setFormError('Data i godziny są wymagane.');
            return;
        }
        setFormError('');
        try {
            await logMutation.mutateAsync(form);
            setShowForm(false);
        } catch { setFormError('Wystąpił błąd. Spróbuj ponownie.'); }
    };

    const handleApprove = (entryId: string, approve: boolean) =>
        approveMutation.mutate({ entryId, payload: { approve } });

    if (isLoading) return <Spinner />;

    return (
        <Section>
            <TopRow>
                <SectionTitle>Ewidencja czasu pracy</SectionTitle>
                <Controls>
                    <MonthInput type="month" value={period} onChange={e => setPeriod(e.target.value)} />
                    {!showForm && <AddBtn onClick={() => setShowForm(true)}>+ Dodaj wpis</AddBtn>}
                </Controls>
            </TopRow>

            {summary && (
                <SummaryGrid>
                    <SummaryCard>
                        <SummaryLabel>Razem godzin</SummaryLabel>
                        <SummaryValue>{Number(summary.totalHours).toFixed(1)} h</SummaryValue>
                    </SummaryCard>
                    <SummaryCard>
                        <SummaryLabel>Zatwierdzone</SummaryLabel>
                        <SummaryValue>{Number(summary.approvedHours).toFixed(1)} h</SummaryValue>
                    </SummaryCard>
                    <SummaryCard>
                        <SummaryLabel>Oczekujące</SummaryLabel>
                        <SummaryValue>{Number(summary.pendingHours).toFixed(1)} h</SummaryValue>
                    </SummaryCard>
                </SummaryGrid>
            )}

            {showForm && (
                <FormBox>
                    <FormTitle>Nowy wpis czasu pracy</FormTitle>
                    <Row>
                        <Field>
                            <Label>Data *</Label>
                            <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                        </Field>
                        <Field>
                            <Label>Od *</Label>
                            <Input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} />
                        </Field>
                        <Field>
                            <Label>Do *</Label>
                            <Input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} />
                        </Field>
                    </Row>
                    <Row>
                        <Field>
                            <Label>Przerwa (min)</Label>
                            <Input type="number" value={form.breakMinutes} onChange={e => setForm(p => ({ ...p, breakMinutes: Number(e.target.value) }))} min={0} />
                        </Field>
                        <Field>
                            <Label>Typ</Label>
                            <Select value={form.entryType} onChange={e => setForm(p => ({ ...p, entryType: e.target.value as WorkTimeEntryType }))}>
                                {(Object.keys(ENTRY_TYPE_LABELS) as WorkTimeEntryType[]).map(t => (
                                    <option key={t} value={t}>{ENTRY_TYPE_LABELS[t]}</option>
                                ))}
                            </Select>
                        </Field>
                    </Row>
                    {formError && <ErrorMsg>{formError}</ErrorMsg>}
                    <FormActions>
                        <CancelBtn onClick={() => { setShowForm(false); setFormError(''); }}>Anuluj</CancelBtn>
                        <SaveBtn onClick={handleLog} disabled={logMutation.isPending}>
                            {logMutation.isPending ? 'Zapisywanie...' : 'Dodaj wpis'}
                        </SaveBtn>
                    </FormActions>
                </FormBox>
            )}

            {entries.length === 0 ? (
                <EmptyText>Brak wpisów czasu pracy w wybranym okresie.</EmptyText>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Data</Th>
                                <Th>Godziny</Th>
                                <Th>Efektywne</Th>
                                <Th>Typ</Th>
                                <Th>Status</Th>
                                <Th>Akcje</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(e => (
                                <tr key={e.id}>
                                    <Td>{new Date(e.date).toLocaleDateString('pl-PL')}</Td>
                                    <Td>{e.startTime.slice(0, 5)} – {e.endTime.slice(0, 5)}</Td>
                                    <Td>{Number(e.effectiveHours).toFixed(1)} h</Td>
                                    <Td>{ENTRY_TYPE_LABELS[e.entryType]}</Td>
                                    <Td>
                                        <StatusBadge $status={e.status}>
                                            {e.status === 'APPROVED' ? 'Zatwierdzone' : e.status === 'REJECTED' ? 'Odrzucone' : 'Oczekujące'}
                                        </StatusBadge>
                                    </Td>
                                    <Td>
                                        {e.status === 'PENDING' && (
                                            <>
                                                <ActionBtn $approve onClick={() => handleApprove(e.id, true)} disabled={approveMutation.isPending}>
                                                    Zatwierdź
                                                </ActionBtn>
                                                <ActionBtn onClick={() => handleApprove(e.id, false)} disabled={approveMutation.isPending}>
                                                    Odrzuć
                                                </ActionBtn>
                                            </>
                                        )}
                                    </Td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
            )}
        </Section>
    );
};
