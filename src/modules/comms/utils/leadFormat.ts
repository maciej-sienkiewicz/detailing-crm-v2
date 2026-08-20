// src/modules/comms/utils/leadFormat.ts
// Drobiazgi, o których tabela leadów i okno szczegółów muszą mówić jednym głosem.
import type { LeadStatus } from '../types';

/** „Marka Model" albo null, gdy nie rozpoznano — jedno miejsce na tę składankę. */
export const formatVehicle = (
    lead: { vehicleBrand: string | null; vehicleModel: string | null }
): string | null =>
    lead.vehicleBrand
        ? `${lead.vehicleBrand}${lead.vehicleModel ? ` ${lead.vehicleModel}` : ''}`
        : null;

/**
 * Statusy, po których rozmowa jest skończona. Plakietka „czyj ruch" na zamkniętym
 * leadzie tylko myli: nikt nie zalega z odpowiedzią w sprawie, która się zakończyła.
 */
export const CLOSED_STATUSES = new Set<LeadStatus>(['COMPLETED', 'LOST', 'NO_SHOW']);
