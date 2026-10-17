// src/modules/comms/utils/leadFormat.ts
// Drobiazgi, o których tabela leadów i okno szczegółów muszą mówić jednym głosem.
import type { LeadSource, LeadStatus } from '../types';
import { formatClockTime } from '@/common/dateTime';

/** „Marka Model" albo null, gdy nie rozpoznano - jedno miejsce na tę składankę. */
export const formatVehicle = (
    lead: { vehicleBrand: string | null; vehicleModel: string | null }
): string | null =>
    lead.vehicleBrand
        ? `${lead.vehicleBrand}${lead.vehicleModel ? ` ${lead.vehicleModel}` : ''}`
        : null;

/**
 * Skąd przyszło zapytanie - nazwy kanałów takie, jakie widzi właściciel. Klucz
 * `Record<LeadSource, …>` pilnuje, żeby nowy kanał nie przeszedł bez nazwy: tak samo
 * nazywa je push o nowym leadzie (PushMessages.sourceLabel po stronie serwera).
 */
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
    PHONE: 'Telefon',
    EMAIL: 'E-mail',
    FORM: 'Formularz na stronie',
    INSTAGRAM: 'Instagram',
    MANUAL: 'Dodane ręcznie',
};

/** Etykieta kanału z analityki, gdzie serwer podaje źródło jako zwykły tekst. */
export const leadSourceLabel = (source: string): string =>
    LEAD_SOURCE_LABELS[source as LeadSource] ?? source;

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
    // Rezerwacja całodniowa zaczyna się o północy - bez „, 00:00" na końcu zdania.
    const time = formatClockTime(date);
    return time ? `${day} ${month}${year}, ${time}` : `${day} ${month}${year}`;
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
    lead: new Date(iso).getTime() > Date.now() ? 'Rezerwacja na' : 'Rezerwacja była na',
    moment: formatMoment(iso),
});
