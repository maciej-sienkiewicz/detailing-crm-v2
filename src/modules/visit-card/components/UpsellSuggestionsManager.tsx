// src/modules/visit-card/components/UpsellSuggestionsManager.tsx
//
// Employee-facing manager of "suggested additional services" (upselling) for a
// single visit or reservation. Suggestions are assigned intentionally, one by
// one, and appear on the customer's public Visit Card, where the customer can
// request them (which triggers a consent SMS: "Odpisz TAK...").
//
// UI follows the app-wide patterns: the service picker is the shared
// ServiceAutocomplete (styled suggestion dropdown), and the discount editor
// offers the same adjustment types as everywhere else (percent, fixed net/gross,
// set net/gross).

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { FieldGroup, Label, Input } from '@/common/components/Form';
import { t } from '@/common/i18n';
import { applyAdjustment, type AdjustmentType } from '@/common/utils/priceAdjustment';
import { handleZeroAwareKeyDown } from '@/common/utils/moneyInput';
import { QuickServiceModal } from '@/modules/calendar/components/QuickServiceModal';
import { ServiceAutocomplete } from '@/modules/checkin/components/ServiceAutocomplete';
import { useUpsellNotificationAvailability } from '../hooks/useUpsellNotificationAvailability';
import type { Service, VatRate } from '@/modules/services/types';
import { visitCardApi, type UpsellTarget } from '../api/visitCardApi';
import type { UpsellNotificationResult, UpsellSuggestion, UpsellSuggestionStatus } from '../types';

const formatPln = (grosz: number): string =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(grosz / 100);

const STATUS_LABEL: Record<UpsellSuggestionStatus, string> = {
    SUGGESTED: 'Widoczna na karcie',
    REQUESTED: 'Klient wybrał, czeka na SMS „TAK”',
    CONFIRMED: 'Potwierdzona i dodana',
};

const Wrap = styled.div`
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
`;

const Heading = styled.h3`
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
`;

const Hint = styled.p`
    margin: 0 0 12px;
    font-size: 12.5px;
    line-height: 1.5;
    color: #64748b;
`;

const SelectedServicePanel = styled.div`
    margin-top: 10px;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #f8fafc;
`;

const SelectedServiceHeader = styled.div`
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 10px;
    min-width: 0;
`;

const SelectedServiceName = styled.div`
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
    min-width: 0;
    overflow-wrap: anywhere;
`;

const SelectedServicePrice = styled.div`
    font-size: 12.5px;
    color: #64748b;
    white-space: nowrap;
    font-feature-settings: 'tnum';
`;

const DiscountGrid = styled.div`
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #e2e8f0;

    @media (min-width: 480px) {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
`;

const ExtraToggleRow = styled.div`
    display: flex;
    gap: 14px;
    margin-top: 10px;
`;

const ExtraToggle = styled.button`
    padding: 0;
    border: none;
    background: none;
    font-size: 12.5px;
    font-weight: 600;
    color: #2563eb;
    cursor: pointer;

    &:hover { text-decoration: underline; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

/* ── Discount type dropdown (app-styled: white portal menu, not the native list) ── */

const DropdownTrigger = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 9px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    color: #0f172a;
    font-family: inherit;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
    transition: all 140ms ease;

    &:hover:not(:disabled) { border-color: #cbd5e1; }
    &:focus {
        outline: none;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const DropdownCaret = styled.span<{ $open: boolean }>`
    flex-shrink: 0;
    border: solid #94a3b8;
    border-width: 0 2px 2px 0;
    display: inline-block;
    padding: 3px;
    margin-top: ${p => (p.$open ? '3px' : '-3px')};
    transform: rotate(${p => (p.$open ? '-135deg' : '45deg')});
    transition: transform 140ms ease;
`;

const DropdownMenu = styled.div`
    position: fixed;
    max-width: calc(100vw - 16px);
    overscroll-behavior: contain;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.10), 0 1px 4px rgba(15, 23, 42, 0.06);
    overflow-y: auto;
    z-index: 3000;
    padding: 4px 0;
`;

const DropdownItem = styled.button<{ $selected: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    border: none;
    background: ${p => (p.$selected ? '#f0f9ff' : 'transparent')};
    color: #0f172a;
    font-family: inherit;
    font-size: 13px;
    font-weight: ${p => (p.$selected ? 600 : 500)};
    text-align: left;
    cursor: pointer;
    transition: background 120ms ease;

    &:hover { background: ${p => (p.$selected ? '#f0f9ff' : '#f8fafc')}; }

    svg {
        flex-shrink: 0;
        width: 13px;
        height: 13px;
        color: #0ea5e9;
    }
`;

interface DiscountTypeSelectProps {
    value: AdjustmentType;
    options: { value: AdjustmentType; label: string }[];
    onChange: (value: AdjustmentType) => void;
    disabled?: boolean;
}

/** App-styled replacement for the native select: options render in a white portal menu. */
const DiscountTypeSelect = ({ value, options, onChange, disabled }: DiscountTypeSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const openMenu = () => {
        const el = triggerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom - 12;
        const spaceAbove = rect.top - 12;
        if (spaceBelow < 180 && spaceAbove > spaceBelow) {
            setMenuStyle({
                bottom: window.innerHeight - rect.top + 4,
                left: rect.left,
                width: rect.width,
                maxHeight: Math.min(260, Math.max(140, spaceAbove)),
            });
        } else {
            setMenuStyle({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                maxHeight: Math.min(260, Math.max(140, spaceBelow)),
            });
        }
        setIsOpen(true);
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            const node = event.target as Node;
            if (!triggerRef.current?.contains(node) && !menuRef.current?.contains(node)) {
                setIsOpen(false);
            }
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [isOpen]);

    const selectedLabel = options.find(o => o.value === value)?.label ?? '';

    return (
        <>
            <DropdownTrigger
                ref={triggerRef}
                type="button"
                onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
                disabled={disabled}
            >
                <span>{selectedLabel}</span>
                <DropdownCaret $open={isOpen} />
            </DropdownTrigger>
            {isOpen && createPortal(
                <DropdownMenu ref={menuRef} style={menuStyle}>
                    {options.map(option => (
                        <DropdownItem
                            key={option.value}
                            type="button"
                            $selected={option.value === value}
                            onClick={() => { onChange(option.value); setIsOpen(false); }}
                        >
                            <span>{option.label}</span>
                            {option.value === value && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </DropdownItem>
                    ))}
                </DropdownMenu>,
                document.body,
            )}
        </>
    );
};

const PreviewLine = styled.div`
    margin-top: 10px;
    font-size: 12.5px;
    color: #0f172a;
    font-feature-settings: 'tnum';

    strong { font-weight: 700; }
`;

const PreviewOld = styled.span`
    margin-right: 6px;
    color: #94a3b8;
    text-decoration: line-through;
`;

const PanelActions = styled.div`
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;

    @media (max-width: 480px) {
        > button { flex: 1; min-width: 0; }
    }
`;

const PrimaryBtn = styled.button`
    padding: 9px 16px;
    border: none;
    border-radius: 8px;
    background: #0f172a;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const GhostBtn = styled.button`
    padding: 9px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    color: #334155;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:hover { border-color: #cbd5e1; }
`;

const List = styled.ul`
    list-style: none;
    margin: 14px 0 0;
    padding: 0;
`;

const Row = styled.li`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 0;
    min-width: 0;
    border-bottom: 1px solid #f1f5f9;

    &:last-child { border-bottom: none; }

    /* Name, price and "Usuń" cannot share a phone-width line inside a modal. */
    @media (max-width: 480px) {
        flex-wrap: wrap;
        row-gap: 6px;

        > *:first-child { flex: 0 0 100%; }
    }
`;

const RowInfo = styled.div`
    min-width: 0;
    flex: 1;
`;

const RowName = styled.div`
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
    overflow-wrap: anywhere;
`;

const RowMeta = styled.div`
    font-size: 12px;
    color: #64748b;
    overflow-wrap: anywhere;
`;

const RowPrice = styled.div`
    flex-shrink: 0;
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
    white-space: nowrap;
    font-feature-settings: 'tnum';
`;

const RowOldPrice = styled.span`
    margin-right: 6px;
    font-weight: 400;
    color: #94a3b8;
    text-decoration: line-through;
`;

const RemoveBtn = styled.button`
    flex-shrink: 0;
    padding: 5px 10px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #fff;
    color: #b91c1c;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;

    &:hover { border-color: #fca5a5; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorText = styled.div`
    margin-top: 10px;
    font-size: 12.5px;
    color: #b91c1c;
`;

const NotifyRow = styled.label`
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 12px;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
`;

const NotifyCheck = styled.input`
    margin-top: 2px;
    width: 16px;
    height: 16px;
    accent-color: #0ea5e9;
    cursor: pointer;
    flex-shrink: 0;
`;

const NotifyText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
`;

const NotifyTitle = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
`;

const NotifyHint = styled.span`
    font-size: 12px;
    line-height: 1.45;
    color: #64748b;
`;

const StagedBox = styled.div`
    margin-top: 12px;
    padding: 12px;
    border: 1px dashed #cbd5e1;
    border-radius: 10px;
    background: #f8fafc;
`;

const StagedHeading = styled.div`
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
`;

const Footer = styled.div`
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid #e2e8f0;
`;

const FooterActions = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
`;

const TemplateHint = styled.p`
    margin: 0;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
    font-size: 12.5px;
    line-height: 1.5;
    color: #64748b;
`;

const NotificationResult = styled.div<{ $ok: boolean }>`
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12.5px;
    line-height: 1.45;
    background: ${p => (p.$ok ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.12)')};
    color: ${p => (p.$ok ? '#047857' : '#b45309')};
    border: 1px solid ${p => (p.$ok ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.30)')};
`;

const EmptyText = styled.div`
    margin-top: 12px;
    font-size: 12.5px;
    color: #94a3b8;
`;

interface UpsellSuggestionsManagerProps {
    /** Visit or reservation the suggestions are attached to. */
    target: UpsellTarget;
    /** Reload trigger: the parent passes its `isOpen` so data refreshes on each open. */
    active: boolean;
}

const MONEY_TYPES: AdjustmentType[] = ['FIXED_NET', 'FIXED_GROSS', 'SET_NET', 'SET_GROSS'];

/**
 * Usługa odłożona do zapisania, jeszcze nie wysłana na serwer.
 *
 * Poczekalnia istnieje po to, żeby kilka propozycji poszło JEDNYM żądaniem, a klient
 * dostał jedną wiadomość wymieniającą wszystko — zamiast trzech SMS-ów pod rząd,
 * każdego za osobny kredyt. Cena i rabat są zamrożone w chwili odłożenia.
 */
interface StagedSuggestion {
    key: string;
    service: Service;
    adjustment?: { type: AdjustmentType; value: number };
    note?: string;
    finalGrossCents: number;
}

export const UpsellSuggestionsManager = ({ target, active }: UpsellSuggestionsManagerProps) => {
    // Powiadomienie SMS to moduł komunikacji ORAZ włączony szablon: bez modułu checkbox
    // nie ma prawa się pojawić (backend i tak by odmówił, a pracownik nie ma oglądać
    // opcji, której nie kupił), bez szablonu — zamiast checkboxa idzie informacja, co
    // trzeba włączyć, żeby móc powiadamiać.
    const notify = useUpsellNotificationAvailability(active);
    const [suggestions, setSuggestions] = useState<UpsellSuggestion[]>([]);
    const [staged, setStaged] = useState<StagedSuggestion[]>([]);
    const [notifyCustomer, setNotifyCustomer] = useState(false);
    const [notification, setNotification] = useState<UpsellNotificationResult | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    /** Discount fields stay hidden until the employee explicitly opts in. */
    const [discountOpen, setDiscountOpen] = useState(false);
    const [noteOpen, setNoteOpen] = useState(false);
    const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('PERCENT');
    const [adjustmentInput, setAdjustmentInput] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [quickServiceOpen, setQuickServiceOpen] = useState(false);
    const [initialServiceName, setInitialServiceName] = useState('');

    const reload = useCallback(async () => {
        const list = await visitCardApi.getUpsellSuggestions(target);
        setSuggestions(list);
    }, [target]);

    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        setError(null);
        setSelectedService(null);
        setStaged([]);
        setNotification(null);
        visitCardApi.getUpsellSuggestions(target)
            .then(list => { if (!cancelled) setSuggestions(list); })
            .catch(() => { if (!cancelled) setError('Nie udało się pobrać sugerowanych usług.'); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, target.kind, target.id]);

    const parsedValue = Number(adjustmentInput.replace(',', '.'));
    const hasValue = adjustmentInput.trim() !== '' && !Number.isNaN(parsedValue) && parsedValue >= 0;
    const discountActive = discountOpen && hasValue && parsedValue > 0;

    /** UI value → shared PriceAdjustment semantics (percent signed, money in cents). */
    const toAdjustment = () => ({
        type: adjustmentType,
        value: adjustmentType === 'PERCENT'
            ? -Math.abs(parsedValue || 0)
            : Math.round(Math.abs(parsedValue || 0) * 100),
    });

    const preview = selectedService
        ? applyAdjustment(
            selectedService.basePriceNet,
            selectedService.vatRate,
            discountActive ? toAdjustment() : { type: 'PERCENT', value: 0 },
        )
        : null;

    const handleSelectService = (service: Service) => {
        setSelectedService(service);
        setDiscountOpen(false);
        setNoteOpen(false);
        setAdjustmentType('PERCENT');
        setAdjustmentInput('');
        setNote('');
        setError(null);
    };

    const handleAddNew = (searchQuery: string) => {
        setInitialServiceName(searchQuery);
        setQuickServiceOpen(true);
    };

    const handleQuickServiceCreate = (service: { id?: string; name: string; basePriceNet: number; vatRate: VatRate }) => {
        if (!service.id) {
            setError('Aby dodać sugestię, usługa musi być zapisana w bazie. Zaznacz „Zapisz w bazie danych" w formularzu.');
            return;
        }
        handleSelectService({
            id: service.id,
            name: service.name,
            basePriceNet: service.basePriceNet,
            vatRate: service.vatRate,
            requireManualPrice: false,
            isActive: true,
            isPackage: false,
            packageItems: null,
            createdAt: '',
            updatedAt: '',
            createdByFirstName: '',
            createdByLastName: '',
            updatedBy: '',
            replacesServiceId: null,
        });
    };

    /** Pozycja z panelu → poczekalnia. Null, gdy panel nie nadaje się jeszcze do zapisania. */
    const stageCurrent = (): StagedSuggestion | null => {
        if (!selectedService) return null;
        if (discountOpen && adjustmentInput.trim() !== '' && (Number.isNaN(parsedValue) || parsedValue < 0)) {
            setError('Wartość rabatu musi być liczbą nieujemną.');
            return null;
        }
        return {
            key: `${selectedService.id}:${Date.now()}`,
            service: selectedService,
            adjustment: discountActive ? toAdjustment() : undefined,
            note: noteOpen ? (note.trim() || undefined) : undefined,
            finalGrossCents: preview?.finalGrossCents ?? selectedService.basePriceNet,
        };
    };

    /** „Dodaj kolejną usługę": odkłada bieżącą i wraca do wyszukiwarki. */
    const handleStageAndNext = () => {
        const item = stageCurrent();
        if (!item) return;
        setStaged(prev => [...prev, item]);
        setSelectedService(null);
        setError(null);
    };

    const handleUnstage = (key: string) => setStaged(prev => prev.filter(item => item.key !== key));

    /**
     * Zapisuje wszystko naraz: to, co w poczekalni, plus usługę otwartą w panelu.
     * Jedno żądanie, więc jedna wiadomość do klienta — o to w tym całym ekranie chodzi.
     */
    const handleSave = async () => {
        const current = selectedService ? stageCurrent() : null;
        if (selectedService && !current) return;
        const items = current ? [...staged, current] : staged;
        if (items.length === 0) return;

        setBusy(true);
        setError(null);
        setNotification(null);
        try {
            const created = await visitCardApi.createUpsellSuggestions(target, {
                suggestions: items.map(item => ({
                    serviceId: item.service.id,
                    adjustment: item.adjustment,
                    note: item.note,
                })),
                notifyCustomer: notify.templateReady && notifyCustomer ? true : undefined,
            });
            setStaged([]);
            setSelectedService(null);
            setNotification(created.customerNotification ?? null);
            await reload();
        } catch {
            setError(items.length === 1 ? 'Nie udało się dodać sugestii.' : 'Nie udało się dodać sugestii.');
        } finally {
            setBusy(false);
        }
    };

    const handleRemove = async (suggestionId: string) => {
        setBusy(true);
        setError(null);
        try {
            await visitCardApi.deleteUpsellSuggestion(target, suggestionId);
            await reload();
        } catch {
            setError('Nie udało się usunąć sugestii.');
        } finally {
            setBusy(false);
        }
    };

    /** Ile propozycji pójdzie w najbliższym zapisie: poczekalnia + usługa otwarta w panelu. */
    const pendingCount = staged.length + (selectedService ? 1 : 0);

    const discountLabels = t.appointments.invoiceSummary.discountTypes;

    return (
        <Wrap>
            <Heading>Sugerowane usługi dodatkowe</Heading>
            <Hint>
                Wybrane usługi (z opcjonalnym rabatem) pojawią się na Karcie Wizyty jako propozycje.
                Gdy klient je wybierze, otrzyma SMS z prośbą o potwierdzenie odpowiedzią „TAK”.
            </Hint>

            {staged.length > 0 && (
                <StagedBox>
                    <StagedHeading>Do zapisania ({staged.length})</StagedHeading>
                    <List>
                        {staged.map(item => (
                            <Row key={item.key}>
                                <RowInfo>
                                    <RowName>{item.service.name}</RowName>
                                    {item.note && <RowMeta>{item.note}</RowMeta>}
                                </RowInfo>
                                <RowPrice>{formatPln(item.finalGrossCents)}</RowPrice>
                                <RemoveBtn onClick={() => handleUnstage(item.key)} disabled={busy}>
                                    Usuń
                                </RemoveBtn>
                            </Row>
                        ))}
                    </List>
                </StagedBox>
            )}

            {!selectedService && <ServiceAutocomplete onSelect={handleSelectService} onAddNew={handleAddNew} />}

            {selectedService && (
                <SelectedServicePanel>
                    <SelectedServiceHeader>
                        <SelectedServiceName>{selectedService.name}</SelectedServiceName>
                        <SelectedServicePrice>
                            {preview && (
                                <>
                                    {preview.hasDiscount && (
                                        <PreviewOld>
                                            {formatPln(applyAdjustment(selectedService.basePriceNet, selectedService.vatRate, { type: 'PERCENT', value: 0 }).finalGrossCents)}
                                        </PreviewOld>
                                    )}
                                    {formatPln(preview.finalGrossCents)} brutto
                                </>
                            )}
                        </SelectedServicePrice>
                    </SelectedServiceHeader>

                    {/* Discount and note are opt-in; the default panel stays minimal. */}
                    {discountOpen && (
                        <DiscountGrid>
                            <FieldGroup>
                                <Label>Rodzaj rabatu</Label>
                                <DiscountTypeSelect
                                    value={adjustmentType}
                                    onChange={setAdjustmentType}
                                    disabled={busy}
                                    options={[
                                        { value: 'PERCENT', label: discountLabels.percent },
                                        { value: 'FIXED_NET', label: discountLabels.fixedNet },
                                        { value: 'FIXED_GROSS', label: discountLabels.fixedGross },
                                        { value: 'SET_NET', label: discountLabels.setNet },
                                        { value: 'SET_GROSS', label: discountLabels.setGross },
                                    ]}
                                />
                            </FieldGroup>
                            <FieldGroup>
                                <Label>{adjustmentType === 'PERCENT' ? 'Wartość (%)' : 'Wartość (PLN)'}</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder={adjustmentType === 'PERCENT' ? 'np. 10' : 'np. 50,00'}
                                    value={adjustmentInput}
                                    onChange={e => setAdjustmentInput(e.target.value)}
                                    onKeyDown={handleZeroAwareKeyDown(adjustmentInput, setAdjustmentInput)}
                                    disabled={busy}
                                />
                            </FieldGroup>
                        </DiscountGrid>
                    )}

                    {noteOpen && (
                        <FieldGroup style={{ marginTop: 10 }}>
                            <Label>Notatka dla klienta</Label>
                            <Input
                                type="text"
                                maxLength={500}
                                placeholder="np. polecane przy tym przebiegu"
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                disabled={busy}
                            />
                        </FieldGroup>
                    )}

                    {discountOpen && preview?.hasDiscount && (
                        <PreviewLine>
                            Cena dla klienta:{' '}
                            <strong>{formatPln(preview.finalGrossCents)} brutto</strong>
                            {' '}({formatPln(preview.finalNetCents)} netto)
                        </PreviewLine>
                    )}

                    <ExtraToggleRow>
                        {!discountOpen && (
                            <ExtraToggle onClick={() => setDiscountOpen(true)} disabled={busy}>
                                + Dodaj rabat
                            </ExtraToggle>
                        )}
                        {!noteOpen && (
                            <ExtraToggle onClick={() => setNoteOpen(true)} disabled={busy}>
                                + Dodaj notatkę
                            </ExtraToggle>
                        )}
                    </ExtraToggleRow>

                    <PanelActions>
                        <GhostBtn onClick={() => setSelectedService(null)} disabled={busy}>
                            Anuluj
                        </GhostBtn>
                        <GhostBtn
                            onClick={handleStageAndNext}
                            disabled={busy || (discountOpen && MONEY_TYPES.includes(adjustmentType) && !hasValue)}
                        >
                            + Dodaj kolejną usługę
                        </GhostBtn>
                    </PanelActions>
                </SelectedServicePanel>
            )}

            {pendingCount > 0 && (
                <Footer>
                    {/* Bez modułu komunikacji nie ma czego pokazywać: modal Karty Wizyty
                        niesie już własny baner o braku modułu. Bez szablonu pokazujemy,
                        co włączyć — zamiast checkboxa, który i tak nic by nie wysłał. */}
                    {!notify.isLoading && notify.moduleEnabled && (
                        notify.templateReady ? (
                            <NotifyRow>
                                <NotifyCheck
                                    type="checkbox"
                                    checked={notifyCustomer}
                                    onChange={e => setNotifyCustomer(e.target.checked)}
                                    disabled={busy}
                                />
                                <NotifyText>
                                    <NotifyTitle>Czy powiadomić klienta o dodanych usługach?</NotifyTitle>
                                    <NotifyHint>
                                        Klient dostanie jednego SMS-a z linkiem do Karty Wizyty, wymieniającego
                                        {pendingCount === 1 ? ' tę usługę' : ` wszystkie ${pendingCount} usługi`}.
                                        Poza godzinami 12:00–18:00 wiadomość poczeka w kolejce.
                                    </NotifyHint>
                                </NotifyText>
                            </NotifyRow>
                        ) : (
                            <TemplateHint>
                                Jeśli włączysz szablon „Propozycja dodatkowych usług” w Ustawieniach → Szablony
                                wiadomości, będziesz mógł powiadomić klienta o dodanych usługach.
                            </TemplateHint>
                        )
                    )}

                    <FooterActions>
                        <PrimaryBtn onClick={handleSave} disabled={busy}>
                            {busy
                                ? 'Zapisywanie...'
                                : pendingCount === 1
                                    ? 'Zapisz sugestię'
                                    : `Zapisz sugestie (${pendingCount})`}
                        </PrimaryBtn>
                    </FooterActions>
                </Footer>
            )}

            {error && <ErrorText>{error}</ErrorText>}
            {notification && (
                <NotificationResult $ok={notification.sent} role="status">
                    {notification.message}
                    {notification.queued && notification.scheduledFor && (
                        <> (wyjdzie o {new Date(notification.scheduledFor).toLocaleString('pl-PL', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })})</>
                    )}
                </NotificationResult>
            )}

            {createPortal(
                <QuickServiceModal
                    isOpen={quickServiceOpen}
                    onClose={() => setQuickServiceOpen(false)}
                    onServiceCreate={handleQuickServiceCreate}
                    initialServiceName={initialServiceName}
                    contentLeft={0}
                />,
                document.body
            )}

            {suggestions.length === 0 ? (
                <EmptyText>Brak sugerowanych usług.</EmptyText>
            ) : (
                <List>
                    {suggestions.map(suggestion => (
                        <Row key={suggestion.id}>
                            <RowInfo>
                                <RowName>{suggestion.serviceName}</RowName>
                                <RowMeta>{STATUS_LABEL[suggestion.status]}</RowMeta>
                            </RowInfo>
                            <RowPrice>
                                {suggestion.originalPriceGross !== suggestion.finalPriceGross && (
                                    <RowOldPrice>{formatPln(suggestion.originalPriceGross)}</RowOldPrice>
                                )}
                                {formatPln(suggestion.finalPriceGross)}
                            </RowPrice>
                            {suggestion.status === 'SUGGESTED' && (
                                <RemoveBtn onClick={() => handleRemove(suggestion.id)} disabled={busy}>
                                    Usuń
                                </RemoveBtn>
                            )}
                        </Row>
                    ))}
                </List>
            )}
        </Wrap>
    );
};
