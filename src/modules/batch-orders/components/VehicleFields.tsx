// src/modules/batch-orders/components/VehicleFields.tsx
//
// Pojazd i data wpisu. Tablica i VIN podpowiadają auta, które studio już zna -
// z bazy pojazdów i z wcześniejszych wpisów zbiorczych - i dopełniają markę/model,
// o ile nie są już wpisane. VIN da się też odczytać ze zdjęcia.

import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Camera } from 'lucide-react';
import { FormField, FormGrid, FieldLabel, InputShell, BareInput } from '@/common/components/Form';
import { BrandSelect, ModelSelect } from '../../vehicles/components/BrandModelSelectors';
import { batchOrderApi } from '../api/batchOrderApi';
import type { VehicleSuggestion } from '../types';

const Autocomplete = styled.div`
    position: relative;
`;

const SuggestionList = styled.ul`
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    z-index: 200;
    margin: 0;
    padding: 4px 0;
    list-style: none;
    max-height: min(220px, 35dvh);
    overflow-y: auto;
    background: #fff;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
`;

const SuggestionItem = styled.li`
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-height: 40px;
    padding: 9px 14px;
    font-size: 14px;
    color: #0f172a;
    cursor: pointer;

    &:hover { background: #f8fafc; }
    strong { font-family: monospace; font-weight: 700; letter-spacing: 0.04em; }
    span { min-width: 0; font-size: 13px; color: #64748b; overflow-wrap: anywhere; }
    @media (hover: none) and (pointer: coarse) { min-height: 48px; align-items: center; }
`;

const CameraBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    padding: 0 12px;
    border: none;
    border-left: 1px solid #e2e8f0;
    background: none;
    color: #0369a1;
    cursor: pointer;

    svg { width: 16px; height: 16px; }
    &:hover:not(:disabled) { background: #f0f9ff; }
    &:disabled { color: #94a3b8; cursor: not-allowed; }
`;

export interface VehicleValues {
    serviceDate: string;
    make: string;
    model: string;
    plate: string;
    vin: string;
}

interface Props {
    value: VehicleValues;
    onChange: (patch: Partial<VehicleValues>) => void;
    onError: (message: string) => void;
    disabled?: boolean;
}

/** Podpowiedzi po 250 ms ciszy, od `minLength` znaków; stare odpowiedzi są odrzucane. */
function useSuggestions(query: string, minLength: number, search: (q: string) => Promise<VehicleSuggestion[]>) {
    const [items, setItems] = useState<VehicleSuggestion[]>([]);
    const [open, setOpen] = useState(false);
    useEffect(() => {
        let cancelled = false;
        const q = query.trim();
        const t = setTimeout(async () => {
            if (q.length < minLength) { setItems([]); setOpen(false); return; }
            try {
                const results = await search(q);
                if (!cancelled) { setItems(results); setOpen(results.length > 0); }
            } catch {
                // Podpowiedź to wygoda, nie warunek zapisu - błąd wyszukiwania milknie.
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(t); };
    }, [query, minLength, search]);
    return { items, open, setOpen };
}

export function VehicleFields({ value, onChange, onError, disabled }: Props) {
    const plateRef = useRef<HTMLDivElement>(null);
    const vinRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const [vinScanning, setVinScanning] = useState(false);
    // Po wyborze podpowiedzi pole zmienia wartość - bez tej flagi lista otwierałaby się znowu.
    const [plateQuery, setPlateQuery] = useState('');
    const [vinQuery, setVinQuery] = useState('');

    const plate = useSuggestions(plateQuery, 2, batchOrderApi.searchVehicles);
    const vin = useSuggestions(vinQuery, 3, batchOrderApi.searchVehiclesFromEntries);
    const setPlateOpen = plate.setOpen;
    const setVinOpen = vin.setOpen;

    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (plateRef.current && !plateRef.current.contains(e.target as Node)) setPlateOpen(false);
            if (vinRef.current && !vinRef.current.contains(e.target as Node)) setVinOpen(false);
        }
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [setPlateOpen, setVinOpen]);

    function applySuggestion(s: VehicleSuggestion) {
        onChange({
            plate: s.licensePlate || value.plate,
            vin: s.vin || value.vin,
            make: value.make || s.brand,
            model: value.model || s.model,
        });
        setPlateQuery('');
        setVinQuery('');
        plate.setOpen(false);
        vin.setOpen(false);
    }

    async function handleVinPhoto(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setVinScanning(true);
        try {
            const read = await batchOrderApi.extractVin(file);
            if (read) onChange({ vin: read });
            else onError('Nie udało się odczytać VIN ze zdjęcia. Spróbuj ponownie albo wpisz go ręcznie.');
        } catch {
            onError('Błąd podczas analizy zdjęcia VIN. Spróbuj ponownie.');
        } finally {
            setVinScanning(false);
        }
    }

    return (
        <>
            <FormGrid $columns={2}>
                <FormField>
                    <FieldLabel htmlFor="entry-date">Data wykonania</FieldLabel>
                    <InputShell>
                        <BareInput
                            id="entry-date"
                            type="date"
                            required
                            disabled={disabled}
                            value={value.serviceDate}
                            onChange={e => onChange({ serviceDate: e.target.value })}
                        />
                    </InputShell>
                </FormField>
                <FormField>
                    <FieldLabel htmlFor="entry-plate">Tablica rejestracyjna</FieldLabel>
                    <Autocomplete ref={plateRef}>
                        <InputShell>
                            <BareInput
                                id="entry-plate"
                                value={value.plate}
                                disabled={disabled}
                                onChange={e => {
                                    const v = e.target.value.toUpperCase();
                                    onChange({ plate: v });
                                    setPlateQuery(v);
                                }}
                                onFocus={() => plate.items.length > 0 && plate.setOpen(true)}
                                placeholder="np. WA12345"
                                autoComplete="off"
                            />
                        </InputShell>
                        {plate.open && (
                            <SuggestionList>
                                {plate.items.map(s => (
                                    <SuggestionItem key={`${s.licensePlate}-${s.vin ?? ''}`} onMouseDown={() => applySuggestion(s)}>
                                        <strong>{s.licensePlate}</strong>
                                        <span>{[s.brand, s.model].filter(Boolean).join(' ')}</span>
                                    </SuggestionItem>
                                ))}
                            </SuggestionList>
                        )}
                    </Autocomplete>
                </FormField>
                <FormField>
                    <FieldLabel>Marka</FieldLabel>
                    <BrandSelect
                        value={value.make}
                        onChange={(brand) => onChange({ make: brand, model: '' })}
                        placeholder="np. BMW"
                    />
                </FormField>
                <FormField>
                    <FieldLabel>Model</FieldLabel>
                    <ModelSelect
                        brand={value.make}
                        value={value.model}
                        onChange={(model) => onChange({ model })}
                        placeholder="np. X5"
                    />
                </FormField>
            </FormGrid>

            <FormField>
                <FieldLabel htmlFor="entry-vin">VIN</FieldLabel>
                <Autocomplete ref={vinRef}>
                    <InputShell>
                        <BareInput
                            id="entry-vin"
                            value={value.vin}
                            disabled={disabled}
                            onChange={e => {
                                const v = e.target.value.toUpperCase();
                                onChange({ vin: v });
                                setVinQuery(v);
                            }}
                            onFocus={() => vin.items.length > 0 && vin.setOpen(true)}
                            placeholder="17 znaków"
                            maxLength={17}
                            autoComplete="off"
                            style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                        />
                        <CameraBtn
                            type="button"
                            title="Odczytaj VIN ze zdjęcia"
                            aria-label="Odczytaj VIN ze zdjęcia"
                            disabled={disabled || vinScanning}
                            onClick={() => fileRef.current?.click()}
                        >
                            <Camera />
                        </CameraBtn>
                    </InputShell>
                    {vin.open && (
                        <SuggestionList>
                            {vin.items.map(s => (
                                <SuggestionItem key={`${s.vin ?? ''}-${s.licensePlate}`} onMouseDown={() => applySuggestion(s)}>
                                    <strong>{s.vin}</strong>
                                    <span>{[s.brand, s.model, s.licensePlate].filter(Boolean).join(' · ')}</span>
                                </SuggestionItem>
                            ))}
                        </SuggestionList>
                    )}
                </Autocomplete>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={handleVinPhoto} />
            </FormField>
        </>
    );
}
