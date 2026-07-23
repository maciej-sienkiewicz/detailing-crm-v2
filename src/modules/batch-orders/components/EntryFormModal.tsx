import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Camera } from 'lucide-react';
import { BrandSelect, ModelSelect } from '../../vehicles/components/BrandModelSelectors';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle,
    ModalContent, ModalFooter, ModalSectionTitle, CloseBtn,
} from '@/common/components/ModalKit';
import {
    FormField, FormGrid, FieldLabel,
    InputShell, BareInput, InputShellTextArea, BareTextArea,
    FormErrorMsg, FormAlertBanner,
} from '@/common/components/Form';
import { SharedButton } from '@/common/styles';
import { batchOrderApi } from '../api/batchOrderApi';
import type { BatchOrderEntry, EntryRequest, ServiceItemRequest, VehicleSuggestion } from '../types';

// ─── Service card ─────────────────────────────────────────────────────────────

const ServiceCard = styled.div`
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px 14px;
    background: #fff;
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const ServiceCardHeader = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
`;

const ServiceNameInput = styled.input`
    flex: 1;
    min-width: 0;
    padding: 9px 12px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    color: #0f172a;
    background: white;
    font-family: inherit;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:focus {
        outline: none;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    &::placeholder { color: #94a3b8; }
`;

const RemoveBtn = styled.button`
    padding: 6px 9px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    flex-shrink: 0;
    transition: all 150ms ease;

    &:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }
`;

const PriceGrid = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 90px;
    gap: 8px;
`;

const PriceField = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const PriceLabel = styled.label`
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
`;

const PriceInput = styled.input`
    width: 100%;
    padding: 8px 10px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #0f172a;
    background: white;
    font-family: inherit;
    box-sizing: border-box;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:focus {
        outline: none;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    &::placeholder { color: #94a3b8; }
`;

const PriceSelect = styled.select`
    width: 100%;
    padding: 8px 10px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    color: #0f172a;
    background: white;
    font-family: inherit;
    box-sizing: border-box;
    cursor: pointer;
    transition: border-color 0.2s ease;

    &:focus {
        outline: none;
        border-color: #0ea5e9;
    }
`;

const AddServiceBtn = styled.button`
    padding: 9px 14px;
    border: 1.5px dashed #e2e8f0;
    border-radius: 10px;
    background: transparent;
    color: #0ea5e9;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    width: 100%;
    font-family: inherit;
    transition: background 150ms ease, border-color 150ms ease;

    &:hover { background: rgba(14, 165, 233, 0.04); border-color: #bae6fd; }
`;

// ─── Autocomplete ─────────────────────────────────────────────────────────────

const AutocompleteWrapper = styled.div`
    position: relative;
`;

const SuggestionList = styled.ul`
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: white;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    list-style: none;
    margin: 0;
    padding: 4px 0;
    z-index: 200;
    max-height: 200px;
    overflow-y: auto;
`;

const SuggestionItem = styled.li`
    padding: 9px 14px;
    cursor: pointer;
    font-size: 14px;
    color: #0f172a;
    display: flex;
    align-items: baseline;
    gap: 8px;
    transition: background 100ms ease;

    &:hover { background: #f8fafc; }

    strong { font-weight: 700; font-family: monospace; letter-spacing: 0.04em; }
    span { color: #64748b; font-size: 13px; }
`;

// ─── VIN camera inline button ─────────────────────────────────────────────────

const CameraInlineBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 12px;
    height: 100%;
    border: none;
    border-left: 1px solid #e2e8f0;
    background: none;
    color: var(--brand-primary);
    cursor: pointer;
    border-radius: 0 10px 10px 0;
    transition: background 0.15s ease;
    flex-shrink: 0;

    &:hover:not(:disabled) { background: #f0f9ff; }
    &:disabled { color: #94a3b8; cursor: not-allowed; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

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
    const [vehicleVin, setVehicleVin] = useState(initial?.vehicleVin ?? '');
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
    const [vinSuggestions, setVinSuggestions] = useState<VehicleSuggestion[]>([]);
    const [showVinSuggestions, setShowVinSuggestions] = useState(false);
    const plateRef = useRef<HTMLDivElement>(null);
    const vinRef = useRef<HTMLDivElement>(null);

    const [vinUploading, setVinUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        let cancelled = false;
        const t = setTimeout(async () => {
            if (vehicleVin.trim().length >= 3) {
                const results = await batchOrderApi.searchVehiclesFromEntries(vehicleVin.trim());
                if (!cancelled) {
                    setVinSuggestions(results);
                    setShowVinSuggestions(results.length > 0);
                }
            } else {
                setVinSuggestions([]);
                setShowVinSuggestions(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [vehicleVin]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (plateRef.current && !plateRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
            if (vinRef.current && !vinRef.current.contains(e.target as Node)) {
                setShowVinSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function selectSuggestion(s: VehicleSuggestion) {
        setVehiclePlate(s.licensePlate);
        if (s.vin) setVehicleVin(s.vin);
        if (!vehicleMake && s.brand) setVehicleMake(s.brand);
        if (!vehicleModel && s.model) setVehicleModel(s.model);
        setShowSuggestions(false);
    }

    function selectVinSuggestion(s: VehicleSuggestion) {
        if (s.vin) setVehicleVin(s.vin);
        if (!vehiclePlate && s.licensePlate) setVehiclePlate(s.licensePlate);
        if (!vehicleMake && s.brand) setVehicleMake(s.brand);
        if (!vehicleModel && s.model) setVehicleModel(s.model);
        setShowVinSuggestions(false);
    }

    async function handleVinFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setVinUploading(true);
        try {
            const vin = await batchOrderApi.extractVin(file);
            if (vin) {
                setVehicleVin(vin);
            } else {
                setError('Nie udało się odczytać VIN ze zdjęcia. Spróbuj ponownie lub wpisz ręcznie.');
            }
        } catch {
            setError('Błąd podczas analizy zdjęcia. Spróbuj ponownie.');
        } finally {
            setVinUploading(false);
        }
    }

    function updateService(idx: number, patch: Partial<ServiceFormItem>) {
        setServices(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
    }

    function updateNet(idx: number, val: string) {
        const cents = displayToCents(val);
        const { vatRate, grossDisplay } = services[idx];
        let newGross = grossDisplay;
        if (vatRate >= 0 && val !== '') {
            newGross = centsToDisplay(vatRate === 0 ? cents : Math.round(cents * (1 + vatRate / 100)));
        }
        updateService(idx, { netDisplay: val, grossDisplay: newGross });
    }

    function updateGross(idx: number, val: string) {
        const cents = displayToCents(val);
        const { vatRate, netDisplay } = services[idx];
        let newNet = netDisplay;
        if (vatRate >= 0 && val !== '') {
            newNet = centsToDisplay(vatRate === 0 ? cents : Math.round(cents / (1 + vatRate / 100)));
        }
        updateService(idx, { grossDisplay: val, netDisplay: newNet });
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
                vehicleVin: vehicleVin.trim().toUpperCase() || undefined,
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
                {error && <FormAlertBanner>{error}</FormAlertBanner>}

                <FormField>
                    <FieldLabel htmlFor="entry-date">Data wykonania *</FieldLabel>
                    <InputShell>
                        <BareInput
                            id="entry-date"
                            type="date"
                            value={serviceDate}
                            onChange={e => setServiceDate(e.target.value)}
                        />
                    </InputShell>
                </FormField>

                <div>
                    <ModalSectionTitle>Pojazd</ModalSectionTitle>
                    <FormGrid $columns={2}>
                        <FormField>
                            <FieldLabel>Marka</FieldLabel>
                            <BrandSelect
                                value={vehicleMake}
                                onChange={(brand) => { setVehicleMake(brand); setVehicleModel(''); }}
                                placeholder="np. BMW"
                            />
                        </FormField>
                        <FormField>
                            <FieldLabel>Model</FieldLabel>
                            <ModelSelect
                                brand={vehicleMake}
                                value={vehicleModel}
                                onChange={setVehicleModel}
                                placeholder="np. 3 Series"
                            />
                        </FormField>
                    </FormGrid>

                    <FormGrid $columns={2} style={{ marginTop: 10 }}>
                        <FormField>
                            <FieldLabel htmlFor="entry-plate">Tablica rejestracyjna</FieldLabel>
                            <AutocompleteWrapper ref={plateRef}>
                                <InputShell>
                                    <BareInput
                                        id="entry-plate"
                                        value={vehiclePlate}
                                        onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                                        onFocus={() => plateSuggestions.length > 0 && setShowSuggestions(true)}
                                        placeholder="np. WA12345"
                                        autoComplete="off"
                                    />
                                </InputShell>
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
                            </AutocompleteWrapper>
                        </FormField>

                        <FormField>
                            <FieldLabel htmlFor="entry-vin">VIN</FieldLabel>
                            <AutocompleteWrapper ref={vinRef}>
                                <InputShell>
                                    <BareInput
                                        id="entry-vin"
                                        value={vehicleVin}
                                        onChange={e => setVehicleVin(e.target.value.toUpperCase())}
                                        onFocus={() => vinSuggestions.length > 0 && setShowVinSuggestions(true)}
                                        placeholder="np. WBA3A5G59DNP26082"
                                        maxLength={17}
                                        autoComplete="off"
                                        style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                                    />
                                    <CameraInlineBtn
                                        type="button"
                                        title="Zeskanuj VIN ze zdjęcia"
                                        disabled={vinUploading}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Camera size={15} />
                                    </CameraInlineBtn>
                                </InputShell>
                                {showVinSuggestions && (
                                    <SuggestionList>
                                        {vinSuggestions.map(s => (
                                            <SuggestionItem key={s.vin ?? s.licensePlate} onMouseDown={() => selectVinSuggestion(s)}>
                                                <strong>{s.vin}</strong>
                                                <span>{[s.brand, s.model, s.licensePlate].filter(Boolean).join(' · ')}</span>
                                            </SuggestionItem>
                                        ))}
                                    </SuggestionList>
                                )}
                            </AutocompleteWrapper>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                style={{ display: 'none' }}
                                onChange={handleVinFileChange}
                            />
                        </FormField>
                    </FormGrid>
                </div>

                <div>
                    <ModalSectionTitle>Wykonane usługi</ModalSectionTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {services.map((svc, idx) => (
                            <ServiceCard key={idx}>
                                <ServiceCardHeader>
                                    <ServiceNameInput
                                        value={svc.name}
                                        onChange={e => updateService(idx, { name: e.target.value })}
                                        placeholder={`Nazwa usługi ${idx + 1}…`}
                                    />
                                    {services.length > 1 && (
                                        <RemoveBtn type="button" onClick={() => removeService(idx)}>✕</RemoveBtn>
                                    )}
                                </ServiceCardHeader>
                                <PriceGrid>
                                    <PriceField>
                                        <PriceLabel>Netto (zł)</PriceLabel>
                                        <PriceInput
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={svc.netDisplay}
                                            onChange={e => updateNet(idx, e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </PriceField>
                                    <PriceField>
                                        <PriceLabel>Brutto (zł)</PriceLabel>
                                        <PriceInput
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={svc.grossDisplay}
                                            onChange={e => updateGross(idx, e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </PriceField>
                                    <PriceField>
                                        <PriceLabel>VAT</PriceLabel>
                                        <PriceSelect
                                            value={svc.vatRate}
                                            onChange={e => updateService(idx, { vatRate: Number(e.target.value) })}
                                        >
                                            {VAT_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </PriceSelect>
                                    </PriceField>
                                </PriceGrid>
                            </ServiceCard>
                        ))}
                        <AddServiceBtn type="button" onClick={addService}>+ Dodaj usługę</AddServiceBtn>
                    </div>
                </div>

                <FormField>
                    <FieldLabel htmlFor="entry-notes">Uwagi</FieldLabel>
                    <InputShellTextArea>
                        <BareTextArea
                            id="entry-notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Dodatkowe uwagi…"
                            style={{ minHeight: 64 }}
                        />
                    </InputShellTextArea>
                </FormField>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton $variant="primary" type="button" onClick={handleSave} disabled={saving}>
                    {saving ? 'Zapisywanie...' : 'Zapisz'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
}
