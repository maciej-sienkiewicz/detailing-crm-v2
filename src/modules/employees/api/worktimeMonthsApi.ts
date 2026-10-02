// src/modules/employees/api/worktimeMonthsApi.ts
//
// Listy miesięczne: jeden przepływ na miesiąc - karty zbierane → karty zatwierdzane →
// lista obecności podpisana. Kontrakt: docs/api-worktime-months.md (nazwy pól 1:1).
//
// Dawniej ten sam miesiąc miał dwa niezależne „zatwierdzenia": kartę na karcie pracownika
// i listę obecności generowaną osobno z dowolnych kart. Lista mogła powstać z niezłożonych
// kart i nie wiedziała, gdy karta się zmieniła. Teraz lista powstaje z zatwierdzonych kart,
// a odblokowanie karty po podpisie unieważnia listę (stage NEEDS_RESIGN).

import { apiClient } from '@/core/apiClient';
import type { CardDay } from '@/modules/worktime/types';

const BASE = '/v1/worktime/team';

export type { CardDay };

export type CardStatus = 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'RETURNED' | 'APPROVED';

/**
 * COLLECTING    - są karty niezłożone i żadna nie czeka na decyzję
 * REVIEWING     - co najmniej jedna karta SUBMITTED
 * READY_TO_SIGN - wszystkie karty APPROVED, brak ważnej podpisanej listy
 * SIGNED        - istnieje podpisana lista, aktualna
 * NEEDS_RESIGN  - podpisana lista jest nieaktualna
 */
export type MonthStage = 'COLLECTING' | 'REVIEWING' | 'READY_TO_SIGN' | 'SIGNED' | 'NEEDS_RESIGN';

export interface MonthCardRow {
    userId: string;
    employeeId: string | null;
    name: string;
    status: CardStatus;
    totalMinutes: number;
    expectedMinutes: number;
    missingWorkingDays: number;
    /** Suma nadwyżek ponad 480 min/dzień. */
    overtimeMinutes: number;
    /** Dni robocze urlopu/L4 w miesiącu. */
    leaveWorkingDays: number;
    submittedAt: string | null;
    approvedAt: string | null;
    approvedByName: string | null;
    /** Tylko przy RETURNED. */
    returnNote: string | null;
    /** false np. dla własnej karty (zasada czterech oczu). */
    canDecide: boolean;
    /** Ostatnie przypomnienie w tym miesiącu. */
    remindedAt: string | null;
}

export interface MonthSheet {
    id: string;
    status: 'GENERATED' | 'APPROVED';
    /** true → stage NEEDS_RESIGN. */
    outdated: boolean;
    generatedAt: string;
    approvedAt: string | null;
    approvedByName: string | null;
    /** Osoby świadomie pominięte (niezatwierdzone karty) - drukowane w stopce PDF. */
    excludedNames: string[];
}

export interface MonthOverview {
    period: string;
    label: string;
    workingDays: number;
    stage: MonthStage;
    counts: { total: number; notSubmitted: number; submitted: number; returned: number; approved: number };
    /** Sortowane po nazwisku. */
    employees: MonthCardRow[];
    /** Najnowsza lista za ten miesiąc. */
    sheet: MonthSheet | null;
    /** Wcześniejsze (nieaktualne) listy, najnowsze pierwsze. */
    sheetHistory: MonthSheet[];
}

export interface CardDetail extends MonthCardRow {
    period: string;
    label: string;
    days: CardDay[];
    returnedAt: string | null;
    returnedByName: string | null;
}

export interface BulkResult {
    skipped: { userId: string; reason: string }[];
}

export interface PendingWorkTimeCount {
    submittedCards: number;
    sheetsToSign: number;
}

export const worktimeMonthsApi = {
    getMonth: async (period: string): Promise<MonthOverview> => {
        const response = await apiClient.get<MonthOverview>(`${BASE}/months/${period}`);
        return response.data;
    },

    getCard: async (period: string, userId: string): Promise<CardDetail> => {
        const response = await apiClient.get<CardDetail>(`${BASE}/months/${period}/cards/${userId}`);
        return response.data;
    },

    approveCard: async (userId: string, period: string): Promise<MonthCardRow> => {
        const response = await apiClient.post<MonthCardRow>(`${BASE}/${userId}/periods/${period}/approve`);
        return response.data;
    },

    /**
     * Z SUBMITTED - zwrot do poprawy, z APPROVED - odblokowanie (podpisana lista z tą
     * kartą staje się nieaktualna). Notatka jest wymagana w obu przypadkach.
     */
    returnCard: async (userId: string, period: string, note: string): Promise<MonthCardRow> => {
        const response = await apiClient.post<MonthCardRow>(`${BASE}/${userId}/periods/${period}/return`, { note });
        return response.data;
    },

    remind: async (period: string, userIds: string[]): Promise<BulkResult & { reminded: string[] }> => {
        const response = await apiClient.post<BulkResult & { reminded: string[] }>(
            `${BASE}/months/${period}/remind`,
            { userIds },
        );
        return response.data;
    },

    pendingCount: async (): Promise<PendingWorkTimeCount> => {
        const response = await apiClient.get<PendingWorkTimeCount>(`${BASE}/pending-count`);
        return response.data;
    },
};
