import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { usePayroll, useGeneratePayroll, useConfirmPayroll } from '../hooks/usePayroll';
import { useCurrentCompensation } from '../hooks/useCompensation';
import { useBonuses } from '../hooks/useBonuses';
import type { PayrollStatus, GeneratePayrollPayload, ConfirmPayrollPayload } from '../types';

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;

const TopRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const SectionTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const GenerateBtn = styled.button`
    padding: 7px 16px;
    background: ${st.accentGreen};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    &:hover { background: #059669; }
`;

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const CardPeriod = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const StatusBadge = styled.span<{ $status: PayrollStatus }>`
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    ${({ $status }) => {
        if ($status === 'PAID') return 'background: rgba(16,185,129,0.12); color: #059669;';
        if ($status === 'CONFIRMED') return 'background: rgba(59,130,246,0.12); color: #2563EB;';
        return 'background: rgba(245,158,11,0.12); color: #D97706;';
    }}
`;

const AmountRow = styled.div`
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
`;

const AmountItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const AmountLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const AmountValue = styled.span`
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
`;

const BreakdownTitle = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const BreakdownRow = styled.div`
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
    border-bottom: 1px solid ${st.border};
    &:last-child { border-bottom: none; }
`;

const ConfirmBtn = styled.button`
    align-self: flex-start;
    padding: 6px 14px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    &:disabled { opacity: 0.6; cursor: not-allowed; }
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
    background: ${st.accentGreen};
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

const InfoNote = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 8px 10px;
`;

const STATUS_LABELS: Record<PayrollStatus, string> = {
    DRAFT: 'Szkic',
    CONFIRMED: 'Zatwierdzony',
    PAID: 'Wypłacony',
};

const formatCents = (cents: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(cents / 100);

const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

interface Props { employeeId: string; }

export const PayrollTab = ({ employeeId }: Props) => {
    const { entries, isLoading } = usePayroll(employeeId);
    const generateMutation = useGeneratePayroll(employeeId);
    const confirmMutation = useConfirmPayroll(employeeId);
    const { compensation } = useCurrentCompensation(employeeId);

    const [showGenerateForm, setShowGenerateForm] = useState(false);
    const [generateForm, setGenerateForm] = useState<GeneratePayrollPayload>({ period: currentMonth() });
    const [confirmingId, setConfirmingId] = useState<string | null>(null);
    const [confirmForm, setConfirmForm] = useState<ConfirmPayrollPayload>({ markAsPaid: false });
    const [formError, setFormError] = useState('');

    const { bonuses: pendingBonuses } = useBonuses(employeeId, generateForm.period);
    const pendingCount = pendingBonuses.filter(b => b.status === 'PENDING').length;

    const activeComponents = compensation?.components.filter(c => c.isActive) ?? [];
    const needsGrossRevenue = activeComponents.some(
        c => c.type === 'PERCENTAGE_OF_REVENUE' && c.calculationBase === 'GROSS_REVENUE'
    );
    const needsNetRevenue = activeComponents.some(
        c => c.type === 'PERCENTAGE_OF_REVENUE' && c.calculationBase === 'NET_REVENUE'
    );

    const handleGenerate = async () => {
        if (!generateForm.period) { setFormError('Wybierz okres.'); return; }
        setFormError('');
        try {
            await generateMutation.mutateAsync(generateForm);
            setShowGenerateForm(false);
        } catch { setFormError('Wystąpił błąd. Spróbuj ponownie.'); }
    };

    const handleConfirm = async () => {
        if (!confirmingId) return;
        try {
            await confirmMutation.mutateAsync({ payrollId: confirmingId, payload: confirmForm });
            setConfirmingId(null);
        } catch { setFormError('Wystąpił błąd. Spróbuj ponownie.'); }
    };

    if (isLoading) return <Spinner />;

    return (
        <Section>
            <TopRow>
                <SectionTitle>Lista płac</SectionTitle>
                {!showGenerateForm && (
                    <GenerateBtn onClick={() => setShowGenerateForm(true)}>+ Generuj listę płac</GenerateBtn>
                )}
            </TopRow>

            {showGenerateForm && (
                <FormBox>
                    <FormTitle>Generuj listę płac</FormTitle>
                    <Row>
                        <Field>
                            <Label>Okres (miesiąc)</Label>
                            <Input
                                type="month"
                                value={generateForm.period}
                                onChange={e => setGenerateForm(p => ({ ...p, period: e.target.value }))}
                            />
                        </Field>
                    </Row>
                    {needsGrossRevenue && (
                        <Row>
                            <Field>
                                <Label>Przychód brutto pracownika (PLN)</Label>
                                <Input
                                    type="number"
                                    placeholder="np. 35000.00"
                                    min={0}
                                    step={0.01}
                                    onChange={e =>
                                        setGenerateForm(p => ({
                                            ...p,
                                            revenueGrossCents: e.target.value
                                                ? Math.round(parseFloat(e.target.value) * 100)
                                                : null,
                                        }))
                                    }
                                />
                            </Field>
                        </Row>
                    )}
                    {needsNetRevenue && (
                        <Row>
                            <Field>
                                <Label>Przychód netto pracownika (PLN)</Label>
                                <Input
                                    type="number"
                                    placeholder="np. 28455.28"
                                    min={0}
                                    step={0.01}
                                    onChange={e =>
                                        setGenerateForm(p => ({
                                            ...p,
                                            revenueNetCents: e.target.value
                                                ? Math.round(parseFloat(e.target.value) * 100)
                                                : null,
                                        }))
                                    }
                                />
                            </Field>
                        </Row>
                    )}
                    {pendingCount > 0 && (
                        <InfoNote>
                            Zostaną wliczone {pendingCount} oczekujące{pendingCount === 1 ? '' : 'go'} bonus{pendingCount === 1 ? '' : 'ów'} / potrąceń za okres {generateForm.period}.
                        </InfoNote>
                    )}
                    {formError && <ErrorMsg>{formError}</ErrorMsg>}
                    <FormActions>
                        <CancelBtn onClick={() => { setShowGenerateForm(false); setFormError(''); }}>Anuluj</CancelBtn>
                        <SaveBtn onClick={handleGenerate} disabled={generateMutation.isPending}>
                            {generateMutation.isPending ? 'Generowanie...' : 'Generuj'}
                        </SaveBtn>
                    </FormActions>
                </FormBox>
            )}

            {confirmingId && (
                <FormBox>
                    <FormTitle>Zatwierdź listę płac</FormTitle>
                    <Row>
                        <Field>
                            <Label>Kwota netto (PLN)</Label>
                            <Input
                                type="number"
                                placeholder="np. 4200.00"
                                onChange={e => setConfirmForm(p => ({ ...p, totalNetCents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null }))}
                                min={0}
                                step={0.01}
                            />
                        </Field>
                        <Field>
                            <Label>Koszt pracodawcy (PLN)</Label>
                            <Input
                                type="number"
                                placeholder="np. 6000.00"
                                onChange={e => setConfirmForm(p => ({ ...p, employerCostTotalCents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null }))}
                                min={0}
                                step={0.01}
                            />
                        </Field>
                    </Row>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: st.fontXs, color: st.textSecondary, cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={confirmForm.markAsPaid ?? false}
                            onChange={e => setConfirmForm(p => ({ ...p, markAsPaid: e.target.checked }))}
                        />
                        Oznacz jako wypłacone
                    </label>
                    {formError && <ErrorMsg>{formError}</ErrorMsg>}
                    <FormActions>
                        <CancelBtn onClick={() => setConfirmingId(null)}>Anuluj</CancelBtn>
                        <SaveBtn onClick={handleConfirm} disabled={confirmMutation.isPending}>
                            {confirmMutation.isPending ? 'Zatwierdzanie...' : 'Zatwierdź'}
                        </SaveBtn>
                    </FormActions>
                </FormBox>
            )}

            {entries.length === 0 ? (
                <EmptyText>Brak wygenerowanych list płac.</EmptyText>
            ) : (
                entries.map(e => (
                    <Card key={e.id}>
                        <CardHeader>
                            <CardPeriod>{e.period}</CardPeriod>
                            <StatusBadge $status={e.status}>{STATUS_LABELS[e.status]}</StatusBadge>
                        </CardHeader>
                        <AmountRow>
                            <AmountItem>
                                <AmountLabel>Wynagrodzenie brutto</AmountLabel>
                                <AmountValue>{formatCents(e.totalGrossCents)}</AmountValue>
                            </AmountItem>
                            {e.totalNetCents != null && (
                                <AmountItem>
                                    <AmountLabel>Netto</AmountLabel>
                                    <AmountValue>{formatCents(e.totalNetCents)}</AmountValue>
                                </AmountItem>
                            )}
                            {e.employerCostTotalCents != null && (
                                <AmountItem>
                                    <AmountLabel>Koszt pracodawcy</AmountLabel>
                                    <AmountValue>{formatCents(e.employerCostTotalCents)}</AmountValue>
                                </AmountItem>
                            )}
                            <AmountItem>
                                <AmountLabel>Przepracowane godziny</AmountLabel>
                                <AmountValue>{Number(e.totalHoursWorked).toFixed(1)} h</AmountValue>
                            </AmountItem>
                        </AmountRow>
                        {e.componentBreakdown.length > 0 && (
                            <>
                                <BreakdownTitle>Składniki</BreakdownTitle>
                                {e.componentBreakdown.map((b, i) => (
                                    <BreakdownRow key={i}>
                                        <span>{b.componentName}</span>
                                        <span>{formatCents(b.calculatedAmountCents)}</span>
                                    </BreakdownRow>
                                ))}
                            </>
                        )}
                        {e.status === 'DRAFT' && !confirmingId && (
                            <ConfirmBtn onClick={() => setConfirmingId(e.id)}>Zatwierdź listę płac</ConfirmBtn>
                        )}
                    </Card>
                ))
            )}
        </Section>
    );
};
