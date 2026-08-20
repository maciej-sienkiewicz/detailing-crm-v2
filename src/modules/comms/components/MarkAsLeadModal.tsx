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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import { Check, ChevronDown, Loader2, Minus, Plus, Search, Trash2, X } from 'lucide-react';
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
import {
    useCreateLeadTag,
    useDeleteLeadTag,
    useLeadDictionaries,
    useMarkThreadAsLead,
} from '../hooks/useLeads';
import type { LeadServiceItemInput } from '../types';
import { EmptyHint, IconButton, PrimaryButton, formatGrosze } from './shared';

const spin = keyframes`
    to { transform: rotate(360deg); }
`;

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

// ─── Dropdown tagów ───────────────────────────────────────────────────────────
// Ten sam mechanizm co ColorDropdown w przyjęciu pojazdu: menu w portalu, pozycja
// liczona od triggera, zamykanie kliknięciem obok. Różnica jest jedna — wybór jest
// wielokrotny, więc menu zostaje otwarte po kliknięciu pozycji.

const SelectContainer = styled.div`
    position: relative;
`;

const SelectTrigger = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 13px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    background: ${p => p.theme.colors.surface};
    cursor: pointer;
    transition: all ${p => p.theme.transitions.fast};
    font-size: 13.5px;
    font-family: inherit;
    color: ${p => p.theme.colors.text};
    text-align: left;

    &:hover { border-color: ${p => p.theme.colors.textMuted}; }
    &:focus-visible {
        outline: none;
        border-color: ${p => p.theme.colors.primary};
    }

    .value {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .placeholder { color: ${p => p.theme.colors.textMuted}; }
    svg { flex-shrink: 0; color: ${p => p.theme.colors.textMuted}; }
`;

const SelectMenu = styled.div`
    position: fixed;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.md};
    box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
    padding: 4px 0;
    z-index: 9999;
    overflow-y: auto;
`;

const SelectOption = styled.button<{ $selected: boolean }>`
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 12px;
    border: none;
    background: ${({ $selected, theme }) => ($selected ? theme.colors.surfaceAlt : 'transparent')};
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: ${({ $selected, theme }) =>
        $selected ? theme.fontWeights.semibold : theme.fontWeights.normal};
    color: ${p => p.theme.colors.text};

    &:hover { background: ${p => p.theme.colors.surfaceHover}; }
`;

/** Kwadracik zaznaczenia — bez niego nie widać, że wyborów może być kilka. */
const OptionBox = styled.span<{ $selected: boolean }>`
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: ${p => p.theme.radii.sm};
    border: 1.5px solid
        ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
    background: ${({ $selected, theme }) => ($selected ? theme.colors.primary : 'transparent')};
    color: #ffffff;
`;

/**
 * Wiersz opcji trzyma dwa cele kliknięcia: całą pozycję (zaznacz) i kosz (usuń ze
 * słownika). Kosz pojawia się dopiero po najechaniu na wiersz — stale widoczny przy
 * każdym tagu robiłby z listy wyboru listę do kasowania.
 */
const OptionRow = styled.div`
    display: flex;
    align-items: stretch;

    &:hover .remove { opacity: 1; }
`;

const RemoveTagButton = styled.button`
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: ${p => p.theme.colors.textMuted};
    cursor: pointer;
    padding: 0 10px;
    opacity: 0;
    transition: opacity ${p => p.theme.transitions.fast}, color ${p => p.theme.transitions.fast};

    &:hover { color: ${p => p.theme.colors.error}; }
    &:focus-visible { opacity: 1; }
`;

const MenuFooter = styled.div`
    border-top: 1px solid ${p => p.theme.colors.border};
    margin-top: 4px;
    padding: 8px 10px 6px;
    display: flex;
    align-items: center;
    gap: 6px;

    input {
        flex: 1;
        min-width: 0;
        border: 1px solid ${p => p.theme.colors.border};
        border-radius: ${p => p.theme.radii.sm};
        padding: 6px 9px;
        font-size: 12.5px;
        font-family: inherit;
        color: ${p => p.theme.colors.text};
        outline: none;

        &:focus { border-color: ${p => p.theme.colors.primary}; }
    }

    button.add {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: none;
        background: ${p => p.theme.colors.primary};
        color: #ffffff;
        border-radius: ${p => p.theme.radii.sm};
        padding: 7px 10px;
        font-size: 12.5px;
        font-family: inherit;
        font-weight: ${p => p.theme.fontWeights.medium};
        cursor: pointer;

        &:disabled { opacity: 0.5; cursor: default; }
    }

    svg.spin { animation: ${spin} 900ms linear infinite; }
`;

interface TagOption {
    code: string;
    label: string;
}

interface TagMultiSelectProps {
    options: TagOption[];
    value: string[];
    onChange: (next: string[]) => void;
    onCreate: (label: string) => void;
    onDelete: (option: TagOption) => void;
    isCreating: boolean;
}

function TagMultiSelect({ options, value, onChange, onCreate, onDelete, isCreating }: TagMultiSelectProps) {
    const [newLabel, setNewLabel] = useState('');
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number }>({
        left: 0,
        width: 0,
        maxHeight: 0,
    });
    const containerRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const calcPos = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const below = viewportHeight - rect.bottom - 4;
        const above = rect.top - 4;
        if (below < 140 && above > below) {
            setPos({ bottom: viewportHeight - rect.top + 4, left: rect.left, width: rect.width, maxHeight: Math.min(260, above) });
        } else {
            setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width, maxHeight: Math.min(260, below) });
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        const onDocClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!containerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
                setOpen(false);
            }
        };
        // Escape ma zamknąć listę, a nie całe okno — dlatego faza przechwytywania
        // i zatrzymanie zdarzenia, zanim dojdzie do nasłuchu modala.
        const onEsc = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            setOpen(false);
        };
        const onReposition = () => calcPos();
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onEsc, true);
        window.addEventListener('scroll', onReposition, true);
        window.addEventListener('resize', onReposition);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onEsc, true);
            window.removeEventListener('scroll', onReposition, true);
            window.removeEventListener('resize', onReposition);
        };
    }, [open, calcPos]);

    const summary = useMemo(
        () =>
            options
                .filter((option) => value.includes(option.code))
                .map((option) => option.label)
                .join(', '),
        [options, value]
    );

    const toggle = (code: string) =>
        onChange(value.includes(code) ? value.filter((entry) => entry !== code) : [...value, code]);

    return (
        <SelectContainer ref={containerRef}>
            <SelectTrigger
                ref={triggerRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => {
                    calcPos();
                    setOpen((current) => !current);
                }}
            >
                <span className={summary ? 'value' : 'value placeholder'}>
                    {summary || 'Wybierz tagi'}
                </span>
                <ChevronDown size={15} />
            </SelectTrigger>
            {open &&
                createPortal(
                    <SelectMenu
                        ref={menuRef}
                        role="listbox"
                        aria-multiselectable
                        style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxHeight }}
                    >
                        {options.length === 0 && <EmptyHint>Brak tagów — dodaj pierwszy niżej</EmptyHint>}
                        {options.map((option) => {
                            const selected = value.includes(option.code);
                            return (
                                <OptionRow key={option.code}>
                                    <SelectOption
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        $selected={selected}
                                        onClick={() => toggle(option.code)}
                                    >
                                        <OptionBox $selected={selected}>
                                            {selected && <Check size={11} strokeWidth={3} />}
                                        </OptionBox>
                                        {option.label}
                                    </SelectOption>
                                    <RemoveTagButton
                                        className="remove"
                                        type="button"
                                        aria-label={`Usuń tag ${option.label}`}
                                        title="Usuń ze słownika"
                                        onClick={() => onDelete(option)}
                                    >
                                        <Trash2 size={13} />
                                    </RemoveTagButton>
                                </OptionRow>
                            );
                        })}

                        <MenuFooter>
                            <input
                                placeholder="Nowy tag…"
                                value={newLabel}
                                maxLength={80}
                                onChange={(event) => setNewLabel(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    // Enter w polu tagu nie ma prawa wysłać całego formularza.
                                    event.preventDefault();
                                    if (!newLabel.trim() || isCreating) return;
                                    onCreate(newLabel.trim());
                                    setNewLabel('');
                                }}
                            />
                            <button
                                className="add"
                                type="button"
                                disabled={!newLabel.trim() || isCreating}
                                onClick={() => {
                                    onCreate(newLabel.trim());
                                    setNewLabel('');
                                }}
                            >
                                {isCreating ? <Loader2 size={12} className="spin" /> : <Plus size={12} />}
                                Dodaj
                            </button>
                        </MenuFooter>
                    </SelectMenu>,
                    document.body
                )}
        </SelectContainer>
    );
}

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
    const createTag = useCreateLeadTag();
    const deleteTag = useDeleteLeadTag();
    const { showSuccess, showError } = useToast();

    const addTag = (label: string) =>
        createTag.mutate(label, {
            // Świeżo dodany tag jest z definicji tym, o który chodziło — zaznaczamy go
            // od razu, żeby nie trzeba było go szukać na liście po dodaniu.
            onSuccess: (entry) =>
                setTags((current) => (current.includes(entry.code) ? current : [...current, entry.code])),
            onError: (error) => {
                const message =
                    (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                showError('Nie udało się dodać tagu', message ?? 'Spróbuj ponownie');
            },
        });

    const removeTag = (option: { code: string; label: string }) =>
        deleteTag.mutate(option.code, {
            onSuccess: () => {
                setTags((current) => current.filter((code) => code !== option.code));
                showSuccess(
                    `Tag „${option.label}" usunięty`,
                    'Leady, które go mają, zachowują go w historii'
                );
            },
            onError: (error) => {
                const message =
                    (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
                showError('Nie udało się usunąć tagu', message ?? 'Spróbuj ponownie');
            },
        });

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
                            onCreate={addTag}
                            onDelete={removeTag}
                            isCreating={createTag.isPending}
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
