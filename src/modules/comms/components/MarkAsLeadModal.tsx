// src/modules/comms/components/MarkAsLeadModal.tsx
// Oznaczenie rozmowy jako leada. Dwa pola i ani jednego więcej — resztę system wie
// sam: kontakt z wątku, klienta po adresie, treść pierwszej wiadomości, a markę
// i model auta odczytuje z korespondencji już po zapisaniu (backend, LLM).
//
//  • Okno jest celowo małe — to potwierdzenie decyzji, a nie formularz. Rozwlekłe
//    objaśnienia pod polami kazałyby je czytać za każdym razem, choć wystarczy raz.
//  • TAGI — dropdown wielokrotnego wyboru, ten sam wzorzec co „Kolor w kalendarzu”
//    przy przyjęciu: lista zamknięta w menu nie rozpycha okna, gdy tagów przybędzie.
//  • USŁUGI — schowane za przyciskiem. Wycena na etapie oznaczania to wyjątek, nie
//    reguła: zwykle wiadomo, o czym jest rozmowa, a nie ile to będzie kosztować.
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Check, Minus, Plus, Search, X } from 'lucide-react';
import {
    ModalShell,
    ModalHeader,
    ModalTitleGroup,
    ModalTitle,
    ModalContent,
    ModalFooter,
    CloseBtn,
} from '@/common/components/ModalKit';
import { useServices } from '@/modules/services';
import { useToast } from '@/common/components/Toast';
import { useLeadDictionaries, useMarkThreadAsLead } from '../hooks/useLeads';
import { TagMultiSelect } from './TagMultiSelect';
import { useTagCatalogActions } from '../hooks/useTagCatalogActions';
import type { LeadServiceItemInput } from '../types';
import { EmptyHint, IconButton, PrimaryButton, formatGrosze } from './shared';

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 7px;
`;

const FieldLabel = styled.div`
    font-size: 11.5px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
`;

// ─── Usługi ───────────────────────────────────────────────────────────────────

const WideButton = styled(IconButton)`
    width: 100%;
    border-radius: ${p => p.theme.radii.md};
    padding: 10px 14px;
    border-style: dashed;
`;

const SearchBox = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    padding: 9px 12px;
    color: ${p => p.theme.colors.textMuted};

    input {
        border: none;
        outline: none;
        flex: 1;
        min-width: 0;
        font-size: 13.5px;
        font-family: inherit;
        color: ${p => p.theme.colors.text};
        background: transparent;
    }
`;

const ServiceList = styled.div`
    max-height: 190px;
    overflow-y: auto;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
`;

const ServiceRow = styled.button<{ $selected: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    border: none;
    border-bottom: 1px solid ${p => p.theme.colors.surfaceAlt};
    background: ${({ $selected }) => ($selected ? '#f0f9ff' : '#ffffff')};
    padding: 9px 12px;
    font-family: inherit;
    font-size: 13.5px;
    text-align: left;
    cursor: pointer;

    &:last-child { border-bottom: none; }
    &:hover { background: ${({ $selected }) => ($selected ? '#e0f2fe' : '#f8fafc')}; }

    .name { color: ${p => p.theme.colors.text}; }
    .price { color: ${p => p.theme.colors.textMuted}; white-space: nowrap; }
`;

const SelectedList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const SelectedRow = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: ${p => p.theme.colors.text};

    .grow { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .qty {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: ${p => p.theme.colors.textSecondary};

        button {
            border: 1px solid ${p => p.theme.colors.border};
            background: #ffffff;
            border-radius: ${p => p.theme.radii.sm};
            width: 22px;
            height: 22px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: ${p => p.theme.colors.textSecondary};
        }
    }
`;

const Total = styled.div`
    margin-right: auto;
    font-size: 15px;
    font-weight: ${p => p.theme.fontWeights.bold};
    color: ${p => p.theme.colors.text};

    small {
        display: block;
        font-size: 11.5px;
        font-weight: ${p => p.theme.fontWeights.normal};
        color: ${p => p.theme.colors.textMuted};
    }
`;

interface SelectedService {
    serviceId: string;
    name: string;
    priceGross: number;
    quantity: number;
}

interface MarkAsLeadModalProps {
    threadId: string;
    onClose: () => void;
    onCreated: (leadId: string) => void;
}

export function MarkAsLeadModal({ threadId, onClose, onCreated }: MarkAsLeadModalProps) {
    const [tags, setTags] = useState<string[]>([]);
    const [servicesOpen, setServicesOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<SelectedService[]>([]);

    // Cennik pobieramy dopiero, gdy ktoś poprosi o usługi — dopóki sekcja jest
    // zwinięta, oznaczenie leada nie kosztuje ani jednego zapytania o katalog.
    const { services, isLoading } = useServices({
        search,
        page: 1,
        limit: 30,
        showInactive: false,
        enabled: servicesOpen,
    });
    const { data: dictionaries } = useLeadDictionaries();
    const markAsLead = useMarkThreadAsLead();
    const { showSuccess, showError } = useToast();
    // Dodawanie i kasowanie tagów w słowniku — ta sama obsługa co przy edycji z tabeli.
    const tagActions = useTagCatalogActions((code) =>
        setTags((current) => (current.includes(code) ? current : [...current, code]))
    );

    const total = useMemo(
        () => selected.reduce((sum, item) => sum + item.priceGross * item.quantity, 0),
        [selected]
    );

    const toggleService = (serviceId: string, name: string, priceGross: number) =>
        setSelected((current) =>
            current.some((item) => item.serviceId === serviceId)
                ? current.filter((item) => item.serviceId !== serviceId)
                : [...current, { serviceId, name, priceGross, quantity: 1 }]
        );

    const changeQuantity = (serviceId: string, delta: number) =>
        setSelected((current) =>
            current.map((item) =>
                item.serviceId === serviceId
                    ? { ...item, quantity: Math.max(1, item.quantity + delta) }
                    : item
            )
        );

    const submit = () => {
        const payload: LeadServiceItemInput[] = selected.map((item) => ({
            serviceId: item.serviceId,
            quantity: item.quantity,
        }));
        markAsLead.mutate(
            { threadId, request: { tags, services: payload } },
            {
                onSuccess: (result) => {
                    showSuccess(
                        'Lead utworzony',
                        result.estimatedValue > 0
                            ? `Wartość zapytania: ${formatGrosze(result.estimatedValue)}`
                            : 'Znajdziesz go w zakładce Leady'
                    );
                    onCreated(result.leadId);
                    onClose();
                },
                onError: (error) => {
                    const message =
                        (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    showError('Nie udało się utworzyć leada', message ?? 'Spróbuj ponownie');
                },
            }
        );
    };

    return (
        <ModalShell isOpen onClose={onClose} size="sm">
            <ModalHeader>
                <ModalTitleGroup>
                    <ModalTitle>Oznacz jako lead</ModalTitle>
                </ModalTitleGroup>
                <CloseBtn onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Body>
                    <Field>
                        <FieldLabel>Tagi</FieldLabel>
                        <TagMultiSelect
                            options={dictionaries?.tags ?? []}
                            value={tags}
                            onChange={setTags}
                            onCreate={tagActions.onCreate}
                            onDelete={tagActions.onDelete}
                            isCreating={tagActions.isCreating}
                        />
                    </Field>

                    <Field>
                        <FieldLabel>Usługi</FieldLabel>
                        {!servicesOpen ? (
                            <WideButton type="button" onClick={() => setServicesOpen(true)}>
                                <Plus /> Dodaj usługi
                            </WideButton>
                        ) : (
                            <>
                                <SearchBox>
                                    <Search size={14} />
                                    <input
                                        autoFocus
                                        placeholder="Szukaj usługi z cennika…"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => { setServicesOpen(false); setSearch(''); }}
                                        aria-label="Zwiń wyszukiwarkę usług"
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
                                    >
                                        <X size={14} />
                                    </button>
                                </SearchBox>

                                <ServiceList>
                                    {isLoading && <EmptyHint>Wczytywanie cennika…</EmptyHint>}
                                    {!isLoading && services.length === 0 && <EmptyHint>Brak usług</EmptyHint>}
                                    {services.map((service) => {
                                        const isSelected = selected.some((item) => item.serviceId === service.id);
                                        return (
                                            <ServiceRow
                                                key={service.id}
                                                type="button"
                                                $selected={isSelected}
                                                onClick={() => toggleService(service.id, service.name, service.basePriceGross)}
                                            >
                                                <span className="name">
                                                    {isSelected && <Check size={13} style={{ marginRight: 4, verticalAlign: -2 }} />}
                                                    {service.name}
                                                </span>
                                                <span className="price">{formatGrosze(service.basePriceGross)}</span>
                                            </ServiceRow>
                                        );
                                    })}
                                </ServiceList>

                                {selected.length > 0 && (
                                    <SelectedList>
                                        {selected.map((item) => (
                                            <SelectedRow key={item.serviceId}>
                                                <span className="grow">{item.name}</span>
                                                <span className="qty">
                                                    <button type="button" onClick={() => changeQuantity(item.serviceId, -1)} aria-label="Mniej">
                                                        <Minus size={11} />
                                                    </button>
                                                    {item.quantity}
                                                    <button type="button" onClick={() => changeQuantity(item.serviceId, 1)} aria-label="Więcej">
                                                        <Plus size={11} />
                                                    </button>
                                                </span>
                                                <span>{formatGrosze(item.priceGross * item.quantity)}</span>
                                            </SelectedRow>
                                        ))}
                                    </SelectedList>
                                )}
                            </>
                        )}
                    </Field>
                </Body>
            </ModalContent>
            <ModalFooter>
                <Total>
                    {total > 0 ? formatGrosze(total) : '—'}
                    <small>wartość potencjalnego zlecenia</small>
                </Total>
                <PrimaryButton onClick={submit} disabled={markAsLead.isPending}>
                    {markAsLead.isPending ? 'Zapisywanie…' : 'Utwórz lead'}
                </PrimaryButton>
            </ModalFooter>
        </ModalShell>
    );
}
