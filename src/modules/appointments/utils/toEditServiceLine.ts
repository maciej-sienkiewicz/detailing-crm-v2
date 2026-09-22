// src/modules/appointments/utils/toEditServiceLine.ts
//
// Pozycja z GET /v1/appointments/{id} → pozycja tabeli usług w edycji rezerwacji.
//
// Poprzednie mapowanie (inline w AppointmentEditView) wypisywało pola ręcznie i gubiło
// dokładne brutto (`basePriceGross`, `finalPriceGross`). Każdy zapis - nawet samej
// zmiany daty - wysyłał wtedy pozycję bez brutta i serwer odtwarzał je z netta:
// usługa ustalona na 1900,00 zł wracała jako 1900,01 zł (CLAUDE.md §1). Brutto przez
// granicę API przenosi toCheckInServiceLine - wzorzec dla każdego mapowania odpowiedzi.

import { toCheckInServiceLine, type ReservationServiceResponse } from '@/modules/checkin/utils/toCheckInServiceLine';
import type { ServiceLineItem } from '@/modules/checkin/types';

export const toEditServiceLine = (
    service: ReservationServiceResponse & { requireManualPrice?: boolean | null },
): ServiceLineItem => ({
    ...toCheckInServiceLine(service),
    requireManualPrice: !!service.requireManualPrice,
});
