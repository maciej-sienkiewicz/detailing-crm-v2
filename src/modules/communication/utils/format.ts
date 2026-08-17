// src/modules/communication/utils/format.ts
import type { LeadStage } from '../types';

/** Formatuje kwotę w groszach jako złote, np. 420000 → "4 200 zł". */
export const formatPln = (grosze: number): string => {
    const zl = grosze / 100;
    const hasFraction = grosze % 100 !== 0;
    const formatted = new Intl.NumberFormat('pl-PL', {
        minimumFractionDigits: hasFraction ? 2 : 0,
        maximumFractionDigits: hasFraction ? 2 : 0,
    }).format(zl);
    return `${formatted} zł`;
};

/** Krótki wiek: "12 min", "3 godz.", "2 dn.". */
export const formatAge = (iso: string): string => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60_000));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} godz.`;
    const days = Math.floor(hours / 24);
    return `${days} dn.`;
};

/** "wysłano 3 dni temu" — dla wiersza wyceny na karcie. */
export const formatSentAgo = (iso: string): string => {
    const diffMs = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diffMs / 86_400_000);
    if (days <= 0) return 'wysłano dziś';
    if (days === 1) return 'wysłano wczoraj';
    return `wysłano ${days} dni temu`;
};

/** "12 sie" — separator daty w wątku. */
export const formatDayLabel = (iso: string): string =>
    new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });

/** "12 sie 14:30" */
export const formatDateTime = (iso: string): string =>
    `${formatDayLabel(iso)} ${new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`;

/** Klucz dnia do grupowania separatorów dat. */
export const dayKey = (iso: string): string => new Date(iso).toDateString();

export const STAGE_LABELS: Record<LeadStage, string> = {
    NEW: 'NOWE',
    QUOTED: 'WYCENIONE',
    TO_CONFIRM: 'DO POTWIERDZENIA',
    SCHEDULED: 'UMÓWIONE',
    WON: 'WYGRANE',
    LOST: 'PRZEGRANE',
};

/** Kolumny kanbanu — WYGRANE nie ma kolumny, wygrane znikają z tablicy. */
export const BOARD_STAGES: LeadStage[] = ['NEW', 'QUOTED', 'TO_CONFIRM', 'SCHEDULED', 'LOST'];

/** Kolejność etapów do wykrywania ruchu "wstecz". */
export const STAGE_ORDER: Record<LeadStage, number> = {
    NEW: 0,
    QUOTED: 1,
    TO_CONFIRM: 2,
    SCHEDULED: 3,
    WON: 4,
    LOST: 5,
};

/** Nagłówek karty: "BMW X5 · 2021" albo fallback na e-mail. */
export const vehicleTitle = (card: {
    vehicleBrand?: string | null;
    vehicleModel?: string | null;
    vehicleYear?: number | null;
    contactEmail: string;
}): string => {
    const name = [card.vehicleBrand, card.vehicleModel].filter(Boolean).join(' ');
    if (!name) return card.contactEmail;
    return card.vehicleYear ? `${name} · ${card.vehicleYear}` : name;
};
