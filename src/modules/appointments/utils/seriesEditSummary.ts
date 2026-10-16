// src/modules/appointments/utils/seriesEditSummary.ts
//
// Teksty okna „Zapisz w serii". Wymaganie biznesu: edycja jednej rezerwacji z serii
// zmienia tylko ją, a nadpisanie innych rezerwacji musi być wybrane wprost i jasno
// opisane - ILE rezerwacji i CO w nich zostanie nadpisane. Logika jest tu, a nie
// w komponencie, żeby każde zdanie dało się sprawdzić testem.
//
// Serwer przy zakresie serii kopiuje z edytowanej rezerwacji ZAWSZE ten sam zestaw pól
// (UpdateRecurringAppointmentHandler: copyTextFieldsFromAnchor, copyLineItemsFromAnchor,
// copyDoorToDoorFromAnchor, kolor) - także te, których operator teraz nie ruszał. Okno
// mówi więc o całym zestawie, a osobno wskazuje, co zmieniono w tej rezerwacji. Klient
// i pojazd idą tylko przy podmianie (inny identyfikator), termin nie idzie nigdy.

import type { CheckInFormData } from '@/modules/checkin/types';
import type { SeriesEditScope, SeriesScopeImpact, SeriesUpdateSummary } from '../types';
import { pluralPl } from '@/common/utils/plural';

/** Pola nadpisywane w innych rezerwacjach przy każdym zapisie w serii. */
export const SERIES_OVERWRITTEN_FIELDS = ['tytuł', 'kolor', 'usługi z cenami', 'notatki', 'door-to-door'] as const;

export interface IdentitySwap {
    customer: boolean;
    vehicle: boolean;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Które z pól serii zmieniono w tej rezerwacji (do podpowiedzi „zmieniono tutaj"). */
export function changedSeriesFields(initial: CheckInFormData, current: CheckInFormData): string[] {
    const changed: string[] = [];
    if ((initial.title ?? '') !== (current.title ?? '')) changed.push('tytuł');
    if (initial.appointmentColorId !== current.appointmentColorId) changed.push('kolor');
    if (!same(initial.services, current.services)) changed.push('usługi z cenami');
    if (
        (initial.technicalState?.inspectionNotes ?? '') !== (current.technicalState?.inspectionNotes ?? '')
        || (initial.technicalState?.protocolNotes ?? '') !== (current.technicalState?.protocolNotes ?? '')
    ) changed.push('notatki');
    if (!same(initial.doorToDoor, current.doorToDoor)) changed.push('door-to-door');
    return changed;
}

/**
 * Podmiana klienta/pojazdu na INNY identyfikator (albo nowy rekord). Tylko taka zmiana
 * idzie do serii - poprawka danych tego samego klienta żyje w kartotece.
 */
export function detectIdentitySwap(initial: CheckInFormData, current: CheckInFormData): IdentitySwap {
    const customer = !!current.isNewCustomer || (current.customerData?.id ?? '') !== (initial.customerData?.id ?? '');
    const vehicle = !!current.isNewVehicle
        || (current.vehicleData?.id ?? null) !== (initial.vehicleData?.id ?? null);
    return { customer, vehicle };
}

/**
 * Poprawione dane TEGO SAMEGO klienta (literówka w imieniu, telefon, adres, firma).
 * Są wspólne dla wszystkich jego rezerwacji niezależnie od zakresu.
 */
export function customerRecordEdited(initial: CheckInFormData, current: CheckInFormData): boolean {
    if (detectIdentitySwap(initial, current).customer) return false;
    const a = initial.customerData;
    const b = current.customerData;
    return (a?.firstName ?? '') !== (b?.firstName ?? '')
        || (a?.lastName ?? '') !== (b?.lastName ?? '')
        || (a?.phone ?? '') !== (b?.phone ?? '')
        || (a?.email ?? '') !== (b?.email ?? '')
        || !same(initial.homeAddress, current.homeAddress)
        || !same(initial.company, current.company);
}

export const reservationsCount = (n: number) =>
    `${n} ${pluralPl(n, 'rezerwacja', 'rezerwacje', 'rezerwacji')}`;

/** „w 1 kolejnej rezerwacji", „w 7 kolejnych rezerwacjach". */
const inReservations = (n: number, scope: SeriesEditScope) => {
    const adj = scope === 'THIS_AND_FUTURE'
        ? (n === 1 ? 'kolejnej' : 'kolejnych')
        : (n === 1 ? 'pozostałej' : 'pozostałych');
    return `w ${n} ${adj} ${n === 1 ? 'rezerwacji' : 'rezerwacjach'}`;
};

const joinPl = (items: string[]) =>
    items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} i ${items[items.length - 1]}`;

/** Zdanie główne okna: CO i GDZIE zostanie nadpisane. */
export function seriesOverwriteSentence(scope: SeriesEditScope, otherCount: number, swap: IdentitySwap): string {
    if (otherCount === 0) return 'W tym zakresie nie ma innych rezerwacji do zmiany.';
    const fields: string[] = [...SERIES_OVERWRITTEN_FIELDS];
    if (swap.customer) fields.push('klienta');
    if (swap.vehicle) fields.push('pojazd');
    return `Nadpiszesz ${joinPl(fields)} ${inReservations(otherCount, scope)} tej serii wartościami z tej rezerwacji.`;
}

/** Co zostanie bez zmian mimo wybranego zakresu - albo null, gdy nic. */
export function seriesSkippedSentence(impact: Pick<SeriesScopeImpact, 'skippedDetachedCount' | 'skippedConvertedCount'>): string | null {
    const parts: string[] = [];
    if (impact.skippedDetachedCount > 0) {
        parts.push(`${reservationsCount(impact.skippedDetachedCount)} ${impact.skippedDetachedCount === 1 ? 'zmieniana' : 'zmieniane'} wcześniej osobno`);
    }
    if (impact.skippedConvertedCount > 0) {
        parts.push(`${reservationsCount(impact.skippedConvertedCount)} ${impact.skippedConvertedCount === 1 ? 'przyjęta' : 'przyjęte'} już jako wizyta`);
    }
    return parts.length ? `Bez zmian zostaną: ${parts.join(', ')}.` : null;
}

export function seriesConfirmLabel(otherCount: number): string {
    return `Nadpisz ${reservationsCount(otherCount)}`;
}

/** Toast po zapisie w serii: tytuł mówi co się stało, treść - co pominięto. */
export function seriesResultToast(summary: SeriesUpdateSummary | null | undefined): { title: string; message?: string } {
    if (!summary) return { title: 'Zapisano zmiany w serii' };
    const others = Math.max(0, summary.updatedCount - 1);
    const title = others > 0
        ? `Zapisano tę rezerwację i ${reservationsCount(others)} z serii`
        : 'Zapisano tę rezerwację';
    const skipped = seriesSkippedSentence(summary);
    return skipped ? { title, message: skipped } : { title };
}
