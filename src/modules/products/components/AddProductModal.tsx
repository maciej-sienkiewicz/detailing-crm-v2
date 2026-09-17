import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import styled from 'styled-components';
import { Loader2, Camera, X, ImageIcon } from 'lucide-react';
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
import { fileToCanvas, canvasToJpegFile } from '../utils/imageTools';
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
const ScanHint = styled.p` margin: 0 0 4px; font-size: 12.5px; color: ${st.textSecondary}; `;
// Zapas „zrób zdjęcie" na telefonie — akcja drugorzędna: odcień, bez wypełnienia (§2).
const PhotoBtn = styled.button`
    margin-top: 10px; width: 100%;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 11px; font-family: inherit; font-size: 13.5px; font-weight: 600;
    color: ${st.accentBlue}; background: ${st.bgCard}; border: 1px solid ${st.accentBlue};
    border-radius: ${st.radiusSm}; cursor: pointer;
    &:hover:not(:disabled) { background: ${st.accentBlueDim}; }
    &:disabled { opacity: 0.6; cursor: default; }
`;
const HiddenFile = styled.input` display: none; `;
const Grid2 = styled.div` display: grid; grid-template-columns: 1fr 1fr; gap: 12px; @media (max-width: 560px) { grid-template-columns: 1fr; } `;
const DraftBanner = styled.div`
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    padding: 10px 12px; border-radius: ${st.radiusSm};
    background: ${st.bgAccentAmber}; border: 1px solid rgba(245,158,11,0.35);
    font-size: 12.5px; color: #92400e; margin-bottom: 4px;
`;
// Cytowanie źródła MUSI być widoczne i klikalne, gdy pokazujemy dane z wyszukiwania
// w sieci — to wymóg dokumentacji OpenAI, nie ozdoba.
const SourceLink = styled.a`
    font-weight: 700; color: #92400e; text-decoration: underline; white-space: nowrap;
    &:hover { color: #78350f; }
`;
const Spin = styled(Loader2)` animation: spin 1s linear infinite; @keyframes spin { to { transform: rotate(360deg); } } `;

const UNITS = Object.keys(UNIT_LABELS) as UnitOfMeasure[];
const VATS: VatRate[] = [23, 8, 5, 0, -1];

interface FormState {
    gtin: string;
    name: string;
    brand: string;
    unitOfMeasure: UnitOfMeasure;
    packageSizeValue: string;
    packageSizeUnit: UnitOfMeasure;
    description: string;
    priceValue: string;       // złotówki jako tekst
    priceDirection: PriceDirection;
    vatRate: VatRate;
}

const EMPTY: FormState = {
    gtin: '', name: '', brand: '',
    unitOfMeasure: 'ML', packageSizeValue: '', packageSizeUnit: 'ML',
    description: '', priceValue: '', priceDirection: 'GROSS', vatRate: 23,
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    canSeeCosts: boolean;
    onCreated: (id: string) => void;
    /** Wstępna nazwa — gdy okno otwiera „Dodaj nowy produkt" z wpisanej frazy. */
    initialName?: string;
    /** Otwórz od razu panel skanowania — gdy okno otwiera przycisk aparatu. */
    autoScan?: boolean;
}

export function AddProductModal({ isOpen, onClose, canSeeCosts, onCreated, initialName, autoScan }: Props) {
    const isDesktop = useBreakpoint('lg');
    const [form, setForm] = useState<FormState>(() => (initialName ? { ...EMPTY, name: initialName } : EMPTY));
    const [draft, setDraft] = useState<ProductDraft | null>(null);
    const [barcode, setBarcode] = useState('');
    const [looking, setLooking] = useState(false);
    const [lookupMsg, setLookupMsg] = useState<{ tone: 'muted' | 'error' | 'ok'; text: string } | null>(null);
    const [scanOpen, setScanOpen] = useState(!!autoScan);
    const [photoBusy, setPhotoBusy] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const create = useCreateProduct();
    const createFromDraft = useCreateFromDraft();
    const scanner = useBarcodeScanner();

    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));

    // Aparat uruchamiamy tylko na telefonie (desktop pokazuje kod QR do handoffu).
    // Skan ciągły „jak MyFitnessPal": kod łapie się sam, bez przycisku migawki.
    useEffect(() => {
        if (scanOpen && !isDesktop) {
            scanner.startContinuous((code) => {
                setBarcode(code);
                setScanOpen(false);
                runLookup(code);
            });
        }
        if (!scanOpen) scanner.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanOpen, isDesktop]);

    const applyDraftToForm = (d: ProductDraft) => {
        setForm(f => ({
            ...f,
            gtin: d.gtin ?? '',
            name: d.name,
            brand: d.brand,
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

    // Telefon, zapas: zdjęcie kodu → najpierw dekoder w przeglądarce (za darmo), a gdy nie
    // odczyta — model wizyjny na serwerze czyta cyfry pod kreskami (jak przy VIN).
    const onPhotoFile = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setPhotoBusy(true);
        setLookupMsg({ tone: 'muted', text: 'Odczytuję kod ze zdjęcia…' });
        try {
            let code = await scanner.decodeImageFile(file);
            if (!code) {
                const jpeg = await canvasToJpegFile(await fileToCanvas(file, 1600));
                code = await productsApi.extractBarcodeFromImage(jpeg);
            }
            if (code) {
                setBarcode(code);
                setScanOpen(false);
                runLookup(code);
            } else {
                setLookupMsg({ tone: 'error', text: 'Nie udało się odczytać kodu ze zdjęcia. Zrób je z bliska, ostro i w dobrym świetle.' });
            }
        } catch {
            setLookupMsg({ tone: 'error', text: 'Nie udało się odczytać kodu ze zdjęcia.' });
        } finally {
            setPhotoBusy(false);
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
                unitOfMeasure: form.unitOfMeasure,
                packageSizeValue: form.packageSizeValue.trim(),
                packageSizeUnit: form.packageSizeUnit,
                description: form.description.trim() || null,
            });
            if (canSeeCosts && priceInput()) {
                await productsApi.updateStudio(saved.id, {
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
            unitOfMeasure: form.unitOfMeasure,
            packageSizeValue: form.packageSizeValue.trim(),
            packageSizeUnit: form.packageSizeUnit,
            description: form.description.trim() || null,
            price: priceInput(),
        };
        const saved = await create.mutateAsync(req);
        onCreated(saved.id);
    };

    // Wymagana jest WYŁĄCZNIE nazwa — resztę można uzupełnić później. Produkt dodaje
    // się często w biegu, przy regale, i blokowanie zapisu na marce zatrzymywało pracę.
    const canSubmit = form.name.trim().length >= 2;

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
                            ) : (
                                <>
                                    {scanner.error ? (
                                        <StatusLine $tone="error">{scanner.error}</StatusLine>
                                    ) : (
                                        <>
                                            <ScanHint>Skieruj aparat na kod kreskowy — złapiemy go automatycznie.</ScanHint>
                                            <Video ref={scanner.videoRef} playsInline muted />
                                        </>
                                    )}
                                    <PhotoBtn type="button" disabled={photoBusy} onClick={() => photoInputRef.current?.click()}>
                                        {photoBusy ? <Spin size={14} /> : <ImageIcon size={15} />}
                                        {photoBusy ? 'Odczytuję zdjęcie…' : scanner.error ? 'Zrób zdjęcie kodu' : 'Nie łapie? Zrób zdjęcie kodu'}
                                    </PhotoBtn>
                                    <HiddenFile ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={onPhotoFile} />
                                </>
                            )}
                        </ScanArea>
                    )}
                </FieldGroup>

                {draft && (
                    <DraftBanner>
                        <span>Sprawdź dane z etykietą przed zapisaniem — pochodzą z wyszukiwania w sieci.</span>
                        {draft.sourceUrl && (
                            <SourceLink href={draft.sourceUrl} target="_blank" rel="noopener noreferrer">
                                Źródło ↗
                            </SourceLink>
                        )}
                    </DraftBanner>
                )}
                <FieldGroup>
                    <Label>Nazwa produktu *</Label>
                    <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="np. Powłoka ceramiczna Pro" />
                </FieldGroup>
                <FieldGroup>
                    <Label>Marka</Label>
                    <Input value={form.brand} onChange={e => set('brand', e.target.value)} />
                </FieldGroup>
                <Grid2>
                    <FieldGroup>
                        <Label>Wielkość opakowania</Label>
                        <Input value={form.packageSizeValue} onChange={e => set('packageSizeValue', e.target.value)} placeholder="np. 50 — opcjonalnie" inputMode="decimal" />
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
