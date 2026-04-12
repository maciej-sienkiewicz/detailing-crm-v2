import { useState } from 'react';
import type {
    ContractType,
    EmploymentMode,
    EtatFraction,
    CreateAmendmentPayload,
} from '../../types';
import { ETAT_HOURS } from './constants';
import { buildInitialCompensation, calcHourlyPreview } from './helpers';
import {
    InlineFormWrapper, FormTitle, FormSectionLabel, FormSeparator, FormRow,
    Field, Label, Input, Select,
    ModeToggle, ModeButton,
    CalcPreview, CalcLabel, CalcValue,
    FormActions, CancelBtn, SaveBtn,
    ErrorMsg,
} from './styles';

interface Props {
    contractType: ContractType;
    initialEtatFraction: EtatFraction;
    onSave: (payload: CreateAmendmentPayload) => Promise<void>;
    onCancel: () => void;
    isPending: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export const AmendmentForm = ({ contractType, initialEtatFraction, onSave, onCancel, isPending }: Props) => {
    const isUop = contractType === 'UOP';

    const [effectiveFrom, setEffectiveFrom] = useState(today());
    const [notes, setNotes] = useState('');
    const [mode, setMode] = useState<EmploymentMode>(isUop ? 'SALARY' : 'HOURLY');
    const [fraction, setFraction] = useState<EtatFraction>(initialEtatFraction);
    const [monthlySalary, setMonthlySalary] = useState('');
    const [hourlyRate, setHourlyRate] = useState('');
    const [error, setError] = useState('');

    const handleModeChange = (m: EmploymentMode) => {
        setMode(m);
        setMonthlySalary('');
        setHourlyRate('');
        setError('');
    };

    const handleSubmit = async () => {
        if (!effectiveFrom) { setError('Data obowiązywania jest wymagana.'); return; }
        if (mode === 'SALARY' && (!monthlySalary || parseFloat(monthlySalary) <= 0)) {
            setError('Podaj wynagrodzenie miesięczne brutto (> 0).');
            return;
        }
        if (mode === 'HOURLY' && (!hourlyRate || parseFloat(hourlyRate) <= 0)) {
            const rateLabel = contractType === 'B2B' ? 'netto' : 'brutto';
            setError(`Podaj stawkę godzinową ${rateLabel} (> 0).`);
            return;
        }
        setError('');

        const payload: CreateAmendmentPayload = {
            effectiveFrom,
            compensation: buildInitialCompensation(contractType, mode, fraction, monthlySalary, hourlyRate),
        };
        if (notes) (payload as Record<string, unknown>)['notes'] = notes;

        try {
            await onSave(payload);
        } catch {
            setError('Wystąpił błąd. Spróbuj ponownie.');
        }
    };

    const hourlyPreview = mode === 'SALARY' ? calcHourlyPreview(monthlySalary, fraction) : null;

    return (
        <InlineFormWrapper>
            <FormTitle>Aneks do umowy</FormTitle>

            <FormRow>
                <Field>
                    <Label>Obowiązuje od *</Label>
                    <Input
                        type="date"
                        value={effectiveFrom}
                        onChange={e => setEffectiveFrom(e.target.value)}
                    />
                </Field>
                <Field>
                    <Label>Notatka (opcjonalnie)</Label>
                    <Input
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Opis zmiany"
                    />
                </Field>
            </FormRow>

            <FormSeparator />
            <FormSectionLabel>Nowe warunki wynagrodzenia</FormSectionLabel>

            {!isUop && (
                <Field>
                    <Label>Tryb rozliczenia</Label>
                    <ModeToggle>
                        <ModeButton $active={mode === 'SALARY'} onClick={() => handleModeChange('SALARY')}>
                            Stała miesięczna
                        </ModeButton>
                        <ModeButton $active={mode === 'HOURLY'} onClick={() => handleModeChange('HOURLY')}>
                            Stawka godzinowa
                        </ModeButton>
                    </ModeToggle>
                </Field>
            )}

            {mode === 'SALARY' ? (
                <>
                    <FormRow>
                        <Field>
                            <Label>{isUop ? 'Wymiar etatu' : 'Podstawa godzinowa'}</Label>
                            <Select value={fraction} onChange={e => setFraction(e.target.value as EtatFraction)}>
                                <option value="FULL">Pełen etat ({ETAT_HOURS.FULL} h/mies.)</option>
                                <option value="HALF">Pół etatu ({ETAT_HOURS.HALF} h/mies.)</option>
                                <option value="QUARTER">Ćwierć etatu ({ETAT_HOURS.QUARTER} h/mies.)</option>
                            </Select>
                        </Field>
                        <Field>
                            <Label>Wynagrodzenie miesięczne brutto (PLN)</Label>
                            <Input
                                type="number"
                                value={monthlySalary}
                                onChange={e => setMonthlySalary(e.target.value)}
                                placeholder="np. 6000"
                                min={0}
                                step={0.01}
                            />
                        </Field>
                    </FormRow>
                    {hourlyPreview && (
                        <CalcPreview>
                            <CalcLabel>Wyliczona stawka godzinowa ({ETAT_HOURS[fraction]} h/mies.)</CalcLabel>
                            <CalcValue>{hourlyPreview} PLN/h</CalcValue>
                        </CalcPreview>
                    )}
                </>
            ) : (
                <Field>
                    <Label>
                        {contractType === 'B2B' ? 'Stawka godzinowa netto (PLN)' : 'Stawka godzinowa brutto (PLN)'}
                    </Label>
                    <Input
                        type="number"
                        value={hourlyRate}
                        onChange={e => setHourlyRate(e.target.value)}
                        placeholder="np. 45.00"
                        min={0}
                        step={0.01}
                    />
                </Field>
            )}

            {error && <ErrorMsg>{error}</ErrorMsg>}

            <FormActions>
                <CancelBtn onClick={onCancel}>Anuluj</CancelBtn>
                <SaveBtn onClick={handleSubmit} disabled={isPending}>
                    {isPending ? 'Zapisywanie...' : 'Zapisz aneks'}
                </SaveBtn>
            </FormActions>
        </InlineFormWrapper>
    );
};
