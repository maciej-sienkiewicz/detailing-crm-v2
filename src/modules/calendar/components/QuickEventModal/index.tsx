// src/modules/calendar/components/QuickEventModal/index.tsx

import React, { forwardRef, useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import { DateTimePicker } from '../DateTimePicker';
import { QuickServiceModal } from '../QuickServiceModal';
import { PriceInputModal } from '../PriceInputModal';
import { QuickColorModal } from '../QuickColorModal';
import { Toggle } from '@/common/components/Toggle';
import { LockedSection } from '@/common/components/LockedSection';
import * as S from '../QuickEventModalStyles';
import { useQuickEventForm } from './useQuickEventForm';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { ServicesTable } from '@/common/components/ServicesTable';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import { netToGross } from '@/common/utils/priceAdjustment';
import {
    IconClock, IconUser, IconCar, IconSettings, IconNote,
    IconX, IconPalette, IconPlus, IconPencil, IconCheck, IconMessageSquare,
} from './icons';
import { useFeature } from '@/modules/subscription';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { RecurrenceSidePanel, SidePanelWrapper, SidePanelInner } from './RecurrenceSidePanel';
import type { QuickEventModalProps, QuickEventModalRef, AppointmentColor, Service, ServiceAdjustment } from './types';

export type { QuickEventFormData, QuickEventInitialData } from './types';
export type { QuickEventModalRef };

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

export const QuickEventModal = forwardRef<QuickEventModalRef, QuickEventModalProps>(({
    isOpen,
    eventData,
    onClose,
    onSave,
    initialData,
}, ref) => {
    const form = useQuickEventForm({ isOpen, eventData, onClose, onSave, ref, initialData });
    const smsFeature = useFeature('SMS_EMAIL');
    const { isCollapsed } = useSidebar();
    const sidebarWidth = isCollapsed ? 64 : 240;

    const [serviceDropdownPos, setServiceDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const [autoOpenModel, setAutoOpenModel] = useState(false);

    const { isRecurring, setIsRecurring, recurrenceRule, setRecurrenceRule } = form;

    const servicesAsLineItems = useMemo((): ServiceLineItem[] => {
        return form.selectedServiceIds.map(id => {
            let svc = form.services.find((s: Service) => s.id === id);
            if (!svc && form.tempServices[id]) {
                svc = { id, ...form.tempServices[id] } as Service;
            }
            if (!svc) return null;
            const baseGross = form.servicePrices[id] ?? 0;
            const vatRate = svc.vatRate ?? 23;
            const basePriceNet = Math.round((baseGross / (1 + vatRate / 100)) * 100);
            return {
                id,
                serviceId: svc.id || id,
                serviceName: svc.name,
                basePriceNet,
                vatRate,
                adjustment: (form.serviceAdjustments[id] ?? { type: 'PERCENT', value: 0 }) as ServiceAdjustment,
                note: form.serviceNotes[id] ?? '',
            } as ServiceLineItem;
        }).filter((x): x is ServiceLineItem => x !== null);
    }, [form.selectedServiceIds, form.services, form.tempServices, form.servicePrices, form.serviceAdjustments, form.serviceNotes]);

    const handleServicesChange = useCallback((newItems: ServiceLineItem[]) => {
        const newIds = new Set(newItems.map(i => i.id));
        form.setSelectedServiceIds(newItems.map(i => i.id));
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
        form.setServicePrices(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(id => { if (!newIds.has(id)) delete next[id]; });
            return next;
        });
        form.setServicePriceInputs(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(id => { if (!newIds.has(id)) delete next[id]; });
            return next;
        });
    }, [form]);

    useEffect(() => {
        if (!isOpen) setAutoOpenModel(false);
    }, [isOpen]);

    useEffect(() => {
        if (!form.showServiceDropdown) { setServiceDropdownPos(null); return; }
        const el = form.serviceInputRef.current;
        if (!el) return;
        const update = () => {
            const r = el.getBoundingClientRect();
            setServiceDropdownPos({ top: r.bottom, left: r.left, width: r.width });
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [form.showServiceDropdown]);

    if (!eventData && !initialData) return null;

    return (
        <>
            <S.Overlay $isOpen={isOpen} $contentLeft={sidebarWidth} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
                <S.ModalWithPanel>
                <S.ModalContainer $isOpen={isOpen} style={{ borderRadius: isRecurring ? '16px 0 0 16px' : '16px' }}>
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
                                    <S.InputGrid>
                                        <S.InputGroup>
                                            <S.Label>{form.isAllDay ? 'Data' : 'Początek'}</S.Label>
                                            <DateTimePicker
                                                value={form.startDateTime}
                                                onChange={(val) => {
                                                    form.setStartDateTime(val);
                                                    if (form.isAllDay) {
                                                        form.setEndDateTime(`${val.split('T')[0]}T23:59:59`);
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
                                            <S.DropdownContainer>
                                                <S.CustomerInputBlock
                                                    $focused={form.focusedField === 'customer'}
                                                    $hasError={!!(form.errors.customer || form.errors.customerFirstName || form.errors.customerLastName || form.errors.customerPhone || form.errors.customerEmail)}
                                                    $dropdownOpen={form.showCustomerDropdown}
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
                                                                    onChange={(e) => {
                                                                        form.setCustomerPhonePrefix(e.target.value);
                                                                        form.setShowCustomerDropdown(true);
                                                                    }}
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
                                                                onFocus={form.handleCustomerFieldFocus}
                                                                onBlur={form.handleCustomerFieldBlur}
                                                                autoComplete="new-password"
                                                                $hasError={!!form.errors.customerEmail}
                                                            />
                                                        </S.CustomerFieldGroup>
                                                    </S.CustomerInputRow>
                                                </S.CustomerInputBlock>

                                                {form.showCustomerDropdown && (
                                                    <S.Dropdown>
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
                                                                            : '⚠ Brak danych kontaktowych — może to inna osoba?'
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
                                                                    ? 'To inna osoba — dodaj jako nowego klienta'
                                                                    : 'Dodaj nowego klienta'
                                                                }
                                                            </span>
                                                        </S.DropdownAddButton>
                                                    </S.Dropdown>
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
                                        /* ── stan: klient ma pojazdy – wybierz z listy ── */
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
                                        <S.Input
                                            ref={form.serviceInputRef}
                                            type="text"
                                            placeholder="Dodaj usługę..."
                                            value={form.serviceSearch}
                                            onChange={(e) => {
                                                form.setServiceSearch(e.target.value);
                                                form.setShowServiceDropdown(true);
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
                                                setTimeout(() => form.setShowServiceDropdown(false), 200);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (form.serviceSearch.trim() && form.filteredServices.length === 0) {
                                                        form.setIsQuickServiceModalOpen(true);
                                                        form.setShowServiceDropdown(false);
                                                        form.setFocusedField(null);
                                                    }
                                                }
                                            }}
                                        />
                                        {form.showServiceDropdown && serviceDropdownPos && createPortal(
                                            <S.ServicePortalDropdown style={{ top: serviceDropdownPos.top, left: serviceDropdownPos.left, width: serviceDropdownPos.width }}>
                                                {form.filteredServices.map((service: Service) => (
                                                    <S.ServiceDropdownItem
                                                        key={service.id}
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => form.addService(service)}
                                                    >
                                                        <S.ServiceDropdownName>{service.name}</S.ServiceDropdownName>
                                                        {service.requireManualPrice ? (
                                                            <S.ServiceDropdownManualBadge>WYCENA</S.ServiceDropdownManualBadge>
                                                        ) : (
                                                            <S.ServiceDropdownPrices>
                                                                <S.ServiceDropdownGross>{(netToGross(service.basePriceNet, service.vatRate) / 100).toFixed(2)} zł brutto</S.ServiceDropdownGross>
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
                                                    <span>Wprowadź nową usługę</span>
                                                </S.DropdownAddButton>
                                            </S.ServicePortalDropdown>,
                                            document.body
                                        )}
                                    </S.DropdownContainer>

                                    {form.errors.services && <S.ErrorMessage>{form.errors.services}</S.ErrorMessage>}
                                    {form.errors.servicePrices && <S.ErrorMessage>{form.errors.servicePrices}</S.ErrorMessage>}

                                    {servicesAsLineItems.length > 0 && (
                                        <ServicesTable
                                            services={servicesAsLineItems}
                                            onChange={handleServicesChange}
                                        />
                                    )}
                                </S.RowContent>
                            </S.Row>

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
                                        onChange={(e) => form.setNotes(e.target.value)}
                                        rows={3}
                                        $accentColor={form.focusedField === 'notes' ? form.accentColor : undefined}
                                        onFocus={() => form.setFocusedField('notes')}
                                        onBlur={() => form.setFocusedField(null)}
                                    />
                                </S.RowContent>
                            </S.Row>

                            <S.Divider />

                            {/* ── SMS row ────────────────────────────────────────── */}
                            <S.Row>
                                <S.IconWrapper>
                                    <IconMessageSquare />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <LockedSection
                                        locked={!smsFeature.enabled}
                                        message="Twój abonament nie obsługuje powiadomień SMS."
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
                                        </SmsCheckList>
                                    </LockedSection>
                                </S.RowContent>
                            </S.Row>
                        </S.ScrollableContent>

                        {/* ── Footer ─────────────────────────────────────────────── */}
                        <S.Footer>
                            <S.ColorPickerWrapper>
                                <S.ColorPickerSection ref={form.colorSectionRef} $hasError={!!form.errors.color}>
                                    <IconPalette />
                                    <S.ColorPickerList>
                                        {form.appointmentColors.map((color: AppointmentColor) => (
                                            <S.ColorButton
                                                key={color.id}
                                                type="button"
                                                onClick={() => form.setSelectedColorId(color.id)}
                                                $color={color.hexColor}
                                                $isSelected={color.id === form.selectedColorId}
                                                title={color.name}
                                            />
                                        ))}
                                        <S.AddColorButton
                                            type="button"
                                            onClick={() => form.setIsQuickColorModalOpen(true)}
                                            title="Dodaj nowy kolor"
                                        >
                                            <IconPlus />
                                        </S.AddColorButton>
                                    </S.ColorPickerList>
                                    {form.selectedColor && (
                                        <S.SelectedColorName>{form.selectedColor.name}</S.SelectedColorName>
                                    )}
                                </S.ColorPickerSection>
                                {form.errors.color && <S.ColorErrorMessage>{form.errors.color}</S.ColorErrorMessage>}
                            </S.ColorPickerWrapper>

                            <S.FooterActions>
                                <S.Button type="button" onClick={form.clearForm} $variant="ghost" title="Wyczyść wszystkie pola">
                                    Wyczyść wszystko
                                </S.Button>
                                <S.Button type="button" onClick={onClose} $variant="secondary">
                                    Anuluj
                                </S.Button>
                                <S.Button
                                    type="submit"
                                    $variant="primary"
                                    disabled={form.isSubmitting}
                                    style={{ '--button-bg': form.accentColor, opacity: form.isSubmitting ? 0.7 : 1 } as React.CSSProperties}
                                >
                                    {form.isSubmitting ? 'Zapisywanie…' : 'Zapisz wizytę'}
                                </S.Button>
                            </S.FooterActions>
                        </S.Footer>

                    </form>
                </S.ModalContainer>

                {/* ── Recurrence side panel ──────────────────────────── */}
                <SidePanelWrapper $visible={isRecurring}>
                    {isRecurring && (
                        <SidePanelInner>
                            <RecurrenceSidePanel
                                rule={recurrenceRule}
                                onChange={setRecurrenceRule}
                                startDateTime={form.startDateTime}
                            />
                        </SidePanelInner>
                    )}
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

        </>
    );
});

QuickEventModal.displayName = 'QuickEventModal';
