// src/modules/appointments/utils/buildAppointmentPayload.ts
//
// Shared payload builder for appointment creation.
// Used by both the standard calendar flow (/v1/appointments)
// and the lead conversion flow (/v1/leads/{id}/appointment).

import { toInstant } from '@/common/dateTime';
import type { QuickEventFormData, AdjustmentType } from '@/modules/calendar/components/QuickEventModal';

export interface ServiceLineItemPayload {
  id: string;
  serviceId: string | null;
  serviceName: string;
  basePriceNet: number;
  /**
   * Exact gross (cents) the user actually typed, when known. Net→gross re-derivation
   * rounds some values wrong (gross 1900.00 → net 1544.72 → re-derived 1900.01 at 23 %
   * VAT) - carrying the exact gross alongside net is what lets the backend skip that
   * round-trip for a temp/custom service (no serviceId, so no catalog row to read the
   * true gross back from). See CreateAppointmentRequest.ServiceLineItemRequest on the
   * backend, which already accepts this field; only this builder wasn't sending it.
   */
  basePriceGross?: number;
  vatRate: number;
  adjustment: { type: AdjustmentType; value: number };
  note: string;
}

export interface AppointmentPayload {
  customer:
    | { mode: 'NEW'; newData: { firstName: string; lastName: string; phone: string; email: string } }
    | { mode: 'UPDATE'; id: string; updateData: { firstName: string; lastName: string; phone: string; email: string } }
    | { mode: 'EXISTING'; id: string };
  vehicle:
    | { mode: 'NEW'; newData: { brand: string; model: string; year?: number } }
    | { mode: 'EXISTING'; id: string }
    | { mode: 'NONE' };
  services: ServiceLineItemPayload[];
  schedule: { isAllDay: boolean; startDateTime: string; endDateTime: string };
  appointmentTitle?: string;
  note?: string;
  appointmentColorId: string;
  sendConfirmationSms: boolean;
  sendReminderSms: boolean;
  sendVisitCard: boolean;
  doorToDoor?: { pickupCity: string; pickupStreet: string; deliveryCity: string; deliveryStreet: string; notes?: string };
}

export function buildAppointmentPayload(data: QuickEventFormData): AppointmentPayload {
  // ── Schedule ───────────────────────────────────────────────────────────────
  let endDateTimeText = data.endDateTime;
  if (!endDateTimeText.includes('T')) endDateTimeText = `${endDateTimeText}T23:59:59`;

  const startInstant = toInstant(
    data.isAllDay && !data.startDateTime.includes('T')
      ? `${data.startDateTime}T00:00:00`
      : data.startDateTime,
  );
  const endInstant = toInstant(endDateTimeText);

  // ── Customer ───────────────────────────────────────────────────────────────
  if (!data.customer) throw new Error('Klient jest wymagany');

  let customer: AppointmentPayload['customer'];
  if (data.customer.isNew) {
    customer = {
      mode: 'NEW',
      newData: {
        firstName: data.customer.firstName || '',
        lastName: data.customer.lastName || '',
        phone: data.customer.phone || '',
        email: data.customer.email || '',
      },
    };
  } else if (data.customer.hasUpdates) {
    if (!data.customer.id) throw new Error('ID klienta jest wymagane do aktualizacji danych');
    customer = {
      mode: 'UPDATE',
      id: data.customer.id,
      updateData: {
        firstName: data.customer.firstName || '',
        lastName: data.customer.lastName || '',
        phone: data.customer.phone || '',
        email: data.customer.email || '',
      },
    };
  } else {
    if (!data.customer.id) throw new Error('ID klienta jest wymagane dla istniejącego klienta');
    customer = { mode: 'EXISTING', id: data.customer.id };
  }

  // ── Vehicle ────────────────────────────────────────────────────────────────
  let vehicle: AppointmentPayload['vehicle'];
  if (data.vehicle) {
    if (data.vehicle.isNew) {
      vehicle = { mode: 'NEW', newData: { brand: data.vehicle.brand, model: data.vehicle.model, year: data.vehicle.year } };
    } else if (data.vehicle.id) {
      vehicle = { mode: 'EXISTING', id: data.vehicle.id };
    } else {
      vehicle = { mode: 'NONE' };
    }
  } else {
    vehicle = { mode: 'NONE' };
  }

  // ── Services ───────────────────────────────────────────────────────────────
  // `lineId` is the per-line-item instance id (the same catalog service can be
  // added more than once); `catalogId` is the underlying catalog/temp service id
  // used to resolve its name/price and to send as `serviceId` to the API.
  const services: ServiceLineItemPayload[] = data.serviceIds.map((lineId, index) => {
    const catalogId = data.serviceRefs?.[lineId] ?? lineId;
    const temp = data.tempServices?.[catalogId];
    const isTempService = !!temp;

    const catalogBasePriceNet = data.serviceBasePrices?.[lineId] ?? temp?.basePriceNet ?? 0;
    const catalogVatRate = temp?.vatRate ?? 23;
    const overriddenVatRate = data.serviceVatRates?.[lineId] ?? catalogVatRate;
    const adjustment: ServiceLineItemPayload['adjustment'] =
      data.serviceAdjustments?.[lineId] ?? { type: 'PERCENT', value: 0 };

    // `servicePrices` is the base gross the form actually shows the user, in PLN,
    // kept exact through every edit (see PriceInput / QuickServiceModal) - unlike
    // `basePriceNet`, which for a temp service is derived from it and already
    // carries whatever rounding that derivation introduced.
    const baseGrossPln = data.servicePrices?.[lineId];
    const basePriceGross = baseGrossPln != null && Number.isFinite(baseGrossPln)
      ? Math.round(baseGrossPln * 100)
      : undefined;

    return {
      id: `${Date.now()}-${index}`,
      serviceId: isTempService ? null : catalogId,
      serviceName: temp?.name ?? catalogId,
      basePriceNet: catalogBasePriceNet,
      basePriceGross,
      vatRate: overriddenVatRate,
      adjustment,
      note: data.serviceNotes?.[lineId] || '',
    };
  });

  return {
    customer,
    vehicle,
    services,
    schedule: { isAllDay: data.isAllDay, startDateTime: startInstant, endDateTime: endInstant },
    appointmentTitle: data.title || undefined,
    note: data.notes || undefined,
    appointmentColorId: data.colorId,
    sendConfirmationSms: data.sendConfirmationSms,
    sendReminderSms: data.sendReminderSms,
    sendVisitCard: data.sendVisitCard,
    doorToDoor: data.doorToDoor?.enabled ? {
      pickupCity: data.doorToDoor.pickupAddress?.city ?? '',
      pickupStreet: data.doorToDoor.pickupAddress?.street ?? '',
      deliveryCity: data.doorToDoor.deliveryAddress?.city ?? '',
      deliveryStreet: data.doorToDoor.deliveryAddress?.street ?? '',
      notes: data.doorToDoor.notes || undefined,
    } : undefined,
  };
}
