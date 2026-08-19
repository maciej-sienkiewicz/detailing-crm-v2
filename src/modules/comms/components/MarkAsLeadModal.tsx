// src/modules/comms/components/MarkAsLeadModal.tsx
// Oznaczenie rozmowy jako leada. Dwa pola i ani jednego więcej — resztę system wie
// sam: kontakt z wątku, klienta po adresie, treść pierwszej wiadomości, a markę
// i model auta odczytuje z korespondencji już po zapisaniu (backend, LLM).
//
//  • TAGI — wielokrotny wybór. Jedno zapytanie potrafi dotyczyć folii z przodu,
//    korekty reszty lakieru i powłoki na koniec; pojedyncza kategoria kazała wybrać
//    jedną z nich i przekłamywała odpowiedź na pytanie „o co klienci pytają".
//  • USŁUGI — schowane za przyciskiem. Wycena na etapie oznaczania to wyjątek, nie
//    reguła: zwykle wiadomo, o czym jest rozmowa, a nie ile to będzie kosztować.
//    Wyszukiwarka cennika otwarta od razu sugerowałaby, że trzeba ją wypełnić.
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Check, Minus, Plus, Search, Tag as TagIcon, X } from 'lucide-react';
import { Modal } from '@/common/components/Modal';
import { useServices } from '@/modules/services';
import { useToast } from '@/common/components/Toast';
import { useLeadDictionaries, useMarkThreadAsLead } from '../hooks/useLeads';
import type { LeadServiceItemInput } from '../types';
import { EmptyHint, IconButton, PrimaryButton, formatGrosze } from './shared';

const Body = styled.div`
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 4px 0 8px;
`;

const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const FieldLabel = styled.div`
    font-size: 12px;
    font-weight: ${p => p.theme.fontWeights.semibold};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
`;

const FieldHint = styled.p`
    margin: 0;
    font-size: 12.5px;
    color: ${p => p.theme.colors.textSecondary};
`;

const TagGrid = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

/** Zaznaczenie musi być widoczne bez najeżdżania — to pole wielokrotnego wyboru. */
const TagChip = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
    background: ${({ $active }) => ($active ? '#f0f9ff' : '#ffffff')};
    color: ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.textSecondary)};
    font-weight: ${({ $active, theme }) =>
        $active ? theme.fontWeights.semibold : theme.fontWeights.normal};
    border-radius: ${p => p.theme.radii.full};
    padding: 7px 14px;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};

    &:hover { border-color: ${p => p.theme.colors.primary}; }
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
        font-size: 13.5px;
        font-family: inherit;
        color: ${p => p.theme.colors.text};
        background: transparent;
    }
`;

const ServiceList = styled.div`
    max-height: 220px;
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

const Footer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border-top: 1px solid ${p => p.theme.colors.border};
    padding-top: 14px;

    .total {
        font-size: 15px;
        font-weight: ${p => p.theme.fontWeights.bold};
        color: ${p => p.theme.colors.text};

        small {
            display: block;
            font-size: 11.5px;
            font-weight: ${p => p.theme.fontWeights.normal};
            color: ${p => p.theme.colors.textMuted};
        }
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

    const total = useMemo(
        () => selected.reduce((sum, item) => sum + item.priceGross * item.quantity, 0),
        [selected]
    );

    const toggleTag = (code: string) =>
        setTags((current) =>
            current.includes(code) ? current.filter((entry) => entry !== code) : [...current, code]
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
        <Modal isOpen onClose={onClose} title="Oznacz jako lead">
            <Body>
                <Field>
                    <FieldLabel>Tagi</FieldLabel>
                    <FieldHint>
                        Czego dotyczy zapytanie. Możesz wybrać kilka — po nich liczy się,
                        o co klienci pytają najczęściej.
                    </FieldHint>
                    <TagGrid>
                        {(dictionaries?.tags ?? []).map((entry) => (
                            <TagChip
                                key={entry.code}
                                type="button"
                                $active={tags.includes(entry.code)}
                                aria-pressed={tags.includes(entry.code)}
                                onClick={() => toggleTag(entry.code)}
                            >
                                {tags.includes(entry.code) ? <Check size={13} /> : <TagIcon size={13} />}
                                {entry.label}
                            </TagChip>
                        ))}
                    </TagGrid>
                </Field>

                <Field>
                    <FieldLabel>Usługi</FieldLabel>
                    {!servicesOpen ? (
                        <>
                            <FieldHint>
                                Jeśli wiadomo już, o jakie usługi chodzi, dopisz je — wartość
                                zapytania policzy się z cennika.
                            </FieldHint>
                            <IconButton
                                type="button"
                                style={{ alignSelf: 'flex-start' }}
                                onClick={() => setServicesOpen(true)}
                            >
                                <Plus /> Dodaj usługi
                            </IconButton>
                        </>
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

                <Footer>
                    <div className="total">
                        {total > 0 ? formatGrosze(total) : '—'}
                        <small>wartość potencjalnego zlecenia</small>
                    </div>
                    <PrimaryButton onClick={submit} disabled={markAsLead.isPending}>
                        {markAsLead.isPending ? 'Zapisywanie…' : 'Utwórz lead'}
                    </PrimaryButton>
                </Footer>
            </Body>
        </Modal>
    );
}
