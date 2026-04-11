import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useCurrentCompensation, useCompensationHistory, useSetCompensation } from '../hooks/useCompensation';
import { useContracts } from '../hooks/useContracts';
import type { SetCompensationPayload, EmploymentMode, EtatFraction } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const ETAT_HOURS: Record<EtatFraction, number> = {
    FULL: 168,
    HALF: 84,
    QUARTER: 42,
};

const ETAT_LABELS: Record<EtatFraction, string> = {
    FULL: 'Pełen etat (168 h/mies.)',
    HALF: 'Pół etatu (84 h/mies.)',
    QUARTER: 'Ćwierć etatu (42 h/mies.)',
};

const EMPLOYMENT_MODE_LABELS: Record<EmploymentMode, string> = {
    SALARY: 'Etat',
    HOURLY: 'Godzinówka',
};

// ─── Styled Components ───────────────────────────────────────────────────────

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

const ModeMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
`;

const ModeBadge = styled.span<{ $mode: EmploymentMode }>`
    display: inline-block;
    padding: 3px 10px;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 700;
    background: ${p => p.$mode === 'SALARY' ? '#EFF6FF' : '#F0FDF4'};
    color: ${p => p.$mode === 'SALARY' ? '#1D4ED8' : '#16A34A'};
`;

const EtatLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
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

const ModeToggle = styled.div`
    display: flex;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    overflow: hidden;
`;

const ModeButton = styled.button<{ $active: boolean }>`
    flex: 1;
    padding: 9px 0;
    border: none;
    background: ${p => p.$active ? st.accentBlue : 'transparent'};
    color: ${p => p.$active ? '#fff' : st.textSecondary};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: background ${st.transition}, color ${st.transition};
    &:hover { background: ${p => p.$active ? '#1D4ED8' : st.bgCard}; }
`;

const CalcPreview = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const CalcLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textSecondary};
`;

const CalcValue = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.accentBlue};
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCents = (cents: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(cents / 100);

interface Props { employeeId: string; }

// ─── Component ───────────────────────────────────────────────────────────────

export const CompensationTab = ({ employeeId }: Props) => {
    const { compensation, isLoading } = useCurrentCompensation(employeeId);
    const { history } = useCompensationHistory(employeeId);
    const { contracts } = useContracts(employeeId);
    const setMutation = useSetCompensation(employeeId);

    const [showForm, setShowForm] = useState(false);
    const [contractId, setContractId] = useState('');
    const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
    const [employmentMode, setEmploymentMode] = useState<EmploymentMode>('SALARY');
    const [etatFraction, setEtatFraction] = useState<EtatFraction>('FULL');
    const [monthlySalaryPln, setMonthlySalaryPln] = useState('');
    const [hourlyRatePln, setHourlyRatePln] = useState('');
    const [formError, setFormError] = useState('');

    const activeContracts = contracts.filter(c => c.isActive);

    const calcHourlyRate =
        employmentMode === 'SALARY' && monthlySalaryPln && parseFloat(monthlySalaryPln) > 0
            ? (parseFloat(monthlySalaryPln) / ETAT_HOURS[etatFraction]).toFixed(2)
            : null;

    const handleModeChange = (mode: EmploymentMode) => {
        setEmploymentMode(mode);
        setMonthlySalaryPln('');
        setHourlyRatePln('');
        setFormError('');
    };

    const handleOpenForm = () => {
        setContractId('');
        setEffectiveFrom(new Date().toISOString().slice(0, 10));
        setEmploymentMode('SALARY');
        setEtatFraction('FULL');
        setMonthlySalaryPln('');
        setHourlyRatePln('');
        setFormError('');
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!contractId) { setFormError('Wybierz umowę.'); return; }
        if (employmentMode === 'SALARY' && (!monthlySalaryPln || parseFloat(monthlySalaryPln) <= 0)) {
            setFormError('Podaj miesięczne wynagrodzenie brutto (wartość > 0).');
            return;
        }
        if (employmentMode === 'HOURLY' && (!hourlyRatePln || parseFloat(hourlyRatePln) <= 0)) {
            setFormError('Podaj stawkę godzinową brutto (wartość > 0).');
            return;
        }
        setFormError('');

        const payload: SetCompensationPayload =
            employmentMode === 'SALARY'
                ? {
                    contractId,
                    effectiveFrom,
                    employmentMode: 'SALARY',
                    etatFraction,
                    monthlySalaryGrossCents: Math.round(parseFloat(monthlySalaryPln) * 100),
                    hourlyRateGrossCents: null,
                    components: [],
                }
                : {
                    contractId,
                    effectiveFrom,
                    employmentMode: 'HOURLY',
                    etatFraction: null,
                    monthlySalaryGrossCents: null,
                    hourlyRateGrossCents: Math.round(parseFloat(hourlyRatePln) * 100),
                    components: [],
                };

        try {
            await setMutation.mutateAsync(payload);
            setShowForm(false);
        } catch {
            setFormError('Wystąpił błąd. Spróbuj ponownie.');
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <Section>
            <TopRow>
                <SectionTitle>Wynagrodzenie</SectionTitle>
                {!showForm && (
                    <SetBtn onClick={handleOpenForm}>
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
                            <Select value={contractId} onChange={e => setContractId(e.target.value)}>
                                <option value="">Wybierz umowę</option>
                                {activeContracts.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.contractType} od {new Date(c.startDate).toLocaleDateString('pl-PL')}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field>
                            <Label>Obowiązuje od</Label>
                            <Input
                                type="date"
                                value={effectiveFrom}
                                onChange={e => setEffectiveFrom(e.target.value)}
                            />
                        </Field>
                    </Row>

                    <Field>
                        <Label>Tryb zatrudnienia</Label>
                        <ModeToggle>
                            <ModeButton
                                $active={employmentMode === 'SALARY'}
                                onClick={() => handleModeChange('SALARY')}
                            >
                                Etat
                            </ModeButton>
                            <ModeButton
                                $active={employmentMode === 'HOURLY'}
                                onClick={() => handleModeChange('HOURLY')}
                            >
                                Godzinówka
                            </ModeButton>
                        </ModeToggle>
                    </Field>

                    {employmentMode === 'SALARY' ? (
                        <>
                            <Row>
                                <Field>
                                    <Label>Wymiar etatu</Label>
                                    <Select
                                        value={etatFraction}
                                        onChange={e => setEtatFraction(e.target.value as EtatFraction)}
                                    >
                                        <option value="FULL">Pełen etat (168 h/mies.)</option>
                                        <option value="HALF">Pół etatu (84 h/mies.)</option>
                                        <option value="QUARTER">Ćwierć etatu (42 h/mies.)</option>
                                    </Select>
                                </Field>
                                <Field>
                                    <Label>Wynagrodzenie miesięczne brutto (PLN)</Label>
                                    <Input
                                        type="number"
                                        value={monthlySalaryPln}
                                        onChange={e => setMonthlySalaryPln(e.target.value)}
                                        placeholder="np. 6000"
                                        min={0}
                                        step={0.01}
                                    />
                                </Field>
                            </Row>
                            {calcHourlyRate && (
                                <CalcPreview>
                                    <CalcLabel>
                                        Wyliczona stawka godzinowa ({ETAT_HOURS[etatFraction]} h/mies.)
                                    </CalcLabel>
                                    <CalcValue>{calcHourlyRate} PLN/h</CalcValue>
                                </CalcPreview>
                            )}
                        </>
                    ) : (
                        <Field>
                            <Label>Stawka godzinowa brutto (PLN)</Label>
                            <Input
                                type="number"
                                value={hourlyRatePln}
                                onChange={e => setHourlyRatePln(e.target.value)}
                                placeholder="np. 45.00"
                                min={0}
                                step={0.01}
                            />
                        </Field>
                    )}

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

                    <ModeMeta>
                        <ModeBadge $mode={compensation.employmentMode ?? 'SALARY'}>
                            {EMPLOYMENT_MODE_LABELS[compensation.employmentMode ?? 'SALARY']}
                        </ModeBadge>
                        {compensation.etatFraction && (
                            <EtatLabel>{ETAT_LABELS[compensation.etatFraction]}</EtatLabel>
                        )}
                    </ModeMeta>

                    <AmountGrid>
                        {compensation.monthlySalaryGrossCents != null && (
                            <AmountCard>
                                <AmountLabel>Wynagrodzenie miesięczne brutto</AmountLabel>
                                <AmountValue>{formatCents(compensation.monthlySalaryGrossCents)}</AmountValue>
                            </AmountCard>
                        )}
                        {compensation.baseSalaryGrossCents != null && compensation.monthlySalaryGrossCents == null && (
                            <AmountCard>
                                <AmountLabel>Wynagrodzenie brutto</AmountLabel>
                                <AmountValue>{formatCents(compensation.baseSalaryGrossCents)}</AmountValue>
                            </AmountCard>
                        )}
                        {compensation.hourlyRateGrossCents != null && (
                            <AmountCard>
                                <AmountLabel>
                                    {compensation.employmentMode === 'SALARY'
                                        ? 'Stawka godzinowa (wyliczona)'
                                        : 'Stawka godzinowa'}
                                </AmountLabel>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ModeBadge $mode={h.employmentMode ?? 'SALARY'}>
                                    {EMPLOYMENT_MODE_LABELS[h.employmentMode ?? 'SALARY']}
                                </ModeBadge>
                                <span style={{ fontSize: st.fontSm, color: st.textSecondary }}>
                                    {h.monthlySalaryGrossCents != null
                                        ? formatCents(h.monthlySalaryGrossCents)
                                        : h.hourlyRateGrossCents != null
                                            ? `${formatCents(h.hourlyRateGrossCents)}/h`
                                            : h.baseSalaryGrossCents != null
                                                ? formatCents(h.baseSalaryGrossCents)
                                                : '—'}
                                </span>
                            </div>
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
