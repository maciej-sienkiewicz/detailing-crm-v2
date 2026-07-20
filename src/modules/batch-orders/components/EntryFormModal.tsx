import { useState } from 'react';
import styled from 'styled-components';
import type { BatchOrderEntry, EntryRequest } from '../types';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
`;

const Modal = styled.div`
    background: ${p => p.theme.colors.surface};
    border-radius: 12px;
    padding: 24px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const ModalTitle = styled.h2`
    margin: 0 0 20px;
    font-size: ${p => p.theme.fontSizes.lg};
    font-weight: 700;
    color: ${p => p.theme.colors.text};
`;

const Field = styled.div`
    margin-bottom: 16px;
`;

const Label = styled.label`
    display: block;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};
    margin-bottom: 6px;
`;

const Input = styled.input`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.background};
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${p => p.theme.colors.primary};
        box-shadow: 0 0 0 3px ${p => p.theme.colors.primary}22;
    }
`;

const Textarea = styled.textarea`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.background};
    resize: vertical;
    min-height: 80px;
    box-sizing: border-box;
    font-family: inherit;

    &:focus {
        outline: none;
        border-color: ${p => p.theme.colors.primary};
        box-shadow: 0 0 0 3px ${p => p.theme.colors.primary}22;
    }
`;

const Select = styled.select`
    width: 100%;
    padding: 10px 12px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.background};
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${p => p.theme.colors.primary};
    }
`;

const Row = styled.div<{ cols?: number }>`
    display: grid;
    grid-template-columns: repeat(${p => p.cols ?? 2}, 1fr);
    gap: 12px;
`;

const SectionTitle = styled.h3`
    margin: 20px 0 12px;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 700;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const ServiceRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
`;

const ServiceInput = styled(Input)`
    flex: 1;
    margin-bottom: 0;
`;

const RemoveBtn = styled.button`
    padding: 8px 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    flex-shrink: 0;

    &:hover { background: ${p => p.theme.colors.background}; color: #e53e3e; }
`;

const AddServiceBtn = styled.button`
    padding: 8px 14px;
    border: 1px dashed ${p => p.theme.colors.border};
    border-radius: 8px;
    background: transparent;
    color: ${p => p.theme.colors.primary};
    font-size: ${p => p.theme.fontSizes.sm};
    cursor: pointer;
    width: 100%;

    &:hover { background: ${p => p.theme.colors.primary}11; }
`;

const MoneyRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 120px;
    gap: 12px;
`;

const Actions = styled.div`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
`;

const CancelBtn = styled.button`
    padding: 10px 20px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 8px;
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    font-size: ${p => p.theme.fontSizes.sm};
    cursor: pointer;

    &:hover { background: ${p => p.theme.colors.background}; }
`;

const SaveBtn = styled.button`
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    background: ${p => p.theme.colors.primary};
    color: #fff;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 600;
    cursor: pointer;

    &:hover { opacity: 0.9; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorMsg = styled.p`
    color: #e53e3e;
    font-size: ${p => p.theme.fontSizes.xs};
    margin: 4px 0 0;
`;

const HintText = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    margin-left: 8px;
    font-weight: 400;
`;

function centsToDisplay(cents: number): string {
    return (cents / 100).toFixed(2);
}

function displayToCents(value: string): number {
    const parsed = parseFloat(value.replace(',', '.'));
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
}

const VAT_OPTIONS = [
    { label: '23%', value: 23 },
    { label: '8%', value: 8 },
    { label: '5%', value: 5 },
    { label: '0%', value: 0 },
    { label: 'ZW', value: -1 },
];

interface Props {
    initial?: BatchOrderEntry | null;
    onSave: (data: EntryRequest) => Promise<void>;
    onClose: () => void;
}

export function EntryFormModal({ initial, onSave, onClose }: Props) {
    const today = new Date().toISOString().split('T')[0];
    const [serviceDate, setServiceDate] = useState(initial?.serviceDate ?? today);
    const [vehicleMake, setVehicleMake] = useState(initial?.vehicleMake ?? '');
    const [vehicleModel, setVehicleModel] = useState(initial?.vehicleModel ?? '');
    const [vehiclePlate, setVehiclePlate] = useState(initial?.vehicleLicensePlate ?? '');
    const [services, setServices] = useState<string[]>(
        initial?.services?.length ? initial.services : ['']
    );
    const [netDisplay, setNetDisplay] = useState(initial ? centsToDisplay(initial.netAmountCents) : '');
    const [grossDisplay, setGrossDisplay] = useState(initial ? centsToDisplay(initial.grossAmountCents) : '');
    const [vatRate, setVatRate] = useState(initial?.vatRate ?? 23);
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function addService() { setServices(s => [...s, '']); }
    function removeService(idx: number) { setServices(s => s.filter((_, i) => i !== idx)); }
    function setService(idx: number, val: string) {
        setServices(s => s.map((v, i) => i === idx ? val : v));
    }

    async function handleSave() {
        const netCents = displayToCents(netDisplay);
        const grossCents = displayToCents(grossDisplay);
        const filteredServices = services.filter(s => s.trim());

        if (!serviceDate) { setError('Data wykonania jest wymagana'); return; }

        setSaving(true);
        setError('');
        try {
            await onSave({
                serviceDate,
                vehicleMake: vehicleMake.trim() || undefined,
                vehicleModel: vehicleModel.trim() || undefined,
                vehicleLicensePlate: vehiclePlate.trim() || undefined,
                services: filteredServices,
                netAmountCents: netCents,
                grossAmountCents: grossCents,
                vatRate,
                notes: notes.trim() || undefined,
            });
            onClose();
        } catch {
            setError('Nie udało się zapisać wpisu. Spróbuj ponownie.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Overlay onClick={onClose}>
            <Modal onClick={e => e.stopPropagation()}>
                <ModalTitle>{initial ? 'Edytuj wpis' : 'Nowy wpis'}</ModalTitle>

                <Field>
                    <Label>Data wykonania usługi *</Label>
                    <Input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                </Field>

                <SectionTitle>Pojazd</SectionTitle>
                <Row>
                    <Field>
                        <Label>Marka</Label>
                        <Input value={vehicleMake} onChange={e => setVehicleMake(e.target.value)} placeholder="np. BMW" />
                    </Field>
                    <Field>
                        <Label>Model</Label>
                        <Input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="np. 3 Series" />
                    </Field>
                </Row>
                <Field>
                    <Label>Tablica rejestracyjna</Label>
                    <Input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="np. WA 12345" />
                </Field>

                <SectionTitle>Wykonane usługi</SectionTitle>
                {services.map((svc, idx) => (
                    <ServiceRow key={idx}>
                        <ServiceInput
                            value={svc}
                            onChange={e => setService(idx, e.target.value)}
                            placeholder={`Usługa ${idx + 1}...`}
                        />
                        {services.length > 1 && (
                            <RemoveBtn onClick={() => removeService(idx)}>✕</RemoveBtn>
                        )}
                    </ServiceRow>
                ))}
                <AddServiceBtn onClick={addService}>+ Dodaj usługę</AddServiceBtn>

                <SectionTitle>
                    Cena
                    <HintText>w złotych, np. 1500.00</HintText>
                </SectionTitle>
                <MoneyRow>
                    <Field>
                        <Label>Netto (zł)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={netDisplay}
                            onChange={e => setNetDisplay(e.target.value)}
                            placeholder="0.00"
                        />
                    </Field>
                    <Field>
                        <Label>Brutto (zł)</Label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={grossDisplay}
                            onChange={e => setGrossDisplay(e.target.value)}
                            placeholder="0.00"
                        />
                    </Field>
                    <Field>
                        <Label>Stawka VAT</Label>
                        <Select value={vatRate} onChange={e => setVatRate(Number(e.target.value))}>
                            {VAT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </Select>
                    </Field>
                </MoneyRow>

                <Field>
                    <Label>Uwagi</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Dodatkowe uwagi..." />
                </Field>

                {error && <ErrorMsg>{error}</ErrorMsg>}

                <Actions>
                    <CancelBtn onClick={onClose}>Anuluj</CancelBtn>
                    <SaveBtn onClick={handleSave} disabled={saving}>
                        {saving ? 'Zapisywanie...' : 'Zapisz'}
                    </SaveBtn>
                </Actions>
            </Modal>
        </Overlay>
    );
}
