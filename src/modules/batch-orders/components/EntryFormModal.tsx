import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { BrandSelect, ModelSelect } from '../../vehicles/components/BrandModelSelectors';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { batchOrderApi } from '../api/batchOrderApi';
import type { BatchOrderEntry, EntryRequest, ServiceItemRequest, VehicleSuggestion } from '../types';

const Field = styled.div`
    margin-bottom: 10px;
`;

const Label = styled.label`
    display: block;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};
    margin-bottom: 4px;
`;

const Input = styled.input`
    width: 100%;
    padding: 7px 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 6px;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.background};
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${p => p.theme.colors.primary};
        box-shadow: 0 0 0 2px ${p => p.theme.colors.primary}22;
    }
`;

const Textarea = styled.textarea`
    width: 100%;
    padding: 7px 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 6px;
    font-size: ${p => p.theme.fontSizes.sm};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.background};
    resize: vertical;
    min-height: 64px;
    box-sizing: border-box;
    font-family: inherit;

    &:focus {
        outline: none;
        border-color: ${p => p.theme.colors.primary};
        box-shadow: 0 0 0 2px ${p => p.theme.colors.primary}22;
    }
`;

const Select = styled.select`
    width: 100%;
    padding: 7px 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 6px;
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
    gap: 10px;
`;

const SectionTitle = styled.h3`
    margin: 14px 0 8px;
    font-size: ${p => p.theme.fontSizes.sm};
    font-weight: 700;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const ServiceCard = styled.div`
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 8px;
    background: ${p => p.theme.colors.background};
`;

const ServiceNameRow = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
`;

const ServiceNameInput = styled(Input)`
    flex: 1;
`;

const RemoveBtn = styled.button`
    padding: 5px 8px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 6px;
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    flex-shrink: 0;

    &:hover { background: #fff5f5; color: #e53e3e; border-color: #fed7d7; }
`;

const ServicePriceRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 100px;
    gap: 8px;
`;

const PriceLabel = styled.label`
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};
    margin-bottom: 3px;
`;

const AddServiceBtn = styled.button`
    padding: 7px 12px;
    border: 1px dashed ${p => p.theme.colors.border};
    border-radius: 6px;
    background: transparent;
    color: ${p => p.theme.colors.primary};
    font-size: ${p => p.theme.fontSizes.sm};
    cursor: pointer;
    width: 100%;

    &:hover { background: ${p => p.theme.colors.primary}11; }
`;

const CancelBtn = styled.button`
    padding: 8px 18px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 6px;
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    font-size: ${p => p.theme.fontSizes.sm};
    cursor: pointer;

    &:hover { background: ${p => p.theme.colors.background}; }
`;

const SaveBtn = styled.button`
    padding: 8px 22px;
    border: none;
    border-radius: 6px;
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

const PlateWrapper = styled.div`
    position: relative;
`;

const SuggestionList = styled.ul`
    position: absolute;
    top: calc(100% + 2px);
    left: 0;
    right: 0;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    list-style: none;
    margin: 0;
    padding: 4px 0;
    z-index: 200;
    max-height: 200px;
    overflow-y: auto;
`;

const SuggestionItem = styled.li`
    padding: 7px 10px;
    cursor: pointer;
    font-size: ${p => p.theme.fontSizes.sm};

    &:hover { background: ${p => p.theme.colors.background}; }

    strong { font-weight: 700; }
    span { color: ${p => p.theme.colors.textMuted}; font-size: 12px; margin-left: 6px; }
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

interface ServiceFormItem {
    name: string;
    netDisplay: string;
    grossDisplay: string;
    vatRate: number;
}

function emptyService(): ServiceFormItem {
    return { name: '', netDisplay: '', grossDisplay: '', vatRate: 23 };
}

function serviceToForm(svc: { name: string; netAmountCents: number; grossAmountCents: number; vatRate: number }): ServiceFormItem {
    return {
        name: svc.name,
        netDisplay: centsToDisplay(svc.netAmountCents),
        grossDisplay: centsToDisplay(svc.grossAmountCents),
        vatRate: svc.vatRate,
    };
}

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
    const [services, setServices] = useState<ServiceFormItem[]>(
        initial?.services?.length
            ? initial.services.map(serviceToForm)
            : [emptyService()]
    );
    const [notes, setNotes] = useState(initial?.notes ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [plateSuggestions, setPlateSuggestions] = useState<VehicleSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const plateRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        const t = setTimeout(async () => {
            if (vehiclePlate.trim().length >= 2) {
                const results = await batchOrderApi.searchVehicles(vehiclePlate.trim());
                if (!cancelled) {
                    setPlateSuggestions(results);
                    setShowSuggestions(results.length > 0);
                }
            } else {
                setPlateSuggestions([]);
                setShowSuggestions(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [vehiclePlate]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (plateRef.current && !plateRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function selectSuggestion(s: VehicleSuggestion) {
        setVehiclePlate(s.licensePlate);
        if (!vehicleMake && s.brand) setVehicleMake(s.brand);
        if (!vehicleModel && s.model) setVehicleModel(s.model);
        setShowSuggestions(false);
    }

    function updateService(idx: number, patch: Partial<ServiceFormItem>) {
        setServices(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
    }

    function updateNet(idx: number, val: string) {
        const cents = displayToCents(val);
        const svc = services[idx];
        const vatRate = svc.vatRate;
        let grossDisplay = svc.grossDisplay;
        if (vatRate >= 0 && val !== '') {
            const grossCents = vatRate === 0 ? cents : Math.round(cents * (1 + vatRate / 100));
            grossDisplay = centsToDisplay(grossCents);
        }
        updateService(idx, { netDisplay: val, grossDisplay });
    }

    function updateGross(idx: number, val: string) {
        const cents = displayToCents(val);
        const svc = services[idx];
        const vatRate = svc.vatRate;
        let netDisplay = svc.netDisplay;
        if (vatRate >= 0 && val !== '') {
            const netCents = vatRate === 0 ? cents : Math.round(cents / (1 + vatRate / 100));
            netDisplay = centsToDisplay(netCents);
        }
        updateService(idx, { grossDisplay: val, netDisplay });
    }

    function addService() {
        setServices(s => [...s, emptyService()]);
    }

    function removeService(idx: number) {
        setServices(s => s.filter((_, i) => i !== idx));
    }

    async function handleSave() {
        if (!serviceDate) { setError('Data wykonania jest wymagana'); return; }

        setSaving(true);
        setError('');
        try {
            const serviceItems: ServiceItemRequest[] = services
                .filter(s => s.name.trim())
                .map(s => ({
                    name: s.name.trim(),
                    netAmountCents: displayToCents(s.netDisplay),
                    grossAmountCents: displayToCents(s.grossDisplay),
                    vatRate: s.vatRate,
                }));

            await onSave({
                serviceDate,
                vehicleMake: vehicleMake.trim() || undefined,
                vehicleModel: vehicleModel.trim() || undefined,
                vehicleLicensePlate: vehiclePlate.trim() || undefined,
                services: serviceItems,
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
        <ModalShell isOpen onClose={onClose} size="lg">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>{initial ? 'Edytuj wpis' : 'Nowy wpis'}</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Field>
                    <Label>Data wykonania usługi *</Label>
                    <Input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                </Field>

                <SectionTitle>Pojazd</SectionTitle>
                <Row>
                    <Field>
                        <Label>Marka</Label>
                        <BrandSelect
                            value={vehicleMake}
                            onChange={(brand) => { setVehicleMake(brand); setVehicleModel(''); }}
                            placeholder="np. BMW"
                        />
                    </Field>
                    <Field>
                        <Label>Model</Label>
                        <ModelSelect
                            brand={vehicleMake}
                            value={vehicleModel}
                            onChange={setVehicleModel}
                            placeholder="np. 3 Series"
                        />
                    </Field>
                </Row>
                <Field>
                    <Label>Tablica rejestracyjna</Label>
                    <PlateWrapper ref={plateRef}>
                        <Input
                            value={vehiclePlate}
                            onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                            onFocus={() => plateSuggestions.length > 0 && setShowSuggestions(true)}
                            placeholder="np. WA12345"
                            autoComplete="off"
                        />
                        {showSuggestions && (
                            <SuggestionList>
                                {plateSuggestions.map(s => (
                                    <SuggestionItem key={s.licensePlate} onMouseDown={() => selectSuggestion(s)}>
                                        <strong>{s.licensePlate}</strong>
                                        <span>{s.brand} {s.model}</span>
                                    </SuggestionItem>
                                ))}
                            </SuggestionList>
                        )}
                    </PlateWrapper>
                </Field>

                <SectionTitle>Wykonane usługi</SectionTitle>
                {services.map((svc, idx) => (
                    <ServiceCard key={idx}>
                        <ServiceNameRow>
                            <ServiceNameInput
                                value={svc.name}
                                onChange={e => updateService(idx, { name: e.target.value })}
                                placeholder={`Nazwa usługi ${idx + 1}...`}
                            />
                            {services.length > 1 && (
                                <RemoveBtn type="button" onClick={() => removeService(idx)}>✕</RemoveBtn>
                            )}
                        </ServiceNameRow>
                        <ServicePriceRow>
                            <div>
                                <PriceLabel>Netto (zł)</PriceLabel>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={svc.netDisplay}
                                    onChange={e => updateNet(idx, e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <PriceLabel>Brutto (zł)</PriceLabel>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={svc.grossDisplay}
                                    onChange={e => updateGross(idx, e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <PriceLabel>Stawka VAT</PriceLabel>
                                <Select value={svc.vatRate} onChange={e => updateService(idx, { vatRate: Number(e.target.value) })}>
                                    {VAT_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </Select>
                            </div>
                        </ServicePriceRow>
                    </ServiceCard>
                ))}
                <AddServiceBtn type="button" onClick={addService}>+ Dodaj usługę</AddServiceBtn>

                <Field style={{ marginTop: 10 }}>
                    <Label>Uwagi</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Dodatkowe uwagi..." />
                </Field>

                {error && <ErrorMsg>{error}</ErrorMsg>}
            </ModalContent>

            <ModalFooter>
                <CancelBtn type="button" onClick={onClose}>Anuluj</CancelBtn>
                <SaveBtn type="button" onClick={handleSave} disabled={saving}>
                    {saving ? 'Zapisywanie...' : 'Zapisz'}
                </SaveBtn>
            </ModalFooter>
        </ModalShell>
    );
}
