// src/modules/appointments/utils/buildAppointmentPayload.ts
//
// Shared payload builder for appointment creation.
// Used by both the standard calendar flow (/v1/appointments)
// and the lead conversion flow (/v1/leads/{id}/appointment).

import { apiClient } from '@/core';
import { toInstant } from '@/common/dateTime';
import type { QuickEventFormData } from '@/modules/calendar/components/QuickEventModal';

export interface ServiceLineItemPayload {
  id: string;
  serviceId: string | null;
  serviceName: string;
  basePriceNet: number;
  vatRate: number;
  adjustment: { type: 'FIXED_GROSS' | 'SET_GROSS'; value: number };
  note: string;
}

export interface AppointmentPayload {
  customer:
    | { mode: 'NEW'; newData: { firstName: string; lastName: string; phone: string; email: string } }
    | { mode: 'UPDATE'; id: string; patch: { firstName: string; lastName: string; phone: string; email: string } }
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
}

export async function buildAppointmentPayload(data: QuickEventFormData): Promise<AppointmentPayload> {
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
      patch: {
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
  const servicesResponse = await apiClient.get('/v1/services');
  const allServices: Array<{ id: string; name: string; basePriceNet: number; vatRate: number }> =
    servicesResponse.data.services || [];

  const services: ServiceLineItemPayload[] = data.serviceIds.map((serviceId, index) => {
    let service = allServices.find(s => s.id === serviceId);
    let isTempService = false;

    if (!service) {
      const temp = data.tempServices?.[serviceId];
      if (temp) {
        isTempService = true;
        service = { id: serviceId, name: temp.name, basePriceNet: temp.basePriceNet, vatRate: temp.vatRate };
      }
    }

    if (!service) {
      throw new Error(`Nie znaleziono usługi (${serviceId}). Usuń ją z listy lub wprowadź ponownie.`);
    }

    const customPriceGross = data.servicePrices?.[serviceId];
    let adjustment: ServiceLineItemPayload['adjustment'];

    if (customPriceGross !== undefined) {
      const customPriceInCents = Math.round(customPriceGross * 100);
      const basePriceGross = service.vatRate <= 0
        ? service.basePriceNet
        : Math.round(service.basePriceNet * (1 + service.vatRate / 100));
      adjustment = customPriceInCents === basePriceGross
        ? { type: 'FIXED_GROSS', value: 0 }
        : { type: 'SET_GROSS', value: customPriceInCents };
    } else {
      adjustment = { type: 'FIXED_GROSS', value: 0 };
    }

    return {
      id: `${Date.now()}-${index}`,
      serviceId: isTempService ? null : service.id,
      serviceName: service.name,
      basePriceNet: service.basePriceNet,
      vatRate: service.vatRate,
      adjustment,
      note: data.serviceNotes?.[serviceId] || '',
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
  };
}
