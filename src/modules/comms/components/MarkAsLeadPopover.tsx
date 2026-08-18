// src/modules/comms/components/MarkAsLeadPopover.tsx
// Jedno kliknięcie → lead. Lekki popover: wyszukiwarka usług z katalogu, klikane
// pozycje, suma licząca się na żywo. Wszystko poza usługami wypełnia się samo.
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Check, Minus, Plus, Search, X } from 'lucide-react';
import { useServices } from '@/modules/services';
import { useToast } from '@/common/components/Toast';
import { useLeadDictionaries, useMarkThreadAsLead } from '../hooks/useLeads';
import type { LeadServiceItemInput } from '../types';
import { EmptyHint, PrimaryButton, formatGrosze } from './shared';

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 60;
`;

const Popover = styled.div`
    position: absolute;
    top: 46px;
    right: 0;
    z-index: 61;
    width: 360px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(17, 24, 39, 0.14);
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 1px solid #eef0f2;

    h4 { margin: 0; font-size: 14px; font-weight: 600; color: #111827; }
    button { border: none; background: none; color: #9ca3af; cursor: pointer; padding: 2px; }
`;

const SearchBox = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 10px 14px 0;
    padding: 7px 10px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    color: #9ca3af;

    input {
        border: none;
        outline: none;
        flex: 1;
        font-size: 13px;
        color: #111827;
    }
`;

const ServiceList = styled.div`
    max-height: 220px;
    overflow-y: auto;
    padding: 8px 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const ServiceRow = styled.button<{ $selected: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px;
    border: none;
    border-radius: 8px;
    background: ${({ $selected }) => ($selected ? '#f0fdf4' : 'transparent')};
    cursor: pointer;
    text-align: left;

    &:hover { background: ${({ $selected }) => ($selected ? '#f0fdf4' : '#f9fafb')}; }

    .name { font-size: 13px; color: #111827; }
    .price { font-size: 12px; color: #6b7280; white-space: nowrap; }
`;

const SelectedList = styled.div`
    border-top: 1px solid #eef0f2;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 160px;
    overflow-y: auto;
`;

const SelectedRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #374151;

    .grow { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .qty { display: inline-flex; align-items: center; gap: 4px; color: #6b7280; }
    .qty button {
        border: 1px solid #e5e7eb; background: #fff; border-radius: 4px;
        width: 18px; height: 18px; display: inline-flex; align-items: center;
        justify-content: center; cursor: pointer; color: #6b7280; padding: 0;
    }
`;

const CategoryRow = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 0 14px 4px;
`;

const CategoryChip = styled.button<{ $active: boolean }>`
    border: 1px solid ${({ $active }) => ($active ? '#111827' : '#e5e7eb')};
    background: ${({ $active }) => ($active ? '#111827' : '#ffffff')};
    color: ${({ $active }) => ($active ? '#ffffff' : '#6b7280')};
    border-radius: 999px;
    font-size: 11px;
    padding: 4px 10px;
    cursor: pointer;
`;

const Footer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-top: 1px solid #eef0f2;
    background: #fafafa;

    .total { font-size: 14px; font-weight: 700; color: #111827; }
    .total small { display: block; font-size: 11px; font-weight: 500; color: #9ca3af; }
`;

interface SelectedService {
    serviceId: string;
    name: string;
    priceGross: number;
    quantity: number;
}

interface MarkAsLeadPopoverProps {
    threadId: string;
    onClose: () => void;
    onCreated: (leadId: string) => void;
}

export function MarkAsLeadPopover({ threadId, onClose, onCreated }: MarkAsLeadPopoverProps) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<SelectedService[]>([]);
    const [category, setCategory] = useState<string | undefined>();
    const { services, isLoading } = useServices({ search, page: 1, limit: 30, showInactive: false });
    const { data: dictionaries } = useLeadDictionaries();
    const markAsLead = useMarkThreadAsLead();
    const { showSuccess, showError } = useToast();

    const total = useMemo(
        () => selected.reduce((sum, item) => sum + item.priceGross * item.quantity, 0),
        [selected]
    );

    const toggle = (serviceId: string, name: string, priceGross: number) => {
        setSelected((current) => {
            const existing = current.find((item) => item.serviceId === serviceId);
            if (existing) return current.filter((item) => item.serviceId !== serviceId);
            return [...current, { serviceId, name, priceGross, quantity: 1 }];
        });
    };

    const changeQuantity = (serviceId: string, delta: number) => {
        setSelected((current) =>
            current
                .map((item) =>
                    item.serviceId === serviceId
                        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
                        : item
                )
        );
    };

    const submit = () => {
        const payload: LeadServiceItemInput[] = selected.map((item) => ({
            serviceId: item.serviceId,
            quantity: item.quantity,
        }));
        markAsLead.mutate(
            { threadId, request: { category, services: payload } },
            {
                onSuccess: (result) => {
                    showSuccess('Lead utworzony', `Wartość zapytania: ${formatGrosze(result.estimatedValue)}`);
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
        <>
            <Overlay onClick={onClose} />
            <Popover>
                <Header>
                    <h4>Oznacz jako lead</h4>
                    <button onClick={onClose} aria-label="Zamknij"><X size={16} /></button>
                </Header>

                <CategoryRow style={{ paddingTop: 10 }}>
                    {(dictionaries?.categories ?? []).map((entry) => (
                        <CategoryChip
                            key={entry.code}
                            $active={category === entry.code}
                            onClick={() => setCategory(category === entry.code ? undefined : entry.code)}
                        >
                            {entry.label}
                        </CategoryChip>
                    ))}
                </CategoryRow>

                <SearchBox>
                    <Search size={14} />
                    <input
                        autoFocus
                        placeholder="Szukaj usługi z cennika…"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </SearchBox>

                <ServiceList>
                    {isLoading && <EmptyHint>Wczytywanie cennika…</EmptyHint>}
                    {!isLoading && services.length === 0 && <EmptyHint>Brak usług</EmptyHint>}
                    {services.map((service) => {
                        const isSelected = selected.some((item) => item.serviceId === service.id);
                        return (
                            <ServiceRow
                                key={service.id}
                                $selected={isSelected}
                                onClick={() => toggle(service.id, service.name, service.basePriceGross)}
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
                                    <button onClick={() => changeQuantity(item.serviceId, -1)} aria-label="Mniej">
                                        <Minus size={11} />
                                    </button>
                                    {item.quantity}
                                    <button onClick={() => changeQuantity(item.serviceId, 1)} aria-label="Więcej">
                                        <Plus size={11} />
                                    </button>
                                </span>
                                <span>{formatGrosze(item.priceGross * item.quantity)}</span>
                            </SelectedRow>
                        ))}
                    </SelectedList>
                )}

                <Footer>
                    <div className="total">
                        {formatGrosze(total)}
                        <small>wartość potencjalnego zlecenia</small>
                    </div>
                    <PrimaryButton onClick={submit} disabled={markAsLead.isPending}>
                        {markAsLead.isPending ? 'Zapisywanie…' : 'Utwórz lead'}
                    </PrimaryButton>
                </Footer>
            </Popover>
        </>
    );
}
