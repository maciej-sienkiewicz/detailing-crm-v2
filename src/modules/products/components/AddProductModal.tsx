import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Loader2, Camera, X } from 'lucide-react';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import { Input, Label, FieldGroup, Select, InputShell, BareInput } from '@/common/components/Form';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import { useBreakpoint } from '@/common/hooks/useBreakpoint';
import { UNIT_LABELS } from '../types';
import type {
    CreateProductRequest, ProductDraft, UnitOfMeasure, PriceDirection, VatRate,
} from '../types';
import { normalizeGtin } from '../utils/gtin';
import { netToGross, grossToNet } from '@/common/utils/priceAdjustment';
import { productsApi } from '../api/productsApi';
import { useCreateProduct, useCreateFromDraft } from '../hooks/useProducts';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { ScanHandoffPanel } from './ScanHandoffPanel';

// Jeden formularz, bez zakładek. Kod kreskowy jest opcjonalnym polem u góry:
// „Pobierz dane" rozpoznaje produkt po kodzie, a ikona aparatu na desktopie pokazuje
// kod QR do zeskanowania telefonem, a na telefonie otwiera aparat od razu.
// W oknie edytora tylko JEDEN przycisk jest wypełniony — „Dodaj produkt" w stopce
// (wyjątek „otwarty edytor", CLAUDE.md §2). „Pobierz dane" i aparat noszą odcień
// akcji bez wypełnienia.

// Przyciski „wmontowane" w pole — wzorzec z NipInputWithGus: siedzą wewnątrz
// InputShell, oddzielone kreską po lewej, prawy dostaje zaokrąglenie rogu pola.
const InFieldBtn = styled.button`
    display: flex; align-items: center; gap: 6px;
    padding: 0 14px; align-self: stretch;
    border: none; border-left: 1px solid #e2e8f0; background: none;
    font-family: inherit; font-size: 12px; font-weight: 600;
    color: var(--brand-primary); cursor: pointer; white-space: nowrap; flex-shrink: 0;
    transition: background 0.15s ease;
    &:hover:not(:disabled) { background: #f0f9ff; }
    &:disabled { color: #94a3b8; cursor: not-allowed; }
`;
const InFieldIconBtn = styled(InFieldBtn)`
    padding: 0 12px;
    border-radius: 0 10px 10px 0;
`;
const StatusLine = styled.p<{ $tone: 'muted' | 'error' | 'ok' }>`
    margin: 6px 0 0; font-size: 12.5px;
    color: ${p => (p.$tone === 'error' ? st.accentRed : p.$tone === 'ok' ? '#047857' : st.textMuted)};
`;
const ScanArea = styled.div`
    margin-top: 10px; padding: 14px;
    border: 1px solid ${st.border}; border-radius: ${st.radiusSm}; background: ${st.bgCardAlt};
    position: relative;
`;
const ScanClose = styled.button`
    position: absolute; top: 8px; right: 8px;
    background: none; border: none; color: ${st.textMuted}; cursor: pointer; padding: 4px;
    &:hover { color: ${st.text}; }
`;
const Video = styled.video`
    width: 100%; max-height: 320px; aspect-ratio: 3/4; object-fit: cover;
    background: #000; border-radius: ${st.radiusSm}; border: 1px solid ${st.border};
`;
const CaptureBtn = styled.button`
    margin-top: 10px; width: 100%;
    padding: 12px; font-family: inherit; font-size: 14px; font-weight: 700;
    color: ${st.accentBlue}; background: ${st.bgCard}; border: 1px solid ${st.accentBlue};
    border-radius: ${st.radiusSm}; cursor: pointer;
    &:hover { background: ${st.accentBlueDim}; }
`;
const ScanHint = styled.p` margin: 0 0 4px; font-size: 12.5px; color: ${st.textSecondary}; `;
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
    const isDesktop = useBreakpoint('lg');
    const [form, setForm] = useState<FormState>(EMPTY);
    const [draft, setDraft] = useState<ProductDraft | null>(null);
    const [barcode, setBarcode] = useState('');
    const [looking, setLooking] = useState(false);
    const [lookupMsg, setLookupMsg] = useState<{ tone: 'muted' | 'error' | 'ok'; text: string } | null>(null);
    const [scanOpen, setScanOpen] = useState(false);
    const create = useCreateProduct();
    const createFromDraft = useCreateFromDraft();
    const scanner = useBarcodeScanner();

    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

    // Aparat uruchamiamy tylko na telefonie (desktop pokazuje kod QR do handoffu).
    useEffect(() => {
        if (scanOpen && !isDesktop) scanner.start();
        if (!scanOpen) scanner.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanOpen, isDesktop]);

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

    // Telefon: pojedyncze zdjęcie z aparatu → wykrycie kodu → pobranie danych.
    const captureFromCamera = async () => {
        const code = await scanner.capture();
        if (code) {
            setBarcode(code);
            setScanOpen(false);
            runLookup(code);
        } else {
            setLookupMsg({ tone: 'error', text: 'Nie wykryto kodu — ustaw go w kadrze i spróbuj ponownie.' });
        }
    };

    // Desktop: kody zeskanowane telefonem wracają po WebSocketcie.
    const onHandoffCodes = (codes: string[]) => {
        if (!codes.length) return;
        const last = codes[codes.length - 1];
        setBarcode(last);
        setScanOpen(false);
        runLookup(last);
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
            gtin: normalizeGtin(form.gtin || barcode),
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

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} maxWidth="720px">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Nowy produkt</ModalTitle>
                    <ModalSubtitle>Wpisz dane; opcjonalnie podaj kod kreskowy, aby pobrać je automatycznie</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                {/* Kod kreskowy — pole opcjonalne z pobraniem danych i aparatem */}
                <FieldGroup>
                    <Label>Kod kreskowy (opcjonalnie)</Label>
                    <InputShell>
                        <BareInput
                            placeholder="np. 5901234123457"
                            value={barcode}
                            onChange={e => setBarcode(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') runLookup(barcode); }}
                        />
                        <InFieldBtn
                            type="button"
                            onClick={() => runLookup(barcode)}
                            disabled={looking || !barcode.trim()}
                            title="Pobierz dane produktu po kodzie"
                        >
                            {looking ? <Spin size={13} /> : null}
                            {looking ? 'Pobieranie…' : 'Pobierz dane'}
                        </InFieldBtn>
                        <InFieldIconBtn
                            type="button"
                            onClick={() => setScanOpen(o => !o)}
                            aria-label={isDesktop ? 'Zeskanuj telefonem' : 'Zeskanuj aparatem'}
                            title={isDesktop ? 'Zeskanuj telefonem (kod QR)' : 'Zeskanuj aparatem'}
                        >
                            <Camera size={16} />
                        </InFieldIconBtn>
                    </InputShell>
                    {lookupMsg && <StatusLine $tone={lookupMsg.tone}>{lookupMsg.text}</StatusLine>}

                    {scanOpen && (
                        <ScanArea>
                            <ScanClose type="button" onClick={() => setScanOpen(false)} aria-label="Zamknij skanowanie">
                                <X size={16} />
                            </ScanClose>
                            {isDesktop ? (
                                <ScanHandoffPanel onCodes={onHandoffCodes} />
                            ) : scanner.supported ? (
                                <>
                                    <ScanHint>Skieruj aparat na kod kreskowy produktu.</ScanHint>
                                    <Video ref={scanner.videoRef} playsInline muted />
                                    <CaptureBtn type="button" onClick={captureFromCamera}>Zeskanuj kod</CaptureBtn>
                                    {scanner.error && <StatusLine $tone="error">{scanner.error}</StatusLine>}
                                </>
                            ) : (
                                <ScanHint>
                                    Ta przeglądarka nie odczyta kodu z aparatu — wpisz kod kreskowy ręcznie w polu powyżej.
                                </ScanHint>
                            )}
                        </ScanArea>
                    )}
                </FieldGroup>

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
            </ModalContent>
            <ModalFooter>
                <SharedButton type="button" $variant="ghost" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton
                    type="button"
                    $variant="primary"
                    onClick={submit}
                    disabled={!canSubmit || create.isPending || createFromDraft.isPending}
                >
                    {(create.isPending || createFromDraft.isPending) ? <Spin size={16} /> : null} Dodaj produkt
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
}
