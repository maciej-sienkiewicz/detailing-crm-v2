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

    return {
      id: `${Date.now()}-${index}`,
      serviceId: isTempService ? null : catalogId,
      serviceName: temp?.name ?? catalogId,
      basePriceNet: catalogBasePriceNet,
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
