// src/modules/batch-orders/components/BatchServicesModal.tsx
//
// The service catalog behind "Zlecenia zbiorcze".
//
// Deliberately built out of the same primitives as EditableServicesTable
// (@/common/components/ServicesTable/styles): a studio that has learned to read one
// service list should not have to learn a second one. That includes the mobile
// behaviour those styles carry - under 640px the row collapses to name + gross with
// the actions beneath, because a five-column price table cannot be read on a phone.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Plus } from 'lucide-react';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { formatCurrency } from '@/common/utils';
import { MAX_2_DECIMALS, centsToInput, inputToCents, handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { netToGross, grossToNet } from '@/common/utils/priceAdjustment';
import { priceInputsForVatRate, storedPriceSide, type PriceSide } from '@/common/utils/priceInputs';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { SharedButton } from '@/common/styles';
import { InputShell, BareInput, Select } from '@/common/components/Form';
import * as S from '@/common/components/ServicesTable/styles';
import {
    useBatchServices,
    useCreateBatchService,
    useUpdateBatchService,
    useDeleteBatchService,
} from '../hooks/useBatchOrders';
import type { BatchService } from '../types';

const VAT_RATES = [23, 8, 5, 0, -1] as const;
const vatLabel = (rate: number) => (rate === -1 ? 'ZW' : `${rate}%`);

// ─── Local styles ─────────────────────────────────────────────────────────────

const Toolbar = styled.div`
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 10px;
    flex-wrap: wrap;
`;

// Wyszukiwarka i przyciski to teraz wspólne prymitywy (InputShell/BareInput,
// SharedButton, Select) - własne AddBtn/SearchInput/VatSelect w tym module
// zaszywały sky-blue #0ea5e9 na sztywno (nie szły za kolorem marki klienta)
// i miały prostokątny kształt obcy pigułkom reszty aplikacji.

/**
 * The editor opens under the row it edits rather than in an overlay: this list already
 * lives inside a modal, and a modal on a modal on a phone leaves nothing of the
 * context the operator is editing against.
 */
const EditPanel = styled.div`
    padding: 10px 14px 12px;
    /* Tint edytora liczony z koloru marki, nie zaszyty sky-blue: idzie za
       kolorem klienta i nie rozjeżdża się z resztą aplikacji. */
    background: color-mix(in srgb, var(--brand-primary) 6%, #ffffff);
    border-top: 1px dashed color-mix(in srgb, var(--brand-primary) 40%, #ffffff);
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const PanelRow = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 88px;
    gap: 8px;

    @media (max-width: 420px) {
        grid-template-columns: 1fr 1fr;
        > :last-child { grid-column: 1 / -1; }
    }
`;

const PanelActions = styled.div`
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    flex-wrap: wrap;
`;

const EmptyMsg = styled.div`
    padding: 28px 16px;
    text-align: center;
    font-size: 13px;
    color: #94a3b8;
`;

const HistoryNote = styled.p`
    margin: 10px 0 0;
    font-size: 11.5px;
    line-height: 1.5;
    color: #94a3b8;
`;

// ─── Editor state ─────────────────────────────────────────────────────────────

interface DraftState {
    name: string;
    netInput: string;
    grossInput: string;
    netCents: number;
    grossCents: number;
    vatRate: number;
    /** The price field the operator typed last - it survives a VAT change unchanged. */
    priceSide: PriceSide;
}

const emptyDraft = (): DraftState => ({
    name: '', netInput: '', grossInput: '', netCents: 0, grossCents: 0, vatRate: 23, priceSide: 'net',
});

const draftFrom = (service: BatchService): DraftState => ({
    name: service.name,
    netInput: centsToInput(service.netAmountCents),
    grossInput: centsToInput(service.grossAmountCents),
    netCents: service.netAmountCents,
    grossCents: service.grossAmountCents,
    vatRate: service.vatRate,
    priceSide: storedPriceSide(service.netAmountCents, service.grossAmountCents, service.vatRate),
});

const IconPencil = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const IconTrash = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    onClose: () => void;
}

export function BatchServicesModal({ onClose }: Props) {
    const [search, setSearch] = useState('');
    const { data: services, isLoading, isError } = useBatchServices();
    const createService = useCreateBatchService();
    const updateService = useUpdateBatchService();
    const deleteService = useDeleteBatchService();

    /** null = nothing open, '' = the "new position" editor, otherwise a service id. */
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DraftState>(emptyDraft);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<BatchService | null>(null);

    // Filtered on the client: the whole catalog is a short list a studio can scroll,
    // and filtering as you type beats a round trip per keystroke.
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        const all = services ?? [];
        return q ? all.filter(s => s.name.toLowerCase().includes(q)) : all;
    }, [services, search]);

    function openNew() {
        setDraft({ ...emptyDraft(), name: search.trim() });
        setError('');
        setEditingId('');
    }

    function openEdit(service: BatchService) {
        setDraft(draftFrom(service));
        setError('');
        setEditingId(service.id);
    }

    function closeEditor() {
        setEditingId(null);
        setError('');
    }

    // Typing net drives gross and typing gross drives net - the same contract as the
    // visit service editor, so a price entered from either side lands where expected.
    function handleNetChange(raw: string) {
        if (!MAX_2_DECIMALS.test(raw)) return;
        setError('');
        const net = Math.round((parseFloat(raw.replace(',', '.')) || 0) * 100);
        const gross = netToGross(net, draft.vatRate);
        setDraft(d => ({
            ...d,
            netInput: raw,
            netCents: net,
            grossCents: gross,
            grossInput: raw === '' ? '' : centsToInput(gross),
            priceSide: 'net',
        }));
    }

    function handleGrossChange(raw: string) {
        if (!MAX_2_DECIMALS.test(raw)) return;
        setError('');
        const gross = Math.round((parseFloat(raw.replace(',', '.')) || 0) * 100);
        const net = grossToNet(gross, draft.vatRate);
        setDraft(d => ({
            ...d,
            grossInput: raw,
            grossCents: gross,
            netCents: net,
            netInput: raw === '' ? '' : centsToInput(net),
            priceSide: 'gross',
        }));
    }

    // Changing VAT keeps the side the operator typed and re-derives the other
    // (CLAUDE.md §1). Keeping net unconditionally turned a gross typed as 1900,00 into
    // 1900,01 after 23% → 8% → 23%. Net still survives when net was typed, or when
    // nothing was typed and the stored pair cannot tell which side was entered - net is
    // the figure a contract is usually written in. The cents follow the fields, exactly
    // as they do while typing.
    function handleVatChange(vatRate: number) {
        setError('');
        setDraft(d => {
            const { net, gross } = priceInputsForVatRate(
                { net: d.netInput, gross: d.grossInput }, d.vatRate, vatRate, d.priceSide,
            );
            return {
                ...d,
                vatRate,
                netInput: net,
                grossInput: gross,
                netCents: inputToCents(net),
                grossCents: inputToCents(gross),
            };
        });
    }

    async function handleSave() {
        const name = draft.name.trim();
        if (name.length < 2) { setError('Nazwa musi mieć co najmniej 2 znaki'); return; }
        if (draft.netCents <= 0 && draft.grossCents <= 0) { setError('Podaj cenę netto lub brutto'); return; }

        const payload = {
            name,
            netAmountCents: draft.netCents,
            grossAmountCents: draft.grossCents,
            vatRate: draft.vatRate,
        };

        setSaving(true);
        try {
            if (editingId) {
                await updateService.mutateAsync({ serviceId: editingId, data: payload });
            } else {
                await createService.mutateAsync(payload);
            }
            closeEditor();
        } catch (e: unknown) {
            const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(message || 'Nie udało się zapisać. Spróbuj ponownie.');
        } finally {
            setSaving(false);
        }
    }

    const editor = (
        <EditPanel onClick={e => e.stopPropagation()}>
            <div>
                <S.DiscountSectionLabel>Nazwa</S.DiscountSectionLabel>
                <S.EditNameInput
                    value={draft.name}
                    onChange={e => { setDraft(d => ({ ...d, name: capitalizeFirst(e.target.value) })); setError(''); }}
                    placeholder="np. Mycie zewnętrzne"
                    autoFocus
                />
            </div>
            <PanelRow>
                <S.EditPriceField>
                    <S.EditPriceFieldLabel>Netto (zł)</S.EditPriceFieldLabel>
                    <S.EditPriceInput
                        type="text"
                        inputMode="decimal"
                        value={draft.netInput}
                        onChange={e => handleNetChange(e.target.value)}
                        onKeyDown={handleZeroAwareKeyDown(draft.netInput, handleNetChange)}
                        placeholder="0,00"
                    />
                </S.EditPriceField>
                <S.EditPriceField>
                    <S.EditPriceFieldLabel>Brutto (zł)</S.EditPriceFieldLabel>
                    <S.EditPriceInput
                        type="text"
                        inputMode="decimal"
                        value={draft.grossInput}
                        onChange={e => handleGrossChange(e.target.value)}
                        onKeyDown={handleZeroAwareKeyDown(draft.grossInput, handleGrossChange)}
                        placeholder="0,00"
                    />
                </S.EditPriceField>
                <S.EditPriceField>
                    <S.EditPriceFieldLabel>VAT</S.EditPriceFieldLabel>
                    <Select
                        $compact
                        value={draft.vatRate}
                        onChange={e => handleVatChange(Number(e.target.value))}
                    >
                        {VAT_RATES.map(r => (
                            <option key={r} value={r}>{vatLabel(r)}</option>
                        ))}
                    </Select>
                </S.EditPriceField>
            </PanelRow>
            {error && <S.EditErrorMsg>{error}</S.EditErrorMsg>}
            <PanelActions>
                <SharedButton $variant="secondary" $size="sm" type="button" onClick={closeEditor} disabled={saving}>
                    Anuluj
                </SharedButton>
                <SharedButton $variant="primary" $size="sm" type="button" onClick={handleSave} disabled={saving}>
                    {saving ? 'Zapisywanie...' : 'Zapisz'}
                </SharedButton>
            </PanelActions>
        </EditPanel>
    );

    return (
        <>
            <ModalShell isOpen onClose={onClose} size="lg">
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle>Zarządzaj usługami</ModalTitle>
                        <ModalSubtitle>Pozycje podpowiadane przy dodawaniu wpisu</ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={onClose} />
                </ModalHeader>

                <ModalContent>
                    <Toolbar>
                        <InputShell $compact style={{ flex: '1 1 180px' }}>
                            <BareInput
                                $compact
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Szukaj usługi..."
                                aria-label="Szukaj usługi"
                            />
                        </InputShell>
                        <SharedButton
                            $variant="primary"
                            $size="sm"
                            type="button"
                            onClick={openNew}
                            disabled={editingId === ''}
                        >
                            <Plus size={15} /> Dodaj usługę
                        </SharedButton>
                    </Toolbar>

                    <S.ServicesBlock>
                        <S.ServicesTableHeader>
                            <S.ServicesHeaderCell>Usługa</S.ServicesHeaderCell>
                            <S.ServicesHeaderCell>Netto</S.ServicesHeaderCell>
                            <S.ServicesHeaderCell>VAT</S.ServicesHeaderCell>
                            <S.ServicesHeaderCell>Brutto</S.ServicesHeaderCell>
                            <S.ServicesHeaderCell />
                        </S.ServicesTableHeader>

                        <S.ServicesList>
                            {editingId === '' && (
                                <S.ServiceItem>{editor}</S.ServiceItem>
                            )}

                            {isLoading && <EmptyMsg>Ładowanie...</EmptyMsg>}
                            {isError && <EmptyMsg>Nie udało się wczytać usług.</EmptyMsg>}

                            {!isLoading && !isError && visible.length === 0 && editingId !== '' && (
                                <EmptyMsg>
                                    {search.trim()
                                        ? 'Brak usług pasujących do wyszukiwania.'
                                        : 'Brak zapisanych usług. Pozycja wpisana we wpisie zapisze się tu automatycznie.'}
                                </EmptyMsg>
                            )}

                            {visible.map(service => (
                                <S.ServiceItem key={service.id}>
                                    <S.ServiceItemRow>
                                        <S.ServiceNameWrap>
                                            <S.ServiceName title={service.name}>{service.name}</S.ServiceName>
                                        </S.ServiceNameWrap>
                                        <S.PriceDisplay>
                                            <S.PriceDisplayMain>
                                                {formatCurrency(service.netAmountCents / 100)}
                                            </S.PriceDisplayMain>
                                        </S.PriceDisplay>
                                        <S.VatCell>{vatLabel(service.vatRate)}</S.VatCell>
                                        <S.PriceDisplay>
                                            <S.PriceDisplayMain $isBrutto>
                                                {formatCurrency(service.grossAmountCents / 100)}
                                            </S.PriceDisplayMain>
                                        </S.PriceDisplay>
                                        <S.ServiceActions>
                                            <S.EditButton
                                                type="button"
                                                title="Edytuj"
                                                aria-label={`Edytuj ${service.name}`}
                                                onClick={() => (editingId === service.id ? closeEditor() : openEdit(service))}
                                            >
                                                <IconPencil />
                                            </S.EditButton>
                                            <S.DeleteButton
                                                type="button"
                                                title="Usuń"
                                                aria-label={`Usuń ${service.name}`}
                                                onClick={() => setConfirmDelete(service)}
                                            >
                                                <IconTrash />
                                            </S.DeleteButton>
                                        </S.ServiceActions>
                                    </S.ServiceItemRow>
                                    {editingId === service.id && editor}
                                </S.ServiceItem>
                            ))}
                        </S.ServicesList>
                    </S.ServicesBlock>

                    <HistoryNote>
                        Zmiany dotyczą wyłącznie podpowiedzi przy kolejnych wpisach. Wpisy już
                        zapisane - w tym rozliczone - przechowują własną kopię nazwy i kwot, więc
                        edycja ani usunięcie pozycji ich nie zmieni.
                    </HistoryNote>
                </ModalContent>

                <ModalFooter>
                    <SharedButton $variant="secondary" type="button" onClick={onClose}>Zamknij</SharedButton>
                </ModalFooter>
            </ModalShell>

            <ConfirmationModal
                isOpen={confirmDelete !== null}
                title="Usuń usługę"
                message={`Usunąć „${confirmDelete?.name}" z listy podpowiedzi? Wpisy, w których ta usługa już wystąpiła, pozostaną bez zmian.`}
                variant="danger"
                confirmText="Usuń"
                cancelText="Anuluj"
                onConfirm={() => {
                    if (confirmDelete) {
                        if (editingId === confirmDelete.id) closeEditor();
                        deleteService.mutateAsync(confirmDelete.id).catch(() => undefined);
                    }
                    setConfirmDelete(null);
                }}
                onCancel={() => setConfirmDelete(null)}
            />
        </>
    );
}
