// src/modules/calendar/components/QuickEventModal/index.tsx

import React, { forwardRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DateTimePicker } from '../DateTimePicker';
import { QuickServiceModal } from '../QuickServiceModal';
import { PriceInputModal } from '../PriceInputModal';
import { QuickColorModal } from '../QuickColorModal';
import { Toggle } from '@/common/components/Toggle';
import * as S from '../QuickEventModalStyles';
import { useQuickEventForm } from './useQuickEventForm';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { roundTo2 } from './helpers';
import {
    IconClock, IconUser, IconCar, IconSettings, IconNote,
    IconTrash, IconX, IconPalette, IconMessageSquare, IconPlus, IconPencil, IconCheck,
} from './icons';
import type { QuickEventModalProps, QuickEventModalRef, AppointmentColor, Service } from './types';

export type { QuickEventFormData } from './types';
export type { QuickEventModalRef };

export const QuickEventModal = forwardRef<QuickEventModalRef, QuickEventModalProps>(({
    isOpen,
    eventData,
    onClose,
    onSave,
}, ref) => {
    const form = useQuickEventForm({ isOpen, eventData, onClose, onSave, ref });

    const [serviceDropdownPos, setServiceDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

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

    if (!eventData) return null;

    return (
        <>
            <S.Overlay $isOpen={isOpen} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
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
                                const customerFields = [
                                    form.customerInputRef.current,
                                    form.customerLastNameInputRef.current,
                                    form.customerPhoneInputRef.current,
                                    form.customerEmailInputRef.current,
                                ];
                                if (customerFields.includes(e.target as HTMLInputElement)) {
                                    e.preventDefault();
                                    if (!form.selectedCustomer) {
                                        form.handleAddNewCustomerDirectly();
                                        form.setFocusedField(null);
                                    } else if (form.customerEditMode) {
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
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                                                    <S.CustomerFieldGroup $borderRight>
                                                        <S.CustomerFieldLabel>Imię</S.CustomerFieldLabel>
                                                        <S.CustomerFieldInput
                                                            ref={form.customerInputRef}
                                                            type="text"
                                                            placeholder="Jan"
                                                            value={form.customerFirstName}
                                                            onChange={(e) => form.setCustomerFirstName(e.target.value)}
                                                            onFocus={() => form.setFocusedField('customer')}
                                                            onBlur={() => form.setFocusedField(null)}
                                                            autoComplete="off"
                                                            autoFocus
                                                        />
                                                    </S.CustomerFieldGroup>
                                                    <S.CustomerFieldGroup>
                                                        <S.CustomerFieldLabel>Nazwisko</S.CustomerFieldLabel>
                                                        <S.CustomerFieldInput
                                                            ref={form.customerLastNameInputRef}
                                                            type="text"
                                                            placeholder="Kowalski"
                                                            value={form.customerLastName}
                                                            onChange={(e) => form.setCustomerLastName(e.target.value)}
                                                            onFocus={() => form.setFocusedField('customer')}
                                                            onBlur={() => form.setFocusedField(null)}
                                                            autoComplete="off"
                                                        />
                                                    </S.CustomerFieldGroup>
                                                </S.CustomerInputRow>
                                                <S.CustomerInputRow>
                                                    <S.CustomerFieldGroup $borderRight>
                                                        <S.CustomerFieldLabel>Telefon</S.CustomerFieldLabel>
                                                        <S.CustomerFieldInput
                                                            ref={form.customerPhoneInputRef}
                                                            type="tel"
                                                            placeholder="+48 123 456 789"
                                                            value={form.customerPhone}
                                                            onChange={(e) => form.setCustomerPhone(e.target.value)}
                                                            onFocus={() => form.setFocusedField('customer')}
                                                            onBlur={() => form.setFocusedField(null)}
                                                            autoComplete="off"
                                                        />
                                                    </S.CustomerFieldGroup>
                                                    <S.CustomerFieldGroup>
                                                        <S.CustomerFieldLabel>E-mail</S.CustomerFieldLabel>
                                                        <S.CustomerFieldInput
                                                            ref={form.customerEmailInputRef}
                                                            type="email"
                                                            placeholder="jan@example.com"
                                                            value={form.customerEmail}
                                                            onChange={(e) => form.setCustomerEmail(e.target.value)}
                                                            onFocus={() => form.setFocusedField('customer')}
                                                            onBlur={() => form.setFocusedField(null)}
                                                            autoComplete="off"
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
                                                    $hasError={!!form.errors.customer}
                                                    $dropdownOpen={form.showCustomerDropdown}
                                                >
                                                    <S.CustomerInputRow>
                                                        <S.CustomerFieldGroup $borderRight>
                                                            <S.CustomerFieldLabel>Imię</S.CustomerFieldLabel>
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
                                                                autoComplete="off"
                                                            />
                                                        </S.CustomerFieldGroup>
                                                        <S.CustomerFieldGroup>
                                                            <S.CustomerFieldLabel>Nazwisko</S.CustomerFieldLabel>
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
                                                                autoComplete="off"
                                                            />
                                                        </S.CustomerFieldGroup>
                                                    </S.CustomerInputRow>
                                                    <S.CustomerInputRow>
                                                        <S.CustomerFieldGroup $borderRight>
                                                            <S.CustomerFieldLabel>Telefon</S.CustomerFieldLabel>
                                                            <S.CustomerFieldInput
                                                                ref={form.customerPhoneInputRef}
                                                                type="tel"
                                                                placeholder="+48 123 456 789"
                                                                value={form.customerPhone}
                                                                onChange={(e) => {
                                                                    form.setCustomerPhone(e.target.value);
                                                                    form.setShowCustomerDropdown(true);
                                                                }}
                                                                onFocus={form.handleCustomerFieldFocus}
                                                                onBlur={form.handleCustomerFieldBlur}
                                                                autoComplete="off"
                                                            />
                                                        </S.CustomerFieldGroup>
                                                        <S.CustomerFieldGroup>
                                                            <S.CustomerFieldLabel>E-mail</S.CustomerFieldLabel>
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
                                                                autoComplete="off"
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
                                <S.RowContent>
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
                                                            onChange={(brand) => { form.setVehicleBrand(brand); form.setVehicleModel(''); form.setFocusedField('vehicle'); }}
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
                                                            autoComplete="off"
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
                                            <S.ChipEdit type="button" onClick={form.handleEnterVehicleEditMode} title="Popraw dane pojazdu">
                                                <IconPencil />
                                            </S.ChipEdit>
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
                                                            onChange={(brand) => { form.setVehicleBrand(brand); form.setVehicleModel(''); form.setFocusedField('vehicle'); }}
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
                                                            autoComplete="off"
                                                        />
                                                    </S.CustomerFieldGroup>
                                                </S.VehicleInputRow>
                                            </S.CustomerInputBlock>
                                            {(form.vehicleBrand || form.vehicleModel) && (
                                                <S.CustomerEditActions>
                                                    <S.CustomerEditConfirmBtn type="button" onClick={form.handleAddNewVehicleDirectly}>
                                                        <IconCheck />
                                                        Dodaj pojazd
                                                    </S.CustomerEditConfirmBtn>
                                                </S.CustomerEditActions>
                                            )}
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
                                                                <S.ServiceDropdownGross>{((service.basePriceNet / 100) * (100 + service.vatRate) / 100).toFixed(2)} zł brutto</S.ServiceDropdownGross>
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

                                    {form.selectedServiceIds.length > 0 && (
                                        <S.ServicesBlock>
                                            {/* Column headers */}
                                            <S.ServicesTableHeader>
                                                <S.ServicesHeaderCell>Usługa</S.ServicesHeaderCell>
                                                <S.ServicesHeaderCell>Netto</S.ServicesHeaderCell>
                                                <S.ServicesHeaderCell>Brutto</S.ServicesHeaderCell>
                                                <S.ServicesHeaderCell />
                                            </S.ServicesTableHeader>

                                            <S.ServicesList>
                                                {form.selectedServiceIds.map(id => {
                                                    let service = form.services.find((s: Service) => s.id === id);
                                                    if (!service && form.tempServices[id]) {
                                                        service = { id, ...form.tempServices[id] };
                                                    }
                                                    if (!service) return null;

                                                    const vatRate = service.vatRate || 23;
                                                    const inputs = form.servicePriceInputs[id] ?? {
                                                        gross: (form.servicePrices[id] ?? 0).toFixed(2),
                                                        net: roundTo2((form.servicePrices[id] ?? 0) / (1 + vatRate / 100)).toFixed(2),
                                                    };
                                                    const isNoteExpanded = form.expandedServiceNote === id;
                                                    const hasNote = !!(form.serviceNotes[id]?.length > 0);

                                                    const limitDecimals = (raw: string): string => {
                                                        const sepIdx = Math.max(raw.indexOf('.'), raw.indexOf(','));
                                                        if (sepIdx === -1) return raw;
                                                        return raw.slice(0, sepIdx + 3);
                                                    };
                                                    const syncFromGross = (raw: string) => {
                                                        const limited = limitDecimals(raw);
                                                        const num = parseFloat(limited.replace(',', '.'));
                                                        if (!isNaN(num)) {
                                                            const net = roundTo2(num / (1 + vatRate / 100));
                                                            form.setServicePrices(prev => ({ ...prev, [id]: num }));
                                                            form.setServicePriceInputs(prev => ({ ...prev, [id]: { gross: limited, net: net.toFixed(2) } }));
                                                        } else {
                                                            form.setServicePriceInputs(prev => ({ ...prev, [id]: { ...prev[id], gross: limited } }));
                                                        }
                                                    };
                                                    const syncFromNet = (raw: string) => {
                                                        const limited = limitDecimals(raw);
                                                        const num = parseFloat(limited.replace(',', '.'));
                                                        if (!isNaN(num)) {
                                                            const gross = roundTo2(num * (1 + vatRate / 100));
                                                            form.setServicePrices(prev => ({ ...prev, [id]: gross }));
                                                            form.setServicePriceInputs(prev => ({ ...prev, [id]: { net: limited, gross: gross.toFixed(2) } }));
                                                        } else {
                                                            form.setServicePriceInputs(prev => ({ ...prev, [id]: { ...prev[id], net: limited } }));
                                                        }
                                                    };
                                                    const normalizeInputs = () => {
                                                        const gross = form.servicePrices[id] ?? 0;
                                                        const net = roundTo2(gross / (1 + vatRate / 100));
                                                        form.setServicePriceInputs(prev => ({
                                                            ...prev,
                                                            [id]: { gross: gross.toFixed(2), net: net.toFixed(2) },
                                                        }));
                                                    };

                                                    return (
                                                        <S.ServiceItem key={id}>
                                                            <S.ServiceItemRow>
                                                                <S.ServiceName title={service.name}>{service.name}</S.ServiceName>

                                                                <S.PriceCellInput
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    value={inputs.net}
                                                                    onChange={(e) => syncFromNet(e.target.value)}
                                                                    onBlur={normalizeInputs}
                                                                />
                                                                <S.PriceCellInput
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    value={inputs.gross}
                                                                    onChange={(e) => syncFromGross(e.target.value)}
                                                                    onBlur={normalizeInputs}
                                                                    $isBrutto
                                                                />

                                                                <S.ServiceActions>
                                                                    <S.IconButton
                                                                        type="button"
                                                                        onClick={() => form.setExpandedServiceNote(isNoteExpanded ? null : id)}
                                                                        $active={hasNote}
                                                                        title="Notatka do usługi"
                                                                    >
                                                                        <IconMessageSquare />
                                                                    </S.IconButton>
                                                                    <S.DeleteButton
                                                                        type="button"
                                                                        onClick={() => {
                                                                            form.setSelectedServiceIds(prev => prev.filter(i => i !== id));
                                                                            form.setServicePrices(prev => { const n = { ...prev }; delete n[id]; return n; });
                                                                            form.setServicePriceInputs(prev => { const n = { ...prev }; delete n[id]; return n; });
                                                                            form.setServiceNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
                                                                            if (form.expandedServiceNote === id) form.setExpandedServiceNote(null);
                                                                        }}
                                                                    >
                                                                        <IconTrash />
                                                                    </S.DeleteButton>
                                                                </S.ServiceActions>
                                                            </S.ServiceItemRow>

                                                            {isNoteExpanded && (
                                                                <S.ServiceNoteContainer>
                                                                    <S.ServiceNoteTextarea
                                                                        placeholder="Notatka do usługi..."
                                                                        value={form.serviceNotes[id] || ''}
                                                                        onChange={(e) => form.setServiceNotes(prev => ({ ...prev, [id]: e.target.value }))}
                                                                        rows={2}
                                                                    />
                                                                </S.ServiceNoteContainer>
                                                            )}
                                                        </S.ServiceItem>
                                                    );
                                                })}
                                            </S.ServicesList>

                                            {/* Summary — integrated into the same block */}
                                            {(() => {
                                                let totalNet = 0;
                                                let totalGross = 0;
                                                form.selectedServiceIds.forEach(id => {
                                                    const svc = form.services.find((s: Service) => s.id === id) || form.tempServices[id];
                                                    if (!svc) return;
                                                    const gross = form.servicePrices[id] ?? 0;
                                                    const vat = svc.vatRate || 23;
                                                    totalNet += roundTo2(gross / (1 + vat / 100));
                                                    totalGross += gross;
                                                });
                                                totalNet = roundTo2(totalNet);
                                                totalGross = roundTo2(totalGross);
                                                const totalVat = roundTo2(totalGross - totalNet);
                                                return (
                                                    <S.SummarySection>
                                                        <S.SummaryItem>
                                                            <S.SummaryLabel>Netto</S.SummaryLabel>
                                                            <S.SummaryValue>{totalNet.toFixed(2)} zł</S.SummaryValue>
                                                        </S.SummaryItem>
                                                        <S.SummaryItem>
                                                            <S.SummaryLabel>VAT</S.SummaryLabel>
                                                            <S.SummaryValue>{totalVat.toFixed(2)} zł</S.SummaryValue>
                                                        </S.SummaryItem>
                                                        <S.SummaryItem>
                                                            <S.SummaryLabel>Łącznie</S.SummaryLabel>
                                                            <S.SummaryValue $isTotal>{totalGross.toFixed(2)} zł</S.SummaryValue>
                                                        </S.SummaryItem>
                                                    </S.SummarySection>
                                                );
                                            })()}
                                        </S.ServicesBlock>
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
