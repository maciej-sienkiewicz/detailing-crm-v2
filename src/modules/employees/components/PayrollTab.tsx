import { useState } from 'react';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { usePayroll, useGeneratePayroll, useConfirmPayroll } from '../hooks/usePayroll';
import { useCurrentCompensation } from '../hooks/useCompensation';
import { useBonuses } from '../hooks/useBonuses';
import type { GeneratePayrollPayload, ConfirmPayrollPayload } from '../types';
import {
    Field, Label, Input, CancelBtn, ErrorMsg, Spinner, EmptyText,
    FormActions, Section, TopRow, SectionTitle, FormBox, FormTitle, FormRow, InfoNote,
    TableWrapper, Table, Thead, Th, Tbody, Tr, Td, TdMuted,
    GenerateBtn, SaveBtn,
    PeriodCell, AmountCell, StatusBadge, ConfirmBtn,
    BreakdownTr, BreakdownTd, BreakdownAmountTd, ExpandToggle,
} from './PayrollTab.styles';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCents = (cents: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(cents / 100);

const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const STATUS_LABELS = {
    DRAFT: 'Szkic',
    CONFIRMED: 'Zatwierdzony',
    PAID: 'Wypłacony',
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

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
    const [expandedId, setExpandedId] = useState<string | null>(null);

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

    // column count for colspan in breakdown rows
    const COL_COUNT = 7;

    return (
        <Section>
            <TopRow>
                <SectionTitle>Lista płac</SectionTitle>
                {!showGenerateForm && (
                    <GenerateBtn onClick={() => setShowGenerateForm(true)}>+ Generuj listę płac</GenerateBtn>
                )}
            </TopRow>

            {/* ── Generate form ── */}
            {showGenerateForm && (
                <FormBox>
                    <FormTitle>Generuj listę płac</FormTitle>
                    <FormRow>
                        <Field>
                            <Label>Okres (miesiąc)</Label>
                            <Input
                                type="month"
                                value={generateForm.period}
                                onChange={e => setGenerateForm(p => ({ ...p, period: e.target.value }))}
                            />
                        </Field>
                    </FormRow>
                    {needsGrossRevenue && (
                        <FormRow>
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
                        </FormRow>
                    )}
                    {needsNetRevenue && (
                        <FormRow>
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
                        </FormRow>
                    )}
                    {pendingCount > 0 && (
                        <InfoNote>
                            Zostaną wliczone {pendingCount} oczekujące{pendingCount === 1 ? '' : 'go'} bonus
                            {pendingCount === 1 ? '' : 'ów'} / potrąceń za okres {generateForm.period}.
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

            {/* ── Confirm form ── */}
            {confirmingId && (
                <FormBox>
                    <FormTitle>Zatwierdź listę płac</FormTitle>
                    <FormRow>
                        <Field>
                            <Label>Kwota netto (PLN)</Label>
                            <Input
                                type="number"
                                placeholder="np. 4200.00"
                                onChange={e => setConfirmForm(p => ({
                                    ...p,
                                    totalNetCents: e.target.value
                                        ? Math.round(parseFloat(e.target.value) * 100)
                                        : null,
                                }))}
                                min={0}
                                step={0.01}
                            />
                        </Field>
                        <Field>
                            <Label>Koszt pracodawcy (PLN)</Label>
                            <Input
                                type="number"
                                placeholder="np. 6000.00"
                                onChange={e => setConfirmForm(p => ({
                                    ...p,
                                    employerCostTotalCents: e.target.value
                                        ? Math.round(parseFloat(e.target.value) * 100)
                                        : null,
                                }))}
                                min={0}
                                step={0.01}
                            />
                        </Field>
                    </FormRow>
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: st.fontXs, color: st.textSecondary, cursor: 'pointer',
                    }}>
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

            {/* ── Table ── */}
            {entries.length === 0 ? (
                <EmptyText>Brak wygenerowanych list płac.</EmptyText>
            ) : (
                <TableWrapper>
                    <Table>
                        <Thead>
                            <tr>
                                <Th>Okres</Th>
                                <Th>Status</Th>
                                <Th>Brutto</Th>
                                <Th>Netto</Th>
                                <Th>Koszt pr.</Th>
                                <Th>Godziny</Th>
                                <Th></Th>
                            </tr>
                        </Thead>
                        <Tbody>
                            {entries.map(e => {
                                const isExpanded = expandedId === e.id;
                                const hasBreakdown = e.componentBreakdown.length > 0;
                                return (
                                    <>
                                        <Tr key={e.id}>
                                            <Td>
                                                <PeriodCell>
                                                    {hasBreakdown && (
                                                        <ExpandToggle
                                                            onClick={() => setExpandedId(isExpanded ? null : e.id)}
                                                            title={isExpanded ? 'Zwiń składniki' : 'Rozwiń składniki'}
                                                        >
                                                            {isExpanded ? '▾ ' : '▸ '}
                                                        </ExpandToggle>
                                                    )}
                                                    {e.period}
                                                </PeriodCell>
                                            </Td>
                                            <Td>
                                                <StatusBadge $status={e.status}>
                                                    {STATUS_LABELS[e.status]}
                                                </StatusBadge>
                                            </Td>
                                            <Td>
                                                <AmountCell>{formatCents(e.totalGrossCents)}</AmountCell>
                                            </Td>
                                            <TdMuted>
                                                {e.totalNetCents != null ? formatCents(e.totalNetCents) : '—'}
                                            </TdMuted>
                                            <TdMuted>
                                                {e.employerCostTotalCents != null
                                                    ? formatCents(e.employerCostTotalCents)
                                                    : '—'}
                                            </TdMuted>
                                            <TdMuted>{Number(e.totalHoursWorked).toFixed(1)} h</TdMuted>
                                            <Td>
                                                {e.status === 'DRAFT' && !confirmingId && (
                                                    <ConfirmBtn onClick={() => setConfirmingId(e.id)}>
                                                        Zatwierdź
                                                    </ConfirmBtn>
                                                )}
                                            </Td>
                                        </Tr>
                                        {isExpanded && hasBreakdown && e.componentBreakdown.map((b, i) => (
                                            <BreakdownTr key={`${e.id}-b-${i}`}>
                                                <BreakdownTd colSpan={COL_COUNT - 1}>{b.componentName}</BreakdownTd>
                                                <BreakdownAmountTd>{formatCents(b.calculatedAmountCents)}</BreakdownAmountTd>
                                            </BreakdownTr>
                                        ))}
                                    </>
                                );
                            })}
                        </Tbody>
                    </Table>
                </TableWrapper>
            )}
        </Section>
    );
};
