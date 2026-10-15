/*
 * Notatki rezerwacji przenoszone do przyjęcia pojazdu.
 *
 * Rezerwacja ma trzy pola: `note` (dawne, jedno na wszystko), `internalNote` (dla
 * zespołu) i `protocolNote` (trafia na protokół przyjęcia). Kreator przyjęcia brał
 * wyłącznie `note`, więc rezerwacja zapisana już nowym formularzem wchodziła do
 * check-inu z pustymi notatkami - a uwaga dla klienta znikała z protokołu.
 *
 * Kolejność jak w edycji rezerwacji (AppointmentEditView): notatka wewnętrzna wygrywa
 * z dawnym `note`, które zostaje tylko dla rezerwacji sprzed rozdzielenia pól.
 */
export interface ReservationNotesSource {
    note?: string | null;
    internalNote?: string | null;
    protocolNote?: string | null;
}

export const reservationTechnicalNotes = (
    reservation: ReservationNotesSource | null | undefined,
): { inspectionNotes: string; protocolNotes: string } => ({
    inspectionNotes: reservation?.internalNote || reservation?.note || '',
    protocolNotes: reservation?.protocolNote || '',
});
