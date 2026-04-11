import { useState } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import {
    useContracts,
    useCreateContract,
    useEndContract,
    useAmendments,
    useCreateAmendment,
} from '../hooks/useContracts';
import type {
    ContractType,
    EtatFraction,
    EmploymentMode,
    EmploymentContract,
    InitialCompensation,
    CreateContractPayload,
    CreateAmendmentPayload,
} from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const ETAT_HOURS: Record<EtatFraction, number> = { FULL: 168, HALF: 84, QUARTER: 42 };

const ETAT_LABELS: Record<EtatFraction, string> = {
    FULL: 'Pełen etat (168 h/mies.)',
    HALF: 'Pół etatu (84 h/mies.)',
    QUARTER: 'Ćwierć etatu (42 h/mies.)',
};

const ETAT_SHORT: Record<EtatFraction, string> = {
    FULL: '168 h/mies.',
    HALF: '84 h/mies.',
    QUARTER: '42 h/mies.',
};

const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
    UOP: 'Umowa o pracę',
    UZ: 'Umowa zlecenie',
    B2B: 'B2B',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

const formatCents = (c: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(c / 100);

const calcHourlyPreview = (monthly: string, fraction: EtatFraction): string | null => {
    const v = parseFloat(monthly);
    if (!v || v <= 0) return null;
    return (v / ETAT_HOURS[fraction]).toFixed(2);
};

const buildCompensation = (
    contractType: ContractType,
    employmentMode: EmploymentMode,
    etatFraction: EtatFraction,
    monthlySalaryPln: string,
    hourlyRatePln: string,
): InitialCompensation => {
    if (employmentMode === 'SALARY') {
        return {
            employmentMode: 'SALARY',
            etatFraction,
            monthlySalaryGrossCents: Math.round(parseFloat(monthlySalaryPln) * 100),
        };
    }
    if (contractType === 'B2B') {
        return {
            employmentMode: 'HOURLY',
            rateType: 'NET',
            hourlyRateNetCents: Math.round(parseFloat(hourlyRatePln) * 100),
        };
    }
    return {
        employmentMode: 'HOURLY',
        rateType: 'GROSS',
        hourlyRateGrossCents: Math.round(parseFloat(hourlyRatePln) * 100),
    };
};

// ─── Styled Components ───────────────────────────────────────────────────────

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
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

const AddBtn = styled.button`
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
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const CardHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
`;

const ContractTypeBadge = styled.span`
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const ActiveBadge = styled.span<{ $active: boolean }>`
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 11px;
    font-weight: 600;
    ${({ $active }) => $active
        ? 'background: rgba(16,185,129,0.12); color: #059669;'
        : 'background: rgba(100,116,139,0.10); color: #64748B;'}
`;

const CardMeta = styled.div`
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
`;

const MetaItem = styled.div`
    display: flex;
    flex-direction: column;
    gap: 1px;
`;

const MetaLabel = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const MetaValue = styled.span`
    font-size: ${st.fontSm};
    color: ${st.textSecondary};
    font-weight: 500;
`;

const CompRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusSm};
    flex-wrap: wrap;
`;

const CompModeBadge = styled.span<{ $mode: EmploymentMode }>`
    padding: 2px 8px;
    border-radius: ${st.radiusSm};
    font-size: 11px;
    font-weight: 700;
    background: ${p => p.$mode === 'SALARY' ? '#EFF6FF' : '#F0FDF4'};
    color: ${p => p.$mode === 'SALARY' ? '#1D4ED8' : '#16A34A'};
`;

const CompAmount = styled.span`
    font-size: ${st.fontSm};
    font-weight: 600;
    color: ${st.text};
`;

const CompDetail = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

const CardActions = styled.div`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
`;

const AmendBtn = styled.button`
    padding: 5px 12px;
    background: none;
    border: 1px solid ${st.accentBlue};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentBlue};
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { background: ${st.accentBlueDim}; }
`;

const EndBtn = styled.button`
    padding: 5px 12px;
    background: none;
    border: 1px solid ${st.accentRed};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.accentRed};
    cursor: pointer;
    transition: all ${st.transition};
    &:hover { background: ${st.accentRedDim}; }
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

// ─── Form Shared ─────────────────────────────────────────────────────────────

const FormBox = styled.div`
    background: ${st.bgCardAlt};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
`;

const InlineFormBox = styled(FormBox)`
    margin-top: 4px;
    background: ${st.bg};
`;

const FormTitle = styled.h4`
    margin: 0;
    font-size: ${st.fontSm};
    font-weight: 700;
    color: ${st.text};
`;

const FormSeparator = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 2px 0;
`;

const FormSectionLabel = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
`;

const Row3 = styled.div`
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

const Textarea = styled.textarea`
    padding: 8px 10px;
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
    font-size: ${st.fontSm};
    color: ${st.text};
    background: ${st.bgInput};
    outline: none;
    resize: vertical;
    min-height: 60px;
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
    padding: 8px 0;
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 12px;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radiusSm};
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

const DangerSaveBtn = styled(SaveBtn)`
    background: ${st.accentRed};
    &:hover { background: #DC2626; }
`;

const ErrorMsg = styled.p`
    margin: 0;
    font-size: ${st.fontXs};
    color: ${st.accentRed};
`;

// ─── Amendments history (inside ContractCard) ─────────────────────────────────

const AmendmentList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0;
    border-top: 1px solid ${st.border};
    margin-top: 4px;
    padding-top: 10px;
`;

const AmendmentListTitle = styled.p`
    margin: 0 0 8px 0;
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.4px;
`;

const AmendmentRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 0;
    border-bottom: 1px solid ${st.border};
    &:last-child { border-bottom: none; }
`;

const AmendmentDate = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
`;

// ─── Compensation form section ────────────────────────────────────────────────
// Extracted as a render-prop pattern (plain function, not a component) to avoid
// Rules-of-Hooks issues while still DRYing up the repeated JSX.

interface CompFieldsProps {
    contractType: ContractType;
    employmentMode: EmploymentMode;
    etatFraction: EtatFraction;
    monthlySalaryPln: string;
    hourlyRatePln: string;
    onModeChange: (m: EmploymentMode) => void;
    onFractionChange: (f: EtatFraction) => void;
    onMonthlyChange: (v: string) => void;
    onHourlyChange: (v: string) => void;
}

const CompensationFields = ({
    contractType,
    employmentMode,
    etatFraction,
    monthlySalaryPln,
    hourlyRatePln,
    onModeChange,
    onFractionChange,
    onMonthlyChange,
    onHourlyChange,
}: CompFieldsProps) => {
    const isUop = contractType === 'UOP';
    const effectiveFraction = etatFraction;
    const preview = employmentMode === 'SALARY'
        ? calcHourlyPreview(monthlySalaryPln, effectiveFraction)
        : null;

    return (
        <>
            {/* Mode toggle — hidden for UOP (always SALARY) */}
            {!isUop && (
                <Field>
                    <Label>Tryb rozliczenia</Label>
                    <ModeToggle>
                        <ModeButton
                            $active={employmentMode === 'SALARY'}
                            onClick={() => onModeChange('SALARY')}
                        >
                            Stała miesięczna
                        </ModeButton>
                        <ModeButton
                            $active={employmentMode === 'HOURLY'}
                            onClick={() => onModeChange('HOURLY')}
                        >
                            Stawka godzinowa
                        </ModeButton>
                    </ModeToggle>
                </Field>
            )}

            {employmentMode === 'SALARY' ? (
                <>
                    <Row>
                        <Field>
                            <Label>
                                {isUop ? 'Wymiar etatu' : 'Podstawa godzinowa'}
                            </Label>
                            <Select
                                value={effectiveFraction}
                                onChange={e => onFractionChange(e.target.value as EtatFraction)}
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
                                onChange={e => onMonthlyChange(e.target.value)}
                                placeholder="np. 6000"
                                min={0}
                                step={0.01}
                            />
                        </Field>
                    </Row>
                    {preview && (
                        <CalcPreview>
                            <CalcLabel>
                                Wyliczona stawka godzinowa ({ETAT_HOURS[effectiveFraction]} h/mies.)
                            </CalcLabel>
                            <CalcValue>{preview} PLN/h</CalcValue>
                        </CalcPreview>
                    )}
                </>
            ) : (
                <Field>
                    <Label>
                        {contractType === 'B2B'
                            ? 'Stawka godzinowa netto (PLN)'
                            : 'Stawka godzinowa brutto (PLN)'}
                    </Label>
                    <Input
                        type="number"
                        value={hourlyRatePln}
                        onChange={e => onHourlyChange(e.target.value)}
                        placeholder="np. 45.00"
                        min={0}
                        step={0.01}
                    />
                </Field>
            )}
        </>
    );
};

// ─── ContractCard sub-component ───────────────────────────────────────────────
// Extracted so each card can call hooks (useAmendments, useCreateAmendment)
// without violating Rules of Hooks.

interface ContractCardProps {
    contract: EmploymentContract;
    employeeId: string;
    isEndFormOpen: boolean;
    onRequestEnd: () => void;
    onCancelEnd: () => void;
    endDate: string;
    onEndDateChange: (v: string) => void;
    onConfirmEnd: () => void;
    endPending: boolean;
}

const ContractCard = ({
    contract,
    employeeId,
    isEndFormOpen,
    onRequestEnd,
    onCancelEnd,
    endDate,
    onEndDateChange,
    onConfirmEnd,
    endPending,
}: ContractCardProps) => {
    const { amendments } = useAmendments(employeeId, contract.id);
    const amendMutation = useCreateAmendment(employeeId, contract.id);

    const isUop = contract.contractType === 'UOP';

    // Amendment form state
    const [showAmendForm, setShowAmendForm] = useState(false);
    const [amendFrom, setAmendFrom] = useState(today());
    const [amendMode, setAmendMode] = useState<EmploymentMode>(isUop ? 'SALARY' : 'HOURLY');
    const [amendFraction, setAmendFraction] = useState<EtatFraction>(contract.etatFraction ?? 'FULL');
    const [amendMonthly, setAmendMonthly] = useState('');
    const [amendHourly, setAmendHourly] = useState('');
    const [amendNotes, setAmendNotes] = useState('');
    const [amendError, setAmendError] = useState('');

    const openAmendForm = () => {
        setAmendFrom(today());
        setAmendMode(isUop ? 'SALARY' : 'HOURLY');
        setAmendFraction(contract.etatFraction ?? 'FULL');
        setAmendMonthly('');
        setAmendHourly('');
        setAmendNotes('');
        setAmendError('');
        setShowAmendForm(true);
    };

    const handleAmendModeChange = (m: EmploymentMode) => {
        setAmendMode(m);
        setAmendMonthly('');
        setAmendHourly('');
        setAmendError('');
    };

    const handleSaveAmendment = async () => {
        if (!amendFrom) { setAmendError('Data obowiązywania jest wymagana.'); return; }
        if (amendMode === 'SALARY' && (!amendMonthly || parseFloat(amendMonthly) <= 0)) {
            setAmendError('Podaj wynagrodzenie miesięczne brutto (wartość > 0).');
            return;
        }
        if (amendMode === 'HOURLY' && (!amendHourly || parseFloat(amendHourly) <= 0)) {
            const rateLabel = contract.contractType === 'B2B' ? 'netto' : 'brutto';
            setAmendError(`Podaj stawkę godzinową ${rateLabel} (wartość > 0).`);
            return;
        }
        setAmendError('');

        const payload: CreateAmendmentPayload = {
            effectiveFrom: amendFrom,
            compensation: buildCompensation(contract.contractType, amendMode, amendFraction, amendMonthly, amendHourly),
        };

        // Attach optional notes if backend supports it (forward-compatible)
        if (amendNotes) (payload as Record<string, unknown>)['notes'] = amendNotes;

        try {
            await amendMutation.mutateAsync(payload);
            setShowAmendForm(false);
        } catch {
            setAmendError('Wystąpił błąd. Spróbuj ponownie.');
        }
    };

    // ── render ──
    return (
        <Card>
            <CardHeader>
                <ContractTypeBadge>{CONTRACT_TYPE_LABELS[contract.contractType]}</ContractTypeBadge>
                <ActiveBadge $active={contract.isActive}>
                    {contract.isActive ? 'Aktywna' : 'Zakończona'}
                </ActiveBadge>
            </CardHeader>

            <CardMeta>
                <MetaItem>
                    <MetaLabel>Od</MetaLabel>
                    <MetaValue>{new Date(contract.startDate).toLocaleDateString('pl-PL')}</MetaValue>
                </MetaItem>
                {contract.endDate && (
                    <MetaItem>
                        <MetaLabel>Do</MetaLabel>
                        <MetaValue>{new Date(contract.endDate).toLocaleDateString('pl-PL')}</MetaValue>
                    </MetaItem>
                )}
                {contract.etatFraction && (
                    <MetaItem>
                        <MetaLabel>Wymiar etatu</MetaLabel>
                        <MetaValue>{ETAT_LABELS[contract.etatFraction]}</MetaValue>
                    </MetaItem>
                )}
                {contract.terminationDate && (
                    <MetaItem>
                        <MetaLabel>Rozwiązana</MetaLabel>
                        <MetaValue>{new Date(contract.terminationDate).toLocaleDateString('pl-PL')}</MetaValue>
                    </MetaItem>
                )}
            </CardMeta>

            {/* Current compensation summary — derived from most recent amendment */}
            {amendments.length > 0 && (() => {
                const latest = amendments[0];
                return (
                    <CompRow>
                        <CompModeBadge $mode={latest.employmentMode}>
                            {latest.employmentMode === 'SALARY' ? 'Etat' : 'Godzinówka'}
                        </CompModeBadge>
                        {latest.employmentMode === 'SALARY' && latest.monthlySalaryGrossCents != null ? (
                            <>
                                <CompAmount>{formatCents(latest.monthlySalaryGrossCents)}/mies.</CompAmount>
                                {latest.hourlyRateGrossCents != null && (
                                    <CompDetail>· {formatCents(latest.hourlyRateGrossCents)}/h brutto</CompDetail>
                                )}
                                {latest.etatFraction && (
                                    <CompDetail>· {ETAT_SHORT[latest.etatFraction]}</CompDetail>
                                )}
                            </>
                        ) : latest.hourlyRateNetCents != null ? (
                            <>
                                <CompAmount>{formatCents(latest.hourlyRateNetCents)}/h</CompAmount>
                                <CompDetail>netto</CompDetail>
                            </>
                        ) : latest.hourlyRateGrossCents != null ? (
                            <>
                                <CompAmount>{formatCents(latest.hourlyRateGrossCents)}/h</CompAmount>
                                <CompDetail>brutto</CompDetail>
                            </>
                        ) : null}
                        <CompDetail style={{ marginLeft: 'auto' }}>
                            od {new Date(latest.effectiveFrom).toLocaleDateString('pl-PL')}
                        </CompDetail>
                    </CompRow>
                );
            })()}

            {/* Actions */}
            {contract.isActive && !showAmendForm && !isEndFormOpen && (
                <CardActions>
                    <AmendBtn onClick={openAmendForm}>+ Aneks</AmendBtn>
                    <EndBtn onClick={onRequestEnd}>Zakończ umowę</EndBtn>
                </CardActions>
            )}

            {/* End-contract inline form */}
            {isEndFormOpen && (
                <InlineFormBox>
                    <FormTitle>Zakończ umowę</FormTitle>
                    <Row>
                        <Field>
                            <Label>Data zakończenia *</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={e => onEndDateChange(e.target.value)}
                            />
                        </Field>
                    </Row>
                    <FormActions>
                        <CancelBtn onClick={onCancelEnd}>Anuluj</CancelBtn>
                        <DangerSaveBtn onClick={onConfirmEnd} disabled={endPending}>
                            {endPending ? 'Przetwarzanie...' : 'Zakończ umowę'}
                        </DangerSaveBtn>
                    </FormActions>
                </InlineFormBox>
            )}

            {/* Amendment inline form */}
            {showAmendForm && (
                <InlineFormBox>
                    <FormTitle>Aneks do umowy</FormTitle>
                    <Row>
                        <Field>
                            <Label>Obowiązuje od *</Label>
                            <Input
                                type="date"
                                value={amendFrom}
                                onChange={e => setAmendFrom(e.target.value)}
                            />
                        </Field>
                        <Field>
                            <Label>Notatki</Label>
                            <Input
                                value={amendNotes}
                                onChange={e => setAmendNotes(e.target.value)}
                                placeholder="Opcjonalny opis zmiany"
                            />
                        </Field>
                    </Row>
                    <FormSeparator />
                    <FormSectionLabel>Nowe warunki wynagrodzenia</FormSectionLabel>
                    <CompensationFields
                        contractType={contract.contractType}
                        employmentMode={amendMode}
                        etatFraction={amendFraction}
                        monthlySalaryPln={amendMonthly}
                        hourlyRatePln={amendHourly}
                        onModeChange={handleAmendModeChange}
                        onFractionChange={setAmendFraction}
                        onMonthlyChange={setAmendMonthly}
                        onHourlyChange={setAmendHourly}
                    />
                    {amendError && <ErrorMsg>{amendError}</ErrorMsg>}
                    <FormActions>
                        <CancelBtn onClick={() => { setShowAmendForm(false); setAmendError(''); }}>
                            Anuluj
                        </CancelBtn>
                        <SaveBtn onClick={handleSaveAmendment} disabled={amendMutation.isPending}>
                            {amendMutation.isPending ? 'Zapisywanie...' : 'Zapisz aneks'}
                        </SaveBtn>
                    </FormActions>
                </InlineFormBox>
            )}

            {/* Amendment history */}
            {amendments.length > 1 && (
                <AmendmentList>
                    <AmendmentListTitle>Historia aneksów</AmendmentListTitle>
                    {amendments.slice(1).map(a => (
                        <AmendmentRow key={a.id}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CompModeBadge $mode={a.employmentMode}>
                                    {a.employmentMode === 'SALARY' ? 'Etat' : 'Godzinówka'}
                                </CompModeBadge>
                                <span style={{ fontSize: st.fontSm, color: st.textSecondary }}>
                                    {a.employmentMode === 'SALARY' && a.monthlySalaryGrossCents != null
                                        ? formatCents(a.monthlySalaryGrossCents)
                                        : a.hourlyRateNetCents != null
                                            ? `${formatCents(a.hourlyRateNetCents)}/h netto`
                                            : a.hourlyRateGrossCents != null
                                                ? `${formatCents(a.hourlyRateGrossCents)}/h brutto`
                                                : '—'}
                                </span>
                            </div>
                            <AmendmentDate>
                                {new Date(a.effectiveFrom).toLocaleDateString('pl-PL')}
                                {a.effectiveTo
                                    ? ` – ${new Date(a.effectiveTo).toLocaleDateString('pl-PL')}`
                                    : ''}
                            </AmendmentDate>
                        </AmendmentRow>
                    ))}
                </AmendmentList>
            )}
        </Card>
    );
};

// ─── ContractsTab ─────────────────────────────────────────────────────────────

interface Props { employeeId: string; }

export const ContractsTab = ({ employeeId }: Props) => {
    const { contracts, isLoading } = useContracts(employeeId);
    const createMutation = useCreateContract(employeeId);
    const endMutation = useEndContract(employeeId);

    // Add-contract form
    const [showAddForm, setShowAddForm] = useState(false);
    const [addContractType, setAddContractType] = useState<ContractType>('UOP');
    const [addStartDate, setAddStartDate] = useState(today());
    const [addEndDate, setAddEndDate] = useState('');
    // Compensation for new contract
    const [addMode, setAddMode] = useState<EmploymentMode>('SALARY');
    const [addFraction, setAddFraction] = useState<EtatFraction>('FULL');
    const [addMonthly, setAddMonthly] = useState('');
    const [addHourly, setAddHourly] = useState('');

    // End-contract form (which contract is being ended)
    const [endContractId, setEndContractId] = useState<string | null>(null);
    const [endDate, setEndDate] = useState(today());

    const [formError, setFormError] = useState('');

    // When contract type changes, reset compensation state
    const handleContractTypeChange = (type: ContractType) => {
        setAddContractType(type);
        setAddMode(type === 'UOP' ? 'SALARY' : 'HOURLY');
        setAddFraction('FULL');
        setAddMonthly('');
        setAddHourly('');
        setFormError('');
    };

    const handleAddModeChange = (m: EmploymentMode) => {
        setAddMode(m);
        setAddMonthly('');
        setAddHourly('');
        setFormError('');
    };

    const resetAddForm = () => {
        setAddContractType('UOP');
        setAddStartDate(today());
        setAddEndDate('');
        setAddMode('SALARY');
        setAddFraction('FULL');
        setAddMonthly('');
        setAddHourly('');
        setFormError('');
    };

    const handleAdd = async () => {
        if (!addStartDate) { setFormError('Data rozpoczęcia jest wymagana.'); return; }
        if (addMode === 'SALARY' && (!addMonthly || parseFloat(addMonthly) <= 0)) {
            setFormError('Podaj wynagrodzenie miesięczne brutto (wartość > 0).');
            return;
        }
        if (addMode === 'HOURLY' && (!addHourly || parseFloat(addHourly) <= 0)) {
            const rateLabel = addContractType === 'B2B' ? 'netto' : 'brutto';
            setFormError(`Podaj stawkę godzinową ${rateLabel} (wartość > 0).`);
            return;
        }
        setFormError('');

        const payload: CreateContractPayload = {
            contractType: addContractType,
            startDate: addStartDate,
            endDate: addEndDate || null,
            initialCompensation: buildCompensation(addContractType, addMode, addFraction, addMonthly, addHourly),
        };

        try {
            await createMutation.mutateAsync(payload);
            setShowAddForm(false);
            resetAddForm();
        } catch {
            setFormError('Wystąpił błąd. Spróbuj ponownie.');
        }
    };

    const handleEnd = async () => {
        if (!endContractId || !endDate) return;
        try {
            await endMutation.mutateAsync({
                contractId: endContractId,
                payload: { terminationDate: endDate },
            });
            setEndContractId(null);
        } catch {
            setFormError('Wystąpił błąd. Spróbuj ponownie.');
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <Section>
            <TopRow>
                <SectionTitle>Umowy o zatrudnienie</SectionTitle>
                {!showAddForm && (
                    <AddBtn onClick={() => setShowAddForm(true)}>+ Dodaj umowę</AddBtn>
                )}
            </TopRow>

            {/* ── Add-contract form ── */}
            {showAddForm && (
                <FormBox>
                    <FormTitle>Nowa umowa</FormTitle>

                    <FormSectionLabel>Dane umowy</FormSectionLabel>
                    <Row3>
                        <Field>
                            <Label>Typ umowy</Label>
                            <Select
                                value={addContractType}
                                onChange={e => handleContractTypeChange(e.target.value as ContractType)}
                            >
                                <option value="UOP">Umowa o pracę</option>
                                <option value="UZ">Umowa zlecenie</option>
                                <option value="B2B">B2B</option>
                            </Select>
                        </Field>
                        <Field>
                            <Label>Data rozpoczęcia *</Label>
                            <Input
                                type="date"
                                value={addStartDate}
                                onChange={e => setAddStartDate(e.target.value)}
                            />
                        </Field>
                        <Field>
                            <Label>Data zakończenia</Label>
                            <Input
                                type="date"
                                value={addEndDate}
                                onChange={e => setAddEndDate(e.target.value)}
                            />
                        </Field>
                    </Row3>

                    <FormSeparator />
                    <FormSectionLabel>Wynagrodzenie</FormSectionLabel>

                    <CompensationFields
                        contractType={addContractType}
                        employmentMode={addMode}
                        etatFraction={addFraction}
                        monthlySalaryPln={addMonthly}
                        hourlyRatePln={addHourly}
                        onModeChange={handleAddModeChange}
                        onFractionChange={setAddFraction}
                        onMonthlyChange={setAddMonthly}
                        onHourlyChange={setAddHourly}
                    />

                    {formError && <ErrorMsg>{formError}</ErrorMsg>}
                    <FormActions>
                        <CancelBtn onClick={() => { setShowAddForm(false); resetAddForm(); }}>
                            Anuluj
                        </CancelBtn>
                        <SaveBtn onClick={handleAdd} disabled={createMutation.isPending}>
                            {createMutation.isPending ? 'Zapisywanie...' : 'Dodaj umowę'}
                        </SaveBtn>
                    </FormActions>
                </FormBox>
            )}

            {/* ── Contract cards ── */}
            {contracts.length === 0 && !showAddForm ? (
                <EmptyText>Brak umów. Kliknij „+ Dodaj umowę" aby dodać pierwszą.</EmptyText>
            ) : (
                contracts.map(c => (
                    <ContractCard
                        key={c.id}
                        contract={c}
                        employeeId={employeeId}
                        isEndFormOpen={endContractId === c.id}
                        onRequestEnd={() => { setEndContractId(c.id); setEndDate(today()); }}
                        onCancelEnd={() => setEndContractId(null)}
                        endDate={endDate}
                        onEndDateChange={setEndDate}
                        onConfirmEnd={handleEnd}
                        endPending={endMutation.isPending}
                    />
                ))
            )}
        </Section>
    );
};
