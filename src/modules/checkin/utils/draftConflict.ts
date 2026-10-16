// src/modules/checkin/utils/draftConflict.ts
//
// HTTP 409 DRAFT_VISIT_ALREADY_EXISTS: to przyjęcie ma już szkic wizyty.
//
// Najczęściej to ten sam szkic, który kreator właśnie założył: odpowiedź zginęła po drodze
// (zerwane połączenie, 5xx po zapisie), sprzedawca kliknął „Utwórz wizytę" jeszcze raz,
// a serwer rozpoznał powtórkę po rezerwacji albo - przy walk-inie - po qrCheckinId.
// Zamiast drugiej wizyty dla tego samego auta wracamy do tamtej.

import { visitApi } from '@/modules/visits/api/visitApi';
import type { ResumableDraft } from '../components/ResumeCheckInModal';

/** Ciało 409 z backendu (pola opcjonalne: starszy backend wysyłał sam komunikat). */
export interface DraftConflict {
    visitId?: string;
    visitNumber?: string;
    createdAt?: string;
    createdByName?: string | null;
}

/** Ciało 409 DRAFT_VISIT_ALREADY_EXISTS albo null, gdy to inny błąd (także inny konflikt). */
export const draftConflictOf = (error: unknown): DraftConflict | null => {
    const response = (error as { response?: { status?: number; data?: unknown } } | null)?.response;
    if (response?.status !== 409) return null;
    const body = (response.data ?? {}) as DraftConflict & { code?: unknown };
    if (body.code !== 'DRAFT_VISIT_ALREADY_EXISTS') return null;
    return {
        visitId: typeof body.visitId === 'string' ? body.visitId : undefined,
        visitNumber: typeof body.visitNumber === 'string' ? body.visitNumber : undefined,
        createdAt: body.createdAt,
        createdByName: body.createdByName,
    };
};

/** Numer zastępczy, dopóki serwer nie podał prawdziwego (patrz CreateVisitFromReservationResponse). */
export const fallbackVisitNumber = (visitId: string): string => `VIS-${visitId.slice(0, 8)}`;

/**
 * Szkic do wznowienia albo null, gdy nie da się go wskazać.
 *
 * Najpierw serwer - zna prawdziwy numer, klienta i stan szkicu: przy rezerwacji po jej id,
 * przy walk-inie po `visitId` z 409 na liście nieukończonych przyjęć (osobnego odczytu
 * jednego szkicu API nie ma). Gdy odczyt się nie uda, a 409 wskazało szkic, wracamy do niego
 * z danymi z formularza: to ten sam klient, a okno dokumentów i tak czyta dokumenty z serwera.
 * Pusty wynik odczytu (szkic już nie trwa) to null - wznawianie nieistniejącej wizyty nic by
 * nie dało.
 */
export async function resolveConflictDraft(
    conflict: DraftConflict,
    reservationId: string | undefined,
    fromForm: Omit<ResumableDraft, 'visitId' | 'visitNumber'>,
): Promise<ResumableDraft | null> {
    try {
        if (reservationId) return await visitApi.getOpenDraftForAppointment(reservationId);
        if (!conflict.visitId) return null;
        const { drafts } = await visitApi.getOpenDrafts();
        return drafts.find(draft => draft.visitId === conflict.visitId) ?? null;
    } catch {
        if (!conflict.visitId) return null;
        return {
            ...fromForm,
            visitId: conflict.visitId,
            visitNumber: conflict.visitNumber ?? fallbackVisitNumber(conflict.visitId),
        };
    }
}
