// src/modules/calendar/components/QuickEventModal/index.tsx

import React, { forwardRef, useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { capitalizeFirst } from '@/common/utils/capitalizeFirst';
import { formatCurrency } from '@/common/utils/formatters';
import { pluralPl } from '@/common/utils/plural';
import styled from 'styled-components';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { DateTimePicker, DateRangePicker } from '../DateTimePicker';
import { QuickServiceModal } from '../QuickServiceModal';
import { PriceInputModal } from '../PriceInputModal';
import { QuickColorModal } from '../QuickColorModal';
import { Toggle } from '@/common/components/Toggle';
import { useVisualViewportSheet } from '@/common/hooks';
import { LockedSection } from '@/common/components/LockedSection';
import { FooterPrimaryButton, FooterSecondaryButton } from '@/common/components/StickyFormFooter';
// Współdzielone komponenty pól z /checkin/new (VerificationStep używa tych samych):
// dzięki temu układ i stylistyka pól są 1:1 z formularzem przyjęcia pojazdu.
import { FormGrid, FieldGroup, Label as FormLabel, Input as FormInputField, ErrorMessage as FormFieldError } from '@/common/components/Form';
import { FieldLabel, InputShell, BareInput, InputShellTextArea, BareTextArea } from '@/common/components/Form';
import { Button, Notice, ui } from '@/common/components/ui';
import { ModalShell, ModalHeader, ModalTitleGroup, ModalTitle, ModalSubtitle, ModalFooter, CloseBtn } from '@/common/components/ModalKit';
import { SUBMODAL_Z_INDEX } from '@/common/styles/sharedModalStyles';
import { acquireScrollLock } from '@/common/utils/scrollLock';
import { PhoneInput } from '@/common/components/PhoneInput';
import * as S from '../QuickEventModalStyles';
import { SmsOptionsSheet, SmsOptionsList, type SmsOption } from './SmsOptionsSheet';
import { ColorDropdown } from '@/common/components/ColorDropdown';
import { useQuickEventForm } from './useQuickEventForm';
import { BrandSelect, ModelSelect } from '@/modules/vehicles/components/BrandModelSelectors';
import { VehicleKindSwitch } from '@/modules/vehicles/components/VehicleKindSwitch';
import { DEFAULT_VEHICLE_KIND, normalizeVehicleKind } from '@/modules/vehicles/vehicleKind';
import { ServicesTable } from '@/common/components/ServicesTable';
import type { ServiceLineItem, SaveServiceData } from '@/common/components/ServicesTable';
import { buildServicesAsLineItems, withRenamedTempServices } from './servicesAsLineItems';
import { formPricesFromLineItems } from './linePrices';
import { netToGross } from '@/common/utils/priceAdjustment';
import { mobileBottomReserve, placeFloating, visibleViewport } from '@/common/utils/floatingPlacement';
import { servicesApi } from '@/modules/services/api/servicesApi';
import { serviceKeys } from '@/modules/services/api/serviceKeys';
import type { VatRate, Service as CatalogService } from '@/modules/services/types';
import {
    IconClock, IconUser, IconCar, IconSettings, IconNote,
    IconX, IconPalette, IconPlus, IconPencil, IconCheck, IconMessageSquare,
} from './icons';
import { useFeature, UpsellModal } from '@/modules/subscription';
import { useSidebar } from '@/widgets/Sidebar/context/SidebarContext';
import { RecurrenceSidePanel, SidePanelWrapper, SidePanelInner } from './RecurrenceSidePanel';
import type { QuickEventModalProps, QuickEventModalRef, AppointmentColor, Service, ServiceAdjustment } from './types';
import { PiiValue } from '@/common/pii';

/** Fokus i zaznaczenia w oknie: głęboki błękit marki, nie kolor rezerwacji ani jaskrawe
 *  #0369a1 - kolor rezerwacji widać tylko w próbkach kolorów (decyzja z 21.10.2026). */
const FOCUS_ACCENT = ui.brandInk;

export type { QuickEventFormData, QuickEventInitialData } from './types';
export type { QuickEventModalRef };

// Atrybuty klienta i pojazdu (telefon i e-mail, rocznik i tablica) jako osobne elementy
// z odstępem, a nie ciąg sklejony kropką (CLAUDE.md §4) - na wąskim polu kropka
// lądowała na początku linii.
const MetaParts = styled.span`
    display: inline-flex;
    flex-wrap: wrap;
    column-gap: 12px;
`;

/**
 * Lista podpowiedzi doklejona do pola (desktop), która ZAWSZE mieści się w ekranie.
 *
 * Wcześniej lista stała zawsze pod polem z podłogą 100 px wysokości: przy polu nisko
 * w oknie (niski ekran, przewinięty formularz) ta podłoga wypychała ją za dolną
 * krawędź. Teraz placeFloating wybiera stronę z miejscem; własny limit wysokości listy
 * (`cap`) jest wysokością, o którą prosi panel, więc przy dużym zapasie lista nie
 * rozciąga się na cały ekran.
 *
 * Pod polem lista jest jego przedłużeniem (bez górnej krawędzi, zaokrąglona u dołu,
 * z CSS). Nad polem takie doklejenie wyglądałoby jak urwane pole, więc lista dostaje
 * pełną ramkę i pełne zaokrąglenie.
 *
 * Zwraca, czy lista stanęła nad polem.
 */
function placeAttachedList(panel: HTMLElement, anchor: HTMLElement, cap: number, offset: number): boolean {
    const rect = anchor.getBoundingClientRect();
    panel.style.width = `${rect.width}px`;
    // scrollHeight to cała treść niezależnie od bieżącego limitu; ramki dokładamy osobno.
    const chrome = panel.offsetHeight - panel.clientHeight;
    const viewport = visibleViewport();
    const placement = placeFloating(
        rect,
        { width: rect.width, height: Math.min(panel.scrollHeight + chrome, cap) },
        viewport,
        { align: 'left', offset, bottomReserve: mobileBottomReserve(viewport.width) },
    );
    panel.style.top = `${placement.top}px`;
    panel.style.left = `${placement.left}px`;
    panel.style.maxHeight = `${Math.min(placement.maxHeight, cap)}px`;
    panel.style.borderTop = placement.above ? `1.5px solid ${ui.brandInk}` : '';
    panel.style.borderRadius = placement.above ? '12px' : '';
    return placement.above;
}

/**
 * Trzyma listę przy polu przy przewijaniu strony, zmianie rozmiaru i wysuwaniu
 * klawiatury. Przewijanie WEWNĄTRZ listy jej nie przelicza - wyzerowałoby przewinięcie.
 */
function useAttachedList(
    open: boolean,
    anchorRef: React.RefObject<HTMLElement | null>,
    panelRef: React.RefObject<HTMLElement | null>,
    cap: number,
    offset: number,
    /** Zmiana liczby pozycji - lista mierzy się od nowa. */
    contentKey: unknown,
    onFlip?: (above: boolean) => void,
): void {
    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const panel = panelRef.current;
            const anchor = anchorRef.current;
            if (panel && anchor) {
                const above = placeAttachedList(panel, anchor, cap, offset);
                onFlip?.(above);
            }
        };
        const onScroll = (e: Event) => {
            if (panelRef.current?.contains(e.target as Node)) return;
            place();
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', onScroll, true);
        window.visualViewport?.addEventListener('resize', place);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', onScroll, true);
            window.visualViewport?.removeEventListener('resize', place);
        };
    }, [open, anchorRef, panelRef, cap, offset, contentKey, onFlip]);
}

// Door to door na wspólnych polach formularza (InputShell) i wspólnym przełączniku
// (Toggle) - wcześniej sekcja miała własny przełącznik i własne pola, jedyne takie
// w aplikacji.
const D2DFields = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 10px;
    padding-top: 12px;
    border-top: 1px solid ${ui.lineFaint};
`;

const D2DAddressGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const D2DAddressInputs = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    @media (max-width: 639px) { grid-template-columns: 1fr; }
`;

/** Cykliczność na telefonie: w sekcji „Termin", bo panelu bocznego nie ma gdzie postawić. */
const MobileRecurrenceBox = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 14px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusStrip};
    background: ${ui.surfaceSoft};
`;

const LinkButton = styled.button`
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    color: ${ui.brandInk};
    cursor: pointer;

    &:hover { text-decoration: underline; }
`;

const DraftActions = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
`;

export const QuickEventModal = forwardRef<QuickEventModalRef, QuickEventModalProps>(({
    isOpen,
    eventData,
    onClose,
    onSave,
    initialData,
    allowRecurrence = true,
}, ref) => {
    const form = useQuickEventForm({ isOpen, eventData, onClose, onSave, ref, initialData });

    // Początek i koniec to jeden kalendarz zakresu; wizyta całodniowa ma jedno pole.
    const handleStartDateTimeChange = (val: string) => {
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
    };
    const queryClient = useQueryClient();
    const smsFeature = useFeature('SMS_EMAIL');
    const [upsellOpen, setUpsellOpen] = useState(false);
    const [smsSheetOpen, setSmsSheetOpen] = useState(false);
    const { isCollapsed } = useSidebar();
    /* Musi się zgadzać z SidebarContainer (SidebarStyles.ts): 64 px zwinięty,
       248 px rozwinięty. Było tu 240 px, czyli o 8 px za mało - okno siadało
       odrobinę pod sidebarem. Poniżej `md` sidebar jest zsunięty z ekranu,
       a przesunięcie zeruje media query w S.Overlay. */
    const sidebarWidth = isCollapsed ? 64 : 248;

    const [highlightedServiceIdx, setHighlightedServiceIdx] = useState(-1);
    const serviceDropdownRef = useRef<HTMLDivElement>(null);
    const customerDropdownContainerRef = useRef<HTMLDivElement>(null);
    const customerDropdownRef = useRef<HTMLDivElement>(null);
    // Lista klientów nad polem: pole nie może wtedy udawać, że lista wychodzi z jego dołu.
    const [customerListAbove, setCustomerListAbove] = useState(false);
    const vehicleButtonRef = useRef<HTMLButtonElement>(null);
    const vehicleDropdownRef = useRef<HTMLDivElement>(null);
    const [vehicleListAbove, setVehicleListAbove] = useState(false);
    const [autoOpenModel, setAutoOpenModel] = useState(false);

    // Mobile-specific UX state
    const [isMobile, setIsMobile] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const serviceSheetRef = useRef<HTMLDivElement>(null);
    const serviceSheetInputRef = useRef<HTMLDivElement>(null);

    const MAX_VISIBLE_COLORS = 5;
    const [colorPanelOpen, setColorPanelOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [colorPanelPos, setColorPanelPos] = useState({ bottom: 0, left: 0 });
    const moreColorsBtnRef = useRef<HTMLButtonElement>(null);
    // Czy w sekcji klienta jest cokolwiek do wycofania (dane wpisane lub klient wybrany).
    const hasCustomerData = !!(
        form.customerFirstName || form.customerLastName ||
        form.customerPhone || form.customerEmail || form.selectedCustomer
    );

    // Podpowiedzi klienta na mobile pokazujemy w przepływie DOKŁADNIE pod tym
    // polem, w którym stoi kursor (Imię / Nazwisko / Telefon) - stąd osobny
    // znacznik aktywnego pola. Osobny stan od desktopowego showCustomerDropdown.
    const [mobileSuggestOpen, setMobileSuggestOpen] = useState(false);
    const [mobileActiveCustomerField, setMobileActiveCustomerField] = useState<'firstName' | 'lastName' | 'phone'>('firstName');

    // Lista podpowiedzi widoczna, gdy: użytkownik pisze (mobileSuggestOpen),
    // są wyniki, i nie wybrano jeszcze klienta.
    const renderMobileCustomerSuggestions = () => {
        if (!isMobile || !mobileSuggestOpen || form.selectedCustomer) return null;
        if (form.customerResults.length === 0) return null;
        return (
            <S.MobileCustomerSuggestions>
                {form.customerResults.map((c) => {
                    const hasContact = !!(c.phone || c.email);
                    return (
                        <S.MobileCustomerSuggestionItem
                            key={c.id}
                            type="button"
                            // preventDefault na mousedown/touchstart, żeby klik w podpowiedź
                            // nie zabrał najpierw focusu polu (i nie zdążył go schować).
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                form.customerJustSelectedRef.current = true;
                                form.handleCustomerSelect({
                                    id: c.id,
                                    firstName: c.firstName ?? undefined,
                                    lastName: c.lastName ?? undefined,
                                    phone: c.phone ?? undefined,
                                    email: c.email ?? undefined,
                                    isNew: false,
                                });
                                setMobileSuggestOpen(false);
                            }}
                        >
                            <S.MobileCustomerSuggestionName>
                                {(c.firstName || c.lastName)
                                    ? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()
                                    : '(bez imienia i nazwiska)'}
                            </S.MobileCustomerSuggestionName>
                            <S.MobileCustomerSuggestionSub $warn={!hasContact}>
                                {hasContact
                                    ? (
                                        <MetaParts>
                                            {c.phone && <span><PiiValue value={c.phone} kind="phone" /></span>}
                                            {c.email && <span>{c.email}</span>}
                                        </MetaParts>
                                    )
                                    : '⚠ Brak danych kontaktowych'}
                            </S.MobileCustomerSuggestionSub>
                        </S.MobileCustomerSuggestionItem>
                    );
                })}
            </S.MobileCustomerSuggestions>
        );
    };

    // Telefon nie ma osobnego „ołówka": pola wybranego klienta są edytowalne od razu.
    // Pierwsza zmiana otwiera edycję, więc poprawka trafia do zapisu (z pytaniem
    // „Zmienić dane klienta?"), a nie ginie po cichu jak wcześniej.
    const editSelectedCustomerMobile = () => {
        if (form.selectedCustomer && !form.customerEditMode) form.handleEnterEditMode();
    };

    // "Wyczyść" na mobile: czyści wybór klienta i wszystkie pola,
    // wraca do pustego formularza (jak reset sekcji w /checkin/new).
    const handleResetCustomerMobile = useCallback(() => {
        form.setSelectedCustomer(null);
        form.setSelectedCustomerId(undefined);
        form.setCustomerFirstName('');
        form.setCustomerLastName('');
        form.setCustomerPhone('');
        form.setCustomerEmail('');
        form.setSelectedVehicle(null);
        form.setVehicleKind(DEFAULT_VEHICLE_KIND);
        form.setVehicleBrand('');
        form.setVehicleModel('');
        form.setVehicleYear('');
    }, [form]);


    /**
     * Trzy powiadomienia SMS jako niezależne przełączniki - każda kombinacja jest
     * poprawna, także „sama karta wizyty". Globalne wyłączenie w konfiguracji
     * studia blokuje pojedynczy przełącznik, nie całą trójkę.
     */
    const allSmsOptions: SmsOption[] = [
        {
            key: 'confirmation',
            label: 'Potwierdzenie rezerwacji',
            description: 'Wyślemy zaraz po zapisaniu rezerwacji.',
            checked: form.sendConfirmationSms,
            disabledReason: form.bookingConfirmationEnabled ? undefined : 'Wyłączone w ustawieniach SMS',
            onChange: form.setSendConfirmationSms,
        },
        {
            key: 'reminder',
            label: 'Przypomnienie przed wizytą',
            description: 'Wyjdzie automatycznie przed terminem.',
            checked: form.sendReminderSms,
            disabledReason: form.preVisitEnabled ? undefined : 'Wyłączone w ustawieniach SMS',
            onChange: form.setSendReminderSms,
        },
        {
            key: 'visitCard',
            label: 'Karta wizyty',
            description: 'Link, pod którym klient śledzi postęp prac.',
            checked: form.sendVisitCard,
            disabledReason: form.reservationCardLinkSmsEnabled ? undefined : 'Wyłączone w ustawieniach SMS',
            onChange: form.setSendVisitCard,
        },
    ];
    // Karta wizyty tylko w studiu, które jej używa - na obu ekranach tak samo.
    const smsOptions = allSmsOptions.filter(o => o.key !== 'visitCard' || form.visitCardEnabled);

    // Numer z pól formularza, nie tylko z wybranego klienta - patrz `smsPhone` w hooku.
    const customerPhone = form.smsPhone;

    /** Jedno zdanie o tym, co poleci - stan widoczny w chwili zapisu, nie po. */
    const smsSummary = (() => {
        if (!smsFeature.enabled) return 'SMS niedostępny w Twoim pakiecie';
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

    const servicesAsLineItems = useMemo(
        () => buildServicesAsLineItems({
            selectedServiceIds: form.selectedServiceIds,
            serviceRefs: form.serviceRefs,
            services: form.services,
            tempServices: form.tempServices,
            servicePrices: form.servicePrices,
            serviceBasePrices: form.serviceBasePrices,
            serviceAdjustments: form.serviceAdjustments,
            serviceNotes: form.serviceNotes,
            serviceVatRates: form.serviceVatRates,
        }),
        [form.selectedServiceIds, form.serviceRefs, form.services, form.tempServices, form.servicePrices, form.serviceBasePrices, form.serviceAdjustments, form.serviceNotes, form.serviceVatRates]
    );

    const handleServicesChange = useCallback((newItems: ServiceLineItem[]) => {
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
        // Netto i brutto wprost z pozycji, nigdy z cennika - także po zbiorczej zmianie
        // VAT, po której pozycja wpisana od netta wraca bez brutta (patrz linePrices.ts).
        const prices = formPricesFromLineItems(newItems);
        form.setServiceBasePrices(() => prices.serviceBasePrices);
        form.setServicePrices(() => prices.servicePrices);
        form.setServicePriceInputs(() => prices.servicePriceInputs);
        // Nazwa usługi spoza cennika wraca do tempServices - stamtąd czyta ją i tabela,
        // i payload rezerwacji. Bez tego zmiana nazwy w „Edytuj pozycję" przepadała.
        form.setTempServices(prev => withRenamedTempServices(prev, newItems));
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
        queryClient.setQueryData<CatalogService[]>(serviceKeys.catalog(), old =>
            old?.map(s => s.id === serviceId ? updatedService : s)
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
    useVisualViewportSheet(isMobile && form.showServiceDropdown, [serviceSheetRef]);

    // Tło nie przewija się pod oknem (CLAUDE.md §3). Z leada blokadę zakłada też
    // BookingFlowModal - licznik referencji w scrollLock łączy obie.
    useEffect(() => (isOpen ? acquireScrollLock() : undefined), [isOpen]);

    // Escape zamyka najpierw to, co jest otwarte W oknie (lista usług, podpowiedzi
    // klienta, wybór auta, kalendarz, marka) - dawniej to samo naciśnięcie zamykało od
    // razu całe okno. Dopiero gdy nic nie jest otwarte, zamyka okno.
    const handleEscape = (e: { defaultPrevented: boolean; preventDefault: () => void }, root: Element | null) => {
        if (e.defaultPrevented) return;
        if (form.showServiceDropdown || form.showCustomerDropdown || form.showVehicleDropdown || colorPanelOpen) {
            e.preventDefault();
            form.setShowServiceDropdown(false);
            form.setShowCustomerDropdown(false);
            form.setShowVehicleDropdown(false);
            setColorPanelOpen(false);
            return;
        }
        if (root?.querySelector('[aria-expanded="true"]')) return;
        e.preventDefault();
        onClose();
    };
    const escapeRef = useRef(handleEscape);
    escapeRef.current = handleEscape;
    const subWindowOpen = smsSheetOpen || upsellOpen || !!form.pendingChoice
        || form.isQuickServiceModalOpen || form.isPriceInputModalOpen || form.isQuickColorModalOpen;
    const subWindowOpenRef = useRef(subWindowOpen);
    subWindowOpenRef.current = subWindowOpen;

    // Escape bez fokusu w oknie. Wybór klienta albo auta z listy podmienia pole na kartę,
    // fokus spada wtedy na <body>, a onKeyDown formularza nie dostaje klawisza - okno
    // z wybranym klientem i autem nie zamykało się Escape'em. Okienka nad tym oknem
    // (SMS, nowa usługa, cena, pytanie o dane klienta) obsługują Escape same.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (e.target !== document.body && e.target !== document.documentElement) return;
            if (subWindowOpenRef.current) return;
            escapeRef.current(e, formRef.current);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen]);

    // When any mobile sheet is open, set tabindex=-1 on all background inputs
    // so iOS grays out the ^ v navigation arrows (they appear because iOS sees other inputs in the DOM)
    useEffect(() => {
        if (!isMobile || !form.showServiceDropdown) return;

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
    }, [isMobile, form.showServiceDropdown]);

    // Auto-expand advanced sections when editing existing data on mobile
    useEffect(() => {
        if (isOpen && isMobile) {
            if (form.notes || form.doorToDoor.enabled || form.sendConfirmationSms || form.sendReminderSms || form.sendVisitCard) {
                setShowAdvanced(true);
            }
        }
    }, [isOpen, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!form.showServiceDropdown) setHighlightedServiceIdx(-1);
    }, [form.showServiceDropdown]);
    useAttachedList(
        !isMobile && form.showServiceDropdown,
        form.serviceInputRef,
        serviceDropdownRef,
        320,
        2,
        `${form.filteredServices.length}-${form.serviceSearch.trim().length > 0}`,
    );

    // Scroll highlighted service item into view when navigating with arrow keys
    useEffect(() => {
        if (highlightedServiceIdx < 0 || !serviceDropdownRef.current) return;
        const items = serviceDropdownRef.current.querySelectorAll<HTMLElement>('[data-service-item]');
        items[highlightedServiceIdx]?.scrollIntoView({ block: 'nearest' });
    }, [highlightedServiceIdx]);

    // Lista aut klienta też w portalu, doklejona do pola: w przewijanej treści okna wychodziła
    // pod stopkę („Wyczyść wszystko”, kolory) i ucinała ostatnie pozycje. Telefon tak samo.
    useAttachedList(
        form.showVehicleDropdown && !!form.selectedCustomer,
        vehicleButtonRef,
        vehicleDropdownRef,
        320,
        0,
        form.vehicles.length,
        setVehicleListAbove,
    );

    useAttachedList(
        !isMobile && form.showCustomerDropdown,
        customerDropdownContainerRef,
        customerDropdownRef,
        280,
        0,
        form.customerResults.length,
        setCustomerListAbove,
    );

    /**
     * Pola marki, modelu i roku - te same dla nowego auta i edycji auta z kartoteki.
     * Telefon: pola pod sobą (FormGrid z /checkin/new), komputer: zwarty blok.
     */
    const renderVehicleFields = (mode: 'new' | 'edit') => {
        const onEnter = (e: React.KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (mode === 'edit') form.handleConfirmVehicleEdit();
            else form.handleAddNewVehicleDirectly();
        };
        const onBrand = (brand: string) => {
            form.setVehicleBrand(brand);
            form.setVehicleModel('');
            form.setFocusedField('vehicle');
            setAutoOpenModel(true);
        };
        const onModel = (model: string) => {
            form.setVehicleModel(model);
            form.setFocusedField('vehicle');
            setAutoOpenModel(false);
            if (!isMobile) setTimeout(() => form.vehicleYearInputRef.current?.focus(), 0);
        };
        const onYear = (value: string) => form.setVehicleYear(value.replace(/\D/g, ''));

        if (isMobile) {
            return (
                <FormGrid>
                    <FieldGroup>
                        <S.FieldLabelRow>
                            <FormLabel>Marka</FormLabel>
                            <VehicleKindSwitch iconOnly value={form.vehicleKind} onChange={form.changeVehicleKind} />
                        </S.FieldLabelRow>
                        <BrandSelect kind={form.vehicleKind} value={form.vehicleBrand} onChange={onBrand} />
                    </FieldGroup>
                    <FieldGroup>
                        <FormLabel>Model</FormLabel>
                        <ModelSelect
                            kind={form.vehicleKind}
                            brand={form.vehicleBrand}
                            value={form.vehicleModel}
                            onChange={onModel}
                            autoOpen={autoOpenModel}
                        />
                    </FieldGroup>
                    <FieldGroup>
                        <FormLabel>Rok produkcji</FormLabel>
                        <FormInputField
                            type="text"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="np. 2021"
                            value={form.vehicleYear}
                            onChange={(e) => onYear(e.target.value)}
                            onKeyDown={onEnter}
                        />
                    </FieldGroup>
                </FormGrid>
            );
        }

        // Nowe auto bez klienta jest wyszarzone: pojazd zapisuje się w karcie klienta.
        const locked = mode === 'new' && !form.selectedCustomer;
        return (
            <S.CustomerInputBlock
                $focused={form.focusedField === 'vehicle'}
                style={locked ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
            >
                <S.VehicleInputRow>
                    <S.CustomerFieldGroup $borderRight>
                        {/* Rodzaj przy marce: wybiera katalog marki i modelu. */}
                        <S.FieldLabelRow>
                            <S.CustomerFieldLabel>Marka</S.CustomerFieldLabel>
                            <VehicleKindSwitch iconOnly value={form.vehicleKind} onChange={form.changeVehicleKind} />
                        </S.FieldLabelRow>
                        <BrandSelect
                            compact
                            kind={form.vehicleKind}
                            value={form.vehicleBrand}
                            onChange={onBrand}
                            onBlur={() => form.setFocusedField(null)}
                        />
                    </S.CustomerFieldGroup>
                    <S.CustomerFieldGroup $borderRight>
                        <S.CustomerFieldLabel>Model</S.CustomerFieldLabel>
                        <ModelSelect
                            compact
                            kind={form.vehicleKind}
                            brand={form.vehicleBrand}
                            value={form.vehicleModel}
                            onChange={onModel}
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
                            onChange={(e) => { onYear(e.target.value); form.setFocusedField('vehicle'); }}
                            onFocus={() => form.setFocusedField('vehicle')}
                            onBlur={() => form.setFocusedField(null)}
                            autoComplete="new-password"
                            onKeyDown={onEnter}
                        />
                    </S.CustomerFieldGroup>
                </S.VehicleInputRow>
            </S.CustomerInputBlock>
        );
    };

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
                        ref={formRef}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                handleEscape(e, e.currentTarget);
                                return;
                            }
                            if (e.key === 'Enter') {
                                const target = e.target as HTMLInputElement;
                                // Enter w tytule przechodzi dalej, a nie wysyła formularza
                                // (wysyłka pustego formularza sypała od razu błędami).
                                if (target.dataset?.qemTitle !== undefined) {
                                    e.preventDefault();
                                    form.customerInputRef.current?.focus();
                                    return;
                                }
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
                        {/* Mobile: header staje się kompaktowym paskiem z nazwą modułu
                            i przyciskiem zamknięcia. Sam edytowalny tytuł rezerwacji
                            przenosi się do sekcji 0 na dole (jak w /checkin/new). */}
                        <S.Header>
                            {isMobile ? (
                                <S.MobilePageTitle>
                                    <S.MobilePageTitleName>Nowa rezerwacja</S.MobilePageTitleName>
                                </S.MobilePageTitle>
                            ) : (
                                <S.HeaderContent>
                                    <S.TitleInput
                                        ref={form.titleInputRef}
                                        type="text"
                                        placeholder="Dodaj tytuł rezerwacji"
                                        data-qem-title=""
                                        value={form.title}
                                        onChange={(e) => form.setTitle(e.target.value)}
                                        $accentColor={form.focusedField === 'title' ? FOCUS_ACCENT : undefined}
                                        onFocus={() => form.setFocusedField('title')}
                                        onBlur={() => form.setFocusedField(null)}
                                    />
                                </S.HeaderContent>
                            )}
                            <S.CloseButton type="button" onClick={onClose}>
                                <IconX />
                            </S.CloseButton>
                        </S.Header>

                        <S.ScrollableContent>
                            {/* Szkic poprzedniej, niezapisanej rezerwacji. Formularz startuje
                                pusty - stare dane wracają tylko na wyraźne życzenie. */}
                            {form.draft && (
                                <S.Row>
                                    <S.RowContent>
                                        <Notice
                                            tone="info"
                                            title="Niedokończona rezerwacja"
                                            action={(
                                                <DraftActions>
                                                    <Button size="sm" variant="tinted" onClick={form.restoreDraft}>
                                                        Wróć do szkicu
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={form.dismissDraft}>
                                                        Odrzuć szkic
                                                    </Button>
                                                </DraftActions>
                                            )}
                                        >
                                            {form.draftSummary}. Wróci w terminie wybranym teraz.
                                        </Notice>
                                    </S.RowContent>
                                </S.Row>
                            )}
                            {/* ── 0. Tytuł (mobile only) - jak w /checkin/new ─────── */}
                            {isMobile && (
                                <S.Row>
                                    <S.RowHeader>
                                        <S.RowHeaderTitleRow>
                                            <S.RowHeaderLabel>Tytuł rezerwacji</S.RowHeaderLabel>
                                        </S.RowHeaderTitleRow>
                                    </S.RowHeader>
                                    <S.RowContent>
                                        <S.TitleInput
                                            type="text"
                                            placeholder="np. Korekta lakieru + powłoka ceramiczna"
                                            data-qem-title=""
                                            value={form.title}
                                            onChange={(e) => form.setTitle(e.target.value)}
                                            $accentColor={form.focusedField === 'title' ? FOCUS_ACCENT : undefined}
                                            onFocus={() => form.setFocusedField('title')}
                                            onBlur={() => form.setFocusedField(null)}
                                        />
                                    </S.RowContent>
                                </S.Row>
                            )}

                            {/* ── 1. Termin ───────────────────────────────── */}
                            {/* Kolejność sekcji i style nagłówka 1:1 z /checkin/new
                                (VerificationStep): numeryczna pigułka + tekst label
                                (BEZ ikony), StatusPill/hint po prawej. */}
                            <S.Row>
                                <S.RowHeader>
                                    <S.RowHeaderTitleRow>
                                        <S.RowHeaderNum>1</S.RowHeaderNum>
                                        <S.RowHeaderLabel>Termin</S.RowHeaderLabel>
                                    </S.RowHeaderTitleRow>
                                    <S.RowHeaderHint $required>wymagane</S.RowHeaderHint>
                                </S.RowHeader>
                                <S.IconWrapper $color={form.focusedField?.startsWith('time') ? FOCUS_ACCENT : undefined}>
                                    <IconClock />
                                </S.IconWrapper>
                                <S.RowContent>
                                    {/* „Cały dzień" i „Cykliczna" także na telefonie - wcześniej tam
                                        ich nie było, więc serii ani wizyty całodniowej nie dało się
                                        założyć z telefonu. */}
                                    <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-start' : 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                                        {allowRecurrence && (
                                            <Toggle
                                                checked={isRecurring}
                                                onChange={setIsRecurring}
                                                label="Cykliczna"
                                                size="sm"
                                            />
                                        )}
                                        <Toggle
                                            checked={form.isAllDay}
                                            onChange={form.handleAllDayToggle}
                                            label="Cały dzień"
                                            size="sm"
                                        />
                                    </div>
                                    {isMobile && allowRecurrence && isRecurring && (
                                        <MobileRecurrenceBox>
                                            <RecurrenceSidePanel
                                                rule={recurrenceRule}
                                                onChange={setRecurrenceRule}
                                                startDateTime={form.startDateTime}
                                            />
                                        </MobileRecurrenceBox>
                                    )}
                                    {form.errors.recurrence && <S.ErrorMessage>{form.errors.recurrence}</S.ErrorMessage>}
                                    {/* Mobile: FormGrid z /checkin/new - trzy pola pod sobą
                                        (Data rozpoczęcia, Data zakończenia, Kolor). Desktop
                                        zostaje przy S.InputGrid, kolor w stopce. */}
                                    {isMobile ? (
                                        <FormGrid>
                                            <FieldGroup>
                                                <FormLabel>{form.isAllDay ? 'Data' : 'Data rozpoczęcia'}</FormLabel>
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
                                                    placeholder="Wybierz datę i godzinę"
                                                    hasError={!!form.errors.startDateTime}
                                                    containerRef={form.startInputRef}
                                                />
                                                {form.errors.startDateTime && <FormFieldError>{form.errors.startDateTime}</FormFieldError>}
                                            </FieldGroup>
                                            {!form.isAllDay && (
                                                <FieldGroup>
                                                    <FormLabel>Data zakończenia</FormLabel>
                                                    <DateTimePicker
                                                        value={form.endDateTime}
                                                        onChange={form.setEndDateTime}
                                                        showTime
                                                        placeholder="Wybierz datę i godzinę"
                                                        hasError={!!form.errors.endDateTime}
                                                        containerRef={form.endInputRef}
                                                    />
                                                    {form.errors.endDateTime && <FormFieldError>{form.errors.endDateTime}</FormFieldError>}
                                                </FieldGroup>
                                            )}
                                            <FieldGroup>
                                                <FormLabel>Kolor w kalendarzu *</FormLabel>
                                                <ColorDropdown
                                                    colors={form.appointmentColors}
                                                    value={form.selectedColorId ?? ''}
                                                    onChange={(id) => form.setSelectedColorId(id)}
                                                    onAddColor={() => form.setIsQuickColorModalOpen(true)}
                                                />
                                                {form.errors.color && <FormFieldError>{form.errors.color}</FormFieldError>}
                                            </FieldGroup>
                                        </FormGrid>
                                    ) : (
                                    <S.InputGrid>
                                        <S.InputGroup>
                                            <S.Label>{form.isAllDay ? 'Data' : 'Początek'}</S.Label>
                                            {form.isAllDay ? (
                                                <DateTimePicker
                                                    value={form.startDateTime}
                                                    onChange={handleStartDateTimeChange}
                                                    showTime={false}
                                                    placeholder="Wybierz datę"
                                                    accentColor={form.focusedField === 'time-start' ? FOCUS_ACCENT : undefined}
                                                    hasError={!!form.errors.startDateTime}
                                                    containerRef={form.startInputRef}
                                                    onFocus={() => form.setFocusedField('time-start')}
                                                    onBlur={() => form.setFocusedField(null)}
                                                />
                                            ) : (
                                                <DateRangePicker
                                                    role="start"
                                                    start={form.startDateTime}
                                                    end={form.endDateTime}
                                                    onStartChange={handleStartDateTimeChange}
                                                    onEndChange={form.setEndDateTime}
                                                    showTime
                                                    placeholder="Wybierz datę"
                                                    accentColor={form.focusedField === 'time-start' ? FOCUS_ACCENT : undefined}
                                                    hasError={!!form.errors.startDateTime}
                                                    containerRef={form.startInputRef}
                                                    onFocus={() => form.setFocusedField('time-start')}
                                                    onBlur={() => form.setFocusedField(null)}
                                                />
                                            )}
                                            {form.errors.startDateTime && <S.ErrorMessage>{form.errors.startDateTime}</S.ErrorMessage>}
                                        </S.InputGroup>
                                        {!form.isAllDay && (
                                            <S.InputGroup>
                                                <S.Label>Koniec</S.Label>
                                                <DateRangePicker
                                                    role="end"
                                                    start={form.startDateTime}
                                                    end={form.endDateTime}
                                                    onStartChange={handleStartDateTimeChange}
                                                    onEndChange={form.setEndDateTime}
                                                    showTime
                                                    placeholder="Wybierz datę i godzinę"
                                                    accentColor={form.focusedField === 'time-end' ? FOCUS_ACCENT : undefined}
                                                    hasError={!!form.errors.endDateTime}
                                                    containerRef={form.endInputRef}
                                                    onFocus={() => form.setFocusedField('time-end')}
                                                    onBlur={() => form.setFocusedField(null)}
                                                />
                                                {form.errors.endDateTime && <S.ErrorMessage>{form.errors.endDateTime}</S.ErrorMessage>}
                                            </S.InputGroup>
                                        )}
                                    </S.InputGrid>
                                    )}
                                </S.RowContent>
                            </S.Row>

                            <S.Divider />

                            {/* ── 2. Dane klienta ─────────────────────────────────── */}
                            <S.Row>
                                <S.RowHeader>
                                    <S.RowHeaderTitleRow>
                                        <S.RowHeaderNum>2</S.RowHeaderNum>
                                        <S.RowHeaderLabel>
                                            Dane klienta
                                            {form.selectedCustomer?.isNew && (
                                                <S.RowHeaderStatus>Nowy</S.RowHeaderStatus>
                                            )}
                                        </S.RowHeaderLabel>
                                    </S.RowHeaderTitleRow>
                                    {isMobile ? (
                                        /* Dwa przyciski akcji jak w /checkin/new (SectionActions). */
                                        <S.RowHeaderActions>
                                            <S.RowHeaderActionBtn
                                                type="button"
                                                onClick={handleResetCustomerMobile}
                                                disabled={!hasCustomerData}
                                            >
                                                Wyczyść
                                            </S.RowHeaderActionBtn>
                                            <S.RowHeaderActionBtn
                                                type="button"
                                                $primary
                                                onClick={() => {
                                                    // Reset ewentualnego wyboru i fokus na Imię -
                                                    // wpisywanie od razu pokazuje podpowiedzi inline.
                                                    if (form.selectedCustomer) handleResetCustomerMobile();
                                                    setMobileSuggestOpen(true);
                                                    requestAnimationFrame(() => form.customerInputRef.current?.focus());
                                                }}
                                            >
                                                {form.selectedCustomer ? 'Zmień klienta' : 'Wybierz klienta'}
                                            </S.RowHeaderActionBtn>
                                        </S.RowHeaderActions>
                                    ) : (
                                        <S.RowHeaderHint $required>wymagane</S.RowHeaderHint>
                                    )}
                                </S.RowHeader>
                                <S.IconWrapper $color={form.focusedField === 'customer' ? FOCUS_ACCENT : undefined}>
                                    <IconUser />
                                </S.IconWrapper>
                                <S.RowContent>
                                    {/* Mobile: pola pod sobą (FormGrid z /checkin/new) - Imię,
                                        Nazwisko, Telefon, E-mail. Podpowiedzi istniejących
                                        klientów pojawiają się W PRZEPŁYWIE bezpośrednio pod
                                        polami imienia (renderMobileCustomerSuggestions). */}
                                    {isMobile ? (
                                        <>
                                            {form.errors.customer && <FormFieldError>{form.errors.customer}</FormFieldError>}
                                            <FormGrid>
                                                <FieldGroup>
                                                    <FormLabel>Imię</FormLabel>
                                                    <FormInputField
                                                        ref={form.customerInputRef}
                                                        value={form.customerFirstName}
                                                        onChange={(e) => { editSelectedCustomerMobile(); form.setCustomerFirstName(e.target.value); form.customerJustSelectedRef.current = false; setMobileSuggestOpen(true); }}
                                                        onFocus={() => { setMobileActiveCustomerField('firstName'); setMobileSuggestOpen(true); }}
                                                        $hasError={!!form.errors.customerFirstName}
                                                        autoComplete="new-password"
                                                    />
                                                    {form.errors.customerFirstName && <FormFieldError>{form.errors.customerFirstName}</FormFieldError>}
                                                </FieldGroup>
                                                {/* Podpowiedzi bezpośrednio pod polem Imię, gdy tam stoi kursor */}
                                                {mobileActiveCustomerField === 'firstName' && renderMobileCustomerSuggestions()}
                                                <FieldGroup>
                                                    <FormLabel>Nazwisko</FormLabel>
                                                    <FormInputField
                                                        value={form.customerLastName}
                                                        onChange={(e) => { editSelectedCustomerMobile(); form.setCustomerLastName(e.target.value); form.customerJustSelectedRef.current = false; setMobileSuggestOpen(true); }}
                                                        onFocus={() => { setMobileActiveCustomerField('lastName'); setMobileSuggestOpen(true); }}
                                                        $hasError={!!form.errors.customerLastName}
                                                        autoComplete="new-password"
                                                    />
                                                    {form.errors.customerLastName && <FormFieldError>{form.errors.customerLastName}</FormFieldError>}
                                                </FieldGroup>
                                                {/* Podpowiedzi bezpośrednio pod polem Nazwisko */}
                                                {mobileActiveCustomerField === 'lastName' && renderMobileCustomerSuggestions()}
                                                <FieldGroup>
                                                    <FormLabel>Telefon</FormLabel>
                                                    <PhoneInput
                                                        variant="legacy"
                                                        onFocus={() => { setMobileActiveCustomerField('phone'); setMobileSuggestOpen(true); }}
                                                        value={`${form.customerPhonePrefix || '+48'} ${form.customerPhone}`.trim()}
                                                        onChange={(full) => {
                                                            editSelectedCustomerMobile();
                                                            const m = full.match(/^(\+\d+)\s*(.*)$/);
                                                            if (m) {
                                                                form.setCustomerPhonePrefix(m[1]);
                                                                form.setCustomerPhone(m[2]);
                                                            } else {
                                                                form.setCustomerPhone(full);
                                                            }
                                                            form.customerJustSelectedRef.current = false;
                                                            setMobileSuggestOpen(true);
                                                        }}
                                                        hasError={!!form.errors.customerPhone}
                                                    />
                                                    {form.errors.customerPhone && <FormFieldError>{form.errors.customerPhone}</FormFieldError>}
                                                </FieldGroup>
                                                {/* Podpowiedzi bezpośrednio pod polem Telefon */}
                                                {mobileActiveCustomerField === 'phone' && renderMobileCustomerSuggestions()}
                                                <FieldGroup>
                                                    <FormLabel>E-mail</FormLabel>
                                                    <FormInputField
                                                        type="email"
                                                        value={form.customerEmail}
                                                        onChange={(e) => { editSelectedCustomerMobile(); form.setCustomerEmail(e.target.value); }}
                                                        $hasError={!!form.errors.customerEmail}
                                                    />
                                                    {form.errors.customerEmail && <FormFieldError>{form.errors.customerEmail}</FormFieldError>}
                                                </FieldGroup>
                                            </FormGrid>
                                        </>
                                    ) : (
                                    <>
                                    {/* ── stan: klient wybrany, tryb edycji ── */}
                                    {form.selectedCustomer && form.customerEditMode ? (
                                        <>
                                            <S.CustomerHint style={{ color: ui.brandInk }}>
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
                                                <S.CustomerEditConfirmBtn type="button" onClick={() => form.handleConfirmEdit()}>
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
                                                    <S.ChipMeta>
                                                        <MetaParts>
                                                            {form.selectedCustomer.phone && <span><PiiValue value={form.selectedCustomer.phone} kind="phone" /></span>}
                                                            {form.selectedCustomer.email && <span>{form.selectedCustomer.email}</span>}
                                                        </MetaParts>
                                                    </S.ChipMeta>
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
                                                    form.setVehicleKind(DEFAULT_VEHICLE_KIND);
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
                                                    $dropdownOpen={!isMobile && form.showCustomerDropdown && !customerListAbove}
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

                                                {/* Desktop portal dropdown */}
                                                {!isMobile && form.showCustomerDropdown && createPortal(
                                                    <S.CustomerPortalDropdown ref={customerDropdownRef}>
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
                                                                            firstName: c.firstName ?? undefined,
                                                                            lastName: c.lastName ?? undefined,
                                                                            phone: c.phone ?? undefined,
                                                                            email: c.email ?? undefined,
                                                                            isNew: false,
                                                                        });
                                                                        form.setShowCustomerDropdown(false);
                                                                    }}
                                                                    $accentColor={FOCUS_ACCENT}
                                                                >
                                                                    {(c.firstName || c.lastName)
                                                                        ? <span>{c.firstName} {c.lastName}</span>
                                                                        : <span style={{ color: ui.textFaint, fontStyle: 'italic' }}>(bez imienia i nazwiska)</span>
                                                                    }
                                                                    <S.DropdownItemMeta $warning={!hasContact}>
                                                                        {hasContact
                                                                            ? (
                                                                                <MetaParts>
                                                                                    {c.phone && <span><PiiValue value={c.phone} kind="phone" /></span>}
                                                                                    {c.email && <span>{c.email}</span>}
                                                                                </MetaParts>
                                                                            )
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

                                            </S.DropdownContainer>
                                            {(form.errors.customer || form.errors.customerPhone) && (
                                                <S.ErrorMessage>{form.errors.customer || form.errors.customerPhone}</S.ErrorMessage>
                                            )}
                                        </>
                                    )}
                                    </>
                                    )}

                                </S.RowContent>
                            </S.Row>

                            {/* ── 3. Pojazd ───────────────────────────────────────── */}
                            <S.Row>
                                <S.RowHeader>
                                    <S.RowHeaderTitleRow>
                                        <S.RowHeaderNum>3</S.RowHeaderNum>
                                        <S.RowHeaderLabel>Dane pojazdu</S.RowHeaderLabel>
                                    </S.RowHeaderTitleRow>
                                    <S.RowHeaderHint>opcjonalne</S.RowHeaderHint>
                                </S.RowHeader>
                                <S.IconWrapper $color={form.focusedField === 'vehicle' ? FOCUS_ACCENT : undefined}>
                                    <IconCar />
                                </S.IconWrapper>
                                <S.RowContent ref={form.vehicleSectionRef}>
                                    {form.selectedVehicle && form.vehicleEditMode ? (
                                        /* ── stan: pojazd wybrany, tryb edycji ── */
                                        <>
                                            <S.CustomerHint style={{ color: ui.brandInk }}>
                                                Edytuj dane pojazdu
                                            </S.CustomerHint>
                                            {renderVehicleFields('edit')}
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
                                                {(form.selectedVehicle.year || form.selectedVehicle.licensePlate) && (
                                                    <S.ChipMeta>
                                                        <MetaParts>
                                                            {form.selectedVehicle.year && <span>{form.selectedVehicle.year}</span>}
                                                            {form.selectedVehicle.licensePlate && <span>{form.selectedVehicle.licensePlate}</span>}
                                                        </MetaParts>
                                                    </S.ChipMeta>
                                                )}
                                            </S.ChipInfo>
                                            {/* Ołówek był w kodzie od dawna, ale bez przycisku - edycji
                                                auta z kartoteki nie dało się otworzyć. */}
                                            <S.ChipEdit
                                                type="button"
                                                onClick={form.handleEnterVehicleEditMode}
                                                title="Popraw dane pojazdu"
                                                aria-label="Popraw dane pojazdu"
                                            >
                                                <IconPencil />
                                            </S.ChipEdit>
                                            <S.ChipClear
                                                type="button"
                                                onClick={() => {
                                                    form.setSelectedVehicle(null);
                                                    form.setVehicleKind(DEFAULT_VEHICLE_KIND);
                                                    form.setVehicleBrand('');
                                                    form.setVehicleModel('');
                                                    form.setVehicleYear('');
                                                }}
                                                title="Usuń pojazd z rezerwacji"
                                                aria-label="Usuń pojazd z rezerwacji"
                                            >
                                                <IconX />
                                            </S.ChipClear>
                                        </S.SelectedCustomerChip>
                                    ) : form.vehicles.length > 0 && !form.isAddingNewVehicle ? (
                                        /* ── stan: klient ma pojazdy, wybierz z listy ──
                                            Także na telefonie: wcześniej telefon miał tylko pola
                                            marki i modelu, a zapis gubił wpisane auto klienta
                                            z kilkoma pojazdami albo zapisywał jego stare auto. */
                                        <S.DropdownContainer>
                                            <S.VehicleSelectButton
                                                ref={vehicleButtonRef}
                                                type="button"
                                                $dropdownOpen={form.showVehicleDropdown && !vehicleListAbove}
                                                disabled={!form.selectedCustomer}
                                                onClick={form.handleVehicleSelectTriggerClick}
                                                onBlur={form.handleVehicleFieldBlur}
                                                aria-haspopup="listbox"
                                                aria-expanded={form.showVehicleDropdown}
                                            >
                                                <span style={{ color: ui.textFaint }}>
                                                    Wybierz z {form.vehicles.length} {pluralPl(form.vehicles.length, 'pojazdu', 'pojazdów', 'pojazdów')} klienta
                                                </span>
                                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0 }}>
                                                    <path d="M1 1l4 4 4-4" stroke={ui.textFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </S.VehicleSelectButton>
                                            {form.showVehicleDropdown && form.selectedCustomer && createPortal(
                                                <S.CustomerPortalDropdown ref={vehicleDropdownRef} role="listbox" aria-label="Pojazdy klienta">
                                                    <S.DropdownSeparator>Pojazdy klienta</S.DropdownSeparator>
                                                    {form.vehicles.map(v => (
                                                        <S.DropdownItem
                                                            key={v.id}
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                form.handleVehicleSelect({ id: v.id, kind: normalizeVehicleKind(v.kind), brand: v.brand, model: v.model, year: v.year, licensePlate: v.licensePlate ?? null, isNew: false });
                                                            }}
                                                            $accentColor={FOCUS_ACCENT}
                                                        >
                                                            <span>{v.brand} {v.model}</span>
                                                            <S.DropdownItemMeta>
                                                                <MetaParts>
                                                                    {v.year && <span>{v.year}</span>}
                                                                    {v.licensePlate && <span>{v.licensePlate}</span>}
                                                                </MetaParts>
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
                                                </S.CustomerPortalDropdown>,
                                                document.body
                                            )}
                                        </S.DropdownContainer>
                                    ) : (
                                        /* ── stan: brak pojazdów lub dodawanie nowego ── */
                                        <>
                                            {form.vehicles.length > 0 && (
                                                <S.CustomerHint>
                                                    <LinkButton
                                                        type="button"
                                                        onClick={() => {
                                                            form.setIsAddingNewVehicle(false);
                                                            form.setVehicleKind(DEFAULT_VEHICLE_KIND);
                                                            form.setVehicleBrand('');
                                                            form.setVehicleModel('');
                                                            form.setVehicleYear('');
                                                        }}
                                                    >
                                                        ← Wróć do listy pojazdów
                                                    </LinkButton>
                                                </S.CustomerHint>
                                            )}
                                            {renderVehicleFields('new')}
                                        </>
                                    )}
                                </S.RowContent>
                            </S.Row>

                            <S.Divider />

                            {/* ── Services row ───────────────────────────────────── */}
                            {/* ── 4. Usługi ───────────────────────────────────────── */}
                            <S.Row>
                                <S.RowHeader>
                                    <S.RowHeaderTitleRow>
                                        <S.RowHeaderNum>4</S.RowHeaderNum>
                                        <S.RowHeaderLabel>
                                            Usługi
                                            {servicesAsLineItems.length > 0 && (
                                                <S.RowHeaderStatus>
                                                    {`${servicesAsLineItems.length} ${pluralPl(servicesAsLineItems.length, 'pozycja', 'pozycje', 'pozycji')}`}
                                                </S.RowHeaderStatus>
                                            )}
                                        </S.RowHeaderLabel>
                                    </S.RowHeaderTitleRow>
                                    {/* Bez usługi rezerwacji nie da się zapisać - sekcja mówi to
                                        tak samo jak „Termin" i „Dane klienta". */}
                                    <S.RowHeaderHint $required>wymagane</S.RowHeaderHint>
                                </S.RowHeader>
                                <S.IconWrapper $color={form.focusedField === 'services' ? FOCUS_ACCENT : undefined}>
                                    <IconSettings />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <S.DropdownContainer>
                                        {isMobile ? (
                                            /* Mobile: tap-to-open bottom sheet */
                                            <S.MobileAddServiceButton
                                                type="button"
                                                onClick={() => {
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
                                                <span>Dodaj usługę…</span>
                                                <IconPlus />
                                            </S.MobileAddServiceButton>
                                        ) : (
                                            /* Desktop: inline search input */
                                            <S.ServiceSearchWrap>
                                                <S.Input
                                                    ref={form.serviceInputRef}
                                                    type="text"
                                                    placeholder="Dodaj usługę…"
                                                    value={form.serviceSearch}
                                                    style={form.serviceSearch ? { paddingRight: 36 } : undefined}
                                                    onChange={(e) => {
                                                        form.setServiceSearch(e.target.value);
                                                        form.setShowServiceDropdown(true);
                                                        setHighlightedServiceIdx(-1);
                                                    }}
                                                    aria-invalid={!!form.errors.services || !!form.errors.servicePrices}
                                                    $accentColor={form.focusedField === 'services' ? FOCUS_ACCENT : undefined}
                                                    $dropdownOpen={form.showServiceDropdown}
                                                    onFocus={() => {
                                                        // Sam fokus (np. tabulatorem) nie otwiera już okna „Nowa usługa" przy
                                                        // pustym cenniku - lista pokazuje wtedy „Dodaj nową usługę".
                                                        form.setFocusedField('services');
                                                        form.setShowServiceDropdown(true);
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
                                                            // Zamknięta lista: Escape idzie dalej i zamyka okno.
                                                            if (!form.showServiceDropdown) return;
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
                                        {!isMobile && form.showServiceDropdown && createPortal(
                                            <S.ServicePortalDropdown ref={serviceDropdownRef}>
                                                {form.filteredServices.length === 0 && form.serviceSearch.trim() && (
                                                    <S.ServiceDropdownEmpty>
                                                        Brak usług pasujących do „{form.serviceSearch.trim()}”
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
                                                                <S.ServiceDropdownGross>{formatCurrency((service.basePriceGross ?? netToGross(service.basePriceNet, service.vatRate)) / 100)} brutto</S.ServiceDropdownGross>
                                                                <S.ServiceDropdownNet>{formatCurrency(service.basePriceNet / 100)} netto</S.ServiceDropdownNet>
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
                                                            ? `Utwórz „${form.serviceSearch.trim()}”`
                                                            : 'Dodaj nową usługę'}
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
                                                            data-placeholder="Szukaj usługi…"
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
                                                                Brak usług pasujących do „{form.serviceSearch.trim()}”
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
                                                                        {formatCurrency((service.basePriceGross ?? netToGross(service.basePriceNet, service.vatRate)) / 100)} brutto
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
                                                                    ? `Utwórz „${form.serviceSearch.trim()}”`
                                                                    : 'Dodaj nową usługę'}
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

                            {/* Kolor w kalendarzu na mobile jest teraz trzecim polem
                                sekcji "Termin" (jak w /checkin/new), więc nie ma
                                już osobnej sekcji koloru. */}

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

                            {/* ── 5. Notatki ──────────────────────────────────────── */}
                            <S.Row>
                                <S.RowHeader>
                                    <S.RowHeaderTitleRow>
                                        <S.RowHeaderNum>5</S.RowHeaderNum>
                                        <S.RowHeaderLabel>Notatki</S.RowHeaderLabel>
                                    </S.RowHeaderTitleRow>
                                    <S.RowHeaderHint>opcjonalne</S.RowHeaderHint>
                                </S.RowHeader>
                                <S.IconWrapper $color={form.focusedField === 'notes' ? FOCUS_ACCENT : undefined}>
                                    <IconNote />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <S.Textarea
                                        placeholder="Dodaj notatki…"
                                        value={form.notes}
                                        onChange={(e) => form.setNotes(capitalizeFirst(e.target.value))}
                                        rows={3}
                                        $accentColor={form.focusedField === 'notes' ? FOCUS_ACCENT : undefined}
                                        onFocus={() => form.setFocusedField('notes')}
                                        onBlur={() => form.setFocusedField(null)}
                                    />
                                </S.RowContent>
                            </S.Row>

                            <S.Divider />

                            {/* ── 6. Door to door ─────────────────────────────────── */}
                            <S.Row>
                                <S.RowHeader>
                                    <S.RowHeaderTitleRow>
                                        <S.RowHeaderNum>6</S.RowHeaderNum>
                                        <S.RowHeaderLabel>
                                            Door to door
                                            {form.doorToDoor.enabled && (
                                                <S.RowHeaderStatus>Włączone</S.RowHeaderStatus>
                                            )}
                                        </S.RowHeaderLabel>
                                    </S.RowHeaderTitleRow>
                                    <S.RowHeaderHint>opcjonalne</S.RowHeaderHint>
                                </S.RowHeader>
                                <S.IconWrapper $color={form.doorToDoor.enabled ? ui.brandInk : undefined}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                        <polyline points="9 22 9 12 15 12 15 22"/>
                                    </svg>
                                </S.IconWrapper>
                                <S.RowContent>
                                    <Toggle
                                        checked={form.doorToDoor.enabled}
                                        onChange={(enabled) => form.setDoorToDoor(d => ({ ...d, enabled }))}
                                        label="Odbiór i odwiezienie auta"
                                        size="sm"
                                    />
                                    {form.doorToDoor.enabled && (
                                        <D2DFields>
                                            <D2DAddressGroup>
                                                <FieldLabel>Miejsce odbioru</FieldLabel>
                                                <D2DAddressInputs>
                                                    <InputShell $compact>
                                                        <BareInput
                                                            $compact
                                                            placeholder="Miasto"
                                                            aria-label="Miejsce odbioru: miasto"
                                                            value={form.doorToDoor.pickupAddress.city}
                                                            onChange={e => form.setDoorToDoor(d => ({ ...d, pickupAddress: { ...d.pickupAddress, city: e.target.value } }))}
                                                        />
                                                    </InputShell>
                                                    <InputShell $compact>
                                                        <BareInput
                                                            $compact
                                                            placeholder="Ulica i numer"
                                                            aria-label="Miejsce odbioru: ulica i numer"
                                                            value={form.doorToDoor.pickupAddress.street}
                                                            onChange={e => form.setDoorToDoor(d => ({ ...d, pickupAddress: { ...d.pickupAddress, street: e.target.value } }))}
                                                        />
                                                    </InputShell>
                                                </D2DAddressInputs>
                                            </D2DAddressGroup>
                                            <D2DAddressGroup>
                                                <FieldLabel>Miejsce odwiezienia</FieldLabel>
                                                <D2DAddressInputs>
                                                    <InputShell $compact>
                                                        <BareInput
                                                            $compact
                                                            placeholder="Miasto"
                                                            aria-label="Miejsce odwiezienia: miasto"
                                                            value={form.doorToDoor.deliveryAddress.city}
                                                            onChange={e => form.setDoorToDoor(d => ({ ...d, deliveryAddress: { ...d.deliveryAddress, city: e.target.value } }))}
                                                        />
                                                    </InputShell>
                                                    <InputShell $compact>
                                                        <BareInput
                                                            $compact
                                                            placeholder="Ulica i numer"
                                                            aria-label="Miejsce odwiezienia: ulica i numer"
                                                            value={form.doorToDoor.deliveryAddress.street}
                                                            onChange={e => form.setDoorToDoor(d => ({ ...d, deliveryAddress: { ...d.deliveryAddress, street: e.target.value } }))}
                                                        />
                                                    </InputShell>
                                                </D2DAddressInputs>
                                            </D2DAddressGroup>
                                            <D2DAddressGroup>
                                                <FieldLabel>Uwagi</FieldLabel>
                                                <InputShellTextArea>
                                                    <BareTextArea
                                                        rows={2}
                                                        placeholder="np. klucze w recepcji, dzwonić przed przyjazdem"
                                                        aria-label="Uwagi do odbioru i odwiezienia"
                                                        value={form.doorToDoor.notes}
                                                        onChange={e => form.setDoorToDoor(d => ({ ...d, notes: capitalizeFirst(e.target.value) }))}
                                                    />
                                                </InputShellTextArea>
                                            </D2DAddressGroup>
                                        </D2DFields>
                                    )}
                                </S.RowContent>
                            </S.Row>

                            <S.Divider />

                            {/* ── 7. Powiadomienia SMS (komputer) ───────────────────── */}
                            {/* Ta sama lista co w arkuszu na telefonie (SmsOptionsList): ten sam
                                adresat, te same powody wyłączenia. Wcześniej komputer miał własne
                                checkboksy bez nagłówka i bez wiedzy o numerze klienta. */}
                            {!isMobile && (
                            <S.Row>
                                <S.RowHeader>
                                    <S.RowHeaderTitleRow>
                                        <S.RowHeaderNum>7</S.RowHeaderNum>
                                        <S.RowHeaderLabel>Powiadomienia SMS</S.RowHeaderLabel>
                                    </S.RowHeaderTitleRow>
                                    <S.RowHeaderHint>opcjonalne</S.RowHeaderHint>
                                </S.RowHeader>
                                <S.IconWrapper>
                                    <IconMessageSquare />
                                </S.IconWrapper>
                                <S.RowContent>
                                    <LockedSection
                                        locked={!smsFeature.enabled}
                                        message="Twój pakiet nie obsługuje powiadomień SMS."
                                        onLockedClick={() => setUpsellOpen(true)}
                                    >
                                        <SmsOptionsList options={smsOptions} phone={customerPhone} />
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
                                    <S.Button type="button" onClick={form.clearAllWithUndo} $variant="ghost" title="Wyczyść wszystkie pola - pasek szkicu pozwala to cofnąć">
                                        Wyczyść wszystko
                                    </S.Button>
                                )}
                                {isMobile ? (
                                    /* Reużywamy tych samych przycisków co StickyFormFooter
                                       na /checkin/new - żeby "Zapisz rezerwację" wyglądało 1:1
                                       z "Dalej" na formularzu przyjęcia pojazdu. */
                                    <>
                                        <FooterSecondaryButton type="button" onClick={onClose}>
                                            Anuluj
                                        </FooterSecondaryButton>
                                        <FooterPrimaryButton
                                            type="submit"
                                            disabled={form.isSubmitting}
                                            $disabled={form.isSubmitting}
                                        >
                                            {form.isSubmitting ? 'Zapisywanie…' : 'Zapisz rezerwację'}
                                        </FooterPrimaryButton>
                                    </>
                                ) : (
                                    <>
                                        <S.Button type="button" onClick={onClose} $variant="secondary">
                                            Anuluj
                                        </S.Button>
                                        <S.Button
                                            type="submit"
                                            $variant="primary"
                                            disabled={form.isSubmitting}
                                            style={{ opacity: form.isSubmitting ? 0.7 : 1 }}
                                        >
                                            {form.isSubmitting ? 'Zapisywanie…' : 'Zapisz rezerwację'}
                                        </S.Button>
                                    </>
                                )}
                            </S.FooterActions>
                        </S.Footer>

                    </form>
                </S.ModalContainer>

                {/* ── Recurrence side panel ──────────────────────────── */}
                <SidePanelWrapper $visible={!isMobile && allowRecurrence && isRecurring}>
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

            {/* Montowane dopiero z wybraną usługą i z kluczem na jej id: każda kolejna
                cena dostaje świeże pola bez efektu zerującego stan. */}
            {form.isPriceInputModalOpen && form.pendingService && (
                <PriceInputModal
                    key={form.pendingService.id}
                    isOpen
                    serviceName={form.pendingService.name}
                    // `??`, nie `||`: stawka 0% to prawdziwa stawka, a nie jej brak.
                    vatRate={form.pendingService.vatRate ?? 23}
                    onClose={form.handlePriceInputModalClose}
                    onConfirm={form.handlePriceConfirm}
                />
            )}

            <QuickColorModal
                isOpen={form.isQuickColorModalOpen}
                onClose={() => form.setIsQuickColorModalOpen(false)}
                onColorCreate={form.handleQuickColorCreate}
            />

            {/* „Zmienić dane klienta/pojazdu?" - te same pytanie i odpowiedzi co w edycji
                rezerwacji (VerificationStep). Zmiana karty z kartoteki nie idzie po cichu. */}
            <ModalShell
                isOpen={!!form.pendingChoice}
                onClose={form.cancelPendingChoice}
                size="md"
                zIndex={SUBMODAL_Z_INDEX}
                labelledBy="qem-record-choice-title"
            >
                <ModalHeader>
                    <ModalTitleGroup>
                        <ModalTitle id="qem-record-choice-title">
                            {form.pendingChoice?.kind === 'vehicle' ? 'Zmienić dane pojazdu?' : 'Zmienić dane klienta?'}
                        </ModalTitle>
                        <ModalSubtitle>
                            {form.pendingChoice?.kind === 'vehicle'
                                ? 'Ten pojazd jest już zapisany. Zapisać zmianę w nim czy dodać nowy?'
                                : 'Ten klient ma już kartę klienta. Zapisać zmianę w jego karcie czy dodać nowego klienta?'}
                        </ModalSubtitle>
                    </ModalTitleGroup>
                    <CloseBtn onClick={form.cancelPendingChoice} />
                </ModalHeader>
                <ModalFooter>
                    <Button variant="outline" onClick={() => form.answerPendingChoice('new')}>
                        {form.pendingChoice?.kind === 'vehicle' ? 'Dodaj jako nowy' : 'Dodaj jako nowego'}
                    </Button>
                    <Button variant="primary" onClick={() => form.answerPendingChoice('edit')}>
                        {form.pendingChoice?.kind === 'vehicle' ? 'Edytuj istniejący' : 'Edytuj istniejącego'}
                    </Button>
                </ModalFooter>
            </ModalShell>

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
