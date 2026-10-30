import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { ChevronDown } from 'lucide-react';
import { useFloatingPanel } from '@/common/hooks/useFloatingPanel';
import { PaymentMethod, DocumentDirection, type FinancialDocument } from '../types';
import { useUpdateDocument } from '../hooks/useFinance';
import { documentAmountsFrom, documentAmountsToCents, type DocumentAmounts } from '../utils/amountInputs';
import { Notice } from '@/common/components/ui';
import { DocumentAmountFields } from './DocumentAmountFields';
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
    InputShellTextArea,
    BareInput,
    BareTextArea,
    FormAlertBanner,
} from '@/common/components/Form';
import { NipInputWithGus, type CompanyInfoResponse } from '@/common/components/NipInputWithGus';
import { useToast } from '@/common/components/Toast';
import { formatCurrency } from '@/common/utils';
import { problemDetail } from '@/core/problem';
import { PricesSection } from '@/modules/visits/components/handover/PricesSection';
import type { PaymentMethod as VisitPaymentMethod } from '@/modules/visits/types/stateTransitions';
import { useVisitDocumentCorrection } from '../hooks/useVisitDocumentCorrection';
import type { VisitDocumentLock } from '../utils/visitDocumentCorrection';

const pln = (cents: number) => formatCurrency(cents / 100);

// ─── Direction badge ──────────────────────────────────────────────────────────

const DirectionBadge = styled.span<{ $income: boolean }>`
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    background: ${p => p.$income ? '#dcfce7' : '#fee2e2'};
    color:       ${p => p.$income ? '#166534' : '#991b1b'};
    border:      1px solid ${p => p.$income ? '#86efac' : '#fca5a5'};
`;

const DirectionRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
`;

const ReadOnlyValue = styled.span`
    display: block;
    padding: 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
`;

const LockNote = styled.div`
    margin-bottom: 20px;
`;

const DirectionHint = styled.p`
    font-size: 11px;
    color: ${p => p.theme.colors.textMuted};
    margin: 0 0 16px;
`;

const PriceBlock = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
`;

const Muted = styled.p`
    margin: 0;
    font-size: 13px;
    color: ${p => p.theme.colors.textMuted};
`;

const Steps = styled.ul`
    margin: 6px 0 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

/** Dlaczego kwoty dokumentu z wizyty nie zmienisz z Finansów - zdanie dla człowieka. */
const LOCK_TEXT: Record<Exclude<VisitDocumentLock, null>, string> = {
    NOT_IN_SETTLEMENT: 'Ten dokument nie obowiązuje już w rozliczeniu wizyty. Otwórz wizytę, żeby zobaczyć, co go zastąpiło.',
    BATCH: 'Wizyta jest w zleceniu zbiorczym. Cenę auta zmienisz w zleceniu albo przez „Popraw rozliczenie” w wizycie.',
    NO_SERVICES: 'Wizyta nie ma usług, z których składa się ta kwota. Zmień ją przez „Popraw rozliczenie” w wizycie.',
};

// ─── Custom Select (portal-based) ────────────────────────────────────────────

const SelectTrigger = styled.button`
    padding: 12px 14px;
    font-size: 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    background: white;
    color: #0f172a;
    outline: none;
    width: 100%;
    box-sizing: border-box;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    text-align: left;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:hover { border-color: #cbd5e1; }
    &:focus {
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.1);
    }
`;

const SelectBackdrop = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1199;
`;

const SelectPanel = styled.div`
    position: fixed;
    min-width: 200px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
    z-index: 1200;
    overflow-x: hidden;
    overscroll-behavior: contain;
    box-sizing: border-box;
    border: 1px solid rgba(0, 0, 0, 0.08);
    /* Pozycję, wysokość i przewijanie ustawia useFloatingPanel; do pierwszego pomiaru
       panel jest niewidoczny, żeby nie mignął w lewym górnym rogu. */
    top: 0;
    left: 0;
    visibility: hidden;
`;

const SelectBody = styled.div`padding: 8px;`;

const SelectOption = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    width: 100%;
    padding: 10px 12px;
    text-align: left;
    font-size: 14px;
    font-weight: ${p => p.$active ? 600 : 400};
    border: 1px solid ${p => p.$active ? 'rgba(99, 102, 241, 0.2)' : 'transparent'};
    border-radius: 10px;
    background: ${p => p.$active ? 'rgba(99, 102, 241, 0.06)' : 'transparent'};
    color: ${p => p.$active ? '#0f172a' : '#64748b'};
    cursor: pointer;
    transition: all 0.15s ease;
    &:hover {
        background: ${p => p.$active ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.02)'};
        color: #0f172a;
    }
`;

interface ModalSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
}

const ModalSelect: React.FC<ModalSelectProps> = ({ value, onChange, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [triggerWidth, setTriggerWidth] = useState(0);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    // Lista zawsze w ekranie: wcześniej stała pod przyciskiem bez limitu wysokości,
    // więc przy polu nisko w oknie (telefon, niski ekran) metody płatności uciekały
    // za dolną krawędź. Teraz przechodzi nad pole albo przewija się w środku.
    useFloatingPanel(isOpen, triggerRef, panelRef, { align: 'left', offset: 4 });
    const selectedLabel = options.find(o => o.value === value)?.label ?? '';

    const handleToggle = () => {
        if (!isOpen && triggerRef.current) {
            setTriggerWidth(triggerRef.current.getBoundingClientRect().width);
        }
        setIsOpen(prev => !prev);
    };

    const handleSelect = (val: string) => { onChange(val); setIsOpen(false); };

    return (
        <>
            {isOpen && <SelectBackdrop onClick={() => setIsOpen(false)} />}
            <SelectTrigger ref={triggerRef} type="button" onClick={handleToggle}>
                <span>{selectedLabel}</span>
                <ChevronDown size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} />
            </SelectTrigger>
            {isOpen && createPortal(
                <SelectPanel ref={panelRef} style={{ minWidth: triggerWidth }}>
                    <SelectBody>
                        {options.map(opt => (
                            <SelectOption key={opt.value} $active={value === opt.value} onClick={() => handleSelect(opt.value)}>
                                {opt.label}
                            </SelectOption>
                        ))}
                    </SelectBody>
                </SelectPanel>,
                document.body
            )}
        </>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    document: FinancialDocument | null;
    onClose: () => void;
}

interface FormState {
    paymentMethod:    string;
    amounts:          DocumentAmounts;
    issueDate:        string;
    dueDate:          string;
    description:      string;
    counterpartyName: string;
    counterpartyNip:  string;
}

function docToForm(doc: FinancialDocument): FormState {
    return {
        paymentMethod:    doc.paymentMethod,
        amounts:          documentAmountsFrom(doc.totalNet, doc.totalGross),
        issueDate:        doc.issueDate,
        dueDate:          doc.dueDate ?? '',
        description:      doc.description  ?? '',
        counterpartyName: doc.counterpartyName ?? '',
        counterpartyNip:  doc.counterpartyNip  ?? '',
    };
}

/*
 * Formularz dostaje `key` dokumentu i stan początkowy z niego, zamiast przepisywać
 * dokument do stanu w efekcie: inny dokument = nowy formularz, bez kaskady renderów.
 */
export const EditDocumentModal: React.FC<Props> = ({ document, onClose }) =>
    document ? <EditDocumentForm key={document.id} document={document} onClose={onClose} /> : null;

const EditDocumentForm: React.FC<{ document: FinancialDocument; onClose: () => void }> = ({ document, onClose }) => {
    const updateDoc = useUpdateDocument();
    const [error, setError] = useState<string | null>(null);
    const [form, setForm] = useState<FormState>(() => docToForm(document));

    const isIncome = document.direction === DocumentDirection.INCOME;
    // Te same reguły pilnuje backend (UpdateFinancialDocumentHandler) - tu tylko po to,
    // żeby nie dało się wpisać zmiany, którą serwer i tak odrzuci.
    const isKsefInvoice = !!document.ksefInvoiceId;
    const isFromVisit = document.source === 'VISIT';
    // Korekta i dokument zastąpiony to para, która sumuje się do zera - zmienia się je
    // tylko kolejną poprawką rozliczenia wizyty (backend odrzuci ręczną zmianę).
    const isSettlementLocked = document.documentType === 'CORRECTION' || !!document.supersededAt;
    // Pola kwot dokumentu zostają zablokowane - kwota dokumentu z wizyty zmienia się cenami
    // usług poniżej (visitDocumentCorrection.ts), nigdy samym dokumentem.
    const amountsLocked = isKsefInvoice || isFromVisit || isSettlementLocked;
    const isVisitDocument = isFromVisit && !!document.visitId && !isSettlementLocked;
    const { showSuccess } = useToast();
    const correction = useVisitDocumentCorrection(
        document, form.paymentMethod as VisitPaymentMethod, form.dueDate, isVisitDocument,
    );
    const lock = correction.scope?.lock ?? null;
    const visitPricing = isVisitDocument && !correction.isLoading && !correction.isError && !!correction.scope && lock === null;
    // Nowa cena zastępuje ten dokument nowym (dzisiejsza data, opis poprawki), więc zmiany
    // daty, kontrahenta i opisu starego dokumentu by przepadły - na ten czas są zablokowane
    // i pokazują to, co jest zapisane.
    const priceEdit = visitPricing && correction.pricesChanged;
    const shown = priceEdit ? docToForm(document) : form;

    const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => prev && ({ ...prev, [key]: e.target.value }));

    const setField = (key: keyof FormState) => (value: string) =>
        setForm(prev => prev && ({ ...prev, [key]: value }));

    const handleGUSFetch = (data: CompanyInfoResponse) => {
        setForm(prev => prev && ({
            ...prev,
            counterpartyName: data.name,
            counterpartyNip:  data.nip,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (priceEdit) {
            if (!correction.canSave) return;
            try {
                await correction.save();
                showSuccess('Kwota zmieniona', 'Ceny usług w wizycie też są nowe. Stary dokument zostaje w historii obok korekty.');
                onClose();
            } catch (e) {
                setError(problemDetail(e, 'Nie udało się zmienić kwoty. Spróbuj ponownie.'));
            }
            return;
        }

        const cents = documentAmountsToCents(form.amounts);
        if (!cents || cents.totalGross <= 0) {
            setError('Kwota brutto musi być większa od zera.');
            return;
        }
        if (form.paymentMethod === PaymentMethod.TRANSFER && !form.dueDate) {
            setError('Przy przelewie podaj termin płatności.');
            return;
        }

        try {
            await updateDoc.mutateAsync({
                id: document.id,
                data: {
                    // Typ się nie zmienia (numer należy do serii) - idzie, żeby serwer
                    // odrzucił zapis, gdyby okno pokazywało nieaktualny dokument.
                    documentType:     document.documentType,
                    paymentMethod:    form.paymentMethod,
                    ...cents,
                    issueDate:        form.issueDate,
                    dueDate:          form.dueDate || null,
                    description:      form.description      || null,
                    counterpartyName: form.counterpartyName || null,
                    counterpartyNip:  form.counterpartyNip  || null,
                },
            });
            onClose();
        } catch (e) {
            setError(problemDetail(e, 'Nie udało się zapisać zmian. Spróbuj ponownie.'));
        }
    };

    return (
        <ModalShell isOpen onClose={onClose} size={visitPricing ? 'lg' : 'md'}>
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Edytuj dokument</ModalTitle>
                    {/* Numer FAK/… zapisu płatności nie jest numerem faktury - nie udajemy, że nim jest. */}
                    <ModalSubtitle>{document.invoicedExternally && document.documentType === 'INVOICE' ? 'Numer nada księgowość' : document.documentNumber}</ModalSubtitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                {error && <FormAlertBanner>{error}</FormAlertBanner>}

                <DirectionRow>
                    <DirectionBadge $income={isIncome}>
                        {isIncome ? 'Przychód' : 'Koszt'}
                    </DirectionBadge>
                </DirectionRow>
                <DirectionHint>Przychodu nie zamienisz na koszt (ani odwrotnie). Usuń dokument i dodaj nowy.</DirectionHint>

                <form id="edit-document-form" onSubmit={handleSubmit} autoComplete="off">
                    {isSettlementLocked && (
                        <LockNote>
                            <Notice tone="info" title={document.documentType === 'CORRECTION' ? 'Korekta z poprawki rozliczenia' : 'Dokument zastąpiony'}>
                                Ten dokument należy do poprawki rozliczenia wizyty i zostaje w historii bez zmian.
                                Kolejną zmianę zrób przez „Popraw rozliczenie” w wizycie.
                            </Notice>
                        </LockNote>
                    )}
                    {!isSettlementLocked && isKsefInvoice && (
                        <LockNote>
                            <Notice tone="info" title="Dokument faktury KSeF">
                                {isVisitDocument
                                    ? 'Faktura jest już w KSeF. Nowa cena usługi wystawi korektę faktury, a przed zapisem zobaczysz, co dokładnie się stanie. Daty i nabywcę zmienisz tylko korektą.'
                                    : 'Faktura jest już w KSeF, więc kwoty, daty i nabywcę zmienisz tylko korektą. Tu poprawisz opis.'}
                            </Notice>
                        </LockNote>
                    )}
                    {!isKsefInvoice && isFromVisit && !isSettlementLocked && (
                        <LockNote>
                            <Notice tone="info" title="Dokument z wydania pojazdu">
                                {isVisitDocument
                                    ? 'Kwota to suma cen usług wizyty. Zmiana ceny tutaj zmienia ją też w wizycie.'
                                    : 'Wizyty tego dokumentu już nie ma, więc kwoty nie zmienisz. Możesz poprawić formę płatności, daty i opis.'}
                            </Notice>
                        </LockNote>
                    )}

                    <ModalSectionTitle>Rodzaj dokumentu</ModalSectionTitle>
                    <FormGrid>
                        <FormField>
                            <FieldLabel as="span">Typ dokumentu</FieldLabel>
                            {/* Bez wyboru: numer {document.documentNumber} należy do serii tego typu. */}
                            <ReadOnlyValue>{document.documentTypeLabel}</ReadOnlyValue>
                        </FormField>

                        <FormField>
                            <FieldLabel>Forma płatności</FieldLabel>
                            {isKsefInvoice ? (
                                <ReadOnlyValue>{document.paymentMethodLabel}</ReadOnlyValue>
                            ) : (
                                <ModalSelect
                                    value={form.paymentMethod}
                                    onChange={setField('paymentMethod')}
                                    options={[
                                        { value: PaymentMethod.CASH,          label: 'Gotówka' },
                                        { value: PaymentMethod.CARD,          label: 'Karta' },
                                        { value: PaymentMethod.TRANSFER,      label: 'Przelew' },
                                        { value: PaymentMethod.BLIK_NA_NUMER, label: 'BLIK na numer' },
                                        { value: PaymentMethod.BLIK_TERMINAL, label: 'BLIK w terminalu' },
                                        { value: PaymentMethod.OTHER,         label: 'Inne' },
                                    ]}
                                />
                            )}
                        </FormField>
                    </FormGrid>
                    {!isKsefInvoice && (form.paymentMethod === PaymentMethod.CASH) !== (document.paymentMethod === PaymentMethod.CASH) && (
                        <DirectionHint>
                            {form.paymentMethod === PaymentMethod.CASH
                                ? 'Po zapisie kwota wpłynie do kasy jako korekta dokumentu.'
                                : 'Po zapisie kwota wyjdzie z kasy jako korekta dokumentu.'}
                        </DirectionHint>
                    )}

                    <ModalSectionTitle>{visitPricing ? 'Ceny usług' : 'Kwoty'}</ModalSectionTitle>
                    {isVisitDocument && correction.isLoading && (
                        <PriceBlock><Muted>Wczytywanie cen usług…</Muted></PriceBlock>
                    )}
                    {isVisitDocument && correction.isError && (
                        <PriceBlock>
                            <Notice
                                tone="danger"
                                title="Nie udało się wczytać cen usług"
                                action={<SharedButton $variant="secondary" type="button" onClick={() => correction.retry()}>Spróbuj ponownie</SharedButton>}
                            >
                                Bez nich kwoty nie da się zmienić. Pozostałe pola zapiszesz normalnie.
                            </Notice>
                        </PriceBlock>
                    )}
                    {isVisitDocument && lock && (
                        <PriceBlock><Notice tone="info" title="Kwoty nie zmienisz tutaj">{LOCK_TEXT[lock]}</Notice></PriceBlock>
                    )}
                    {visitPricing ? (
                        <PriceBlock>
                            <PricesSection
                                prices={correction.prices}
                                onChange={correction.changePrice}
                                onReset={correction.reset}
                                discount={correction.originalGross - correction.newGross}
                                totalGross={correction.newGross}
                                problems={[]}
                                fmt={pln}
                                changeContext="przy zmianie kwoty"
                                defaultEditing
                            />
                            {correction.scope!.alsoAffected.length > 0 && (
                                <Notice tone="warn" title="Zmiana dotyczy całej wizyty">
                                    Wizyta ma też dokument {correction.scope!.alsoAffected.map(d => d.number).join(', ')}.
                                    Nowa cena zastąpi wszystkie dokumenty wizyty, nie tylko ten.
                                </Notice>
                            )}
                            {priceEdit && correction.preview.isChecking && <Muted>Sprawdzanie zmiany…</Muted>}
                            {priceEdit && correction.preview.blockReason && (
                                <Notice tone="danger" title="Tej zmiany nie da się teraz zapisać">
                                    {correction.preview.blockReason}
                                </Notice>
                            )}
                            {priceEdit && correction.preview.isError && (
                                <Notice tone="danger" title="Nie udało się sprawdzić zmiany">
                                    {problemDetail(correction.preview.error, 'Spróbuj ponownie za chwilę.')}
                                </Notice>
                            )}
                            {priceEdit && correction.preview.effects && (
                                <Notice tone="info" title="Co się stanie po zapisie">
                                    <Steps>
                                        {correction.preview.effects.steps.map(step => <li key={step}>{step}</li>)}
                                        <li>
                                            {correction.preview.effects.customerDifference > 0
                                                ? `Klient dopłaca ${pln(correction.preview.effects.customerDifference)}.`
                                                : correction.preview.effects.customerDifference < 0
                                                    ? `Klient dostaje zwrot ${pln(-correction.preview.effects.customerDifference)}.`
                                                    : 'Klient nie dopłaca i nie dostaje zwrotu.'}
                                        </li>
                                    </Steps>
                                </Notice>
                            )}
                        </PriceBlock>
                    ) : (
                        <DocumentAmountFields
                            idPrefix="ed"
                            value={form.amounts}
                            onChange={amounts => setForm(prev => prev && ({ ...prev, amounts }))}
                            disabled={amountsLocked}
                        />
                    )}
                    {priceEdit && (
                        <DirectionHint>
                            Nowa kwota zastępuje ten dokument nowym z dzisiejszą datą. Datę wystawienia,
                            kontrahenta i opis zmienisz w nowym dokumencie.
                        </DirectionHint>
                    )}

                    <ModalSectionTitle>Daty</ModalSectionTitle>
                    <FormGrid>
                        <FormField>
                            <FieldLabel htmlFor="ed-issueDate">Data wystawienia</FieldLabel>
                            <InputShell>
                                <BareInput
                                    id="ed-issueDate"
                                    disabled={isKsefInvoice || priceEdit}
                                    type="date"
                                    value={shown.issueDate}
                                    onChange={set('issueDate')}
                                    required
                                    autoComplete="new-password"
                                />
                            </InputShell>
                        </FormField>

                        <FormField>
                            <FieldLabel htmlFor="ed-dueDate">
                                Termin płatności
                                {form.paymentMethod === PaymentMethod.TRANSFER && (
                                    <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>
                                )}
                            </FieldLabel>
                            <InputShell>
                                <BareInput
                                    id="ed-dueDate"
                                    disabled={isKsefInvoice}
                                    type="date"
                                    value={form.dueDate}
                                    onChange={set('dueDate')}
                                    required={form.paymentMethod === PaymentMethod.TRANSFER}
                                    autoComplete="new-password"
                                />
                            </InputShell>
                        </FormField>
                    </FormGrid>

                    <ModalSectionTitle>Kontrahent</ModalSectionTitle>
                    <FormGrid>
                        <FormField $fullWidth>
                            <FieldLabel htmlFor="ed-counterpartyName">Nazwa kontrahenta</FieldLabel>
                            <InputShell>
                                <BareInput
                                    id="ed-counterpartyName"
                                    disabled={isKsefInvoice || priceEdit}
                                    type="text"
                                    placeholder="Jan Kowalski / Firma Sp. z o.o."
                                    value={shown.counterpartyName}
                                    onChange={set('counterpartyName')}
                                    autoComplete="new-password"
                                />
                            </InputShell>
                        </FormField>

                        <FormField $fullWidth>
                            <FieldLabel htmlFor="ed-counterpartyNip">NIP</FieldLabel>
                            {isKsefInvoice ? (
                                <ReadOnlyValue id="ed-counterpartyNip">{form.counterpartyNip || 'Brak'}</ReadOnlyValue>
                            ) : (
                                <NipInputWithGus
                                    id="ed-counterpartyNip"
                                    disabled={priceEdit}
                                    value={shown.counterpartyNip}
                                    onChange={setField('counterpartyNip')}
                                    onFetch={handleGUSFetch}
                                    placeholder="1234567890"
                                />
                            )}
                        </FormField>
                    </FormGrid>

                    <ModalSectionTitle>Opis</ModalSectionTitle>
                    <FormGrid>
                        <FormField $fullWidth>
                            <FieldLabel htmlFor="ed-description">Opis / tytuł</FieldLabel>
                            <InputShellTextArea>
                                <BareTextArea
                                    id="ed-description"
                                    disabled={priceEdit}
                                    placeholder="Np. Detailing kompletny + powłoka ceramiczna"
                                    value={shown.description}
                                    onChange={set('description')}
                                    autoComplete="new-password"
                                />
                            </InputShellTextArea>
                        </FormField>
                    </FormGrid>
                </form>
            </ModalContent>

            <ModalFooter>
                <SharedButton $variant="secondary" type="button" onClick={onClose}>Anuluj</SharedButton>
                <SharedButton
                    $variant="primary"
                    type="submit"
                    form="edit-document-form"
                    disabled={updateDoc.isPending || isSettlementLocked || (priceEdit && !correction.canSave)}
                >
                    {updateDoc.isPending || correction.isSaving ? 'Zapisywanie…' : priceEdit ? 'Zapisz nową kwotę' : 'Zapisz zmiany'}
                </SharedButton>
            </ModalFooter>
        </ModalShell>
    );
};
