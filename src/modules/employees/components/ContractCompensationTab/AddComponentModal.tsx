import { useState } from 'react';
import type { ComponentType, CalculationBase, PaymentFrequency, CompensationComponentPayload } from '../../types';
import { COMPONENT_TYPE_LABELS, CALC_BASE_LABELS, FREQUENCY_LABELS } from './constants';
import {
    Overlay, ModalBox, ModalTitle,
    Field, Label, Input, Select, Textarea, TwoCol,
    FormActions, CancelBtn, SaveBtn,
    ErrorMsg, HintText,
} from './styles';

interface Props {
    onClose: () => void;
    onSave: (component: CompensationComponentPayload, effectiveFrom: string) => Promise<void>;
}

const today = () => new Date().toISOString().slice(0, 10);

export const AddComponentModal = ({ onClose, onSave }: Props) => {
    const [type, setType] = useState<ComponentType>('PERCENTAGE_OF_REVENUE');
    const [name, setName] = useState('');
    const [value, setValue] = useState('');
    const [calcBase, setCalcBase] = useState<CalculationBase>('NET_REVENUE');
    const [frequency, setFrequency] = useState<PaymentFrequency>('MONTHLY');
    const [description, setDescription] = useState('');
    const [effectiveFrom, setEffectiveFrom] = useState(today());
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) { setError('Podaj nazwę składnika.'); return; }
        const num = parseFloat(value);
        if (!value || isNaN(num) || num <= 0) { setError('Podaj poprawną wartość (> 0).'); return; }
        if (!effectiveFrom) { setError('Wybierz datę obowiązywania.'); return; }

        setSaving(true);
        setError('');
        try {
            await onSave(
                {
                    name: name.trim(),
                    type,
                    calculationBase: type === 'PERCENTAGE_OF_REVENUE' ? calcBase : null,
                    value: num,
                    thresholds: [],
                    frequency,
                    isActive: true,
                    description: description.trim() || null,
                },
                effectiveFrom,
            );
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
                            placeholder={type === 'PERCENTAGE_OF_REVENUE' ? 'np. 3' : 'np. 500.00'}
                            min={0}
                            step={0.01}
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
                            Przy generowaniu payrollu podajesz przychód pracownika za dany miesiąc.
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

                <FormActions>
                    <CancelBtn onClick={onClose}>Anuluj</CancelBtn>
                    <SaveBtn onClick={handleSave} disabled={saving}>
                        {saving ? 'Zapisywanie...' : 'Dodaj składnik'}
                    </SaveBtn>
                </FormActions>
            </ModalBox>
        </Overlay>
    );
};
