// src/modules/batch-orders/components/BatchServicesModal.tsx
//
// The service catalog behind "Zlecenia zbiorcze".
//
// Deliberately built out of the same primitives as EditableServicesTable
// (@/common/components/ServicesTable/styles): a studio that has learned to read one
// service list should not have to learn a second one. That includes the mobile
// behaviour those styles carry — under 640px the row collapses to name + gross with
// the actions beneath, because a five-column price table cannot be read on a phone.

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { formatCurrency } from '@/common/utils';
import { MAX_2_DECIMALS, centsToInput, handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { netToGross, grossToNet } from '@/common/utils/priceAdjustment';
import {
    ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle,
    ModalContent, ModalFooter, CloseBtn,
} from '@/common/components/ModalKit';
import { ConfirmationModal } from '@/common/components/ConfirmationModal';
import { SharedButton } from '@/common/styles';
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

const SearchInput = styled.input`
    flex: 1 1 180px;
    min-width: 0;
    padding: 8px 12px;
    font-size: 13px;
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    color: #0f172a;
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
    transition: all 150ms ease;

    &:focus { border-color: #0ea5e9; box-shadow: 0 0 0 2px rgba(14,165,233,0.12); }
    &::placeholder { color: #b0bec5; }

    @media (hover: none) and (pointer: coarse) { min-height: 44px; }
`;

const AddBtn = styled.button`
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    background: #0ea5e9;
    border: none;
    border-radius: 9px;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: background 150ms ease;

    &:hover { background: #0284c7; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }

    @media (hover: none) and (pointer: coarse) { min-height: 44px; }
`;

/**
 * The editor opens under the row it edits rather than in an overlay: this list already
 * lives inside a modal, and a modal on a modal on a phone leaves nothing of the
 * context the operator is editing against.
 */
const EditPanel = styled.div`
    padding: 10px 14px 12px;
    background: #f0f9ff;
    border-top: 1px dashed #bae6fd;
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

const VatSelect = styled.select`
    width: 100%;
    padding: 8px 10px;
    font-size: 13px;
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    color: #0f172a;
    outline: none;
    font-family: inherit;
    box-sizing: border-box;
    cursor: pointer;

    &:focus { border-color: #0ea5e9; }

    @media (hover: none) and (pointer: coarse) { min-height: 44px; }
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
}

const emptyDraft = (): DraftState => ({
    name: '', netInput: '', grossInput: '', netCents: 0, grossCents: 0, vatRate: 23,
});

const draftFrom = (service: BatchService): DraftState => ({
    name: service.name,
    netInput: centsToInput(service.netAmountCents),
    grossInput: centsToInput(service.grossAmountCents),
    netCents: service.netAmountCents,
    grossCents: service.grossAmountCents,
    vatRate: service.vatRate,
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

    // Typing net drives gross and typing gross drives net — the same contract as the
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
        }));
    }

    // Changing VAT keeps net and re-derives gross: net is the figure a contract is
    // usually written in, so it is the one that should survive the rate change.
    function handleVatChange(vatRate: number) {
        setError('');
        setDraft(d => {
            const gross = netToGross(d.netCents, vatRate);
            return {
                ...d,
                vatRate,
                grossCents: gross,
                grossInput: d.netInput === '' ? '' : centsToInput(gross),
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
                    <VatSelect
                        value={draft.vatRate}
                        onChange={e => handleVatChange(Number(e.target.value))}
                    >
                        {VAT_RATES.map(r => (
                            <option key={r} value={r}>{vatLabel(r)}</option>
                        ))}
                    </VatSelect>
                </S.EditPriceField>
            </PanelRow>
            {error && <S.EditErrorMsg>{error}</S.EditErrorMsg>}
            <PanelActions>
                <S.DiscountRemoveButton type="button" onClick={closeEditor} disabled={saving}>
                    Anuluj
                </S.DiscountRemoveButton>
                <AddBtn type="button" onClick={handleSave} disabled={saving}>
                    {saving ? 'Zapisywanie...' : 'Zapisz'}
                </AddBtn>
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
                        <SearchInput
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Szukaj usługi..."
                            aria-label="Szukaj usługi"
                        />
                        <AddBtn type="button" onClick={openNew} disabled={editingId === ''}>
                            + Dodaj usługę
                        </AddBtn>
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
                        zapisane — w tym rozliczone — przechowują własną kopię nazwy i kwot, więc
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
