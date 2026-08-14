import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Plus, Trash2, Banknote, CreditCard, ArrowLeftRight, Smartphone, MonitorSmartphone } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalSubtitle,
    ModalContent,
    ModalFooter,
    ModalSectionTitle,
    CloseBtn,
} from '@/common/components/ModalKit';
import { SharedButton } from '@/common/styles';
import {
    FormGrid,
    FormField,
    FieldLabel,
    InputShell,
    BareInput,
    FormAlertBanner,
    Select,
} from '@/common/components/Form';
import { formatCurrency } from '@/common/utils';
import { companyApi } from '@/modules/settings/api/companyApi';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { CompleteInvoicePayload, PaymentMethod } from '../../types/stateTransitions';

// ─── Model ────────────────────────────────────────────────────────────────────

export interface InvoiceServiceSeed {
    name: string;
    /** Kwota brutto usługi w groszach. */
    grossPrice: number;
    /** Kwota netto usługi w groszach. */
    netPrice: number;
}

type VatRateCode = '23' | '8' | '5' | '0' | 'zw';
type PriceMode = 'NET' | 'GROSS';

/**
 * Pozycja z zasadą „pole wpisane jest źródłem prawdy": [mode] wskazuje, którą
 * kwotę wpisał użytkownik — ta kwota NIGDY nie jest przeliczana wstecz, a druga
 * jest zawsze pochodną (VAT od netto albo VAT „w stu" od brutto, jak w ustawie
 * o VAT art. 106e ust. 7). Dzięki temu wpisane 500,00 nie przeskoczy na 499,99.
 */
interface ItemDraft {
    name: string;
    /** Netto w PLN — autorytatywne przy mode=NET, pochodne przy GROSS. */
    net: string;
    /** Brutto w PLN — autorytatywne przy mode=GROSS, pochodne przy NET. */
    gross: string;
    mode: PriceMode;
    vatRate: VatRateCode;
}

const VAT_PERCENT: Record<VatRateCode, number> = { '23': 23, '8': 8, '5': 5, '0': 0, zw: 0 };

const toPln = (grosz: number) => (grosz / 100).toFixed(2);

const parsePln = (value: string): number => {
    const parsed = parseFloat(value.replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
};

/** VAT od netto (grosze): round(netto × stawka%). */
const vatFromNet = (net: number, rate: VatRateCode) => Math.round(net * VAT_PERCENT[rate] / 100);

/** VAT „w stu" od brutto (grosze): round(brutto × stawka / (100 + stawka)) — art. 106e ust. 7. */
const vatFromGross = (gross: number, rate: VatRateCode) =>
    Math.round(gross * VAT_PERCENT[rate] / (100 + VAT_PERCENT[rate]));

/** Kwoty pozycji w groszach — liczone identycznie jak na backendzie. */
const itemAmounts = (item: ItemDraft): { net: number; gross: number } => {
    if (item.mode === 'GROSS') {
        const gross = parsePln(item.gross);
        return { net: gross - vatFromGross(gross, item.vatRate), gross };
    }
    const net = parsePln(item.net);
    return { net, gross: net + vatFromNet(net, item.vatRate) };
};

/** Uzupełnia pole pochodne na podstawie autorytatywnego. */
const withDerived = (item: ItemDraft): ItemDraft => {
    const { net, gross } = itemAmounts(item);
    return item.mode === 'GROSS'
        ? { ...item, net: toPln(net) }
        : { ...item, gross: toPln(gross) };
};

/** Stawka wykryta z relacji brutto/netto usługi; przy braku dopasowania 23%. */
const detectRate = (net: number, gross: number): VatRateCode => {
    if (net <= 0) return '23';
    const ratio = gross / net;
    if (Math.abs(ratio - 1.23) < 0.005) return '23';
    if (Math.abs(ratio - 1.08) < 0.005) return '8';
    if (Math.abs(ratio - 1.05) < 0.005) return '5';
    if (Math.abs(ratio - 1.0) < 0.005) return '0';
    return '23';
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const SectionHint = styled.p`
    font-size: 12px;
    color: ${p => p.theme.colors.textMuted};
    margin: -6px 0 0;
    line-height: 1.5;
`;

const ItemRow = styled.div`
    display: grid;
    grid-template-columns: minmax(160px, 2.2fr) 105px 105px 84px 32px;
    gap: 8px;
    align-items: center;
`;

/** Pole pochodne — wartość wyliczona z pola wpisanego, lekko wyszarzona. */
const DerivedShell = styled(InputShell)<{ $derived: boolean }>`
    ${p => p.$derived && `
        background: ${p.theme.colors.surfaceAlt};
        input { color: ${p.theme.colors.textSecondary}; }
    `}
`;

const ItemHeaderRow = styled(ItemRow)`
    font-size: 11px;
    font-weight: 600;
    color: ${p => p.theme.colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.04em;
`;

const ItemsWrap = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const RemoveBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: none;
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    border-radius: 8px;
    cursor: pointer;
    &:hover { background: #fef2f2; color: #dc2626; }
    &:disabled { opacity: 0.3; cursor: not-allowed; }
`;

const AddItemBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    align-self: flex-start;
    padding: 7px 12px;
    font-size: 13px;
    font-weight: 600;
    color: #1d4ed8;
    background: #eff6ff;
    border: 1px dashed #93c5fd;
    border-radius: 8px;
    cursor: pointer;
    &:hover { background: #dbeafe; }
`;

const BalanceBar = styled.div<{ $state: 'ok' | 'under' | 'over' }>`
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.55;
    ${p => p.$state === 'ok' && `
        background: #f0fdf4; border: 1px solid #bbf7d0; color: #14532d;
    `}
    ${p => p.$state === 'under' && `
        background: #fffbeb; border: 1px solid #fde68a; color: #78350f;
    `}
    ${p => p.$state === 'over' && `
        background: #fef2f2; border: 1px solid #fecaca; color: #7f1d1d;
    `}
    strong { font-variant-numeric: tabular-nums; }
`;

const BalanceRow = styled.div`
    display: flex;
    justify-content: space-between;
    gap: 16px;
`;

const PillRow = styled.div`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
`;

const Pill = styled.button<{ $selected: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 13px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontSm};
    font-weight: 600;
    cursor: pointer;
    transition: all 140ms ease;
    ${p => p.$selected ? `
        background: ${st.accentBlue}; color: white; border: 1px solid ${st.accentBlue};
    ` : `
        background: ${st.bgCard}; color: ${st.textSecondary}; border: 1px solid ${st.border};
        &:hover { border-color: ${st.accentBlue}; color: ${st.accentBlue}; }
    `}
    svg { width: 13px; height: 13px; }
`;

const RemainderToggleBtn = styled.button<{ $active: boolean }>`
    align-self: flex-start;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 140ms ease;
    ${p => p.$active ? `
        background: #b45309; color: white; border: 1px solid #b45309;
    ` : `
        background: white; color: #b45309; border: 1.5px solid #f59e0b;
        &:hover { background: #fffbeb; }
    `}
`;

const CompanyPromptBox = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 12px;

    h4 { margin: 0; font-size: 14px; color: #1e3a8a; }
    p  { margin: 0; font-size: 12px; color: #1e40af; line-height: 1.5; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

const remainderMethods: Array<{ value: PaymentMethod; label: string; icon: React.ReactNode }> = [
    { value: 'CASH',          label: 'Gotówka',       icon: <Banknote size={13} /> },
    { value: 'CARD',          label: 'Karta',         icon: <CreditCard size={13} /> },
    { value: 'TRANSFER',      label: 'Przelew',       icon: <ArrowLeftRight size={13} /> },
    { value: 'BLIK_NA_NUMER', label: 'BLIK na numer', icon: <Smartphone size={13} /> },
    { value: 'BLIK_TERMINAL', label: 'BLIK terminal', icon: <MonitorSmartphone size={13} /> },
];

interface InvoiceAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Usługi wizyty — punkt startowy pozycji faktury. */
    services: InvoiceServiceSeed[];
    /** Kwota brutto całej wizyty w groszach — suma dokumentów musi się z nią zgadzać. */
    visitGross: number;
    currency: string;
    initial: CompleteInvoicePayload | null;
    buyerDefaults: { companyName?: string; fullName: string; email?: string };
    onSave: (invoice: CompleteInvoicePayload) => void;
}

/**
 * „Wprowadź zmiany" — edycja pozycji faktury KSeF przy finalizacji płatności.
 *
 * Kwoty pozycji można zmieniać, ale suma dokumentów zawsze pokrywa całą kwotę
 * wizyty: gdy faktura jest niższa, reszta musi zostać udokumentowana paragonem
 * (drugim dokumentem przychodowym, widocznym w finansach i kasie).
 */
export const InvoiceAdjustmentModal = ({
    isOpen,
    onClose,
    services,
    visitGross,
    currency,
    initial,
    buyerDefaults,
    onSave,
}: InvoiceAdjustmentModalProps) => {
    const queryClient = useQueryClient();

    // ── Dane firmy (sprzedawca) — wymagane do KSeF ─────────────────────────────
    const { data: company, isLoading: companyLoading } = useQuery({
        queryKey: ['company', 'settings'],
        queryFn: () => companyApi.getCompanySettings(),
        enabled: isOpen,
    });
    const companyIncomplete = !companyLoading && (!company?.name?.trim() || !company?.taxId?.trim());

    const [companyDraft, setCompanyDraft] = useState({ name: '', taxId: '', street: '', postalCode: '', city: '' });
    useEffect(() => {
        if (company) {
            setCompanyDraft({
                name: company.name ?? '',
                taxId: company.taxId ?? '',
                street: company.street ?? '',
                postalCode: company.postalCode ?? '',
                city: company.city ?? '',
            });
        }
    }, [company]);

    const saveCompanyMutation = useMutation({
        // Pełny obiekt aktualizacji — pola nieedytowane w tym oknie przechodzą bez zmian
        mutationFn: () => companyApi.updateCompanySettings({
            name:        companyDraft.name.trim(),
            taxId:       companyDraft.taxId.trim(),
            regon:       company?.regon ?? '',
            street:      companyDraft.street.trim() || (company?.street ?? ''),
            postalCode:  companyDraft.postalCode.trim() || (company?.postalCode ?? ''),
            city:        companyDraft.city.trim() || (company?.city ?? ''),
            phone:       company?.phone ?? '',
            email:       company?.email ?? '',
            website:     company?.website ?? null,
            bankAccount: company?.bankAccount ?? null,
        }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['company', 'settings'] }),
    });

    // ── Pozycje ────────────────────────────────────────────────────────────────
    // Seed w trybie GROSS z cenami brutto usług — suma domyślna równa się
    // kwocie wizyty co do grosza
    const seedItems = (): ItemDraft[] =>
        services.length > 0
            ? services.map(s => withDerived({
                name: s.name,
                net: '',
                gross: toPln(s.grossPrice),
                mode: 'GROSS',
                vatRate: detectRate(s.netPrice, s.grossPrice),
            }))
            : [withDerived({ name: 'Usługi detailingowe', net: '', gross: toPln(visitGross), mode: 'GROSS', vatRate: '23' })];

    const [items, setItems] = useState<ItemDraft[]>(seedItems);
    const [buyerNip, setBuyerNip] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [buyerAddress1, setBuyerAddress1] = useState('');
    const [buyerAddress2, setBuyerAddress2] = useState('');
    const [buyerEmail, setBuyerEmail] = useState('');
    const [remainderCovered, setRemainderCovered] = useState(false);
    const [remainderMethod, setRemainderMethod] = useState<PaymentMethod>('CASH');
    const [exemptionBasis, setExemptionBasis] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Re-seed przy każdym otwarciu — modal odzwierciedla bieżącą konfigurację
    useEffect(() => {
        if (!isOpen) return;
        if (initial) {
            setItems(initial.items.map(i => {
                const rate = (i.vatRate ?? '23') as VatRateCode;
                const qty = i.quantity ?? 1;
                if (i.unitPriceGross != null) {
                    return withDerived({
                        name: i.name, net: '', gross: toPln(Math.round(i.unitPriceGross * qty)),
                        mode: 'GROSS', vatRate: rate,
                    });
                }
                return withDerived({
                    name: i.name, net: toPln(Math.round((i.unitPriceNet ?? 0) * qty)), gross: '',
                    mode: 'NET', vatRate: rate,
                });
            }));
            setBuyerNip(initial.buyerNip ?? '');
            setBuyerName(initial.buyerName ?? '');
            setBuyerAddress1(initial.buyerAddressLine1 ?? '');
            setBuyerAddress2(initial.buyerAddressLine2 ?? '');
            setBuyerEmail(initial.buyerEmail ?? '');
            setRemainderCovered(!!initial.remainderPaymentMethod);
            setRemainderMethod(initial.remainderPaymentMethod ?? 'CASH');
            setExemptionBasis(initial.exemptionLegalBasis ?? '');
        } else {
            setItems(seedItems());
            setBuyerName(buyerDefaults.companyName ?? buyerDefaults.fullName);
            setBuyerEmail(buyerDefaults.email ?? '');
            setRemainderCovered(false);
            setExemptionBasis('');
        }
        setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    /** Stawka „zw" wymaga podstawy prawnej zwolnienia — pole P_19A faktury FA(3). */
    const hasExemptItem = items.some(item => item.vatRate === 'zw');

    const invoiceGross = useMemo(
        () => items.reduce((sum, item) => sum + itemAmounts(item).gross, 0),
        [items]
    );
    const remainder = visitGross - invoiceGross;
    const balanceState: 'ok' | 'under' | 'over' = remainder === 0 ? 'ok' : remainder > 0 ? 'under' : 'over';

    const fmt = (grosz: number) => formatCurrency(grosz / 100, currency);

    /**
     * Edycja pola kwoty przełącza tryb: wpisane netto → mode=NET (brutto pochodne),
     * wpisane brutto → mode=GROSS (netto pochodne). Pole edytowane zachowuje
     * dokładnie wpisany tekst; pochodne aktualizuje się na bieżąco.
     */
    const updateItem = (index: number, patch: Partial<ItemDraft>) =>
        setItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const next: ItemDraft = { ...item, ...patch };
            if (patch.net !== undefined) next.mode = 'NET';
            if (patch.gross !== undefined) next.mode = 'GROSS';
            // Zmiana kwoty lub stawki → przelicz wyłącznie pole pochodne
            if (patch.net !== undefined || patch.gross !== undefined || patch.vatRate !== undefined) {
                return withDerived(next);
            }
            return next;
        }));

    const handleSave = () => {
        if (companyIncomplete) {
            setError('Uzupełnij dane firmy (nazwa i NIP) — są wymagane do wysyłki faktury do KSeF.');
            return;
        }
        for (const [i, item] of items.entries()) {
            if (!item.name.trim()) { setError(`Pozycja ${i + 1}: podaj nazwę`); return; }
            if (itemAmounts(item).gross <= 0) { setError(`Pozycja ${i + 1}: podaj kwotę`); return; }
        }
        if (hasExemptItem && !exemptionBasis.trim()) {
            setError('Stawka „zw" wymaga podania podstawy prawnej zwolnienia z VAT');
            return;
        }
        const nip = buyerNip.replace(/[^0-9]/g, '');
        if (nip && nip.length !== 10) { setError('NIP nabywcy musi mieć 10 cyfr'); return; }
        if (!nip && !buyerName.trim()) { setError('Faktura dla konsumenta (bez NIP) wymaga imienia i nazwiska nabywcy'); return; }
        if (balanceState === 'over') {
            setError('Kwota faktury przekracza kwotę wizyty — obniż pozycje.');
            return;
        }
        if (balanceState === 'under' && !remainderCovered) {
            setError('Kwota faktury jest niższa niż kwota wizyty. Reszta musi zostać udokumentowana drugim dokumentem (paragonem).');
            return;
        }

        onSave({
            // Kwota autorytatywna idzie do backendu w swoim trybie — backend liczy
            // identycznie, więc wpisana wartość nigdy nie „przeskakuje"
            items: items.map(item => ({
                name: item.name.trim(),
                quantity: 1,
                ...(item.mode === 'GROSS'
                    ? { unitPriceGross: parsePln(item.gross) }
                    : { unitPriceNet: parsePln(item.net) }),
                vatRate: item.vatRate,
            })),
            buyerNip: nip || undefined,
            buyerName: buyerName.trim() || undefined,
            buyerAddressLine1: buyerAddress1.trim() || undefined,
            buyerAddressLine2: buyerAddress2.trim() || undefined,
            buyerEmail: buyerEmail.trim() || undefined,
            remainderPaymentMethod: balanceState === 'under' ? remainderMethod : undefined,
            exemptionLegalBasis: hasExemptItem ? exemptionBasis.trim() : undefined,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <ModalShell isOpen={isOpen} onClose={onClose} size="xl">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Wprowadź zmiany</ModalTitle>
                    <ModalSubtitle>
                        Dostosuj pozycje faktury — dokument trafi automatycznie do KSeF
                    </ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {error && <FormAlertBanner>{error}</FormAlertBanner>}

                {companyIncomplete && (
                    <CompanyPromptBox>
                        <h4>Uzupełnij dane firmy</h4>
                        <p>
                            Do wystawienia faktury w KSeF potrzebna jest nazwa i NIP Twojej firmy.
                            Dane zapiszą się w ustawieniach studia.
                        </p>
                        <FormGrid $columns={2}>
                            <FormField>
                                <FieldLabel>Nazwa firmy *</FieldLabel>
                                <InputShell>
                                    <BareInput value={companyDraft.name}
                                        onChange={e => setCompanyDraft(d => ({ ...d, name: e.target.value }))} />
                                </InputShell>
                            </FormField>
                            <FormField>
                                <FieldLabel>NIP *</FieldLabel>
                                <InputShell>
                                    <BareInput value={companyDraft.taxId} inputMode="numeric"
                                        onChange={e => setCompanyDraft(d => ({ ...d, taxId: e.target.value }))} />
                                </InputShell>
                            </FormField>
                            <FormField>
                                <FieldLabel>Ulica i numer</FieldLabel>
                                <InputShell>
                                    <BareInput value={companyDraft.street}
                                        onChange={e => setCompanyDraft(d => ({ ...d, street: e.target.value }))} />
                                </InputShell>
                            </FormField>
                            <FormField>
                                <FieldLabel>Kod pocztowy i miejscowość</FieldLabel>
                                <InputShell>
                                    <BareInput
                                        value={`${companyDraft.postalCode} ${companyDraft.city}`.trim()}
                                        onChange={e => {
                                            const [postalCode = '', ...rest] = e.target.value.split(' ');
                                            setCompanyDraft(d => ({ ...d, postalCode, city: rest.join(' ') }));
                                        }} />
                                </InputShell>
                            </FormField>
                        </FormGrid>
                        <SharedButton
                            $variant="primary" $size="sm"
                            disabled={saveCompanyMutation.isPending || !companyDraft.name.trim() || !companyDraft.taxId.trim()}
                            onClick={() => saveCompanyMutation.mutate()}
                        >
                            {saveCompanyMutation.isPending ? 'Zapisywanie…' : 'Zapisz dane firmy'}
                        </SharedButton>
                    </CompanyPromptBox>
                )}

                <ModalSectionTitle>Nabywca</ModalSectionTitle>
                <FormGrid $columns={2}>
                    <FormField>
                        <FieldLabel>NIP (puste = konsument)</FieldLabel>
                        <InputShell>
                            <BareInput value={buyerNip} onChange={e => setBuyerNip(e.target.value)}
                                placeholder="np. 5213017228" inputMode="numeric" />
                        </InputShell>
                    </FormField>
                    <FormField>
                        <FieldLabel>Nazwa / imię i nazwisko</FieldLabel>
                        <InputShell>
                            <BareInput value={buyerName} onChange={e => setBuyerName(e.target.value)} />
                        </InputShell>
                    </FormField>
                    <FormField>
                        <FieldLabel>Ulica i numer</FieldLabel>
                        <InputShell>
                            <BareInput value={buyerAddress1} onChange={e => setBuyerAddress1(e.target.value)} />
                        </InputShell>
                    </FormField>
                    <FormField>
                        <FieldLabel>Kod pocztowy i miejscowość</FieldLabel>
                        <InputShell>
                            <BareInput value={buyerAddress2} onChange={e => setBuyerAddress2(e.target.value)} />
                        </InputShell>
                    </FormField>
                </FormGrid>

                <ModalSectionTitle>Pozycje faktury</ModalSectionTitle>
                <SectionHint>
                    Możesz zmienić nazwy i kwoty pozycji. Wpisz netto <em>albo</em> brutto —
                    kwota, którą wpiszesz, zostaje dokładnie taka, jak ją podałeś, a druga
                    jest wyliczana ze stawki VAT.
                </SectionHint>
                <ItemsWrap>
                    <ItemHeaderRow>
                        <span>Nazwa pozycji</span>
                        <span>Netto</span>
                        <span>Brutto</span>
                        <span>VAT</span>
                        <span />
                    </ItemHeaderRow>
                    {items.map((item, index) => (
                        <ItemRow key={index}>
                            <InputShell>
                                <BareInput value={item.name}
                                    onChange={e => updateItem(index, { name: e.target.value })} />
                            </InputShell>
                            <DerivedShell $derived={item.mode === 'GROSS'}>
                                <BareInput value={item.net} inputMode="decimal"
                                    title={item.mode === 'GROSS' ? 'Wyliczone z brutto' : 'Kwota wpisana — źródło prawdy'}
                                    onChange={e => updateItem(index, { net: e.target.value })} />
                            </DerivedShell>
                            <DerivedShell $derived={item.mode === 'NET'}>
                                <BareInput value={item.gross} inputMode="decimal"
                                    title={item.mode === 'NET' ? 'Wyliczone z netto' : 'Kwota wpisana — źródło prawdy'}
                                    onChange={e => updateItem(index, { gross: e.target.value })} />
                            </DerivedShell>
                            <Select value={item.vatRate}
                                onChange={e => updateItem(index, { vatRate: e.target.value as VatRateCode })}>
                                <option value="23">23%</option>
                                <option value="8">8%</option>
                                <option value="5">5%</option>
                                <option value="0">0%</option>
                                <option value="zw">zw.</option>
                            </Select>
                            <RemoveBtn disabled={items.length === 1}
                                onClick={() => setItems(prev => prev.filter((_, i) => i !== index))}
                                title="Usuń pozycję">
                                <Trash2 size={15} />
                            </RemoveBtn>
                        </ItemRow>
                    ))}
                    <AddItemBtn onClick={() => setItems(prev => [
                        ...prev,
                        { name: '', net: '', gross: '', mode: 'GROSS', vatRate: '23' },
                    ])}>
                        <Plus size={14} /> Dodaj pozycję
                    </AddItemBtn>
                </ItemsWrap>

                {hasExemptItem && (
                    <FormField>
                        <FieldLabel>Podstawa prawna zwolnienia z VAT *</FieldLabel>
                        <InputShell>
                            <BareInput
                                value={exemptionBasis}
                                onChange={e => setExemptionBasis(e.target.value)}
                                placeholder="np. art. 113 ust. 1 ustawy o VAT"
                            />
                        </InputShell>
                        <SectionHint>
                            Wymagana przez KSeF dla pozycji ze stawką „zw" — trafia na fakturę jako pole P_19A.
                        </SectionHint>
                    </FormField>
                )}

                <BalanceBar $state={balanceState}>
                    <BalanceRow>
                        <span>Kwota wizyty</span>
                        <strong>{fmt(visitGross)}</strong>
                    </BalanceRow>
                    <BalanceRow>
                        <span>Suma faktury</span>
                        <strong>{fmt(invoiceGross)}</strong>
                    </BalanceRow>
                    {balanceState === 'ok' && (
                        <span>Faktura pokrywa całą kwotę wizyty.</span>
                    )}
                    {balanceState === 'over' && (
                        <span>Kwota faktury przekracza kwotę wizyty o <strong>{fmt(-remainder)}</strong> — obniż pozycje.</span>
                    )}
                    {balanceState === 'under' && (
                        <>
                            <BalanceRow>
                                <span>Pozostaje do udokumentowania</span>
                                <strong>{fmt(remainder)}</strong>
                            </BalanceRow>
                            {!remainderCovered ? (
                                <RemainderToggleBtn $active={false} onClick={() => setRemainderCovered(true)}>
                                    Resztę kwoty pokryj drugim dokumentem (paragon)
                                </RemainderToggleBtn>
                            ) : (
                                <>
                                    <span>
                                        Reszta <strong>{fmt(remainder)}</strong> zostanie udokumentowana paragonem —
                                        osobnym dokumentem przychodowym (przy gotówce z wpisem do kasy).
                                        Wybierz metodę płatności reszty:
                                    </span>
                                    <PillRow>
                                        {remainderMethods.map(m => (
                                            <Pill key={m.value} $selected={remainderMethod === m.value}
                                                onClick={() => setRemainderMethod(m.value)}>
                                                {m.icon}{m.label}
                                            </Pill>
                                        ))}
                                    </PillRow>
                                    <RemainderToggleBtn $active onClick={() => setRemainderCovered(false)}>
                                        Anuluj podział — faktura na całość
                                    </RemainderToggleBtn>
                                </>
                            )}
                        </>
                    )}
                </BalanceBar>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton
                    $variant="primary"
                    onClick={handleSave}
                    disabled={
                        balanceState === 'over'
                        || (balanceState === 'under' && !remainderCovered)
                        || companyIncomplete
                        || (hasExemptItem && !exemptionBasis.trim())
                    }
                >
                    Zapisz zmiany
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
