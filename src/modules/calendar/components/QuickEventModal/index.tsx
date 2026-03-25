// src/modules/calendar/components/QuickEventModal/index.tsx

import React, { forwardRef } from 'react';
import { DateTimePicker } from '../DateTimePicker';
import { VehicleModal } from '@/modules/appointments/components/VehicleModal';
import { QuickServiceModal } from '../QuickServiceModal';
import { PriceInputModal } from '../PriceInputModal';
import { QuickColorModal } from '../QuickColorModal';
import { QuickCustomerModal } from '../QuickCustomerModal';
import { Toggle } from '@/common/components/Toggle';
import { useQueryClient } from '@tanstack/react-query';
import * as S from '../QuickEventModalStyles';
import { useQuickEventForm } from './useQuickEventForm';
import { parseCustomerInput, roundTo2 } from './helpers';
import {
    IconClock, IconUser, IconCar, IconSettings, IconNote,
    IconTrash, IconX, IconPalette, IconMessageSquare, IconPlus,
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
    const queryClient = useQueryClient();

    const form = useQuickEventForm({ isOpen, eventData, onClose, onSave, ref });

    if (!eventData) return null;

    return (
        <>
            <S.Overlay $isOpen={isOpen} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
                <S.ModalContainer $isOpen={isOpen}>
                    <form onSubmit={form.handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

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
                                    <S.DropdownContainer>
                                        <S.Input
                                            ref={form.customerInputRef}
                                            type="text"
                                            placeholder={
                                                form.selectedCustomer
                                                    ? (`${form.selectedCustomer.firstName ?? ''} ${form.selectedCustomer.lastName ?? ''}`.trim() || '(Nie uzupełniono imienia i nazwiska)')
                                                    : 'Dodaj klienta...'
                                            }
                                            value={form.customerSearch}
                                            onChange={(e) => {
                                                form.setCustomerSearch(e.target.value);
                                                form.setShowCustomerDropdown(true);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (form.selectedCustomer) return;
                                                    const trimmed = form.customerSearch.trim();
                                                    if (!trimmed) return;
                                                    form.setParsedCustomerData(parseCustomerInput(trimmed));
                                                    form.setIsAddCustomerModalOpen(true);
                                                    form.setShowCustomerDropdown(false);
                                                }
                                            }}
                                            aria-invalid={!!form.errors.customer}
                                            $accentColor={form.focusedField === 'customer' ? form.accentColor : undefined}
                                            $hasError={!!form.errors.customer}
                                            $dropdownOpen={form.showCustomerDropdown}
                                            onFocus={() => {
                                                form.setFocusedField('customer');
                                                form.setShowCustomerDropdown(true);
                                            }}
                                            onBlur={() => {
                                                form.setFocusedField(null);
                                                setTimeout(() => {
                                                    form.setShowCustomerDropdown(false);
                                                    if (form.customerJustSelectedRef.current) {
                                                        form.customerJustSelectedRef.current = false;
                                                        return;
                                                    }
                                                    const trimmed = form.customerSearch.trim();
                                                    if (!trimmed) return;
                                                    form.setParsedCustomerData(parseCustomerInput(trimmed));
                                                    form.setIsAddCustomerModalOpen(true);
                                                }, 300);
                                            }}
                                        />
                                        {form.showCustomerDropdown && (
                                            <S.Dropdown>
                                                {form.customerResults.map((c) => (
                                                    <S.DropdownItem
                                                        key={c.id}
                                                        type="button"
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
                                                            form.setCustomerSearch(`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim());
                                                            form.setShowCustomerDropdown(false);
                                                        }}
                                                        $accentColor={form.accentColor}
                                                    >
                                                        {(c.firstName || c.lastName)
                                                            ? <span>{c.firstName} {c.lastName}</span>
                                                            : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>(Nie uzupełniono imienia i nazwiska)</span>
                                                        }
                                                        <span>{c.phone || c.email}</span>
                                                    </S.DropdownItem>
                                                ))}
                                                    <S.DropdownAddButton
                                                        type="button"
                                                        onClick={() => {
                                                            form.setParsedCustomerData(parseCustomerInput(form.customerSearch));
                                                            form.setIsAddCustomerModalOpen(true);
                                                            form.setShowCustomerDropdown(false);
                                                            form.setFocusedField(null);
                                                        }}
                                                    >
                                                        <IconPlus />
                                                        <span>Dodaj nowego klienta</span>
                                                    </S.DropdownAddButton>
                                            </S.Dropdown>
                                        )}
                                    </S.DropdownContainer>

                                    {form.errors.customer && <S.ErrorMessage>{form.errors.customer}</S.ErrorMessage>}

                                    {form.selectedCustomer && (
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
                                                        <S.ChipMeta>{form.selectedCustomer.phone || form.selectedCustomer.email}</S.ChipMeta>
                                                    </>
                                                )}
                                            </S.ChipInfo>
                                            <S.ChipClear
                                                type="button"
                                                onClick={() => {
                                                    form.setSelectedCustomer(null);
                                                    form.setSelectedCustomerId(undefined);
                                                    form.setCustomerSearch('');
                                                    form.setVehicleSearch('');
                                                }}
                                            >
                                                <IconX />
                                            </S.ChipClear>
                                        </S.SelectedCustomerChip>
                                    )}
                                </S.RowContent>
                            </S.Row>

                            {/* ── Vehicle row ────────────────────────────────────── */}
                            <S.Row>
                                <S.IconWrapper $color={form.focusedField === 'vehicle' ? form.accentColor : undefined}>
                                    <IconCar />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <S.DropdownContainer>
                                        <S.Input
                                            ref={form.vehicleInputRef}
                                            type="text"
                                            placeholder={
                                                form.selectedCustomer
                                                    ? (form.selectedVehicle ? `${form.selectedVehicle.brand} ${form.selectedVehicle.model}` : 'Wybierz pojazd...')
                                                    : 'Najpierw wybierz klienta'
                                            }
                                            value={form.selectedCustomer ? form.vehicleSearch : ''}
                                            onChange={(e) => {
                                                form.setVehicleSearch(e.target.value);
                                                form.setShowVehicleDropdown(true);
                                            }}
                                            disabled={!form.selectedCustomer}
                                            $accentColor={form.focusedField === 'vehicle' ? form.accentColor : undefined}
                                            $dropdownOpen={form.showVehicleDropdown && !!form.selectedCustomer}
                                            onFocus={() => {
                                                if (!form.selectedCustomer) return;
                                                form.setFocusedField('vehicle');
                                                if (form.vehicles.length === 0) {
                                                    form.setVehicleModalInitialMode('new');
                                                    form.setIsVehicleModalOpen(true);
                                                } else {
                                                    form.setShowVehicleDropdown(true);
                                                }
                                            }}
                                            onBlur={() => {
                                                form.setFocusedField(null);
                                                setTimeout(() => form.setShowVehicleDropdown(false), 200);
                                            }}
                                        />
                                        {form.showVehicleDropdown && form.selectedCustomer && (
                                            <S.Dropdown>
                                                {form.vehicles
                                                    .filter(v => {
                                                        if (!form.vehicleSearch.trim()) return true;
                                                        const q = form.vehicleSearch.toLowerCase();
                                                        return (v.brand || '').toLowerCase().includes(q)
                                                            || (v.model || '').toLowerCase().includes(q)
                                                            || (v.licensePlate || '').toLowerCase().includes(q);
                                                    })
                                                    .map(v => (
                                                        <S.DropdownItem
                                                            key={v.id}
                                                            type="button"
                                                            onClick={() => {
                                                                form.handleVehicleSelect({ id: v.id, brand: v.brand, model: v.model, isNew: false });
                                                                form.setVehicleSearch(`${v.brand} ${v.model}`.trim());
                                                                form.setShowVehicleDropdown(false);
                                                            }}
                                                            $accentColor={form.accentColor}
                                                        >
                                                            <span>{v.brand} {v.model}</span>
                                                            <span>{v.licensePlate}</span>
                                                        </S.DropdownItem>
                                                    ))}
                                                <S.DropdownAddButton
                                                    type="button"
                                                    onClick={() => {
                                                        form.setVehicleModalInitialMode('new');
                                                        form.setIsVehicleModalOpen(true);
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
                                        {form.showServiceDropdown && (
                                            <S.Dropdown>
                                                {form.filteredServices.map((service: Service) => (
                                                    <S.DropdownItem
                                                        key={service.id}
                                                        type="button"
                                                        onClick={() => form.addService(service)}
                                                        $accentColor={form.accentColor}
                                                    >
                                                        <span>{service.name}</span>
                                                        <span>
                                                            {service.requireManualPrice
                                                                ? 'NIESTANDARDOWA'
                                                                : `${((service.basePriceNet / 100) * (100 + service.vatRate) / 100).toFixed(2)} zł brutto`
                                                            }
                                                        </span>
                                                    </S.DropdownItem>
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
                                                        <span>Wprowadź nową usługę</span>
                                                    </S.DropdownAddButton>
                                            </S.Dropdown>
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

                                                    const syncFromGross = (raw: string) => {
                                                        const num = parseFloat(raw.replace(',', '.'));
                                                        if (!isNaN(num)) form.setServicePrices(prev => ({ ...prev, [id]: num }));
                                                        form.setServicePriceInputs(prev => ({ ...prev, [id]: { ...prev[id], gross: raw } }));
                                                    };
                                                    const syncFromNet = (raw: string) => {
                                                        const num = parseFloat(raw.replace(',', '.'));
                                                        if (!isNaN(num)) {
                                                            const gross = roundTo2(num * (1 + vatRate / 100));
                                                            form.setServicePrices(prev => ({ ...prev, [id]: gross }));
                                                        }
                                                        form.setServicePriceInputs(prev => ({ ...prev, [id]: { ...prev[id], net: raw } }));
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
            <QuickCustomerModal
                isOpen={form.isAddCustomerModalOpen}
                onClose={() => { form.setIsAddCustomerModalOpen(false); form.setCustomerSearch(''); }}
                onSuccess={(customer) => {
                    const phone = (customer as any).phone || customer.contact?.phone || undefined;
                    const email = (customer as any).email || customer.contact?.email || undefined;
                    form.handleCustomerSelect({ id: customer.id, firstName: customer.firstName, lastName: customer.lastName, phone, email, isNew: false });
                    form.setCustomerSearch(`${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim());
                    form.setShowCustomerDropdown(false);
                    queryClient.invalidateQueries({ queryKey: ['appointments', 'customers', 'search'] });
                }}
                initialFirstName={form.parsedCustomerData.firstName}
                initialLastName={form.parsedCustomerData.lastName}
                initialPhone={form.parsedCustomerData.phone}
                initialEmail={form.parsedCustomerData.email}
            />

            <VehicleModal
                isOpen={form.isVehicleModalOpen}
                vehicles={form.vehicles}
                onClose={() => { form.setIsVehicleModalOpen(false); form.setVehicleModalInitialMode('select'); }}
                onSelect={form.handleVehicleSelect}
                allowSkip
                initialMode={form.vehicleModalInitialMode}
            />

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
