import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useCurrentCompensation, useCompensationHistory, useSetCompensation } from '../hooks/useCompensation';
import { useContracts } from '../hooks/useContracts';
import type { SetCompensationPayload } from '../types';

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

const SetBtn = styled.button`
    padding: 7px 16px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    transition: background ${st.transition};
    &:hover { background: #1D4ED8; }
`;

const Card = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 16px;
`;

const CardTitle = styled.p`
    margin: 0 0 12px 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const AmountGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
`;

const AmountCard = styled.div`
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusSm};
    padding: 12px;
`;

const AmountLabel = styled.p`
    margin: 0 0 4px 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const AmountValue = styled.p`
    margin: 0;
    font-size: ${st.fontLg};
    font-weight: 700;
    color: ${st.text};
`;

const ComponentsTitle = styled.p`
    margin: 0 0 8px 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const ComponentRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid ${st.border};
    &:last-child { border-bottom: none; }
`;

const ComponentName = styled.span`
    font-size: ${st.fontSm};
    color: ${st.text};
`;

const ComponentValue = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.accentBlue};
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

const HistoryTitle = styled.h4`
    margin: 0 0 8px 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const HistoryItem = styled.div`
    padding: 10px 0;
    border-bottom: 1px solid ${st.border};
    &:last-child { border-bottom: none; }
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const HistoryPeriod = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

// ─── Form ────────────────────────────────────────────────────────────────────

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

const formatCents = (cents: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(cents / 100);

interface Props { employeeId: string; }

export const CompensationTab = ({ employeeId }: Props) => {
    const { compensation, isLoading } = useCurrentCompensation(employeeId);
    const { history } = useCompensationHistory(employeeId);
    const { contracts } = useContracts(employeeId);
    const setMutation = useSetCompensation(employeeId);

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<Omit<SetCompensationPayload, 'components'>>({
        contractId: '',
        effectiveFrom: new Date().toISOString().slice(0, 10),
        baseSalaryGrossCents: null,
        hourlyRateGrossCents: null,
    });
    const [baseSalaryPln, setBaseSalaryPln] = useState('');
    const [hourlyRatePln, setHourlyRatePln] = useState('');
    const [formError, setFormError] = useState('');

    const activeContracts = contracts.filter(c => c.isActive);

    const handleSave = async () => {
        if (!form.contractId) { setFormError('Wybierz umowę.'); return; }
        if (!baseSalaryPln && !hourlyRatePln) { setFormError('Podaj wynagrodzenie podstawowe lub stawkę godzinową.'); return; }
        setFormError('');
        const payload: SetCompensationPayload = {
            ...form,
            baseSalaryGrossCents: baseSalaryPln ? Math.round(parseFloat(baseSalaryPln) * 100) : null,
            hourlyRateGrossCents: hourlyRatePln ? Math.round(parseFloat(hourlyRatePln) * 100) : null,
            components: [],
        };
        try {
            await setMutation.mutateAsync(payload);
            setShowForm(false);
        } catch { setFormError('Wystąpił błąd. Spróbuj ponownie.'); }
    };

    if (isLoading) return <Spinner />;

    return (
        <Section>
            <TopRow>
                <SectionTitle>Wynagrodzenie</SectionTitle>
                {!showForm && (
                    <SetBtn onClick={() => setShowForm(true)}>
                        {compensation ? 'Zmień wynagrodzenie' : '+ Ustaw wynagrodzenie'}
                    </SetBtn>
                )}
            </TopRow>

            {showForm && (
                <FormBox>
                    <FormTitle>Konfiguracja wynagrodzenia</FormTitle>
                    <Row>
                        <Field>
                            <Label>Umowa</Label>
                            <Select value={form.contractId} onChange={e => setForm(p => ({ ...p, contractId: e.target.value }))}>
                                <option value="">Wybierz umowę</option>
                                {activeContracts.map(c => (
                                    <option key={c.id} value={c.id}>{c.contractType} od {new Date(c.startDate).toLocaleDateString('pl-PL')}</option>
                                ))}
                            </Select>
                        </Field>
                        <Field>
                            <Label>Obowiązuje od</Label>
                            <Input type="date" value={form.effectiveFrom} onChange={e => setForm(p => ({ ...p, effectiveFrom: e.target.value }))} />
                        </Field>
                    </Row>
                    <Row>
                        <Field>
                            <Label>Wynagrodzenie brutto (PLN)</Label>
                            <Input type="number" value={baseSalaryPln} onChange={e => setBaseSalaryPln(e.target.value)} placeholder="np. 5000" min={0} step={0.01} />
                        </Field>
                        <Field>
                            <Label>Stawka godzinowa brutto (PLN)</Label>
                            <Input type="number" value={hourlyRatePln} onChange={e => setHourlyRatePln(e.target.value)} placeholder="np. 35.00" min={0} step={0.01} />
                        </Field>
                    </Row>
                    {formError && <ErrorMsg>{formError}</ErrorMsg>}
                    <FormActions>
                        <CancelBtn onClick={() => { setShowForm(false); setFormError(''); }}>Anuluj</CancelBtn>
                        <SaveBtn onClick={handleSave} disabled={setMutation.isPending}>
                            {setMutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
                        </SaveBtn>
                    </FormActions>
                </FormBox>
            )}

            {compensation ? (
                <Card>
                    <CardTitle>Aktualna konfiguracja</CardTitle>
                    <AmountGrid>
                        {compensation.baseSalaryGrossCents != null && (
                            <AmountCard>
                                <AmountLabel>Wynagrodzenie brutto</AmountLabel>
                                <AmountValue>{formatCents(compensation.baseSalaryGrossCents)}</AmountValue>
                            </AmountCard>
                        )}
                        {compensation.hourlyRateGrossCents != null && (
                            <AmountCard>
                                <AmountLabel>Stawka godzinowa</AmountLabel>
                                <AmountValue>{formatCents(compensation.hourlyRateGrossCents)}/h</AmountValue>
                            </AmountCard>
                        )}
                    </AmountGrid>
                    {compensation.components.length > 0 && (
                        <>
                            <ComponentsTitle>Składniki wynagrodzenia</ComponentsTitle>
                            {compensation.components.map(comp => (
                                <ComponentRow key={comp.id}>
                                    <ComponentName>{comp.name}</ComponentName>
                                    <ComponentValue>
                                        {comp.type === 'PERCENTAGE_OF_REVENUE'
                                            ? `${comp.value}%`
                                            : formatCents(comp.value * 100)}
                                    </ComponentValue>
                                </ComponentRow>
                            ))}
                        </>
                    )}
                    <HistoryPeriod>Obowiązuje od: {new Date(compensation.effectiveFrom).toLocaleDateString('pl-PL')}</HistoryPeriod>
                </Card>
            ) : (
                !showForm && <EmptyText>Brak skonfigurowanego wynagrodzenia.</EmptyText>
            )}

            {history.length > 1 && (
                <Card>
                    <HistoryTitle>Historia wynagrodzeń</HistoryTitle>
                    {history.slice(1).map(h => (
                        <HistoryItem key={h.id}>
                            <span style={{ fontSize: st.fontSm, color: st.textSecondary }}>
                                {h.baseSalaryGrossCents != null ? formatCents(h.baseSalaryGrossCents) : '—'}
                            </span>
                            <HistoryPeriod>
                                {new Date(h.effectiveFrom).toLocaleDateString('pl-PL')}
                                {h.effectiveTo ? ` – ${new Date(h.effectiveTo).toLocaleDateString('pl-PL')}` : ''}
                            </HistoryPeriod>
                        </HistoryItem>
                    ))}
                </Card>
            )}
        </Section>
    );
};
