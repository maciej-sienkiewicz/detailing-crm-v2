import { useState } from 'react';
import styled from 'styled-components';
import { Loader2, Keyboard, ScanBarcode, Smartphone, ArrowRight } from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { Input, Label, FieldGroup, Select } from '@/common/components/Form';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { UNIT_LABELS } from '../types';
import type {
    CreateProductRequest, ProductDraft, UnitOfMeasure, PriceDirection, VatRate,
} from '../types';
import { normalizeGtin } from '../utils/gtin';
import { netToGross, grossToNet } from '@/common/utils/priceAdjustment';
import { productsApi } from '../api/productsApi';
import { useCreateProduct, useCreateFromDraft } from '../hooks/useProducts';
import { ScanHandoffPanel } from './ScanHandoffPanel';

type Mode = 'manual' | 'barcode' | 'phone';

// Przełącznik ścieżki wejścia — trzy drogi, JEDEN formularz. To nie remis: przełącznik
// tylko wybiera, skąd wziąć wartości początkowe (CLAUDE.md §2).
const ModeTabs = styled.div` display: flex; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; `;
const ModeTab = styled.button<{ $active: boolean }>`
    flex: 1 1 0; min-width: 120px;
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 10px 12px; font-family: inherit; font-size: 13px; font-weight: 600;
    border-radius: ${st.radiusSm}; cursor: pointer;
    border: 1px solid ${p => (p.$active ? st.accentBlue : st.border)};
    background: ${p => (p.$active ? st.accentBlueDim : st.bgCard)};
    color: ${p => (p.$active ? st.accentBlue : st.textSecondary)};
`;
const BarcodeRow = styled.div` display: flex; gap: 8px; align-items: flex-end; `;
const FetchBtn = styled(SharedButton)` flex-shrink: 0; `;
const StatusLine = styled.p<{ $tone: 'muted' | 'error' | 'ok' }>`
    margin: 6px 0 0; font-size: 12.5px;
    color: ${p => (p.$tone === 'error' ? st.accentRed : p.$tone === 'ok' ? '#047857' : st.textMuted)};
`;
const Grid2 = styled.div` display: grid; grid-template-columns: 1fr 1fr; gap: 12px; @media (max-width: 560px) { grid-template-columns: 1fr; } `;
const DraftBanner = styled.div`
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    padding: 10px 12px; border-radius: ${st.radiusSm};
    background: ${st.bgAccentAmber}; border: 1px solid rgba(245,158,11,0.35);
    font-size: 12.5px; color: #92400e; margin-bottom: 4px;
`;
const Spin = styled(Loader2)` animation: spin 1s linear infinite; @keyframes spin { to { transform: rotate(360deg); } } `;

const UNITS = Object.keys(UNIT_LABELS) as UnitOfMeasure[];
const VATS: VatRate[] = [23, 8, 5, 0, -1];

interface FormState {
    gtin: string;
    name: string;
    brand: string;
    manufacturerName: string;
    unitOfMeasure: UnitOfMeasure;
    packageSizeValue: string;
    packageSizeUnit: UnitOfMeasure;
    description: string;
    supplierName: string;
    priceValue: string;       // złotówki jako tekst
    priceDirection: PriceDirection;
    vatRate: VatRate;
}

const EMPTY: FormState = {
    gtin: '', name: '', brand: '', manufacturerName: '',
    unitOfMeasure: 'ML', packageSizeValue: '', packageSizeUnit: 'ML',
    description: '', supplierName: '', priceValue: '', priceDirection: 'GROSS', vatRate: 23,
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    canSeeCosts: boolean;
    onCreated: (id: string) => void;
}

export function AddProductModal({ isOpen, onClose, canSeeCosts, onCreated }: Props) {
    const [mode, setMode] = useState<Mode>('manual');
    const [form, setForm] = useState<FormState>(EMPTY);
    const [draft, setDraft] = useState<ProductDraft | null>(null);
    const [barcode, setBarcode] = useState('');
    const [looking, setLooking] = useState(false);
    const [lookupMsg, setLookupMsg] = useState<{ tone: 'muted' | 'error' | 'ok'; text: string } | null>(null);
    const create = useCreateProduct();
    const createFromDraft = useCreateFromDraft();

    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

    const applyDraftToForm = (d: ProductDraft) => {
        setForm(f => ({
            ...f,
            gtin: d.gtin ?? '',
            name: d.name,
            brand: d.brand,
            manufacturerName: d.manufacturerName,
            unitOfMeasure: d.unitOfMeasure,
            packageSizeValue: d.packageSizeValue,
            packageSizeUnit: d.packageSizeUnit,
            description: d.description ?? '',
        }));
    };

    const runLookup = async (code: string) => {
        const normalized = normalizeGtin(code);
        if (!normalized) {
            setLookupMsg({ tone: 'error', text: 'Niepoprawny kod — suma kontrolna się nie zgadza.' });
            return;
        }
        setLooking(true);
        setLookupMsg({ tone: 'muted', text: 'Sprawdzam w bazie i pytam AI…' });
        try {
            const res = await productsApi.lookup(normalized);
            if (res.status === 'FOUND_LOCAL' && res.product) {
                setLookupMsg({ tone: 'ok', text: 'Produkt jest już w katalogu — otwieram jego kartę.' });
                onCreated(res.product.id);
                return;
            }
            if (res.status === 'RESOLVED' && res.draft) {
                setDraft(res.draft);
                applyDraftToForm(res.draft);
                setLookupMsg({ tone: 'ok', text: 'Rozpoznano — sprawdź dane z etykietą i zapisz.' });
                return;
            }
            setLookupMsg({ tone: 'muted', text: 'Nie znaleziono. Uzupełnij dane ręcznie — kod został zapisany.' });
            set('gtin', normalized);
        } catch {
            setLookupMsg({ tone: 'error', text: 'Nie udało się pobrać danych. Uzupełnij ręcznie.' });
            set('gtin', normalized);
        } finally {
            setLooking(false);
        }
    };

    const priceInput = () => {
        if (!canSeeCosts || !form.priceValue.trim()) return null;
        const zl = parseFloat(form.priceValue.replace(',', '.'));
        if (isNaN(zl) || zl < 0) return null;
        const cents = Math.round(zl * 100);
        const net = form.priceDirection === 'NET' ? cents : grossToNet(cents, form.vatRate);
        const gross = form.priceDirection === 'GROSS' ? cents : netToGross(cents, form.vatRate);
        return {
            unitPriceNet: net,
            unitPriceGross: gross,
            priceEnteredAs: form.priceDirection,
            vatRate: form.vatRate,
        };
    };

    const submit = async () => {
        // Ścieżka rozpoznana zewnętrznie: zapis kartą z draftu (zachowuje pochodzenie).
        if (draft) {
            const saved = await createFromDraft.mutateAsync({
                ...draft,
                name: form.name.trim(),
                brand: form.brand.trim(),
                manufacturerName: form.manufacturerName.trim() || form.brand.trim(),
                unitOfMeasure: form.unitOfMeasure,
                packageSizeValue: form.packageSizeValue.trim(),
                packageSizeUnit: form.packageSizeUnit,
                description: form.description.trim() || null,
            });
            // Cena i dostawca to nakładka studia — dołóż osobnym zapisem, jeśli podano.
            if (canSeeCosts && (priceInput() || form.supplierName.trim())) {
                await productsApi.updateStudio(saved.id, {
                    supplierName: form.supplierName.trim() || null,
                    isFavourite: false, isHidden: false, price: priceInput(),
                });
            }
            onCreated(saved.id);
            return;
        }
        const req: CreateProductRequest = {
            gtin: normalizeGtin(form.gtin),
            name: form.name.trim(),
            brand: form.brand.trim(),
            manufacturerName: form.manufacturerName.trim() || null,
            unitOfMeasure: form.unitOfMeasure,
            packageSizeValue: form.packageSizeValue.trim(),
            packageSizeUnit: form.packageSizeUnit,
            description: form.description.trim() || null,
            supplierName: form.supplierName.trim() || null,
            price: priceInput(),
        };
        const saved = await create.mutateAsync(req);
        onCreated(saved.id);
    };

    const canSubmit = form.name.trim().length >= 2 && form.brand.trim() && form.packageSizeValue.trim();
    // Krok następny zależy od stanu: przed pobraniem to „Pobierz dane", po — to zapis.
    // W oknie edytora tylko jeden przycisk jest wypełniony (wyjątek „otwarty edytor").
    const showFetchAsPrimary = mode === 'barcode' && !draft && !form.name.trim();

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="720px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Nowy produkt</ModalTitle>
                    <ModalSubtitle>Wpisz ręcznie, pobierz z kodu albo zeskanuj telefonem</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <ModeTabs>
                    <ModeTab type="button" $active={mode === 'manual'} onClick={() => setMode('manual')}>
                        <Keyboard size={16} /> Ręcznie
                    </ModeTab>
                    <ModeTab type="button" $active={mode === 'barcode'} onClick={() => setMode('barcode')}>
                        <ScanBarcode size={16} /> Kod kreskowy
                    </ModeTab>
                    <ModeTab type="button" $active={mode === 'phone'} onClick={() => setMode('phone')}>
                        <Smartphone size={16} /> Skanuj telefonem
                    </ModeTab>
                </ModeTabs>

                {mode === 'barcode' && (
                    <FieldGroup>
                        <Label>Kod kreskowy (GTIN)</Label>
                        <BarcodeRow>
                            <Input
                                autoFocus
                                placeholder="np. 5901234123457"
                                value={barcode}
                                onChange={e => setBarcode(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') runLookup(barcode); }}
                            />
                            <FetchBtn
                                type="button"
                                $variant={showFetchAsPrimary ? 'primary' : 'secondary'}
                                onClick={() => runLookup(barcode)}
                                disabled={looking || !barcode.trim()}
                            >
                                {looking ? <Spin size={16} /> : <ArrowRight size={16} />} Pobierz dane
                            </FetchBtn>
                        </BarcodeRow>
                        {lookupMsg && <StatusLine $tone={lookupMsg.tone}>{lookupMsg.text}</StatusLine>}
                    </FieldGroup>
                )}

                {mode === 'phone' && (
                    <ScanHandoffPanel onCodes={codes => { if (codes.length) { setMode('barcode'); setBarcode(codes[codes.length - 1]); runLookup(codes[codes.length - 1]); } }} />
                )}

                {(mode === 'manual' || mode === 'barcode') && (
                    <>
                        {draft && (
                            <DraftBanner>
                                Sprawdź dane z etykietą przed zapisaniem — pochodzą z automatycznego rozpoznania.
                            </DraftBanner>
                        )}
                        <FieldGroup>
                            <Label>Nazwa produktu *</Label>
                            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="np. Powłoka ceramiczna Pro" />
                        </FieldGroup>
                        <Grid2>
                            <FieldGroup>
                                <Label>Marka *</Label>
                                <Input value={form.brand} onChange={e => set('brand', e.target.value)} />
                            </FieldGroup>
                            <FieldGroup>
                                <Label>Producent</Label>
                                <Input value={form.manufacturerName} onChange={e => set('manufacturerName', e.target.value)} placeholder="jak marka, jeśli puste" />
                            </FieldGroup>
                        </Grid2>
                        <Grid2>
                            <FieldGroup>
                                <Label>Wielkość opakowania *</Label>
                                <Input value={form.packageSizeValue} onChange={e => set('packageSizeValue', e.target.value)} placeholder="np. 50" inputMode="decimal" />
                            </FieldGroup>
                            <FieldGroup>
                                <Label>Jednostka</Label>
                                <Select value={form.packageSizeUnit} onChange={e => set('packageSizeUnit', e.target.value as UnitOfMeasure)}>
                                    {UNITS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                                </Select>
                            </FieldGroup>
                        </Grid2>
                        {canSeeCosts && (
                            <Grid2>
                                <FieldGroup>
                                    <Label>Cena jednostkowa (zł)</Label>
                                    <Input value={form.priceValue} onChange={e => set('priceValue', e.target.value)} placeholder="opcjonalnie" inputMode="decimal" />
                                </FieldGroup>
                                <FieldGroup>
                                    <Label>Rodzaj / VAT</Label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <Select value={form.priceDirection} onChange={e => set('priceDirection', e.target.value as PriceDirection)}>
                                            <option value="GROSS">brutto</option>
                                            <option value="NET">netto</option>
                                        </Select>
                                        <Select value={String(form.vatRate)} onChange={e => set('vatRate', Number(e.target.value) as VatRate)}>
                                            {VATS.map(v => <option key={v} value={v}>{v === -1 ? 'zw.' : `${v}%`}</option>)}
                                        </Select>
                                    </div>
                                </FieldGroup>
                            </Grid2>
                        )}
                        {canSeeCosts && (
                            <FieldGroup>
                                <Label>Dostawca</Label>
                                <Input value={form.supplierName} onChange={e => set('supplierName', e.target.value)} placeholder="u kogo kupujecie — opcjonalnie" />
                            </FieldGroup>
                        )}
                        <FieldGroup>
                            <Label>Opis / notatka</Label>
                            <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="opcjonalnie" />
                        </FieldGroup>
                    </>
                )}
            </ModalContent>
            <ModalFooter>
                <SharedButton type="button" $variant="ghost" onClick={onClose}>Anuluj</SharedButton>
                {(mode === 'manual' || mode === 'barcode') && (
                    <SharedButton
                        type="button"
                        $variant="primary"
                        onClick={submit}
                        disabled={!canSubmit || create.isPending || createFromDraft.isPending}
                    >
                        {(create.isPending || createFromDraft.isPending) ? <Spin size={16} /> : null} Dodaj produkt
                    </SharedButton>
                )}
            </ModalFooter>
        </ModalShell>
    );
}
