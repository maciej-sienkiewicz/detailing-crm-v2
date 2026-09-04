// src/modules/comms/utils/leadFormat.ts
// Drobiazgi, o których tabela leadów i okno szczegółów muszą mówić jednym głosem.
import type { LeadStatus } from '../types';

/** „Marka Model" albo null, gdy nie rozpoznano - jedno miejsce na tę składankę. */
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

const MONTHS_GENITIVE = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];

/**
 * Termin rezerwacji po ludzku: „17 sierpnia, 10:00".
 *
 * Rok pomijamy - nikt nie umawia detailingu na przyszły rok, a data z rokiem
 * czyta się jak numer dokumentu, nie jak termin. Pomijamy go jednak tylko wtedy,
 * gdy naprawdę jest zbędny: przy terminie z innego roku niż bieżący brak roku
 * nie skracałby zdania, tylko je fałszował.
 *
 * Nazwa miesiąca odmieniona ręcznie, bo `toLocaleDateString` daje mianownik
 * („17 sierpień"), którego nie da się wstawić w zdanie po polsku.
 */
const formatMoment = (iso: string): string => {
    const date = new Date(iso);
    const day = date.getDate();
    const month = MONTHS_GENITIVE[date.getMonth()];
    const year = date.getFullYear() === new Date().getFullYear() ? '' : ` ${date.getFullYear()}`;
    const time = date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${month}${year}, ${time}`;
};

/**
 * Zdanie o terminie rezerwacji, gotowe do wstawienia. Czas przeszły dla terminu,
 * który już minął: „została zaplanowana na wczoraj" brzmi jak niedokończona
 * sprawa, a to zwykle wizyta, która się po prostu odbyła.
 *
 * Arytmetyka czasu siedzi tutaj, poza ciałem komponentu - render zostaje czystym
 * mapowaniem danych na widok.
 */
export const describeAppointmentMoment = (iso: string): { lead: string; moment: string } => ({
    lead: new Date(iso).getTime() > Date.now() ? 'Rezerwacja została zaplanowana na' : 'Rezerwacja była zaplanowana na',
    moment: formatMoment(iso),
});
