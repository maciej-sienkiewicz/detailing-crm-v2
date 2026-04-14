import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useLeaves, useRequestLeave, useReviewLeave, useCancelLeave, useLeaveBalance, useInitLeaveBalance } from '../hooks/useLeaves';
import type { LeaveType, LeaveStatus, RequestLeavePayload, InitLeaveBalancePayload } from '../types';

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

const BalanceGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
`;

const BalanceCard = styled.div`
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusSm};
    padding: 12px;
    text-align: center;
`;

const BalanceLabel = styled.p`
    margin: 0 0 4px 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const BalanceValue = styled.p<{ $highlight?: boolean }>`
    margin: 0;
    font-size: ${st.fontXl};
    font-weight: 700;
    color: ${({ $highlight }) => ($highlight ? st.accentGreen : st.text)};
`;

const BalanceSubLabel = styled.p`
    margin: 4px 0 0 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
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

const StatusBadge = styled.span<{ $status: LeaveStatus }>`
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    ${({ $status }) => {
        if ($status === 'APPROVED') return 'background: rgba(16,185,129,0.12); color: #059669;';
        if ($status === 'REJECTED') return 'background: rgba(239,68,68,0.10); color: #DC2626;';
        if ($status === 'CANCELLED') return 'background: rgba(100,116,139,0.10); color: #64748B;';
        return 'background: rgba(245,158,11,0.12); color: #D97706;';
    }}
`;

const ReviewBtn = styled.button<{ $approve?: boolean }>`
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

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
    ANNUAL: 'Urlop wypoczynkowy',
    SICK: 'Zwolnienie lekarskie',
    UNPAID: 'Urlop bezpłatny',
    SPECIAL: 'Urlop okolicznościowy',
    PARENTAL: 'Urlop rodzicielski',
    CARE: 'Opieka nad dzieckiem',
};

const STATUS_LABELS: Record<LeaveStatus, string> = {
    PENDING: 'Oczekujący',
    APPROVED: 'Zatwierdzony',
    REJECTED: 'Odrzucony',
    CANCELLED: 'Anulowany',
};

interface Props { employeeId: string; }

export const LeavesTab = ({ employeeId }: Props) => {
    const { leaves, isLoading } = useLeaves(employeeId);
    const { balances } = useLeaveBalance(employeeId);
    const requestMutation = useRequestLeave(employeeId);
    const reviewMutation = useReviewLeave();
    const cancelMutation = useCancelLeave(employeeId);
    const initBalanceMutation = useInitLeaveBalance(employeeId);

    const currentYear = new Date().getFullYear();
    const currentBalance = balances.find(b => b.year === currentYear);

    const [showRequestForm, setShowRequestForm] = useState(false);
    const [showBalanceForm, setShowBalanceForm] = useState(false);
    const [requestForm, setRequestForm] = useState<RequestLeavePayload>({
        leaveType: 'ANNUAL',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        reason: null,
    });
    const [balanceForm, setBalanceForm] = useState<InitLeaveBalancePayload>({
        year: currentYear,
        totalDays: 26,
        carriedOverDays: 0,
        adjustmentDays: 0,
        notes: null,
    });
    const [formError, setFormError] = useState('');

    const handleRequest = async () => {
        if (!requestForm.startDate || !requestForm.endDate) { setFormError('Daty są wymagane.'); return; }
        setFormError('');
        try {
            await requestMutation.mutateAsync(requestForm);
            setShowRequestForm(false);
        } catch { setFormError('Wystąpił błąd. Spróbuj ponownie.'); }
    };

    const handleInitBalance = async () => {
        setFormError('');
        try {
            await initBalanceMutation.mutateAsync(balanceForm);
            setShowBalanceForm(false);
        } catch { setFormError('Wystąpił błąd. Spróbuj ponownie.'); }
    };

    const handleReview = (leaveRequestId: string, approve: boolean) =>
        reviewMutation.mutate({ leaveRequestId, payload: { approve } });

    const handleCancel = (leaveRequestId: string) =>
        cancelMutation.mutate(leaveRequestId);

    if (isLoading) return <Spinner />;

    return (
        <Section>
            {currentBalance ? (
                <>
                    <TopRow>
                        <SectionTitle>Saldo urlopowe {currentYear}</SectionTitle>
                    </TopRow>
                    <BalanceGrid>
                        <BalanceCard>
                            <BalanceLabel>Przysługuje</BalanceLabel>
                            <BalanceValue>{currentBalance.totalDays}</BalanceValue>
                            <BalanceSubLabel>dni</BalanceSubLabel>
                        </BalanceCard>
                        <BalanceCard>
                            <BalanceLabel>Wykorzystane</BalanceLabel>
                            <BalanceValue>{currentBalance.usedDays}</BalanceValue>
                            <BalanceSubLabel>dni</BalanceSubLabel>
                        </BalanceCard>
                        <BalanceCard>
                            <BalanceLabel>Oczekujące</BalanceLabel>
                            <BalanceValue $highlight>{currentBalance.pendingDays}</BalanceValue>
                            <BalanceSubLabel>dni</BalanceSubLabel>
                        </BalanceCard>
                        <BalanceCard>
                            <BalanceLabel>Pozostało</BalanceLabel>
                            <BalanceValue $highlight>{currentBalance.remainingDays}</BalanceValue>
                            <BalanceSubLabel>dni</BalanceSubLabel>
                        </BalanceCard>
                    </BalanceGrid>
                </>
            ) : (
                <TopRow>
                    <SectionTitle>Saldo urlopowe {currentYear}</SectionTitle>
                    {!showBalanceForm && (
                        <AddBtn onClick={() => setShowBalanceForm(true)}>Ustaw saldo</AddBtn>
                    )}
                </TopRow>
            )}

            {showBalanceForm && (
                <FormBox>
                    <FormTitle>Inicjalizacja salda urlopowego</FormTitle>
                    <Row>
                        <Field>
                            <Label>Rok</Label>
                            <Input type="number" value={balanceForm.year} onChange={e => setBalanceForm(p => ({ ...p, year: Number(e.target.value) }))} />
                        </Field>
                        <Field>
                            <Label>Liczba dni</Label>
                            <Input type="number" value={balanceForm.totalDays} onChange={e => setBalanceForm(p => ({ ...p, totalDays: Number(e.target.value) }))} min={0} />
                        </Field>
                    </Row>
                    <Row>
                        <Field>
                            <Label>Przeniesione z poprzedniego roku</Label>
                            <Input type="number" value={balanceForm.carriedOverDays} onChange={e => setBalanceForm(p => ({ ...p, carriedOverDays: Number(e.target.value) }))} min={0} />
                        </Field>
                        <Field>
                            <Label>Korekta</Label>
                            <Input type="number" value={balanceForm.adjustmentDays} onChange={e => setBalanceForm(p => ({ ...p, adjustmentDays: Number(e.target.value) }))} />
                        </Field>
                    </Row>
                    {formError && <ErrorMsg>{formError}</ErrorMsg>}
                    <FormActions>
                        <CancelBtn onClick={() => { setShowBalanceForm(false); setFormError(''); }}>Anuluj</CancelBtn>
                        <SaveBtn onClick={handleInitBalance} disabled={initBalanceMutation.isPending}>
                            {initBalanceMutation.isPending ? 'Zapisywanie...' : 'Zapisz saldo'}
                        </SaveBtn>
                    </FormActions>
                </FormBox>
            )}

            <TopRow>
                <SectionTitle>Wnioski urlopowe</SectionTitle>
                {!showRequestForm && (
                    <AddBtn onClick={() => setShowRequestForm(true)}>+ Złóż wniosek</AddBtn>
                )}
            </TopRow>

            {showRequestForm && (
                <FormBox>
                    <FormTitle>Nowy wniosek urlopowy</FormTitle>
                    <Field>
                        <Label>Typ urlopu</Label>
                        <Select value={requestForm.leaveType} onChange={e => setRequestForm(p => ({ ...p, leaveType: e.target.value as LeaveType }))}>
                            {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map(t => (
                                <option key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</option>
                            ))}
                        </Select>
                    </Field>
                    <Row>
                        <Field>
                            <Label>Od *</Label>
                            <Input type="date" value={requestForm.startDate} onChange={e => setRequestForm(p => ({ ...p, startDate: e.target.value }))} />
                        </Field>
                        <Field>
                            <Label>Do *</Label>
                            <Input type="date" value={requestForm.endDate} onChange={e => setRequestForm(p => ({ ...p, endDate: e.target.value }))} />
                        </Field>
                    </Row>
                    {formError && <ErrorMsg>{formError}</ErrorMsg>}
                    <FormActions>
                        <CancelBtn onClick={() => { setShowRequestForm(false); setFormError(''); }}>Anuluj</CancelBtn>
                        <SaveBtn onClick={handleRequest} disabled={requestMutation.isPending}>
                            {requestMutation.isPending ? 'Wysyłanie...' : 'Złóż wniosek'}
                        </SaveBtn>
                    </FormActions>
                </FormBox>
            )}

            {leaves.length === 0 ? (
                <EmptyText>Brak wniosków urlopowych.</EmptyText>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <Table>
                        <thead>
                            <tr>
                                <Th>Typ</Th>
                                <Th>Od</Th>
                                <Th>Do</Th>
                                <Th>Dni</Th>
                                <Th>Status</Th>
                                <Th>Akcje</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaves.map(l => (
                                <tr key={l.id}>
                                    <Td>{LEAVE_TYPE_LABELS[l.leaveType]}</Td>
                                    <Td>{new Date(l.startDate).toLocaleDateString('pl-PL')}</Td>
                                    <Td>{new Date(l.endDate).toLocaleDateString('pl-PL')}</Td>
                                    <Td>{l.businessDaysCount}</Td>
                                    <Td>
                                        <StatusBadge $status={l.status}>{STATUS_LABELS[l.status]}</StatusBadge>
                                    </Td>
                                    <Td>
                                        {l.status === 'PENDING' && (
                                            <>
                                                <ReviewBtn $approve onClick={() => handleReview(l.id, true)} disabled={reviewMutation.isPending}>
                                                    Zatwierdź
                                                </ReviewBtn>
                                                <ReviewBtn onClick={() => handleReview(l.id, false)} disabled={reviewMutation.isPending}>
                                                    Odrzuć
                                                </ReviewBtn>
                                            </>
                                        )}
                                        {l.status === 'APPROVED' && (
                                            <ReviewBtn onClick={() => handleCancel(l.id)} disabled={cancelMutation.isPending}>
                                                Wycofaj
                                            </ReviewBtn>
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
