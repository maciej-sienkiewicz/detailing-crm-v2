/**
 * Rezerwacja w historii pojazdu nie ma własnego widoku — prowadzi do kalendarza.
 * Kalendarz szuka dnia po atrybucie `data-date` FullCalendara, czyli po dacie
 * LOKALNEJ. `toISOString()` przeliczyłby ją na UTC i wizyta z 27. o 01:00
 * wskazywałaby na 26., czyli inny kafelek, a przy przełomie miesiąca — inny
 * ekran kalendarza.
 */
export const toCalendarDate = (iso: string): string => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';

    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};
