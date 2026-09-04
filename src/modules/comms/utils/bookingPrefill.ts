// src/modules/comms/utils/bookingPrefill.ts
// Zamiana tego, co już wiemy o rozmowie, na wypełniony formularz rezerwacji.
//
// Sens przycisku „Stwórz rezerwację" polega na tym, że nikt nie przepisuje ręcznie
// danych, które system ma pod ręką: klienta z kartoteki, auta z jego historii,
// wyceny uzgodnionej w korespondencji. Tłumaczenie modeli siedzi w jednym miejscu,
// bo robią to dwa różne widoki - panel leada i podgląd konwersacji.
import { grossToNet } from '@/common/utils/priceAdjustment';
import type { QuickEventInitialData } from '@/modules/calendar';
import type { SelectedCustomer, SelectedVehicle } from '@/modules/appointments/types';
import type { ContactCard, Lead, LeadServiceItem } from '../types';

/** Stawka dla pozycji sprzed V75, które znały wyłącznie brutto - jak w leadServiceLines. */
const DEFAULT_VAT_RATE = 23;

/** Ile najwyżej wierszy rozwiniemy z jednej pozycji - zapora przed ilością z literówki. */
const MAX_EXPANDED_ROWS = 50;

/**
 * „Jan Kowalski" → { firstName: 'Jan', lastName: 'Kowalski' }.
 * Kartoteka trzyma imię i nazwisko osobno, a lead i wątek - jednym ciągiem.
 * Ostatni człon traktujemy jako nazwisko: „Anna Maria Nowak" to Anna Maria + Nowak.
 */
function splitName(fullName: string | null | undefined): { firstName: string; lastName: string } {
    const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

interface ServicePrefill {
    serviceIds: string[];
    serviceRefs: { [lineId: string]: string };
    servicePrices: { [lineId: string]: number };
    serviceBasePrices: { [lineId: string]: number };
    serviceVatRates: { [lineId: string]: number };
    serviceNotes: { [lineId: string]: string };
    tempServices: { [serviceId: string]: { name: string; basePriceNet: number; vatRate: number } };
}

/**
 * Wycena leada → pozycje formularza rezerwacji.
 *
 * Cena pozycji leada jest już PO rabatach - rabat został „wypalony" w kwocie w chwili
 * wyceny. Dlatego wchodzi tu jako cena bazowa z zerowym rabatem: przeniesienie samej
 * wartości procentowej przeliczyłoby ją drugi raz i klient dostałby rabat podwójnie.
 *
 * Ilość rozwijamy na osobne wiersze, tak samo jak edytor wyceny leada: formularz
 * rezerwacji nie zna ilości, zna pozycje z własną ceną i notatką.
 */
function servicesToPrefill(items: LeadServiceItem[]): ServicePrefill {
    const prefill: ServicePrefill = {
        serviceIds: [],
        serviceRefs: {},
        servicePrices: {},
        serviceBasePrices: {},
        serviceVatRates: {},
        serviceNotes: {},
        tempServices: {},
    };

    items.forEach((item) => {
        const vatRate = item.vatRate ?? DEFAULT_VAT_RATE;
        const priceNet = item.priceNet ?? grossToNet(item.priceGross, vatRate);
        const copies = Math.min(Math.max(1, item.quantity), MAX_EXPANDED_ROWS);

        for (let index = 0; index < copies; index += 1) {
            const lineId = `lead-${item.id}-${index}`;
            // Pozycja bez usługi z katalogu (wpisana ręcznie przy wycenie) musi wejść
            // jako usługa tymczasowa - inaczej formularz nie ma skąd wziąć jej nazwy.
            const catalogId = item.serviceId ?? `temp-${lineId}`;
            if (!item.serviceId) {
                prefill.tempServices[catalogId] = {
                    name: item.name,
                    basePriceNet: priceNet,
                    vatRate,
                };
            }
            prefill.serviceIds.push(lineId);
            prefill.serviceRefs[lineId] = catalogId;
            prefill.servicePrices[lineId] = item.priceGross / 100;
            prefill.serviceBasePrices[lineId] = priceNet;
            prefill.serviceVatRates[lineId] = vatRate;
            if (item.note) prefill.serviceNotes[lineId] = item.note;
        }
    });

    return prefill;
}

/**
 * Klient do formularza. Rozpoznany w kartotece wchodzi jako istniejący - rezerwacja
 * dopina się do jego historii zamiast zakładać duplikat. Nierozpoznany wchodzi jako
 * nowy i w trybie edycji: dane z maila to nasze przypuszczenie, więc niech człowiek
 * je potwierdzi, zamiast zakładać kartotekę na literówkę w stopce.
 */
function buildCustomer(params: {
    customerId: string | null;
    fullName: string | null;
    email: string | null;
    phone: string | null;
}): { customer: SelectedCustomer; customerEditing: boolean } {
    const { firstName, lastName } = splitName(params.fullName);
    const known = Boolean(params.customerId);
    return {
        customer: {
            id: params.customerId ?? undefined,
            firstName,
            lastName,
            phone: params.phone ?? '',
            email: params.email ?? '',
            isNew: !known,
        },
        customerEditing: !known,
    };
}

/** Auto z kartoteki, gdy pasuje do rozpoznanej marki i modelu; inaczej nowe. */
function buildVehicle(
    brand: string | null,
    model: string | null,
    knownVehicles: ContactCard['vehicles'] | undefined
): SelectedVehicle | undefined {
    if (!brand) {
        // Bez marki nie ma czego wpisać w formularz, ale jeśli klient ma w kartotece
        // dokładnie jedno auto, to prawie na pewno o nie chodzi.
        const only = knownVehicles?.length === 1 ? knownVehicles[0] : null;
        return only
            ? { id: only.id, brand: only.brand, model: only.model, year: only.year ?? undefined, isNew: false }
            : undefined;
    }

    const match = knownVehicles?.find(
        (vehicle) =>
            vehicle.brand.toLowerCase() === brand.toLowerCase() &&
            (!model || vehicle.model.toLowerCase() === model.toLowerCase())
    );
    if (match) {
        return { id: match.id, brand: match.brand, model: match.model, year: match.year ?? undefined, isNew: false };
    }
    return { brand, model: model ?? '', isNew: true };
}

/** Panel leada → wypełniony formularz rezerwacji. */
export function leadToBookingPrefill(lead: Lead, contactCard?: ContactCard | null): QuickEventInitialData {
    const { customer, customerEditing } = buildCustomer({
        customerId: lead.customerId ?? contactCard?.customer?.id ?? null,
        fullName: lead.customerName ?? contactCard?.customer?.fullName ?? null,
        email: lead.contactIdentifier,
        phone: contactCard?.customer?.phone ?? null,
    });

    return {
        customer,
        customerEditing,
        vehicle: buildVehicle(lead.vehicleBrand, lead.vehicleModel, contactCard?.vehicles),
        ...servicesToPrefill(lead.services),
    };
}

/** Podgląd konwersacji → wypełniony formularz rezerwacji (bez wyceny - tej jeszcze nie ma). */
export function contactToBookingPrefill(params: {
    email: string;
    participantName: string | null;
    contactCard?: ContactCard | null;
}): QuickEventInitialData {
    const { customer, customerEditing } = buildCustomer({
        customerId: params.contactCard?.customer?.id ?? null,
        fullName: params.contactCard?.customer?.fullName ?? params.participantName,
        email: params.email,
        phone: params.contactCard?.customer?.phone ?? null,
    });

    return {
        customer,
        customerEditing,
        vehicle: buildVehicle(null, null, params.contactCard?.vehicles),
    };
}
