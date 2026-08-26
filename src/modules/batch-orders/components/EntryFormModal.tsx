import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
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
import { MAX_2_DECIMALS, centsToInput, inputToCents, handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { netToGross, grossToNet } from '@/common/utils/priceAdjustment';
import { formatCurrency } from '@/common/utils';
import { batchOrderApi } from '../api/batchOrderApi';
import { useVisualViewportSheet } from '@/common/hooks';
import { useBatchServices } from '../hooks/useBatchOrders';
import type { BatchOrderEntry, BatchService, EntryRequest, ServiceItemRequest, VehicleSuggestion } from '../types';

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

    @media (hover: none) and (pointer: coarse) {
        min-height: 44px;
    }
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

    @media (max-width: 360px) {
        grid-template-columns: 1fr 1fr;

        /* VAT select spans full width on very small screens */
        > :last-child { grid-column: 1 / -1; }
    }
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

    @media (hover: none) and (pointer: coarse) {
        min-height: 44px;
    }
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

    @media (hover: none) and (pointer: coarse) {
        min-height: 44px;
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
    max-height: min(200px, 35dvh);
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
    min-height: 40px;
    transition: background 100ms ease;

    &:hover { background: #f8fafc; }

    strong { font-weight: 700; font-family: monospace; letter-spacing: 0.04em; }
    span { color: #64748b; font-size: 13px; overflow-wrap: anywhere; min-width: 0; }

    @media (hover: none) and (pointer: coarse) {
        min-height: 48px;
        align-items: center;
    }
`;

/**
 * The service list is positioned against the viewport and portalled to <body>.
 *
 * The plate and VIN lists sit inside the scrolling modal body, which is survivable
 * for a field near the top; the service rows are the last thing in a long form, so
 * an absolutely-positioned list there gets cut off by the scroll container exactly
 * when it is needed. Same trick as the check-in service picker.
 */
const FixedSuggestionList = styled(SuggestionList)`
    position: fixed;
    right: auto;
    top: auto;
    z-index: 3000;
`;

/* ─── Telefon: pełnoekranowy arkusz zamiast listy przyklejonej do pola ────────
 *
 * Lista pozycjonowana do inputa jest na telefonie nie do użycia: pole usług
 * leży na końcu długiego formularza, klawiatura zabiera pół ekranu, a lista
 * i tak wchodziła na pola cen. Ten sam wzorzec co picker usług przy wizycie
 * (ServiceInlineRow): arkusz na całą widoczną wysokość, z własnym polem
 * wyszukiwania i listą, śledzący visualViewport. */
const SheetBackdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 3400;
    background: rgba(15, 23, 42, 0.35);
`;

const Sheet = styled.div`
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 3401;
    background: #fff;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding-top: env(safe-area-inset-top);
`;

const SheetHandle = styled.div`
    width: 36px;
    height: 4px;
    background: #e2e8f0;
    border-radius: 2px;
    margin: 10px auto 0;
    flex-shrink: 0;
`;

const SheetHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 4px 8px 4px 16px;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    border-bottom: 1px solid #f1f5f9;
    flex-shrink: 0;
`;

/** Arkusz zakrywa cały ekran, więc to jedyne wyjście na telefonie. */
const SheetClose = styled.button`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    svg { width: 20px; height: 20px; }
    &:active { background: #f1f5f9; color: #0f172a; }
`;

const SheetSearchWrap = styled.div`
    padding: 10px 16px;
    border-bottom: 1px solid #f1f5f9;
    flex-shrink: 0;
`;

const SheetSearchInput = styled.input`
    width: 100%;
    box-sizing: border-box;
    min-height: 44px;
    padding: 11px 16px;
    /* 16px: mniejszy font każe iOS-owi przybliżyć stronę przy wejściu w pole. */
    font-size: 16px;
    font-family: inherit;
    color: #0f172a;
    background: #f8fafc;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    outline: none;

    &:focus {
        border-color: #0ea5e9;
        background: #fff;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
    }
`;

const SheetList = styled.div`
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    /* Zapas pod ostatnią pozycją: margines telefonu plus wysokość klawiatury
       (--kb-inset z useVisualViewportSheet), zamiast kurczenia arkusza. */
    padding-bottom: calc(env(safe-area-inset-bottom) + var(--kb-inset, 0px));
`;

const SheetItem = styled.button`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    border: none;
    border-bottom: 1px solid #f1f5f9;
    background: transparent;
    font-family: inherit;
    font-size: 14px;
    text-align: left;
    color: #0f172a;
    cursor: pointer;

    &:active { background: #f8fafc; }
`;

const SheetItemPrice = styled.span`
    flex-shrink: 0;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
`;

const SheetEmpty = styled.div`
    padding: 28px 16px;
    text-align: center;
    color: #94a3b8;
    font-size: 13px;
`;

/** Service suggestions carry a price, so they need two columns rather than the
 *  plate list's "code + description" shape. */
const ServiceSuggestionItem = styled(SuggestionItem)`
    justify-content: space-between;
    align-items: center;
    gap: 12px;
`;

const ServiceSuggestionName = styled.span`
    color: #0f172a;
    font-size: 14px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ServiceSuggestionPrice = styled.span`
    flex-shrink: 0;
    font-size: 12.5px;
    color: #64748b;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
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
        netDisplay: centsToInput(svc.netAmountCents),
        grossDisplay: centsToInput(svc.grossAmountCents),
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

    // The module's own service catalog, fetched once and filtered locally: it is a short
    // per-studio list, and a request per keystroke would lag behind the typing it is
    // meant to shortcut.
    const { data: catalog } = useBatchServices();
    const [suggestFor, setSuggestFor] = useState<number | null>(null);
    const [suggestStyle, setSuggestStyle] = useState<React.CSSProperties>({});
    // Telefon obsługujemy pełnoekranowym arkuszem, nie listą przy polu.
    const [isMobile] = useState(() => window.innerWidth < 768);
    const [sheetQuery, setSheetQuery] = useState('');
    const sheetRef = useRef<HTMLDivElement>(null);
    const sheetInputRef = useRef<HTMLInputElement>(null);
    const servicesRef = useRef<HTMLDivElement>(null);
    const suggestAnchorRef = useRef<HTMLInputElement | null>(null);
    const suggestListRef = useRef<HTMLUListElement>(null);

    /** Anchors the list to the input, opening upward when the room is above. */
    const positionSuggestions = useCallback(() => {
        const el = suggestAnchorRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const below = viewportHeight - rect.bottom - 12;
        const above = rect.top - 12;
        const openUp = below < 140 && above > below;
        setSuggestStyle({
            left: rect.left,
            width: rect.width,
            maxHeight: Math.min(220, Math.max(120, openUp ? above : below)),
            ...(openUp
                ? { bottom: viewportHeight - rect.top + 4 }
                : { top: rect.bottom + 4 }),
        });
    }, []);

    useEffect(() => {
        if (suggestFor === null || isMobile) return;
        positionSuggestions();

        function handleClick(e: MouseEvent) {
            const target = e.target as Node;
            const insideSection = servicesRef.current?.contains(target);
            const insideList = suggestListRef.current?.contains(target);
            if (!insideSection && !insideList) setSuggestFor(null);
        }
        // The list is fixed to the viewport, so it has to follow its anchor rather
        // than ride along with the modal's scroll.
        window.addEventListener('scroll', positionSuggestions, true);
        window.addEventListener('resize', positionSuggestions);
        window.visualViewport?.addEventListener('resize', positionSuggestions);
        document.addEventListener('mousedown', handleClick);
        return () => {
            window.removeEventListener('scroll', positionSuggestions, true);
            window.removeEventListener('resize', positionSuggestions);
            window.visualViewport?.removeEventListener('resize', positionSuggestions);
            document.removeEventListener('mousedown', handleClick);
        };
    }, [suggestFor, positionSuggestions, isMobile]);

    function openSuggestions(idx: number, input: HTMLInputElement | null) {
        suggestAnchorRef.current = input;
        setSuggestFor(idx);
        if (isMobile) {
            setSheetQuery(services[idx]?.name ?? '');
            // Focus przenosimy po zamontowaniu arkusza, inaczej klawiatura
            // zdąży się schować razem z blurem pola w formularzu.
            requestAnimationFrame(() => sheetInputRef.current?.focus());
        }
    }

    useVisualViewportSheet(isMobile && suggestFor !== null, sheetRef);

    function suggestionsFor(query: string): BatchService[] {
        const q = query.trim().toLowerCase();
        if (!catalog?.length) return [];
        // An empty field offers the whole catalog (capped): on a fresh row the operator
        // usually wants to pick, not to type.
        const matches = q ? catalog.filter(s => s.name.toLowerCase().includes(q)) : catalog;
        // An exact hit means the field is already what it would be set to; keeping the
        // list open there would cover the price fields the operator is moving to next.
        if (matches.length === 1 && matches[0].name.toLowerCase() === q) return [];
        return matches.slice(0, 8);
    }

    function applySuggestion(idx: number, service: BatchService) {
        updateService(idx, {
            name: service.name,
            netDisplay: centsToInput(service.netAmountCents),
            grossDisplay: centsToInput(service.grossAmountCents),
            vatRate: service.vatRate,
        });
        setSuggestFor(null);
    }

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

    // Net drives gross and gross drives net, through the same helpers the visit service
    // editor uses — including for ZW (vatRate -1), where the two are equal. The previous
    // `vatRate >= 0` guard left the other field stale on a ZW position, so a service
    // exempt from VAT could be saved with a gross that disagreed with its net.
    function updateNet(idx: number, val: string) {
        if (!MAX_2_DECIMALS.test(val)) return;
        const { vatRate } = services[idx];
        const gross = netToGross(inputToCents(val), vatRate);
        updateService(idx, {
            netDisplay: val,
            grossDisplay: val === '' ? '' : centsToInput(gross),
        });
    }

    function updateGross(idx: number, val: string) {
        if (!MAX_2_DECIMALS.test(val)) return;
        const { vatRate } = services[idx];
        const net = grossToNet(inputToCents(val), vatRate);
        updateService(idx, {
            grossDisplay: val,
            netDisplay: val === '' ? '' : centsToInput(net),
        });
    }

    // A VAT change keeps net and re-derives gross: net is the figure the contract is
    // written in, so it is the one that should survive.
    function updateVat(idx: number, vatRate: number) {
        const { netDisplay } = services[idx];
        const gross = netToGross(inputToCents(netDisplay), vatRate);
        updateService(idx, {
            vatRate,
            grossDisplay: netDisplay === '' ? '' : centsToInput(gross),
        });
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
                    netAmountCents: inputToCents(s.netDisplay),
                    grossAmountCents: inputToCents(s.grossDisplay),
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
                    <div ref={servicesRef} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {services.map((svc, idx) => {
                            const suggestions = suggestFor === idx ? suggestionsFor(svc.name) : [];
                            return (
                            <ServiceCard key={idx}>
                                <ServiceCardHeader>
                                    <AutocompleteWrapper style={{ flex: 1, minWidth: 0 }}>
                                        <ServiceNameInput
                                            value={svc.name}
                                            onChange={e => {
                                                updateService(idx, { name: capitalizeFirst(e.target.value) });
                                                openSuggestions(idx, e.currentTarget);
                                            }}
                                            onFocus={e => openSuggestions(idx, e.currentTarget)}
                                            placeholder={`Nazwa usługi ${idx + 1}...`}
                                            autoComplete="off"
                                            style={{ width: '100%' }}
                                        />
                                        {!isMobile && suggestions.length > 0 && createPortal(
                                            <FixedSuggestionList ref={suggestListRef} style={suggestStyle}>
                                                {suggestions.map(s => (
                                                    <ServiceSuggestionItem
                                                        key={s.id}
                                                        // mousedown, not click: the input's blur must not
                                                        // tear the list down before the choice lands.
                                                        onMouseDown={() => applySuggestion(idx, s)}
                                                    >
                                                        <ServiceSuggestionName>{s.name}</ServiceSuggestionName>
                                                        <ServiceSuggestionPrice>
                                                            {formatCurrency(s.grossAmountCents / 100)} brutto
                                                        </ServiceSuggestionPrice>
                                                    </ServiceSuggestionItem>
                                                ))}
                                            </FixedSuggestionList>,
                                            document.body
                                        )}
                                        {isMobile && suggestFor === idx && createPortal(
                                            <>
                                                <SheetBackdrop onClick={() => setSuggestFor(null)} />
                                                <Sheet ref={sheetRef}>
                                                    <SheetHandle />
                                                    <SheetHeader>
                                                        <span>Wybierz usługę</span>
                                                        <SheetClose
                                                            type="button"
                                                            aria-label="Zamknij"
                                                            onClick={() => setSuggestFor(null)}
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                                <line x1="6" y1="6" x2="18" y2="18" />
                                                            </svg>
                                                        </SheetClose>
                                                    </SheetHeader>
                                                    <SheetSearchWrap>
                                                        <SheetSearchInput
                                                            ref={sheetInputRef}
                                                            value={sheetQuery}
                                                            onChange={e => {
                                                                const text = capitalizeFirst(e.target.value);
                                                                setSheetQuery(text);
                                                                // Wpisana treść od razu ląduje w wierszu, więc
                                                                // zamknięcie arkusza nie gubi nazwy własnej usługi.
                                                                updateService(idx, { name: text });
                                                            }}
                                                            placeholder="Szukaj usługi..."
                                                            autoComplete="off"
                                                        />
                                                    </SheetSearchWrap>
                                                    <SheetList>
                                                        {suggestionsFor(sheetQuery).map(s => (
                                                            <SheetItem
                                                                key={s.id}
                                                                type="button"
                                                                onClick={() => applySuggestion(idx, s)}
                                                            >
                                                                <span>{s.name}</span>
                                                                <SheetItemPrice>
                                                                    {formatCurrency(s.grossAmountCents / 100)} brutto
                                                                </SheetItemPrice>
                                                            </SheetItem>
                                                        ))}
                                                        {suggestionsFor(sheetQuery).length === 0 && (
                                                            <SheetEmpty>
                                                                {sheetQuery.trim()
                                                                    ? 'Brak usługi w katalogu — zostanie zapisana jako wpisana ręcznie.'
                                                                    : 'Katalog usług jest pusty.'}
                                                            </SheetEmpty>
                                                        )}
                                                    </SheetList>
                                                </Sheet>
                                            </>,
                                            document.body
                                        )}
                                    </AutocompleteWrapper>
                                    {services.length > 1 && (
                                        <RemoveBtn type="button" onClick={() => removeService(idx)}>✕</RemoveBtn>
                                    )}
                                </ServiceCardHeader>
                                <PriceGrid>
                                    <PriceField>
                                        <PriceLabel>Netto (zł)</PriceLabel>
                                        <PriceInput
                                            type="text"
                                            inputMode="decimal"
                                            value={svc.netDisplay}
                                            onChange={e => updateNet(idx, e.target.value)}
                                            onKeyDown={handleZeroAwareKeyDown(svc.netDisplay, val => updateNet(idx, val))}
                                            placeholder="0,00"
                                        />
                                    </PriceField>
                                    <PriceField>
                                        <PriceLabel>Brutto (zł)</PriceLabel>
                                        <PriceInput
                                            type="text"
                                            inputMode="decimal"
                                            value={svc.grossDisplay}
                                            onChange={e => updateGross(idx, e.target.value)}
                                            onKeyDown={handleZeroAwareKeyDown(svc.grossDisplay, val => updateGross(idx, val))}
                                            placeholder="0,00"
                                        />
                                    </PriceField>
                                    <PriceField>
                                        <PriceLabel>VAT</PriceLabel>
                                        <PriceSelect
                                            value={svc.vatRate}
                                            onChange={e => updateVat(idx, Number(e.target.value))}
                                        >
                                            {VAT_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </PriceSelect>
                                    </PriceField>
                                </PriceGrid>
                            </ServiceCard>
                            );
                        })}
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
                            placeholder="Dodatkowe uwagi..."
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
