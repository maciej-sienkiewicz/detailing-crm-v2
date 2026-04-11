import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useCurrentCompensation, useCompensationHistory, useSetCompensation } from '../hooks/useCompensation';
import type {
    EmploymentMode,
    EtatFraction,
    ComponentType,
    CalculationBase,
    PaymentFrequency,
    CompensationComponent,
    CompensationComponentPayload,
} from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const ETAT_LABELS: Record<EtatFraction, string> = {
    FULL: 'Pełen etat (168 h/mies.)',
    HALF: 'Pół etatu (84 h/mies.)',
    QUARTER: 'Ćwierć etatu (42 h/mies.)',
};

const EMPLOYMENT_MODE_LABELS: Record<EmploymentMode, string> = {
    SALARY: 'Etat',
    HOURLY: 'Godzinówka',
};

const COMPONENT_TYPE_LABELS: Record<ComponentType, string> = {
    FIXED: 'Stały dodatek',
    PERCENTAGE_OF_REVENUE: 'Premia od obrotu',
    HOURLY: 'Godzinowy',
    BONUS: 'Premia uznaniowa',
};

const CALC_BASE_LABELS: Record<CalculationBase, string> = {
    GROSS_REVENUE: 'Obrót brutto',
    NET_REVENUE: 'Obrót netto',
    HOURS_WORKED: 'Przepracowane godziny',
};

const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
    MONTHLY: 'Miesięcznie',
    QUARTERLY: 'Kwartalnie',
    ANNUALLY: 'Rocznie',
    ONE_TIME: 'Jednorazowo',
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

const InfoNote = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-style: italic;
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

const ComponentsHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
`;

const ComponentsTitle = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textSecondary};
`;

const AddComponentBtn = styled.button`
    padding: 4px 12px;
    background: ${st.accentBlue};
    border: none;
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    &:hover { opacity: 0.88; }
`;

const ComponentRow = styled.div<{ $inactive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid ${st.border};
    &:last-child { border-bottom: none; }
    opacity: ${p => p.$inactive ? 0.45 : 1};
`;

const ComponentLeft = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const ComponentName = styled.span`
    font-size: ${st.fontSm};
    color: ${st.text};
`;

const ComponentMeta = styled.span`
    font-size: 11px;
    color: ${st.textMuted};
`;

const ComponentRight = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ComponentValue = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.accentBlue};
`;

const TypeBadge = styled.span`
    padding: 2px 7px;
    border-radius: 9999px;
    font-size: 10px;
    font-weight: 600;
    background: rgba(99,102,241,0.1);
    color: #6366F1;
`;

const ToggleBtn = styled.button<{ $active: boolean }>`
    padding: 3px 9px;
    border-radius: ${st.radiusSm};
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid ${p => p.$active ? st.accentGreen : st.border};
    background: ${p => p.$active ? 'rgba(16,185,129,0.08)' : 'transparent'};
    color: ${p => p.$active ? st.accentGreen : st.textMuted};
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const DeleteComponentBtn = styled.button`
    padding: 3px 9px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: 11px;
    color: ${st.accentRed};
    background: none;
    cursor: pointer;
    &:hover { background: rgba(239,68,68,0.08); }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const EffectiveFrom = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
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

const ErrorMsg = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
`;

const NoComponents = styled.p`
    margin: 0;
    padding: 8px 0;
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    font-style: italic;
`;

// ─── Modal ────────────────────────────────────────────────────────────────────

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
`;

const ModalBox = styled.div`
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    padding: 24px;
    width: 100%;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const ModalTitle = styled.h3`
    margin: 0;
    font-size: ${st.fontMd};
    font-weight: 700;
    color: ${st.text};
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
    cursor: pointer;
    &:focus { border-color: ${st.accentBlue}; }
`;

const Textarea = styled.textarea`
    padding: 8px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    resize: vertical;
    min-height: 56px;
    &:focus { border-color: ${st.accentBlue}; }
`;

const TwoCol = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
`;

const ModalActions = styled.div`
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

const HintText = styled.p`
    margin: 0;
    font-size: 11px;
    color: ${st.textMuted};
    font-style: italic;
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCents = (cents: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(cents / 100);

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatComponentValue = (comp: CompensationComponent) => {
    if (comp.type === 'PERCENTAGE_OF_REVENUE') return `${comp.value}%`;
    if (comp.type === 'HOURLY') return `${formatCents(comp.value * 100)}/h`;
    return formatCents(comp.value * 100);
};

// ─── Add component modal ──────────────────────────────────────────────────────

interface AddComponentModalProps {
    onClose: () => void;
    onSave: (component: CompensationComponentPayload, effectiveFrom: string) => Promise<void>;
}

const AddComponentModal = ({ onClose, onSave }: AddComponentModalProps) => {
    const [type, setType] = useState<ComponentType>('PERCENTAGE_OF_REVENUE');
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [calcBase, setCalcBase] = useState<CalculationBase>('NET_REVENUE');
    const [frequency, setFrequency] = useState<PaymentFrequency>('MONTHLY');
    const [description, setDescription] = useState('');
    const [effectiveFrom, setEffectiveFrom] = useState(todayISO());
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) { setError('Podaj nazwę składnika.'); return; }
        const num = parseFloat(value);
        if (!value || isNaN(num) || num <= 0) { setError('Podaj poprawną wartość (większą od zera).'); return; }
        if (!effectiveFrom) { setError('Wybierz datę obowiązywania.'); return; }
        setError('');
        setSaving(true);
        try {
            const payload: CompensationComponentPayload = {
                name: name.trim(),
                type,
                calculationBase: type === 'PERCENTAGE_OF_REVENUE' ? calcBase : null,
                value: num,
                thresholds: [],
                frequency,
                isActive: true,
                description: description.trim() || null,
            };
            await onSave(payload, effectiveFrom);
            onClose();
        } catch {
            setError('Wystąpił błąd. Spróbuj ponownie.');
        } finally {
            setSaving(false);
        }
    };

    const valueLabel =
        type === 'PERCENTAGE_OF_REVENUE' ? 'Wartość (%)' :
        type === 'HOURLY' ? 'Stawka godzinowa (PLN)' :
        'Kwota (PLN)';

    const valuePlaceholder =
        type === 'PERCENTAGE_OF_REVENUE' ? 'np. 3' : 'np. 500.00';

    return (
        <Overlay onClick={onClose}>
            <ModalBox onClick={e => e.stopPropagation()}>
                <ModalTitle>Dodaj składnik wynagrodzenia</ModalTitle>

                <Field>
                    <Label>Typ składnika</Label>
                    <Select value={type} onChange={e => setType(e.target.value as ComponentType)}>
                        {(Object.keys(COMPONENT_TYPE_LABELS) as ComponentType[]).map(t => (
                            <option key={t} value={t}>{COMPONENT_TYPE_LABELS[t]}</option>
                        ))}
                    </Select>
                </Field>

                <Field>
                    <Label>Nazwa</Label>
                    <Input
                        type="text"
                        placeholder={type === 'PERCENTAGE_OF_REVENUE' ? 'np. Premia od obrotu netto' : 'np. Dodatek stażowy'}
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </Field>

                <TwoCol>
                    <Field>
                        <Label>{valueLabel}</Label>
                        <Input
                            type="number"
                            placeholder={valuePlaceholder}
                            min={0}
                            step={type === 'PERCENTAGE_OF_REVENUE' ? 0.01 : 0.01}
                            value={value}
                            onChange={e => setValue(e.target.value)}
                        />
                    </Field>
                    <Field>
                        <Label>Częstotliwość</Label>
                        <Select value={frequency} onChange={e => setFrequency(e.target.value as PaymentFrequency)}>
                            {(Object.keys(FREQUENCY_LABELS) as PaymentFrequency[]).map(f => (
                                <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
                            ))}
                        </Select>
                    </Field>
                </TwoCol>

                {type === 'PERCENTAGE_OF_REVENUE' && (
                    <Field>
                        <Label>Baza kalkulacji</Label>
                        <Select value={calcBase} onChange={e => setCalcBase(e.target.value as CalculationBase)}>
                            <option value="NET_REVENUE">{CALC_BASE_LABELS.NET_REVENUE}</option>
                            <option value="GROSS_REVENUE">{CALC_BASE_LABELS.GROSS_REVENUE}</option>
                        </Select>
                        <HintText>
                            Przy generowaniu payroll musisz podać odpowiedni przychód pracownika za dany miesiąc.
                        </HintText>
                    </Field>
                )}

                <Field>
                    <Label>Obowiązuje od</Label>
                    <Input
                        type="date"
                        value={effectiveFrom}
                        onChange={e => setEffectiveFrom(e.target.value)}
                    />
                </Field>

                <Field>
                    <Label>Opis (opcjonalnie)</Label>
                    <Textarea
                        placeholder="Dodatkowe informacje..."
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                    />
                </Field>

                {error && <ErrorMsg>{error}</ErrorMsg>}

                <ModalActions>
                    <CancelBtn onClick={onClose}>Anuluj</CancelBtn>
                    <SaveBtn onClick={handleSave} disabled={saving}>
                        {saving ? 'Zapisywanie...' : 'Dodaj składnik'}
                    </SaveBtn>
                </ModalActions>
            </ModalBox>
        </Overlay>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { employeeId: string; }

export const CompensationTab = ({ employeeId }: Props) => {
    const { compensation, isLoading } = useCurrentCompensation(employeeId);
    const { history } = useCompensationHistory(employeeId);
    const setCompensation = useSetCompensation(employeeId);

    const [showAddModal, setShowAddModal] = useState(false);
    const [mutatingId, setMutatingId] = useState<string | null>(null);
    const [actionError, setActionError] = useState('');

    if (isLoading) return <Spinner />;

    // Build the base SetCompensationPayload from the current config
    const buildPayload = (updatedComponents: CompensationComponentPayload[], effectiveFrom?: string) => {
        if (!compensation) return null;
        return {
            contractId: compensation.contractId,
            effectiveFrom: effectiveFrom ?? todayISO(),
            employmentMode: compensation.employmentMode,
            etatFraction: compensation.etatFraction,
            monthlySalaryGrossCents: compensation.monthlySalaryGrossCents,
            hourlyRateGrossCents: compensation.hourlyRateGrossCents,
            hourlyRateNetCents: compensation.hourlyRateNetCents,
            baseSalaryGrossCents: compensation.baseSalaryGrossCents,
            components: updatedComponents,
        };
    };

    const handleAddComponent = async (newComp: CompensationComponentPayload, effectiveFrom: string) => {
        const existing: CompensationComponentPayload[] = (compensation?.components ?? []).map(c => ({
            name: c.name,
            type: c.type,
            calculationBase: c.calculationBase,
            value: c.value,
            thresholds: [],
            frequency: c.frequency,
            isActive: c.isActive,
            description: c.description,
        }));
        const payload = buildPayload([...existing, newComp], effectiveFrom);
        if (!payload) throw new Error('Brak konfiguracji wynagrodzenia');
        await setCompensation.mutateAsync(payload);
    };

    const handleToggleActive = async (comp: CompensationComponent) => {
        if (!compensation) return;
        setMutatingId(comp.id);
        setActionError('');
        const updatedComponents: CompensationComponentPayload[] = compensation.components.map(c => ({
            name: c.name,
            type: c.type,
            calculationBase: c.calculationBase,
            value: c.value,
            thresholds: [],
            frequency: c.frequency,
            isActive: c.id === comp.id ? !c.isActive : c.isActive,
            description: c.description,
        }));
        const payload = buildPayload(updatedComponents);
        if (!payload) return;
        try {
            await setCompensation.mutateAsync(payload);
        } catch {
            setActionError('Nie udało się zaktualizować składnika.');
        } finally {
            setMutatingId(null);
        }
    };

    const handleDeleteComponent = async (comp: CompensationComponent) => {
        if (!compensation) return;
        setMutatingId(comp.id);
        setActionError('');
        const updatedComponents: CompensationComponentPayload[] = compensation.components
            .filter(c => c.id !== comp.id)
            .map(c => ({
                name: c.name,
                type: c.type,
                calculationBase: c.calculationBase,
                value: c.value,
                thresholds: [],
                frequency: c.frequency,
                isActive: c.isActive,
                description: c.description,
            }));
        const payload = buildPayload(updatedComponents);
        if (!payload) return;
        try {
            await setCompensation.mutateAsync(payload);
        } catch {
            setActionError('Nie udało się usunąć składnika.');
        } finally {
            setMutatingId(null);
        }
    };

    return (
        <Section>
            <TopRow>
                <SectionTitle>Wynagrodzenie</SectionTitle>
                <InfoNote>Stawkę bazową zmieniasz przez aneks w zakładce Umowy.</InfoNote>
            </TopRow>

            {compensation ? (
                <>
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
                            {compensation.hourlyRateNetCents != null && (
                                <AmountCard>
                                    <AmountLabel>Stawka godzinowa netto</AmountLabel>
                                    <AmountValue>{formatCents(compensation.hourlyRateNetCents)}/h</AmountValue>
                                </AmountCard>
                            )}
                            {compensation.hourlyRateGrossCents != null && (
                                <AmountCard>
                                    <AmountLabel>
                                        {compensation.employmentMode === 'SALARY'
                                            ? 'Stawka godzinowa (wyliczona)'
                                            : 'Stawka godzinowa brutto'}
                                    </AmountLabel>
                                    <AmountValue>{formatCents(compensation.hourlyRateGrossCents)}/h</AmountValue>
                                </AmountCard>
                            )}
                        </AmountGrid>

                        <EffectiveFrom>
                            Obowiązuje od: {new Date(compensation.effectiveFrom).toLocaleDateString('pl-PL')}
                        </EffectiveFrom>
                    </Card>

                    {/* ── Components management ── */}
                    <Card>
                        <ComponentsHeader>
                            <ComponentsTitle>Składniki dodatkowe</ComponentsTitle>
                            <AddComponentBtn onClick={() => setShowAddModal(true)}>
                                + Dodaj składnik
                            </AddComponentBtn>
                        </ComponentsHeader>

                        {actionError && <ErrorMsg style={{ marginBottom: 8 }}>{actionError}</ErrorMsg>}

                        {compensation.components.length === 0 ? (
                            <NoComponents>
                                Brak składników. Dodaj np. premię od obrotu (PERCENTAGE_OF_REVENUE).
                            </NoComponents>
                        ) : (
                            compensation.components.map(comp => (
                                <ComponentRow key={comp.id} $inactive={!comp.isActive}>
                                    <ComponentLeft>
                                        <ComponentName>{comp.name}</ComponentName>
                                        <ComponentMeta>
                                            {FREQUENCY_LABELS[comp.frequency]}
                                            {comp.calculationBase
                                                ? ` · baza: ${CALC_BASE_LABELS[comp.calculationBase]}`
                                                : ''}
                                            {comp.description ? ` · ${comp.description}` : ''}
                                        </ComponentMeta>
                                    </ComponentLeft>
                                    <ComponentRight>
                                        <ComponentValue>{formatComponentValue(comp)}</ComponentValue>
                                        <TypeBadge>{COMPONENT_TYPE_LABELS[comp.type]}</TypeBadge>
                                        <ToggleBtn
                                            $active={comp.isActive}
                                            onClick={() => handleToggleActive(comp)}
                                            disabled={mutatingId === comp.id}
                                        >
                                            {comp.isActive ? 'Aktywny' : 'Nieaktywny'}
                                        </ToggleBtn>
                                        <DeleteComponentBtn
                                            onClick={() => handleDeleteComponent(comp)}
                                            disabled={mutatingId === comp.id}
                                        >
                                            Usuń
                                        </DeleteComponentBtn>
                                    </ComponentRight>
                                </ComponentRow>
                            ))
                        )}
                    </Card>
                </>
            ) : (
                <EmptyText>Brak skonfigurowanego wynagrodzenia. Dodaj umowę w zakładce Umowy.</EmptyText>
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
                                        : h.hourlyRateNetCents != null
                                            ? `${formatCents(h.hourlyRateNetCents)}/h netto`
                                            : h.hourlyRateGrossCents != null
                                                ? `${formatCents(h.hourlyRateGrossCents)}/h brutto`
                                                : h.baseSalaryGrossCents != null
                                                    ? formatCents(h.baseSalaryGrossCents)
                                                    : '—'}
                                    {h.components.length > 0 && ` + ${h.components.length} składnik(ów)`}
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

            {showAddModal && (
                <AddComponentModal
                    onClose={() => setShowAddModal(false)}
                    onSave={handleAddComponent}
                />
            )}
        </Section>
    );
};
