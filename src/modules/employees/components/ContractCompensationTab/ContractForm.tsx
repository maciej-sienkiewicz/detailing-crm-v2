import { useState } from 'react';
import type {
    ContractType,
    EmploymentMode,
    EtatFraction,
    CreateContractPayload,
} from '../../types';
import { ETAT_HOURS } from './constants';
import { buildInitialCompensation, calcHourlyPreview } from './helpers';
import {
    GlobalFormWrapper, FormTitle, FormSectionLabel, FormSeparator,
    FormRow, FormRow3,
    Field, Label, Input, Select,
    ModeToggle, ModeButton,
    CalcPreview, CalcLabel, CalcValue,
    FormActions, CancelBtn, SaveBtn,
    ErrorMsg,
} from './styles';

interface Props {
    onSave: (payload: CreateContractPayload) => Promise<void>;
    onCancel: () => void;
    isPending: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export const ContractForm = ({ onSave, onCancel, isPending }: Props) => {
    const [contractType, setContractType] = useState<ContractType>('UOP');
    const [startDate, setStartDate] = useState(today());
    const [endDate, setEndDate] = useState('');
    const [mode, setMode] = useState<EmploymentMode>('SALARY');
    const [fraction, setFraction] = useState<EtatFraction>('FULL');
    const [monthlySalary, setMonthlySalary] = useState('');
    const [hourlyRate, setHourlyRate] = useState('');
    const [error, setError] = useState('');

    const isUop = contractType === 'UOP';

    const handleContractTypeChange = (type: ContractType) => {
        setContractType(type);
        setMode(type === 'UOP' ? 'SALARY' : 'HOURLY');
        setFraction('FULL');
        setMonthlySalary('');
        setHourlyRate('');
        setError('');
    };

    const handleModeChange = (m: EmploymentMode) => {
        setMode(m);
        setMonthlySalary('');
        setHourlyRate('');
        setError('');
    };

    const handleSubmit = async () => {
        if (!startDate) { setError('Data rozpoczęcia jest wymagana.'); return; }
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

        try {
            await onSave({
                contractType,
                startDate,
                endDate: endDate || null,
                initialCompensation: buildInitialCompensation(contractType, mode, fraction, monthlySalary, hourlyRate),
            });
        } catch {
            setError('Wystąpił błąd. Spróbuj ponownie.');
        }
    };

    const hourlyPreview = mode === 'SALARY' ? calcHourlyPreview(monthlySalary, fraction) : null;

    return (
        <GlobalFormWrapper>
            <FormTitle>Nowa umowa</FormTitle>

            <FormSectionLabel>Dane umowy</FormSectionLabel>

            <FormRow3>
                <Field>
                    <Label>Typ umowy</Label>
                    <Select
                        value={contractType}
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
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                </Field>
                <Field>
                    <Label>Data zakończenia</Label>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                    />
                </Field>
            </FormRow3>

            <FormSeparator />
            <FormSectionLabel>Wynagrodzenie startowe</FormSectionLabel>

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
                    {isPending ? 'Zapisywanie...' : 'Dodaj umowę'}
                </SaveBtn>
            </FormActions>
        </GlobalFormWrapper>
    );
};
