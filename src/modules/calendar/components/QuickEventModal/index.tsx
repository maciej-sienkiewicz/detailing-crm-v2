// src/modules/calendar/components/QuickEventModal/index.tsx

import React, { forwardRef, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DateTimePicker } from '../DateTimePicker';
import { QuickServiceModal } from '../QuickServiceModal';
import { PriceInputModal } from '../PriceInputModal';
import { QuickColorModal } from '../QuickColorModal';
import { Toggle } from '@/common/components/Toggle';
import { useVisualViewportSheet } from '@/common/hooks';
import { LockedSection } from '@/common/components/LockedSection';
import * as S from '../QuickEventModalStyles';
import { MobileNewCustomerSheet, type NewCustomerDraft } from './MobileNewCustomerSheet';
import { SmsOptionsSheet, type SmsOption } from './SmsOptionsSheet';
import { ColorDropdown } from '@/common/components/ColorDropdown';
import { useQuickEventForm } from './useQuickEventForm';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { ServicesTable } from '@/common/components/ServicesTable';
import type { ServiceLineItem, SaveServiceData } from '@/common/components/ServicesTable';
import { netToGross } from '@/common/utils/priceAdjustment';
import { servicesApi } from '@/modules/services/api/servicesApi';
import type { VatRate, Service as CatalogService } from '@/modules/services/types';
import {
    IconClock, IconUser, IconCar, IconSettings, IconNote,
    IconX, IconPalette, IconPlus, IconPencil, IconCheck, IconMessageSquare,
} from './icons';
import { useFeature, UpsellModal } from '@/modules/subscription';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { RecurrenceSidePanel, SidePanelWrapper, SidePanelInner } from './RecurrenceSidePanel';
import type { QuickEventModalProps, QuickEventModalRef, AppointmentColor, Service, ServiceAdjustment } from './types';

export type { QuickEventFormData, QuickEventInitialData } from './types';
export type { QuickEventModalRef };

/** Podpis nad polem koloru — ten sam język co etykiety w arkuszu przyjęcia. */
const MobileColorLabel = styled.div`
    margin-bottom: 6px;
    font-size: 11px;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const SmsCheckList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const SmsCheckItem = styled.label<{ $disabled?: boolean }>`
    display: flex;
    align-items: center;
    gap: 9px;
    cursor: ${p => p.$disabled ? 'not-allowed' : 'pointer'};
    opacity: ${p => p.$disabled ? 0.45 : 1};
    user-select: none;
`;

const SmsCheckbox = styled.input.attrs({ type: 'checkbox' })`
    appearance: none;
    -webkit-appearance: none;
    flex-shrink: 0;
    width: 15px;
    height: 15px;
    border: 1.5px solid #cbd5e1;
    border-radius: 4px;
    background: white;
    cursor: inherit;
    transition: background 130ms, border-color 130ms;
    position: relative;

    &:checked {
        background: #3b82f6;
        border-color: #3b82f6;
    }

    &:checked::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 0px;
        width: 5px;
        height: 9px;
        border: 2px solid white;
        border-top: none;
        border-left: none;
        transform: rotate(45deg);
    }

    &:disabled {
        background: #f1f5f9;
        border-color: #e2e8f0;
    }
`;

const SmsCheckText = styled.span`
    font-size: 13px;
    color: #334155;
    line-height: 1.45;
`;

const SmsDisabledHint = styled.span`
    display: block;
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
`;

const D2DToggleRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
`;

const D2DToggleLabel = styled.span`
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 7px;
`;

const D2DBadge = styled.span`
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 2px 7px;
    border-radius: 999px;
    background: #f0f9ff;
    color: #0369a1;
    border: 1px solid #bae6fd;
`;

const D2DToggleSwitch = styled.button<{ $active: boolean }>`
    position: relative;
    width: 36px;
    height: 20px;
    border-radius: 999px;
    border: none;
    cursor: pointer;
    background: ${p => p.$active ? '#0ea5e9' : '#cbd5e1'};
    transition: background 200ms ease;
    flex-shrink: 0;

    &::after {
        content: '';
        position: absolute;
        top: 2px;
        left: ${p => p.$active ? '18px' : '2px'};
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.18);
        transition: left 200ms ease;
    }
`;

const D2DFields = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 10px;
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;
`;

const D2DAddressGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const D2DAddressLabel = styled.span`
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #64748b;
`;

const D2DAddressInputs = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
`;

const D2DInput = styled.input`
    width: 100%;
    box-sizing: border-box;
    padding: 8px 11px;
    font-size: 13px;
    color: #0f172a;
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    outline: none;
    font-family: inherit;
    transition: border-color 150ms ease, box-shadow 150ms ease;

    &::placeholder { color: #b0bec5; }

    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
    }
`;

const D2DNotes = styled.textarea`
    width: 100%;
    box-sizing: border-box;
    padding: 8px 11px;
    font-size: 13px;
    color: #0f172a;
    background: #ffffff;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    outline: none;
    font-family: inherit;
    resize: none;
    line-height: 1.45;
    transition: border-color 150ms ease, box-shadow 150ms ease;

    &::placeholder { color: #b0bec5; }

    &:focus {
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
    }
`;

export const QuickEventModal = forwardRef<QuickEventModalRef, QuickEventModalProps>(({
    isOpen,
    eventData,
    onClose,
    onSave,
    initialData,
}, ref) => {
    const form = useQuickEventForm({ isOpen, eventData, onClose, onSave, ref, initialData });
    const queryClient = useQueryClient();
    const smsFeature = useFeature('SMS_EMAIL');
    const [upsellOpen, setUpsellOpen] = useState(false);
    const [smsSheetOpen, setSmsSheetOpen] = useState(false);
    const { isCollapsed } = useSidebar();
    const sidebarWidth = isCollapsed ? 64 : 240;

    const [serviceDropdownPos, setServiceDropdownPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
    const [highlightedServiceIdx, setHighlightedServiceIdx] = useState(-1);
    const serviceDropdownRef = useRef<HTMLDivElement>(null);
    const [customerDropdownPos, setCustomerDropdownPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
    const customerDropdownContainerRef = useRef<HTMLDivElement>(null);
    const [autoOpenModel, setAutoOpenModel] = useState(false);

    // Mobile-specific UX state
    const [isMobile, setIsMobile] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const serviceSheetRef = useRef<HTMLDivElement>(null);
    const customerSheetRef = useRef<HTMLDivElement>(null);
    // Telefon: „Dodaj nowego klienta" otwiera formularz zamiast zapisywać od razu.
    const [newCustomerDraft, setNewCustomerDraft] = useState<NewCustomerDraft | null>(null);
    const serviceSheetInputRef = useRef<HTMLDivElement>(null);
    const customerSheetInputRef = useRef<HTMLDivElement>(null);

    const MAX_VISIBLE_COLORS = 5;
    const [colorPanelOpen, setColorPanelOpen] = useState(false);
    const [colorPanelPos, setColorPanelPos] = useState({ bottom: 0, left: 0 });
    const moreColorsBtnRef = useRef<HTMLButtonElement>(null);
    /**
     * Telefon: dotknięcie pola klienta otwiera arkusz wyszukiwania w tym samym
     * geście, z pominięciem fokusu w polu pod spodem. Bez tego iOS najpierw
     * ustawiał fokus w polu formularza — modal przewijał się do niego, wjeżdżała
     * klawiatura, a ułamek sekundy później arkusz przykrywał to wszystko. Ten
     * pośredni stan czytało się właśnie jako przeskok listy podpowiedzi.
     *
     * preventDefault zabiera fokus, więc klawiaturę musimy otworzyć sami — iOS
     * robi to tylko z focus() wywołanego wewnątrz gestu, stąd chwilowe pole
     * poza ekranem, do którego wchodzimy, zanim arkusz się zamontuje.
     */
    const customerTapGuardRef = useRef(0);
    const openCustomerSheetFromTap = useCallback((e: React.PointerEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
        if (!isMobile) return;
        e.preventDefault();

        // Jedno dotknięcie daje i pointerdown, i touchstart — arkusz otwieramy raz.
        const now = performance.now();
        if (now - customerTapGuardRef.current < 700) return;
        customerTapGuardRef.current = now;

        const tmp = document.createElement('div');
        tmp.contentEditable = 'true';
        tmp.setAttribute('inputmode', 'search');
        tmp.style.cssText = 'position:fixed;top:-200px;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
        document.body.appendChild(tmp);
        tmp.focus();

        form.setFocusedField('customer');
        form.setShowCustomerDropdown(true);

        requestAnimationFrame(() => requestAnimationFrame(() => {
            customerSheetInputRef.current?.focus();
            tmp.remove();
        }));
    }, [isMobile, form]);

    /**
     * Trzy powiadomienia SMS jako niezależne przełączniki — każda kombinacja jest
     * poprawna, także „sama karta wizyty". Globalne wyłączenie w konfiguracji
     * studia blokuje pojedynczy przełącznik, nie całą trójkę.
     */
    const smsOptions: SmsOption[] = [
        {
            key: 'confirmation',
            label: 'Potwierdzenie rezerwacji',
            description: 'Wyślemy zaraz po zapisaniu wizyty.',
            checked: form.sendConfirmationSms,
            disabledReason: form.bookingConfirmationEnabled ? undefined : 'Wyłączone globalnie w konfiguracji SMS',
            onChange: form.setSendConfirmationSms,
        },
        {
            key: 'reminder',
            label: 'Przypomnienie przed wizytą',
            description: 'Wyjdzie automatycznie przed terminem.',
            checked: form.sendReminderSms,
            disabledReason: form.preVisitEnabled ? undefined : 'Wyłączone globalnie w konfiguracji SMS',
            onChange: form.setSendReminderSms,
        },
        {
            key: 'visitCard',
            label: 'Karta wizyty',
            description: 'Link, pod którym klient śledzi postęp prac.',
            checked: form.sendVisitCard,
            disabledReason: form.visitCardEnabled ? undefined : 'Karta wizyty jest wyłączona w ustawieniach',
            onChange: form.setSendVisitCard,
        },
    ];

    const customerPhone = form.selectedCustomer?.phone?.trim() || null;

    /** Jedno zdanie o tym, co poleci — stan widoczny w chwili zapisu, nie po. */
    const smsSummary = (() => {
        if (!smsFeature.enabled) return 'SMS niedostępny w abonamencie';
        if (!customerPhone) return 'SMS: brak numeru telefonu klienta';
        const active = smsOptions
            .filter(o => o.checked && !o.disabledReason)
            .map(o => ({ confirmation: 'potwierdzenie', reminder: 'przypomnienie', visitCard: 'karta wizyty' }[o.key]));
        return active.length > 0 ? `SMS: ${active.join(' + ')}` : 'SMS: nic nie wyślemy';
    })();

    const smsActionable = smsFeature.enabled && !!customerPhone;

    const hiddenColorCount = Math.max(0, form.appointmentColors.length - MAX_VISIBLE_COLORS);

    const openColorPanel = () => {
        if (moreColorsBtnRef.current) {
            const r = moreColorsBtnRef.current.getBoundingClientRect();
            setColorPanelPos({ bottom: window.innerHeight - r.top + 8, left: r.left });
        }
        setColorPanelOpen(o => !o);
    };

    const { isRecurring, setIsRecurring, recurrenceRule, setRecurrenceRule } = form;

    const servicesAsLineItems = useMemo((): ServiceLineItem[] => {
        return form.selectedServiceIds.map(id => {
            const catalogId = form.serviceRefs[id] ?? id;
            let svc = form.services.find((s: Service) => s.id === catalogId);
            if (!svc && form.tempServices[catalogId]) {
                svc = { id: catalogId, ...form.tempServices[catalogId] } as Service;
            }
            if (!svc) return null;
            const baseGross = form.servicePrices[id] ?? 0;
            const vatRate = form.serviceVatRates[id] ?? svc.vatRate ?? 23;
            const basePriceNet = Math.round((baseGross / (1 + vatRate / 100)) * 100);
            return {
                id,
                serviceId: svc.id || catalogId,
                serviceName: svc.name,
                basePriceNet,
                vatRate,
                adjustment: (form.serviceAdjustments[id] ?? { type: 'PERCENT', value: 0 }) as ServiceAdjustment,
                note: form.serviceNotes[id] ?? '',
                isPackage: svc.isPackage ?? false,
                packageItems: svc.packageItems ?? null,
            } as ServiceLineItem;
        }).filter((x): x is ServiceLineItem => x !== null);
    }, [form.selectedServiceIds, form.serviceRefs, form.services, form.tempServices, form.servicePrices, form.serviceAdjustments, form.serviceNotes, form.serviceVatRates]);

    const handleServicesChange = useCallback((newItems: ServiceLineItem[]) => {
        const newIds = new Set(newItems.map(i => i.id));
        form.setSelectedServiceIds(newItems.map(i => i.id));
        form.setServiceRefs(() => {
            const next: { [lineId: string]: string } = {};
            newItems.forEach(item => { next[item.id] = item.serviceId || item.id; });
            return next;
        });
        form.setServiceAdjustments(() => {
            const next: { [id: string]: ServiceAdjustment } = {};
            newItems.forEach(item => { next[item.id] = item.adjustment as ServiceAdjustment; });
            return next;
        });
        form.setServiceNotes(() => {
            const next: { [id: string]: string } = {};
            newItems.forEach(item => { next[item.id] = item.note ?? ''; });
            return next;
        });
        form.setServiceVatRates(() => {
            const next: { [id: string]: number } = {};
            newItems.forEach(item => { next[item.id] = item.vatRate; });
            return next;
        });
        form.setServiceBasePrices(() => {
            const next: { [id: string]: number } = {};
            newItems.forEach(item => {
                if (item.basePriceGross != null) {
                    next[item.id] = item.basePriceNet;
                } else {
                    const catalogId = item.serviceId || item.id;
                    const catalogSvc = form.services.find((s: Service) => s.id === catalogId);
                    next[item.id] = catalogSvc?.basePriceNet ?? form.tempServices[catalogId]?.basePriceNet ?? item.basePriceNet;
                }
            });
            return next;
        });
        form.setServicePrices(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(id => { if (!newIds.has(id)) delete next[id]; });
            // When an item carries an explicit basePriceGross, update the stored gross price.
            // This happens when the "Edytuj pozycję" price editor is confirmed.
            newItems.forEach(item => {
                if (item.basePriceGross != null) {
                    next[item.id] = item.basePriceGross / 100;
                }
            });
            return next;
        });
        form.setServicePriceInputs(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(id => { if (!newIds.has(id)) delete next[id]; });
            newItems.forEach(item => {
                if (item.basePriceGross != null) {
                    const gross = item.basePriceGross / 100;
                    const net = Math.round(gross / (1 + item.vatRate / 100) * 100) / 100;
                    next[item.id] = { gross: gross.toFixed(2), net: net.toFixed(2) };
                }
            });
            return next;
        });
    }, [form]);

    const handleSaveService = useCallback(async (serviceId: string, data: SaveServiceData): Promise<string | null> => {
        const updatedService = await servicesApi.updateService({
            originalServiceId: serviceId,
            name: data.name,
            basePriceNet: data.basePriceNet,
            basePriceGross: data.basePriceGross,
            vatRate: data.vatRate as VatRate,
            requireManualPrice: data.requireManualPrice,
        });
        // Replace old service entry with new one in cache (synchronous, no refetch flicker).
        queryClient.setQueryData<CatalogService[]>(['services'], (old = []) =>
            old.map(s => s.id === serviceId ? updatedService : s)
        );
        // Return the new ID so the caller can update its line-item references.
        return updatedService.id !== serviceId ? updatedService.id : null;
    }, [queryClient]);

    useEffect(() => {
        if (!isOpen) setAutoOpenModel(false);
    }, [isOpen]);

    // Detect mobile viewport
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // Reset mobile-specific state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setShowAdvanced(false);
        }
    }, [isOpen]);

    // Keep both mobile sheets spanning the visible region: header and search
    // field pinned to the top of the screen, list ending at the keyboard edge.
    useVisualViewportSheet(
        isMobile && (form.showServiceDropdown || form.showCustomerDropdown),
        [serviceSheetRef, customerSheetRef],
    );

    // When any mobile sheet is open, set tabindex=-1 on all background inputs
    // so iOS grays out the ^ v navigation arrows (they appear because iOS sees other inputs in the DOM)
    useEffect(() => {
        if (!isMobile || (!form.showServiceDropdown && !form.showCustomerDropdown)) return;

        const inputs = Array.from(
            document.querySelectorAll<HTMLElement>('input, textarea, select')
        );
        inputs.forEach(el => {
            el.dataset._prevTabindex = el.getAttribute('tabindex') ?? '__none__';
            el.setAttribute('tabindex', '-1');
        });

        return () => {
            inputs.forEach(el => {
                const prev = el.dataset._prevTabindex;
                delete el.dataset._prevTabindex;
                if (prev === '__none__') {
                    el.removeAttribute('tabindex');
                } else if (prev !== undefined) {
                    el.setAttribute('tabindex', prev);
                }
            });
        };
    }, [isMobile, form.showServiceDropdown, form.showCustomerDropdown]);

    // When customer sheet opens: init contenteditable with current search value + transfer focus
    useEffect(() => {
        if (!isMobile || !form.showCustomerDropdown) return;

        // Suppress the blur-timer that would close the dropdown immediately after
        // we programmatically move focus from the inline input to the sheet's search field.
        form.skipNextCustomerBlurRef.current = true;
        form.customerInputRef.current?.blur();

        const el = customerSheetInputRef.current;
        if (!el) return;

        // Pre-fill with whatever the user already typed
        const current = form.customerFirstName;
        if (el.innerText !== current) {
            el.innerText = current;
            // Move cursor to end
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(el);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
        }

        // Keyboard is already open (user was typing), just transfer focus
        el.focus();
    }, [isMobile, form.showCustomerDropdown]); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-expand advanced sections when editing existing data on mobile
    useEffect(() => {
        if (isOpen && isMobile) {
            if (form.notes || form.doorToDoor.enabled || form.sendConfirmationSms || form.sendReminderSms || form.sendVisitCard) {
                setShowAdvanced(true);
            }
        }
    }, [isOpen, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!form.showServiceDropdown) { setServiceDropdownPos(null); setHighlightedServiceIdx(-1); return; }
        const el = form.serviceInputRef.current;
        if (!el) return;
        const update = () => {
            const r = el.getBoundingClientRect();
            const spaceBelow = window.innerHeight - r.bottom - 8;
            const maxHeight = Math.min(320, Math.max(100, spaceBelow));
            setServiceDropdownPos({ top: r.bottom + 2, left: r.left, width: r.width, maxHeight });
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [form.showServiceDropdown]);

    // Scroll highlighted service item into view when navigating with arrow keys
    useEffect(() => {
        if (highlightedServiceIdx < 0 || !serviceDropdownRef.current) return;
        const items = serviceDropdownRef.current.querySelectorAll<HTMLElement>('[data-service-item]');
        items[highlightedServiceIdx]?.scrollIntoView({ block: 'nearest' });
    }, [highlightedServiceIdx]);

    useEffect(() => {
        if (!form.showCustomerDropdown || isMobile) { setCustomerDropdownPos(null); return; }
        const el = customerDropdownContainerRef.current;
        if (!el) return;
        const update = () => {
            const r = el.getBoundingClientRect();
            const spaceBelow = window.innerHeight - r.bottom - 8;
            const maxHeight = Math.min(280, Math.max(100, spaceBelow));
            setCustomerDropdownPos({ top: r.bottom, left: r.left, width: r.width, maxHeight });
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [form.showCustomerDropdown, isMobile]);

    if (!eventData && !initialData) return null;

    const highlightMatch = (text: string, query: string): React.ReactNode => {
        const q = query.trim();
        if (!q) return text;
        const idx = text.toLowerCase().indexOf(q.toLowerCase());
        if (idx === -1) return text;
        return (
            <>
                {text.slice(0, idx)}
                <S.ServiceDropdownHighlight>{text.slice(idx, idx + q.length)}</S.ServiceDropdownHighlight>
                {text.slice(idx + q.length)}
            </>
        );
    };

    return (
        <>
            <S.Overlay $isOpen={isOpen} $contentLeft={sidebarWidth} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
                <S.ModalWithPanel>
                <S.ModalContainer $isOpen={isOpen}>
                    <form
                        onSubmit={form.handleSubmit}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                e.preventDefault();
                                onClose();
                                return;
                            }
                            if (e.key === 'Enter') {
                                const target = e.target as HTMLInputElement;
                                if (!form.selectedCustomer) {
                                    if (target === form.customerInputRef.current) {
                                        e.preventDefault();
                                        form.customerLastNameInputRef.current?.focus();
                                        return;
                                    }
                                    if (target === form.customerLastNameInputRef.current) {
                                        e.preventDefault();
                                        form.customerPhoneInputRef.current?.focus();
                                        return;
                                    }
                                    if (target === form.customerPhonePrefixRef.current) {
                                        e.preventDefault();
                                        form.customerPhoneInputRef.current?.focus();
                                        return;
                                    }
                                    if (target === form.customerPhoneInputRef.current) {
                                        e.preventDefault();
                                        form.customerEmailInputRef.current?.focus();
                                        return;
                                    }
                                    if (target === form.customerEmailInputRef.current) {
                                        e.preventDefault();
                                        form.handleAddNewCustomerDirectly();
                                        form.setFocusedField(null);
                                        return;
                                    }
                                } else if (form.customerEditMode) {
                                    const customerFields = [
                                        form.customerInputRef.current,
                                        form.customerLastNameInputRef.current,
                                        form.customerPhoneInputRef.current,
                                        form.customerEmailInputRef.current,
                                    ];
                                    if (customerFields.includes(target)) {
                                        e.preventDefault();
                                        form.handleConfirmEdit();
                                    }
                                }
                            }
                        }}
                        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
                    >

                        {/* ── Header ─────────────────────────────────────────────── */}
                        <S.Header>
                            <S.HeaderContent>
                                <S.TitleInput
                                    ref={form.titleInputRef}
                                    type="text"
                                    placeholder="Dodaj tytuł rezerwacji"
                                    value={form.title}
                                    onChange={(e) => form.setTitle(e.target.value)}
                                    $accentColor={form.focusedField === 'title' ? form.accentColor : undefined}
                                    onFocus={() => form.setFocusedField('title')}
                                    onBlur={() => form.setFocusedField(null)}
                                />
                            </S.HeaderContent>
                            <S.CloseButton type="button" onClick={onClose}>
                                <IconX />
                            </S.CloseButton>
                        </S.Header>

                        <S.ScrollableContent>
                            {/* ── Time row ───────────────────────────────────────── */}
                            <S.Row>
                                <S.IconWrapper $color={form.focusedField?.startsWith('time') ? form.accentColor : undefined}>
                                    <IconClock />
                                </S.IconWrapper>
                                <S.RowContent>
                                    {!isMobile && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                                            <Toggle
                                                checked={isRecurring}
                                                onChange={setIsRecurring}
                                                label="Cykliczna"
                                                size="sm"
                                            />
                                            <Toggle
                                                checked={form.isAllDay}
                                                onChange={form.handleAllDayToggle}
                                                label="Wizyta całodniowa"
                                                size="sm"
                                            />
                                        </div>
                                    )}
                                    <S.InputGrid>
                                        <S.InputGroup>
                                            <S.Label>{form.isAllDay ? 'Data' : 'Początek'}</S.Label>
                                            <DateTimePicker
                                                value={form.startDateTime}
                                                onChange={(val) => {
                                                    form.setStartDateTime(val);
                                                    if (form.isAllDay) {
                                                        form.setEndDateTime(`${val.split('T')[0]}T23:59:59`);
                                                    } else {
                                                        const startDate = val.split('T')[0];
                                                        const endDate = form.endDateTime.split('T')[0];
                                                        if (startDate > endDate) {
                                                            const endTime = form.endDateTime.split('T')[1] ?? '00:00';
                                                            form.setEndDateTime(`${startDate}T${endTime}`);
                                                        }
                                                    }
                                                }}
                                                showTime={!form.isAllDay}
                                                placeholder="Wybierz datę"
                                                accentColor={form.focusedField === 'time-start' ? form.accentColor : undefined}
                                                hasError={!!form.errors.startDateTime}
                                                containerRef={form.startInputRef}
                                                onFocus={() => form.setFocusedField('time-start')}
                                                onBlur={() => form.setFocusedField(null)}
                                            />
                                            {form.errors.startDateTime && <S.ErrorMessage>{form.errors.startDateTime}</S.ErrorMessage>}
                                        </S.InputGroup>
                                        {!form.isAllDay && (
                                            <S.InputGroup>
                                                <S.Label>Koniec</S.Label>
                                                <DateTimePicker
                                                    value={form.endDateTime}
                                                    onChange={form.setEndDateTime}
                                                    showTime
                                                    placeholder="Wybierz datę i godzinę"
                                                    accentColor={form.focusedField === 'time-end' ? form.accentColor : undefined}
                                                    hasError={!!form.errors.endDateTime}
                                                    containerRef={form.endInputRef}
                                                    onFocus={() => form.setFocusedField('time-end')}
                                                    onBlur={() => form.setFocusedField(null)}
                                                />
                                                {form.errors.endDateTime && <S.ErrorMessage>{form.errors.endDateTime}</S.ErrorMessage>}
                                            </S.InputGroup>
                                        )}
                                    </S.InputGrid>
                                </S.RowContent>
                            </S.Row>

                            <S.Divider />

                            {/* ── Customer row ───────────────────────────────────── */}
                            <S.Row>
                                <S.IconWrapper $color={form.focusedField === 'customer' ? form.accentColor : undefined}>
                                    <IconUser />
                                </S.IconWrapper>
                                <S.RowContent>
                                    {/* ── stan: klient wybrany, tryb edycji ── */}
                                    {form.selectedCustomer && form.customerEditMode ? (
                                        <>
                                            <S.CustomerHint style={{ color: '#0ea5e9' }}>
                                                Edytuj dane klienta
                                            </S.CustomerHint>
                                            <S.CustomerInputBlock $focused={form.focusedField === 'customer'}>
                                                <S.CustomerInputRow>
                                                    <S.CustomerFieldGroup $borderRight $hasError={!!form.errors.customerFirstName}>
                                                        <S.CustomerFieldLabel $hasError={!!form.errors.customerFirstName}>Imię</S.CustomerFieldLabel>
                                                        <S.CustomerFieldInput
                                                            ref={form.customerInputRef}
                                                            type="text"
                                                            placeholder="Jan"
                                                            value={form.customerFirstName}
                                                            onChange={(e) => form.setCustomerFirstName(e.target.value)}
                                                            onFocus={form.handleCustomerFieldFocus}
                                                            onBlur={form.handleCustomerFieldBlur}
                                                            autoComplete="new-password"
                                                            autoFocus
                                                            $hasError={!!form.errors.customerFirstName}
                                                        />
                                                    </S.CustomerFieldGroup>
                                                    <S.CustomerFieldGroup $hasError={!!form.errors.customerLastName}>
                                                        <S.CustomerFieldLabel $hasError={!!form.errors.customerLastName}>Nazwisko</S.CustomerFieldLabel>
                                                        <S.CustomerFieldInput
                                                            ref={form.customerLastNameInputRef}
                                                            type="text"
                                                            placeholder="Kowalski"
                                                            value={form.customerLastName}
                                                            onChange={(e) => form.setCustomerLastName(e.target.value)}
                                                            onFocus={form.handleCustomerFieldFocus}
                                                            onBlur={form.handleCustomerFieldBlur}
                                                            autoComplete="new-password"
                                                            $hasError={!!form.errors.customerLastName}
                                                        />
                                                    </S.CustomerFieldGroup>
                                                </S.CustomerInputRow>
                                                <S.CustomerInputRow>
                                                    <S.CustomerFieldGroup $borderRight $hasError={!!form.errors.customerPhone}>
                                                        <S.CustomerFieldLabel $hasError={!!form.errors.customerPhone}>Telefon</S.CustomerFieldLabel>
                                                        <S.PhoneInputRow>
                                                            <S.PhonePrefixInput
                                                                ref={form.customerPhonePrefixRef}
                                                                type="text"
                                                                placeholder="+48"
                                                                value={form.customerPhonePrefix}
                                                                onChange={(e) => form.setCustomerPhonePrefix(e.target.value)}
                                                                onFocus={form.handleCustomerFieldFocus}
                                                                onBlur={form.handleCustomerFieldBlur}
                                                                autoComplete="new-password"
                                                                $hasError={!!form.errors.customerPhone}
                                                            />
                                                            <S.CustomerFieldInput
                                                                ref={form.customerPhoneInputRef}
                                                                type="tel"
                                                                placeholder="123 456 789"
                                                                value={form.customerPhone}
                                                                onChange={(e) => form.setCustomerPhone(form.formatPhone(e.target.value))}
                                                                onFocus={form.handleCustomerFieldFocus}
                                                                onBlur={form.handleCustomerFieldBlur}
                                                                autoComplete="new-password"
                                                                $hasError={!!form.errors.customerPhone}
                                                            />
                                                        </S.PhoneInputRow>
                                                    </S.CustomerFieldGroup>
                                                    <S.CustomerFieldGroup $hasError={!!form.errors.customerEmail}>
                                                        <S.CustomerFieldLabel $hasError={!!form.errors.customerEmail}>E-mail</S.CustomerFieldLabel>
                                                        <S.CustomerFieldInput
                                                            ref={form.customerEmailInputRef}
                                                            type="email"
                                                            placeholder="jan@example.com"
                                                            value={form.customerEmail}
                                                            onChange={(e) => form.setCustomerEmail(e.target.value)}
                                                            onFocus={form.handleCustomerFieldFocus}
                                                            onBlur={form.handleCustomerFieldBlur}
                                                            autoComplete="new-password"
                                                            $hasError={!!form.errors.customerEmail}
                                                        />
                                                    </S.CustomerFieldGroup>
                                                </S.CustomerInputRow>
                                            </S.CustomerInputBlock>
                                            <S.CustomerEditActions>
                                                <S.CustomerEditConfirmBtn type="button" onClick={form.handleConfirmEdit}>
                                                    <IconCheck />
                                                    Zatwierdź zmiany
                                                </S.CustomerEditConfirmBtn>
                                                <S.CustomerEditCancelBtn type="button" onClick={form.handleCancelEdit}>
                                                    Anuluj
                                                </S.CustomerEditCancelBtn>
                                            </S.CustomerEditActions>
                                        </>
                                    ) : form.selectedCustomer ? (
                                        /* ── stan: klient wybrany, chip ── */
                                        <S.SelectedCustomerChip>
                                            <S.ChipCheck>✓</S.ChipCheck>
                                            <S.ChipInfo>
                                                <S.ChipName>
                                                    {(form.selectedCustomer.firstName || form.selectedCustomer.lastName)
                                                        ? `${form.selectedCustomer.firstName ?? ''} ${form.selectedCustomer.lastName ?? ''}`.trim()
                                                        : '(Brak danych)'
                                                    }
                                                    {form.selectedCustomer.isNew && <S.NewBadge>Nowy</S.NewBadge>}
                                                </S.ChipName>
                                                {(form.selectedCustomer.phone || form.selectedCustomer.email) && (
                                                    <>
                                                        <S.ChipDot>·</S.ChipDot>
                                                        <S.ChipMeta>
                                                            {[form.selectedCustomer.phone, form.selectedCustomer.email].filter(Boolean).join('  ·  ')}
                                                        </S.ChipMeta>
                                                    </>
                                                )}
                                            </S.ChipInfo>
                                            <S.ChipEdit
                                                type="button"
                                                onClick={form.handleEnterEditMode}
                                                title="Popraw dane klienta"
                                            >
                                                <IconPencil />
                                            </S.ChipEdit>
                                            <S.ChipClear
                                                type="button"
                                                onClick={() => {
                                                    form.setSelectedCustomer(null);
                                                    form.setSelectedCustomerId(undefined);
                                                    form.setCustomerFirstName('');
                                                    form.setCustomerLastName('');
                                                    form.setCustomerPhone('');
                                                    form.setCustomerEmail('');
                                                    form.setSelectedVehicle(null);
                                                    form.setVehicleBrand('');
                                                    form.setVehicleModel('');
                                                    form.setVehicleYear('');
                                                }}
                                                title="Usuń klienta"
                                            >
                                                <IconX />
                                            </S.ChipClear>
                                        </S.SelectedCustomerChip>
                                    ) : (
                                        /* ── stan: brak klienta, formularz wyszukiwania ── */
                                        <>
                                            <S.CustomerHint>
                                                Wyszukaj istniejącego klienta lub wypełnij pola, aby dodać nowego
                                            </S.CustomerHint>
                                            <S.DropdownContainer ref={customerDropdownContainerRef}>
                                                <S.CustomerInputBlock
                                                    $focused={form.focusedField === 'customer'}
                                                    $hasError={!!(form.errors.customer || form.errors.customerFirstName || form.errors.customerLastName || form.errors.customerPhone || form.errors.customerEmail)}
                                                    $dropdownOpen={!isMobile && form.showCustomerDropdown}
                                                >
                                                    <S.CustomerInputRow>
                                                        <S.CustomerFieldGroup $borderRight $hasError={!!form.errors.customerFirstName}>
                                                            <S.CustomerFieldLabel $hasError={!!form.errors.customerFirstName}>Imię</S.CustomerFieldLabel>
                                                            <S.CustomerFieldInput
                                                                ref={form.customerInputRef}
                                                                type="text"
                                                                placeholder="Jan"
                                                                value={form.customerFirstName}
                                                                onChange={(e) => {
                                                                    form.setCustomerFirstName(e.target.value);
                                                                    form.setShowCustomerDropdown(true);
                                                                }}
                                                                onPointerDown={openCustomerSheetFromTap}
                                                                onTouchStart={openCustomerSheetFromTap}
                                                                onFocus={form.handleCustomerFieldFocus}
                                                                onBlur={form.handleCustomerFieldBlur}
                                                                autoComplete="new-password"
                                                                $hasError={!!form.errors.customerFirstName}
                                                            />
                                                        </S.CustomerFieldGroup>
                                                        <S.CustomerFieldGroup $hasError={!!form.errors.customerLastName}>
                                                            <S.CustomerFieldLabel $hasError={!!form.errors.customerLastName}>Nazwisko</S.CustomerFieldLabel>
                                                            <S.CustomerFieldInput
                                                                ref={form.customerLastNameInputRef}
                                                                type="text"
                                                                placeholder="Kowalski"
                                                                value={form.customerLastName}
                                                                onChange={(e) => {
                                                                    form.setCustomerLastName(e.target.value);
                                                                    form.setShowCustomerDropdown(true);
                                                                }}
                                                                onPointerDown={openCustomerSheetFromTap}
                                                                onTouchStart={openCustomerSheetFromTap}
                                                                onFocus={form.handleCustomerFieldFocus}
                                                                onBlur={form.handleCustomerFieldBlur}
                                                                autoComplete="new-password"
                                                                $hasError={!!form.errors.customerLastName}
                                                            />
                                                        </S.CustomerFieldGroup>
                                                    </S.CustomerInputRow>

                                                    {/* Phone + email: always visible, on every viewport */}
                                                    <S.CustomerInputRow>
                                                            <S.CustomerFieldGroup $borderRight $hasError={!!form.errors.customerPhone}>
                                                                <S.CustomerFieldLabel $hasError={!!form.errors.customerPhone}>Telefon</S.CustomerFieldLabel>
                                                                <S.PhoneInputRow>
                                                                    <S.PhonePrefixInput
                                                                        ref={form.customerPhonePrefixRef}
                                                                        type="text"
                                                                        placeholder="+48"
                                                                        value={form.customerPhonePrefix}
                                                                        onChange={(e) => {
                                                                            form.setCustomerPhonePrefix(e.target.value);
                                                                            form.setShowCustomerDropdown(true);
                                                                        }}
                                                                        onPointerDown={openCustomerSheetFromTap}
                                                                        onTouchStart={openCustomerSheetFromTap}
                                                                        onFocus={form.handleCustomerFieldFocus}
                                                                        onBlur={form.handleCustomerFieldBlur}
                                                                        autoComplete="new-password"
                                                                        $hasError={!!form.errors.customerPhone}
                                                                    />
                                                                    <S.CustomerFieldInput
                                                                        ref={form.customerPhoneInputRef}
                                                                        type="tel"
                                                                        placeholder="123 456 789"
                                                                        value={form.customerPhone}
                                                                        onChange={(e) => {
                                                                            form.setCustomerPhone(form.formatPhone(e.target.value));
                                                                            form.setShowCustomerDropdown(true);
                                                                        }}
                                                                        onPointerDown={openCustomerSheetFromTap}
                                                                        onTouchStart={openCustomerSheetFromTap}
                                                                        onFocus={form.handleCustomerFieldFocus}
                                                                        onBlur={form.handleCustomerFieldBlur}
                                                                        autoComplete="new-password"
                                                                        $hasError={!!form.errors.customerPhone}
                                                                    />
                                                                </S.PhoneInputRow>
                                                            </S.CustomerFieldGroup>
                                                            <S.CustomerFieldGroup $hasError={!!form.errors.customerEmail}>
                                                                <S.CustomerFieldLabel $hasError={!!form.errors.customerEmail}>E-mail</S.CustomerFieldLabel>
                                                                <S.CustomerFieldInput
                                                                    ref={form.customerEmailInputRef}
                                                                    type="email"
                                                                    placeholder="jan@example.com"
                                                                    value={form.customerEmail}
                                                                    onChange={(e) => {
                                                                        form.setCustomerEmail(e.target.value);
                                                                        form.setShowCustomerDropdown(true);
                                                                    }}
                                                                    onPointerDown={openCustomerSheetFromTap}
                                                                    onTouchStart={openCustomerSheetFromTap}
                                                                    onFocus={form.handleCustomerFieldFocus}
                                                                    onBlur={form.handleCustomerFieldBlur}
                                                                    autoComplete="new-password"
                                                                    $hasError={!!form.errors.customerEmail}
                                                                />
                                                            </S.CustomerFieldGroup>
                                                    </S.CustomerInputRow>
                                                </S.CustomerInputBlock>

                                                {/* Desktop portal dropdown */}
                                                {!isMobile && form.showCustomerDropdown && customerDropdownPos && createPortal(
                                                    <S.CustomerPortalDropdown style={{ top: customerDropdownPos.top, left: customerDropdownPos.left, width: customerDropdownPos.width, maxHeight: customerDropdownPos.maxHeight }}>
                                                        {form.customerResults.length > 0 && (
                                                            <S.DropdownSeparator>Istniejący klienci</S.DropdownSeparator>
                                                        )}
                                                        {form.customerResults.map((c) => {
                                                            const hasContact = !!(c.phone || c.email);
                                                            return (
                                                                <S.DropdownItem
                                                                    key={c.id}
                                                                    type="button"
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={() => {
                                                                        form.customerJustSelectedRef.current = true;
                                                                        form.handleCustomerSelect({
                                                                            id: c.id,
                                                                            firstName: c.firstName,
                                                                            lastName: c.lastName,
                                                                            phone: c.phone,
                                                                            email: c.email,
                                                                            isNew: false,
                                                                        });
                                                                        form.setShowCustomerDropdown(false);
                                                                    }}
                                                                    $accentColor={form.accentColor}
                                                                >
                                                                    {(c.firstName || c.lastName)
                                                                        ? <span>{c.firstName} {c.lastName}</span>
                                                                        : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>(Nie uzupełniono imienia i nazwiska)</span>
                                                                    }
                                                                    <S.DropdownItemMeta $warning={!hasContact}>
                                                                        {hasContact
                                                                            ? [c.phone, c.email].filter(Boolean).join('  ·  ')
                                                                            : '⚠ Brak danych kontaktowych, może to inna osoba?'
                                                                        }
                                                                    </S.DropdownItemMeta>
                                                                </S.DropdownItem>
                                                            );
                                                        })}
                                                        {form.customerResults.length > 0 && (
                                                            <S.DropdownSeparator>Nie ten klient?</S.DropdownSeparator>
                                                        )}
                                                        <S.DropdownAddButton
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                form.handleAddNewCustomerDirectly();
                                                                form.setFocusedField(null);
                                                            }}
                                                        >
                                                            <IconPlus />
                                                            <span>
                                                                {form.customerResults.length > 0
                                                                    ? 'To inna osoba, dodaj jako nowego klienta'
                                                                    : 'Dodaj nowego klienta'
                                                                }
                                                            </span>
                                                        </S.DropdownAddButton>
                                                    </S.CustomerPortalDropdown>,
                                                    document.body
                                                )}

                                                {/* Mobile bottom sheet for customer results */}
                                                {isMobile && form.showCustomerDropdown && createPortal(
                                                    <>
                                                        <S.MobileSheetBackdrop
                                                            // Arkusz wstaje pod palcem, więc „kliknięcie" domykające gest
                                                            // dotknięcia lądowałoby już na tle i od razu by go zamknęło.
                                                            onClick={() => {
                                                                if (performance.now() - customerTapGuardRef.current < 400) return;
                                                                form.setShowCustomerDropdown(false);
                                                            }}
                                                        />
                                                        <S.MobileBottomSheet ref={customerSheetRef}>
                                                            <S.MobileSheetHandle />
                                                            <S.MobileSheetTitle>
                                                                <span>Szukaj klienta</span>
                                                                <S.MobileSheetClose
                                                                    type="button"
                                                                    aria-label="Zamknij"
                                                                    // Keep focus on the editable until the click lands; the
                                                                    // sheet then unmounts and the keyboard drops with it.
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={() => form.setShowCustomerDropdown(false)}
                                                                >
                                                                    <IconX />
                                                                </S.MobileSheetClose>
                                                            </S.MobileSheetTitle>
                                                            <S.MobileSheetSearchWrap>
                                                                <S.MobileSheetSearchEditable
                                                                    ref={customerSheetInputRef}
                                                                    contentEditable
                                                                    suppressContentEditableWarning
                                                                    role="searchbox"
                                                                    aria-label="Szukaj klienta"
                                                                    data-placeholder="Imię lub nazwisko..."
                                                                    inputMode="search"
                                                                    enterKeyHint="search"
                                                                    autoCorrect="off"
                                                                    autoCapitalize="words"
                                                                    spellCheck={false}
                                                                    onInput={(e) => {
                                                                        const text = e.currentTarget.innerText.replace(/\n/g, '');
                                                                        form.setCustomerFirstName(text);
                                                                        form.setShowCustomerDropdown(true);
                                                                    }}
                                                                    onPaste={(e) => {
                                                                        e.preventDefault();
                                                                        const text = e.clipboardData.getData('text/plain').replace(/\n/g, '');
                                                                        document.execCommand('insertText', false, text);
                                                                    }}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') e.preventDefault();
                                                                    }}
                                                                />
                                                            </S.MobileSheetSearchWrap>
                                                            <S.MobileSheetScrollable>
                                                                {form.customerResults.map((c) => {
                                                                    const hasContact = !!(c.phone || c.email);
                                                                    return (
                                                                        <S.DropdownItem
                                                                            key={c.id}
                                                                            type="button"
                                                                            onMouseDown={(e) => e.preventDefault()}
                                                                            onClick={() => {
                                                                                form.customerJustSelectedRef.current = true;
                                                                                form.handleCustomerSelect({
                                                                                    id: c.id,
                                                                                    firstName: c.firstName,
                                                                                    lastName: c.lastName,
                                                                                    phone: c.phone,
                                                                                    email: c.email,
                                                                                    isNew: false,
                                                                                });
                                                                                form.setShowCustomerDropdown(false);
                                                                            }}
                                                                            $accentColor={form.accentColor}
                                                                        >
                                                                            {(c.firstName || c.lastName)
                                                                                ? <span>{c.firstName} {c.lastName}</span>
                                                                                : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>(Nie uzupełniono imienia i nazwiska)</span>
                                                                            }
                                                                            <S.DropdownItemMeta $warning={!hasContact}>
                                                                                {hasContact
                                                                                    ? [c.phone, c.email].filter(Boolean).join('  ·  ')
                                                                                    : '⚠ Brak danych kontaktowych'
                                                                                }
                                                                            </S.DropdownItemMeta>
                                                                        </S.DropdownItem>
                                                                    );
                                                                })}
                                                                <S.DropdownAddButton
                                                                    type="button"
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={() => {
                                                                        // Zamiast zapisywać klienta z samym imieniem wpisanym
                                                                        // w wyszukiwarkę, otwieramy formularz z kompletem pól.
                                                                        // To, co wpisano, dzielimy na imię i nazwisko.
                                                                        const typed = form.customerFirstName.trim();
                                                                        const spaceAt = typed.indexOf(' ');
                                                                        setNewCustomerDraft({
                                                                            firstName: spaceAt > 0 ? typed.slice(0, spaceAt) : typed,
                                                                            lastName: spaceAt > 0
                                                                                ? typed.slice(spaceAt + 1).trim()
                                                                                : form.customerLastName.trim(),
                                                                            phonePrefix: form.customerPhonePrefix || '+48',
                                                                            phone: form.customerPhone,
                                                                            email: form.customerEmail,
                                                                        });
                                                                        form.setShowCustomerDropdown(false);
                                                                        form.setFocusedField(null);
                                                                    }}
                                                                >
                                                                    <IconPlus />
                                                                    <span>
                                                                        {form.customerResults.length > 0
                                                                            ? 'To inna osoba, dodaj jako nowego klienta'
                                                                            : 'Dodaj nowego klienta'
                                                                        }
                                                                    </span>
                                                                </S.DropdownAddButton>
                                                            </S.MobileSheetScrollable>
                                                        </S.MobileBottomSheet>
                                                    </>,
                                                    document.body
                                                )}
                                            </S.DropdownContainer>
                                        </>
                                    )}

                                </S.RowContent>
                            </S.Row>

                            {/* ── Vehicle row ────────────────────────────────────── */}
                            <S.Row>
                                <S.IconWrapper $color={form.focusedField === 'vehicle' ? form.accentColor : undefined}>
                                    <IconCar />
                                </S.IconWrapper>
                                <S.RowContent ref={form.vehicleSectionRef}>
                                    {form.selectedVehicle && form.vehicleEditMode ? (
                                        /* ── stan: pojazd wybrany, tryb edycji ── */
                                        <>
                                            <S.CustomerHint style={{ color: '#0ea5e9' }}>
                                                Edytuj dane pojazdu
                                            </S.CustomerHint>
                                            <S.CustomerInputBlock $focused={form.focusedField === 'vehicle'}>
                                                <S.VehicleInputRow>
                                                    <S.CustomerFieldGroup $borderRight>
                                                        <S.CustomerFieldLabel>Marka</S.CustomerFieldLabel>
                                                        <BrandSelect
                                                            compact
                                                            value={form.vehicleBrand}
                                                            onChange={(brand) => { form.setVehicleBrand(brand); form.setVehicleModel(''); form.setFocusedField('vehicle'); setAutoOpenModel(true); }}
                                                            onBlur={() => form.setFocusedField(null)}
                                                        />
                                                    </S.CustomerFieldGroup>
                                                    <S.CustomerFieldGroup $borderRight>
                                                        <S.CustomerFieldLabel>Model</S.CustomerFieldLabel>
                                                        <ModelSelect
                                                            compact
                                                            brand={form.vehicleBrand}
                                                            value={form.vehicleModel}
                                                            onChange={(model) => { form.setVehicleModel(model); form.setFocusedField('vehicle'); }}
                                                            onBlur={() => form.setFocusedField(null)}
                                                            autoOpen={autoOpenModel}
                                                        />
                                                    </S.CustomerFieldGroup>
                                                    <S.CustomerFieldGroup>
                                                        <S.CustomerFieldLabel>Rok</S.CustomerFieldLabel>
                                                        <S.CustomerFieldInput
                                                            type="text" inputMode="numeric" placeholder="2021" maxLength={4}
                                                            value={form.vehicleYear}
                                                            onChange={(e) => form.setVehicleYear(e.target.value.replace(/\D/g, ''))}
                                                            onFocus={() => form.setFocusedField('vehicle')}
                                                            onBlur={() => form.setFocusedField(null)}
                                                            autoComplete="new-password"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    form.handleConfirmVehicleEdit();
                                                                }
                                                            }}
                                                        />
                                                    </S.CustomerFieldGroup>
                                                </S.VehicleInputRow>
                                            </S.CustomerInputBlock>
                                            <S.CustomerEditActions>
                                                <S.CustomerEditConfirmBtn type="button" onClick={form.handleConfirmVehicleEdit}>
                                                    <IconCheck />
                                                    Zatwierdź zmiany
                                                </S.CustomerEditConfirmBtn>
                                                <S.CustomerEditCancelBtn type="button" onClick={form.handleCancelVehicleEdit}>
                                                    Anuluj
                                                </S.CustomerEditCancelBtn>
                                            </S.CustomerEditActions>
                                        </>
                                    ) : form.selectedVehicle ? (
                                        /* ── stan: pojazd wybrany, chip ── */
                                        <S.SelectedCustomerChip>
                                            <S.ChipCheck>✓</S.ChipCheck>
                                            <S.ChipInfo>
                                                <S.ChipName>
                                                    {`${form.selectedVehicle.brand} ${form.selectedVehicle.model}`.trim() || '(Brak danych)'}
                                                    {form.selectedVehicle.isNew && <S.NewBadge>Nowy</S.NewBadge>}
                                                </S.ChipName>
                                                {form.selectedVehicle.year && (
                                                    <>
                                                        <S.ChipDot>·</S.ChipDot>
                                                        <S.ChipMeta>{form.selectedVehicle.year}</S.ChipMeta>
                                                    </>
                                                )}
                                            </S.ChipInfo>
                                            <S.ChipClear
                                                type="button"
                                                onClick={() => {
                                                    form.setSelectedVehicle(null);
                                                    form.setVehicleBrand('');
                                                    form.setVehicleModel('');
                                                    form.setVehicleYear('');
                                                }}
                                                title="Zmień pojazd"
                                            >
                                                <IconX />
                                            </S.ChipClear>
                                        </S.SelectedCustomerChip>
                                    ) : form.vehicles.length > 0 && !form.isAddingNewVehicle ? (
                                        /* ── stan: klient ma pojazdy, wybierz z listy ── */
                                        <S.DropdownContainer>
                                            <S.VehicleSelectButton
                                                type="button"
                                                $dropdownOpen={form.showVehicleDropdown}
                                                disabled={!form.selectedCustomer}
                                                onClick={form.handleVehicleSelectTriggerClick}
                                                onBlur={form.handleVehicleFieldBlur}
                                            >
                                                <span style={{ color: '#c8d4e0' }}>Wybierz pojazd</span>
                                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0 }}>
                                                    <path d="M1 1l4 4 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </S.VehicleSelectButton>
                                            {form.showVehicleDropdown && form.selectedCustomer && (
                                                <S.Dropdown>
                                                    <S.DropdownSeparator>Pojazdy klienta</S.DropdownSeparator>
                                                    {form.vehicles.map(v => (
                                                        <S.DropdownItem
                                                            key={v.id}
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                form.handleVehicleSelect({ id: v.id, brand: v.brand, model: v.model, year: v.year, isNew: false });
                                                            }}
                                                            $accentColor={form.accentColor}
                                                        >
                                                            <span>{v.brand} {v.model}</span>
                                                            <S.DropdownItemMeta>
                                                                {[v.year, v.licensePlate].filter(Boolean).join('  ·  ')}
                                                            </S.DropdownItemMeta>
                                                        </S.DropdownItem>
                                                    ))}
                                                    <S.DropdownSeparator>Inny pojazd?</S.DropdownSeparator>
                                                    <S.DropdownAddButton
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => {
                                                            form.setIsAddingNewVehicle(true);
                                                            form.setShowVehicleDropdown(false);
                                                            form.setFocusedField(null);
                                                        }}
                                                    >
                                                        <IconPlus />
                                                        <span>Dodaj nowy pojazd</span>
                                                    </S.DropdownAddButton>
                                                </S.Dropdown>
                                            )}
                                        </S.DropdownContainer>
                                    ) : (
                                        /* ── stan: brak pojazdów lub dodawanie nowego ── */
                                        <>
                                            {form.vehicles.length > 0 && (
                                                <S.CustomerHint>
                                                    <button
                                                        type="button"
                                                        style={{ background: 'none', border: 'none', color: '#0ea5e9', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
                                                        onClick={() => {
                                                            form.setIsAddingNewVehicle(false);
                                                            form.setVehicleBrand('');
                                                            form.setVehicleModel('');
                                                            form.setVehicleYear('');
                                                        }}
                                                    >
                                                        ← Wróć do listy pojazdów
                                                    </button>
                                                </S.CustomerHint>
                                            )}
                                            <S.CustomerInputBlock
                                                $focused={form.focusedField === 'vehicle'}
                                                style={!form.selectedCustomer ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                                            >
                                                <S.VehicleInputRow>
                                                    <S.CustomerFieldGroup $borderRight>
                                                        <S.CustomerFieldLabel>Marka</S.CustomerFieldLabel>
                                                        <BrandSelect
                                                            compact
                                                            value={form.vehicleBrand}
                                                            onChange={(brand) => {
                                                                form.setVehicleBrand(brand);
                                                                form.setVehicleModel('');
                                                                form.setFocusedField('vehicle');
                                                                setAutoOpenModel(true);
                                                            }}
                                                            onBlur={() => form.setFocusedField(null)}
                                                        />
                                                    </S.CustomerFieldGroup>
                                                    <S.CustomerFieldGroup $borderRight>
                                                        <S.CustomerFieldLabel>Model</S.CustomerFieldLabel>
                                                        <ModelSelect
                                                            compact
                                                            brand={form.vehicleBrand}
                                                            value={form.vehicleModel}
                                                            onChange={(model) => {
                                                                form.setVehicleModel(model);
                                                                form.setFocusedField('vehicle');
                                                                setAutoOpenModel(false);
                                                                setTimeout(() => form.vehicleYearInputRef.current?.focus(), 0);
                                                            }}
                                                            onBlur={() => form.setFocusedField(null)}
                                                            autoOpen={autoOpenModel}
                                                        />
                                                    </S.CustomerFieldGroup>
                                                    <S.CustomerFieldGroup>
                                                        <S.CustomerFieldLabel>Rok</S.CustomerFieldLabel>
                                                        <S.CustomerFieldInput
                                                            ref={form.vehicleYearInputRef}
                                                            type="text"
                                                            inputMode="numeric"
                                                            placeholder="2021"
                                                            maxLength={4}
                                                            value={form.vehicleYear}
                                                            onChange={(e) => { form.setVehicleYear(e.target.value.replace(/\D/g, '')); form.setFocusedField('vehicle'); }}
                                                            onFocus={() => form.setFocusedField('vehicle')}
                                                            onBlur={() => form.setFocusedField(null)}
                                                            autoComplete="new-password"
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    form.handleAddNewVehicleDirectly();
                                                                }
                                                            }}
                                                        />
                                                    </S.CustomerFieldGroup>
                                                </S.VehicleInputRow>
                                            </S.CustomerInputBlock>
                                        </>
                                    )}
                                </S.RowContent>
                            </S.Row>

                            <S.Divider />

                            {/* ── Services row ───────────────────────────────────── */}
                            <S.Row>
                                <S.IconWrapper $color={form.focusedField === 'services' ? form.accentColor : undefined}>
                                    <IconSettings />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <S.DropdownContainer>
                                        {isMobile ? (
                                            /* Mobile: tap-to-open bottom sheet */
                                            <S.MobileAddServiceButton
                                                type="button"
                                                onClick={() => {
                                                    if (form.services.length === 0) {
                                                        form.setIsQuickServiceModalOpen(true);
                                                        return;
                                                    }
                                                    // iOS only opens keyboard from focus() called within a user gesture.
                                                    // Mount a temporary off-screen contenteditable NOW (within the gesture),
                                                    // open the keyboard, then transfer focus after the portal mounts.
                                                    const tmp = document.createElement('div');
                                                    tmp.contentEditable = 'true';
                                                    tmp.setAttribute('inputmode', 'search');
                                                    tmp.style.cssText = 'position:fixed;top:-200px;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
                                                    document.body.appendChild(tmp);
                                                    tmp.focus();

                                                    form.setServiceSearch('');
                                                    setHighlightedServiceIdx(-1);
                                                    form.setShowServiceDropdown(true);

                                                    // Transfer focus to real search field after portal renders (~2 frames)
                                                    requestAnimationFrame(() => requestAnimationFrame(() => {
                                                        serviceSheetInputRef.current?.focus();
                                                        document.body.removeChild(tmp);
                                                    }));
                                                }}
                                            >
                                                <span>Dodaj usługę...</span>
                                                <IconPlus />
                                            </S.MobileAddServiceButton>
                                        ) : (
                                            /* Desktop: inline search input */
                                            <S.ServiceSearchWrap>
                                                <S.Input
                                                    ref={form.serviceInputRef}
                                                    type="text"
                                                    placeholder="Dodaj usługę..."
                                                    value={form.serviceSearch}
                                                    style={form.serviceSearch ? { paddingRight: 36 } : undefined}
                                                    onChange={(e) => {
                                                        form.setServiceSearch(e.target.value);
                                                        form.setShowServiceDropdown(true);
                                                        setHighlightedServiceIdx(-1);
                                                    }}
                                                    aria-invalid={!!form.errors.services || !!form.errors.servicePrices}
                                                    $accentColor={form.focusedField === 'services' ? form.accentColor : undefined}
                                                    $dropdownOpen={form.showServiceDropdown}
                                                    onFocus={() => {
                                                        form.setFocusedField('services');
                                                        if (form.services.length === 0) {
                                                            form.setIsQuickServiceModalOpen(true);
                                                        } else {
                                                            form.setShowServiceDropdown(true);
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        form.setFocusedField(null);
                                                        setTimeout(() => {
                                                            form.setShowServiceDropdown(false);
                                                            setHighlightedServiceIdx(-1);
                                                        }, 200);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        const count = form.filteredServices.length;
                                                        if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            form.setShowServiceDropdown(false);
                                                            setHighlightedServiceIdx(-1);
                                                            return;
                                                        }
                                                        if (e.key === 'ArrowDown') {
                                                            e.preventDefault();
                                                            if (!form.showServiceDropdown) { form.setShowServiceDropdown(true); return; }
                                                            setHighlightedServiceIdx(prev => (prev + 1) % Math.max(1, count));
                                                            return;
                                                        }
                                                        if (e.key === 'ArrowUp') {
                                                            e.preventDefault();
                                                            setHighlightedServiceIdx(prev => prev <= 0 ? count - 1 : prev - 1);
                                                            return;
                                                        }
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const highlighted = form.filteredServices[highlightedServiceIdx];
                                                            if (highlighted) {
                                                                form.addService(highlighted);
                                                                setHighlightedServiceIdx(-1);
                                                            } else if (count === 1) {
                                                                form.addService(form.filteredServices[0]);
                                                            } else if (form.serviceSearch.trim() && count === 0) {
                                                                form.setIsQuickServiceModalOpen(true);
                                                                form.setShowServiceDropdown(false);
                                                                form.setFocusedField(null);
                                                            }
                                                        }
                                                    }}
                                                />
                                                {form.serviceSearch && (
                                                    <S.ServiceSearchClear
                                                        type="button"
                                                        tabIndex={-1}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => {
                                                            form.setServiceSearch('');
                                                            setHighlightedServiceIdx(-1);
                                                            form.serviceInputRef.current?.focus();
                                                        }}
                                                        aria-label="Wyczyść wyszukiwanie"
                                                    >
                                                        <IconX />
                                                    </S.ServiceSearchClear>
                                                )}
                                            </S.ServiceSearchWrap>
                                        )}

                                        {/* Desktop portal dropdown */}
                                        {!isMobile && form.showServiceDropdown && serviceDropdownPos && createPortal(
                                            <S.ServicePortalDropdown
                                                ref={serviceDropdownRef}
                                                style={{
                                                    top: serviceDropdownPos.top,
                                                    left: serviceDropdownPos.left,
                                                    width: serviceDropdownPos.width,
                                                    maxHeight: serviceDropdownPos.maxHeight,
                                                }}
                                            >
                                                {form.filteredServices.length === 0 && form.serviceSearch.trim() && (
                                                    <S.ServiceDropdownEmpty>
                                                        Brak usług pasujących do „{form.serviceSearch.trim()}"
                                                    </S.ServiceDropdownEmpty>
                                                )}
                                                {form.filteredServices.map((service: Service, idx: number) => (
                                                    <S.ServiceDropdownItem
                                                        key={service.id}
                                                        type="button"
                                                        data-service-item
                                                        $isHighlighted={idx === highlightedServiceIdx}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onMouseEnter={() => setHighlightedServiceIdx(idx)}
                                                        onMouseLeave={() => setHighlightedServiceIdx(-1)}
                                                        onClick={() => {
                                                            form.addService(service);
                                                            setHighlightedServiceIdx(-1);
                                                            setTimeout(() => form.serviceInputRef.current?.focus(), 0);
                                                        }}
                                                    >
                                                        <S.ServiceDropdownName>
                                                            {highlightMatch(service.name, form.serviceSearch)}
                                                        </S.ServiceDropdownName>
                                                        {service.requireManualPrice ? (
                                                            <S.ServiceDropdownManualBadge>WYCENA</S.ServiceDropdownManualBadge>
                                                        ) : (
                                                            <S.ServiceDropdownPrices>
                                                                <S.ServiceDropdownGross>{((service.basePriceGross ?? netToGross(service.basePriceNet, service.vatRate)) / 100).toFixed(2)} zł brutto</S.ServiceDropdownGross>
                                                                <S.ServiceDropdownNet>{(service.basePriceNet / 100).toFixed(2)} zł netto</S.ServiceDropdownNet>
                                                            </S.ServiceDropdownPrices>
                                                        )}
                                                    </S.ServiceDropdownItem>
                                                ))}
                                                <S.DropdownAddButton
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        form.setIsQuickServiceModalOpen(true);
                                                        form.setShowServiceDropdown(false);
                                                        form.setFocusedField(null);
                                                    }}
                                                >
                                                    <IconPlus />
                                                    <span>
                                                        {form.serviceSearch.trim()
                                                            ? `Utwórz „${form.serviceSearch.trim()}"`
                                                            : 'Wprowadź nową usługę'}
                                                    </span>
                                                </S.DropdownAddButton>
                                            </S.ServicePortalDropdown>,
                                            document.body
                                        )}

                                        {/* Mobile bottom sheet */}
                                        {isMobile && form.showServiceDropdown && createPortal(
                                            <>
                                                <S.MobileSheetBackdrop
                                                    onClick={() => {
                                                        form.setShowServiceDropdown(false);
                                                        form.setServiceSearch('');
                                                    }}
                                                />
                                                <S.MobileBottomSheet ref={serviceSheetRef}>
                                                    <S.MobileSheetHandle />
                                                    <S.MobileSheetTitle>
                                                        <span>Wybierz usługę</span>
                                                        <S.MobileSheetClose
                                                            type="button"
                                                            aria-label="Zamknij"
                                                            // Keep focus on the editable until the click lands; the
                                                            // sheet then unmounts and the keyboard drops with it.
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                form.setShowServiceDropdown(false);
                                                                form.setServiceSearch('');
                                                            }}
                                                        >
                                                            <IconX />
                                                        </S.MobileSheetClose>
                                                    </S.MobileSheetTitle>
                                                    <S.MobileSheetSearchWrap>
                                                        <S.MobileSheetSearchEditable
                                                            ref={serviceSheetInputRef}
                                                            contentEditable
                                                            suppressContentEditableWarning
                                                            role="searchbox"
                                                            aria-label="Szukaj usługi"
                                                            data-placeholder="Szukaj usługi..."
                                                            inputMode="search"
                                                            enterKeyHint="search"
                                                            autoCorrect="off"
                                                            autoCapitalize="off"
                                                            spellCheck={false}
                                                            onInput={(e) => {
                                                                const text = e.currentTarget.innerText.replace(/\n/g, '');
                                                                form.setServiceSearch(text);
                                                                setHighlightedServiceIdx(-1);
                                                            }}
                                                            onPaste={(e) => {
                                                                e.preventDefault();
                                                                const text = e.clipboardData.getData('text/plain').replace(/\n/g, '');
                                                                document.execCommand('insertText', false, text);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') e.preventDefault();
                                                            }}
                                                        />
                                                        {form.serviceSearch && (
                                                            <S.ServiceSearchClear
                                                                type="button"
                                                                tabIndex={-1}
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={() => {
                                                                    if (serviceSheetInputRef.current) {
                                                                        serviceSheetInputRef.current.innerText = '';
                                                                    }
                                                                    form.setServiceSearch('');
                                                                    serviceSheetInputRef.current?.focus();
                                                                }}
                                                                style={{ top: '50%', right: 26 }}
                                                            >
                                                                <IconX />
                                                            </S.ServiceSearchClear>
                                                        )}
                                                    </S.MobileSheetSearchWrap>
                                                    <S.MobileSheetScrollable>
                                                        {form.filteredServices.length === 0 && form.serviceSearch.trim() && (
                                                            <S.ServiceDropdownEmpty>
                                                                Brak usług pasujących do „{form.serviceSearch.trim()}"
                                                            </S.ServiceDropdownEmpty>
                                                        )}
                                                        {form.filteredServices.map((service: Service) => (
                                                            <S.ServiceDropdownItem
                                                                key={service.id}
                                                                type="button"
                                                                $isHighlighted={false}
                                                                onClick={() => {
                                                                    form.addService(service);
                                                                    setHighlightedServiceIdx(-1);
                                                                }}
                                                            >
                                                                <S.ServiceDropdownName>
                                                                    {highlightMatch(service.name, form.serviceSearch)}
                                                                </S.ServiceDropdownName>
                                                                {service.requireManualPrice ? (
                                                                    <S.ServiceDropdownManualBadge>WYCENA</S.ServiceDropdownManualBadge>
                                                                ) : (
                                                                    <S.ServiceDropdownGross>
                                                                        {((service.basePriceGross ?? netToGross(service.basePriceNet, service.vatRate)) / 100).toFixed(2)} zł brutto
                                                                    </S.ServiceDropdownGross>
                                                                )}
                                                            </S.ServiceDropdownItem>
                                                        ))}
                                                        <S.DropdownAddButton
                                                            type="button"
                                                            onClick={() => {
                                                                form.setIsQuickServiceModalOpen(true);
                                                                form.setShowServiceDropdown(false);
                                                                form.setFocusedField(null);
                                                            }}
                                                        >
                                                            <IconPlus />
                                                            <span>
                                                                {form.serviceSearch.trim()
                                                                    ? `Utwórz „${form.serviceSearch.trim()}"`
                                                                    : 'Wprowadź nową usługę'}
                                                            </span>
                                                        </S.DropdownAddButton>
                                                    </S.MobileSheetScrollable>
                                                </S.MobileBottomSheet>
                                            </>,
                                            document.body
                                        )}
                                    </S.DropdownContainer>

                                    {form.errors.services && <S.ErrorMessage>{form.errors.services}</S.ErrorMessage>}
                                    {form.errors.servicePrices && <S.ErrorMessage>{form.errors.servicePrices}</S.ErrorMessage>}

                                    {servicesAsLineItems.length > 0 && (
                                        <ServicesTable
                                            services={servicesAsLineItems}
                                            onChange={handleServicesChange}
                                            onSaveService={handleSaveService}
                                        />
                                    )}
                                </S.RowContent>
                            </S.Row>

                            {/* ── Kolor w kalendarzu (telefon) ───────────────────── */}
                            {/* Rząd kolorowych kropek w stopce wymagał celowania palcem
                                w kółko o średnicy 18 px i nie mówił, co znaczy który
                                kolor. Na telefonie to zwykłe pole formularza — takie
                                samo jak w arkuszu przyjęcia pojazdu. */}
                            {isMobile && (
                                <>
                                    <S.Divider />
                                    <S.Row>
                                        <S.IconWrapper>
                                            <IconPalette />
                                        </S.IconWrapper>
                                        <S.RowContent>
                                            <MobileColorLabel>Kolor w kalendarzu</MobileColorLabel>
                                            <ColorDropdown
                                                colors={form.appointmentColors}
                                                value={form.selectedColorId ?? ''}
                                                onChange={(id) => form.setSelectedColorId(id)}
                                                onAddColor={() => form.setIsQuickColorModalOpen(true)}
                                            />
                                            {form.errors.color && (
                                                <S.ColorErrorMessage>{form.errors.color}</S.ColorErrorMessage>
                                            )}
                                        </S.RowContent>
                                    </S.Row>
                                </>
                            )}

                            {/* Advanced toggle (mobile only) */}
                            {isMobile && !showAdvanced && (
                                <>
                                    <S.Divider />
                                    <S.AdvancedToggleBtn type="button" onClick={() => setShowAdvanced(true)}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 5v14M5 12h14"/>
                                        </svg>
                                        Szczegóły
                                    </S.AdvancedToggleBtn>
                                </>
                            )}

                            {(!isMobile || showAdvanced) && (
                            <>

                            <S.Divider />

                            {/* ── Notes row ──────────────────────────────────────── */}
                            <S.Row>
                                <S.IconWrapper $color={form.focusedField === 'notes' ? form.accentColor : undefined}>
                                    <IconNote />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <S.Textarea
                                        placeholder="Dodaj notatki..."
                                        value={form.notes}
                                        onChange={(e) => form.setNotes(capitalizeFirst(e.target.value))}
                                        rows={3}
                                        $accentColor={form.focusedField === 'notes' ? form.accentColor : undefined}
                                        onFocus={() => form.setFocusedField('notes')}
                                        onBlur={() => form.setFocusedField(null)}
                                    />
                                </S.RowContent>
                            </S.Row>

                            <S.Divider />

                            {/* ── Door to Door row ───────────────────────────────── */}
                            <S.Row>
                                <S.IconWrapper $color={form.doorToDoor.enabled ? '#0ea5e9' : undefined}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                        <polyline points="9 22 9 12 15 12 15 22"/>
                                    </svg>
                                </S.IconWrapper>
                                <S.RowContent>
                                    <D2DToggleRow onClick={() => form.setDoorToDoor(d => ({ ...d, enabled: !d.enabled }))}>
                                        <D2DToggleLabel>
                                            Door to Door
                                            <D2DBadge>Odbiór / Dostawa</D2DBadge>
                                        </D2DToggleLabel>
                                        <D2DToggleSwitch
                                            type="button"
                                            $active={form.doorToDoor.enabled}
                                            onClick={e => { e.stopPropagation(); form.setDoorToDoor(d => ({ ...d, enabled: !d.enabled })); }}
                                        />
                                    </D2DToggleRow>
                                    {form.doorToDoor.enabled && (
                                        <D2DFields>
                                            <D2DAddressGroup>
                                                <D2DAddressLabel>Miejsce odbioru</D2DAddressLabel>
                                                <D2DAddressInputs>
                                                    <D2DInput
                                                        placeholder="Miasto"
                                                        value={form.doorToDoor.pickupAddress.city}
                                                        onChange={e => form.setDoorToDoor(d => ({ ...d, pickupAddress: { ...d.pickupAddress, city: e.target.value } }))}
                                                    />
                                                    <D2DInput
                                                        placeholder="Ulica i numer"
                                                        value={form.doorToDoor.pickupAddress.street}
                                                        onChange={e => form.setDoorToDoor(d => ({ ...d, pickupAddress: { ...d.pickupAddress, street: e.target.value } }))}
                                                    />
                                                </D2DAddressInputs>
                                            </D2DAddressGroup>
                                            <D2DAddressGroup>
                                                <D2DAddressLabel>Miejsce dostarczenia</D2DAddressLabel>
                                                <D2DAddressInputs>
                                                    <D2DInput
                                                        placeholder="Miasto"
                                                        value={form.doorToDoor.deliveryAddress.city}
                                                        onChange={e => form.setDoorToDoor(d => ({ ...d, deliveryAddress: { ...d.deliveryAddress, city: e.target.value } }))}
                                                    />
                                                    <D2DInput
                                                        placeholder="Ulica i numer"
                                                        value={form.doorToDoor.deliveryAddress.street}
                                                        onChange={e => form.setDoorToDoor(d => ({ ...d, deliveryAddress: { ...d.deliveryAddress, street: e.target.value } }))}
                                                    />
                                                </D2DAddressInputs>
                                            </D2DAddressGroup>
                                            <D2DAddressGroup>
                                                <D2DAddressLabel>Uwagi</D2DAddressLabel>
                                                <D2DNotes
                                                    rows={2}
                                                    placeholder="Dodaj uwagi do usługi door to door..."
                                                    value={form.doorToDoor.notes}
                                                    onChange={e => form.setDoorToDoor(d => ({ ...d, notes: capitalizeFirst(e.target.value) }))}
                                                />
                                            </D2DAddressGroup>
                                        </D2DFields>
                                    )}
                                </S.RowContent>
                            </S.Row>

                            <S.Divider />

                            {/* ── SMS row (komputer) ─────────────────────────────── */}
                            {/* Na telefonie te same trzy ustawienia żyją w arkuszu
                                pod wierszem stanu nad przyciskiem zapisu. */}
                            {!isMobile && (
                            <S.Row>
                                <S.IconWrapper>
                                    <IconMessageSquare />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <LockedSection
                                        locked={!smsFeature.enabled}
                                        message="Twój abonament nie obsługuje powiadomień SMS."
                                        onLockedClick={() => setUpsellOpen(true)}
                                    >
                                        <SmsCheckList>
                                            <SmsCheckItem $disabled={!form.bookingConfirmationEnabled}>
                                                <SmsCheckbox
                                                    checked={form.sendConfirmationSms && form.bookingConfirmationEnabled}
                                                    onChange={e => form.setSendConfirmationSms(e.target.checked)}
                                                    disabled={!form.bookingConfirmationEnabled}
                                                />
                                                <SmsCheckText>
                                                    Wyślij SMS z potwierdzeniem rezerwacji
                                                    {!form.bookingConfirmationEnabled && (
                                                        <SmsDisabledHint>Wyłączone globalnie w konfiguracji SMS</SmsDisabledHint>
                                                    )}
                                                </SmsCheckText>
                                            </SmsCheckItem>
                                            <SmsCheckItem $disabled={!form.preVisitEnabled}>
                                                <SmsCheckbox
                                                    checked={form.sendReminderSms && form.preVisitEnabled}
                                                    onChange={e => form.setSendReminderSms(e.target.checked)}
                                                    disabled={!form.preVisitEnabled}
                                                />
                                                <SmsCheckText>
                                                    Wyślij SMS przypominający przed wizytą
                                                    {!form.preVisitEnabled && (
                                                        <SmsDisabledHint>Wyłączone globalnie w konfiguracji SMS</SmsDisabledHint>
                                                    )}
                                                </SmsCheckText>
                                            </SmsCheckItem>
                                            {form.visitCardEnabled && (
                                                <SmsCheckItem>
                                                    <SmsCheckbox
                                                        checked={form.sendVisitCard}
                                                        onChange={e => form.setSendVisitCard(e.target.checked)}
                                                    />
                                                    <SmsCheckText>
                                                        Wyślij SMS z linkiem do Karty Wizyty.
                                                    </SmsCheckText>
                                                </SmsCheckItem>
                                            )}
                                        </SmsCheckList>
                                    </LockedSection>
                                </S.RowContent>
                            </S.Row>
                            )}

                            </>
                            )} {/* end advanced sections */}

                        </S.ScrollableContent>

                        {/* ── Footer ─────────────────────────────────────────────── */}
                        <S.Footer>
                            {!isMobile && (
                            <S.ColorPickerWrapper>
                                <S.ColorPickerSection ref={form.colorSectionRef} $hasError={!!form.errors.color}>
                                    <IconPalette />
                                    <S.ColorPickerList>
                                        {form.appointmentColors.slice(0, MAX_VISIBLE_COLORS).map((color: AppointmentColor) => (
                                            <S.ColorButton
                                                key={color.id}
                                                type="button"
                                                onClick={() => form.setSelectedColorId(color.id)}
                                                $color={color.hexColor}
                                                $isSelected={color.id === form.selectedColorId}
                                                title={color.name}
                                            />
                                        ))}
                                        {hiddenColorCount > 0 ? (
                                            <S.MoreColorsButton
                                                ref={moreColorsBtnRef}
                                                type="button"
                                                $active={colorPanelOpen}
                                                onClick={openColorPanel}
                                                title="Pokaż wszystkie kolory"
                                            >
                                                +{hiddenColorCount}
                                            </S.MoreColorsButton>
                                        ) : (
                                            <S.AddColorButton
                                                type="button"
                                                onClick={() => form.setIsQuickColorModalOpen(true)}
                                                title="Dodaj nowy kolor"
                                            >
                                                <IconPlus />
                                            </S.AddColorButton>
                                        )}
                                    </S.ColorPickerList>
                                    {form.selectedColor && !isMobile && (
                                        <S.SelectedColorName>{form.selectedColor.name}</S.SelectedColorName>
                                    )}
                                </S.ColorPickerSection>
                                {form.errors.color && <S.ColorErrorMessage>{form.errors.color}</S.ColorErrorMessage>}
                            </S.ColorPickerWrapper>
                            )}

                            {colorPanelOpen && createPortal(
                                <>
                                    <S.ColorPanelOverlay onClick={() => setColorPanelOpen(false)} />
                                    <S.ColorPanel $bottom={colorPanelPos.bottom} $left={colorPanelPos.left}>
                                        {form.appointmentColors.map((color: AppointmentColor) => (
                                            <S.ColorPanelItem
                                                key={color.id}
                                                type="button"
                                                $selected={color.id === form.selectedColorId}
                                                onClick={() => {
                                                    form.setSelectedColorId(color.id);
                                                    setColorPanelOpen(false);
                                                }}
                                            >
                                                <S.ColorPanelSwatch $color={color.hexColor} $selected={color.id === form.selectedColorId} />
                                                {color.name}
                                            </S.ColorPanelItem>
                                        ))}
                                        <S.ColorPanelSeparator />
                                        <S.ColorPanelAddBtn
                                            type="button"
                                            onClick={() => {
                                                setColorPanelOpen(false);
                                                form.setIsQuickColorModalOpen(true);
                                            }}
                                        >
                                            <IconPlus />
                                            Dodaj nowy kolor
                                        </S.ColorPanelAddBtn>
                                    </S.ColorPanel>
                                </>,
                                document.body
                            )}

                            {isMobile && (
                                <S.SmsSummaryRow
                                    type="button"
                                    $muted={!smsActionable}
                                    onClick={() => {
                                        if (!smsFeature.enabled) { setUpsellOpen(true); return; }
                                        setSmsSheetOpen(true);
                                    }}
                                >
                                    <IconMessageSquare />
                                    <span>{smsSummary}</span>
                                    <S.SmsSummaryChevron viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                        strokeWidth="2.5" strokeLinecap="round">
                                        <polyline points="9 6 15 12 9 18" />
                                    </S.SmsSummaryChevron>
                                </S.SmsSummaryRow>
                            )}

                            <S.FooterActions>
                                {!isMobile && (
                                    <S.Button type="button" onClick={form.clearForm} $variant="ghost" title="Wyczyść wszystkie pola">
                                        Wyczyść wszystko
                                    </S.Button>
                                )}
                                <S.Button type="button" onClick={onClose} $variant="secondary">
                                    Anuluj
                                </S.Button>
                                <S.Button
                                    type="submit"
                                    $variant="primary"
                                    disabled={form.isSubmitting}
                                    style={{ '--button-bg': form.accentColor, opacity: form.isSubmitting ? 0.7 : 1 } as React.CSSProperties}
                                >
                                    {form.isSubmitting ? 'Zapisywanie...' : 'Zapisz wizytę'}
                                </S.Button>
                            </S.FooterActions>
                        </S.Footer>

                    </form>
                </S.ModalContainer>

                {/* ── Recurrence side panel ──────────────────────────── */}
                <SidePanelWrapper $visible={isRecurring}>
                    <SidePanelInner>
                        <RecurrenceSidePanel
                            rule={recurrenceRule}
                            onChange={setRecurrenceRule}
                            startDateTime={form.startDateTime}
                        />
                    </SidePanelInner>
                </SidePanelWrapper>

                </S.ModalWithPanel>
            </S.Overlay>

            {/* ── Sub-modals ────────────────────────────────────────────────────── */}
            <QuickServiceModal
                isOpen={form.isQuickServiceModalOpen}
                onClose={() => form.setIsQuickServiceModalOpen(false)}
                onServiceCreate={form.handleQuickServiceCreate}
                initialServiceName={form.serviceSearch}
            />

            <PriceInputModal
                isOpen={form.isPriceInputModalOpen}
                serviceName={form.pendingService?.name || ''}
                vatRate={form.pendingService?.vatRate || 23}
                onClose={form.handlePriceInputModalClose}
                onConfirm={form.handlePriceConfirm}
            />

            <QuickColorModal
                isOpen={form.isQuickColorModalOpen}
                onClose={() => form.setIsQuickColorModalOpen(false)}
                onColorCreate={form.handleQuickColorCreate}
            />

            {newCustomerDraft && (
                <MobileNewCustomerSheet
                    initial={newCustomerDraft}
                    onCancel={() => setNewCustomerDraft(null)}
                    onConfirm={(draft) => {
                        form.setCustomerFirstName(draft.firstName);
                        form.setCustomerLastName(draft.lastName);
                        form.setCustomerPhonePrefix(draft.phonePrefix);
                        form.setCustomerPhone(draft.phone);
                        form.setCustomerEmail(draft.email);
                        setNewCustomerDraft(null);
                        // Stany są asynchroniczne, więc zapis klienta wykonujemy na
                        // wartościach z formularza, nie czekając na przerysowanie.
                        form.handleAddNewCustomerDirectly({
                            values: {
                                firstName: draft.firstName,
                                lastName: draft.lastName,
                                phone: draft.phone.trim() ? `${draft.phonePrefix.trim()} ${draft.phone.trim()}` : '',
                                email: draft.email,
                            },
                        });
                    }}
                />
            )}

            {smsSheetOpen && (
                <SmsOptionsSheet
                    isMobile={isMobile}
                    options={smsOptions}
                    phone={customerPhone}
                    onClose={() => setSmsSheetOpen(false)}
                />
            )}

            {upsellOpen && <UpsellModal feature="SMS_EMAIL" onClose={() => setUpsellOpen(false)} />}

        </>
    );
});

QuickEventModal.displayName = 'QuickEventModal';
