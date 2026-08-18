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

/** Etykiety statusów leada (backendowy enum LeadStatus). */
export const STAGE_LABELS: Record<LeadStage, string> = {
    NEW: 'NOWE',
    IN_PROGRESS: 'W TOKU',
    CONFIRMED: 'UMÓWIONE',
    COMPLETED: 'ZREALIZOWANE',
    LOST: 'PRZEGRANE',
    NO_SHOW: 'NIE POJAWIŁ SIĘ',
};

/** Kolumny kanbanu — pełny cykl życia leada, żaden status nie ginie z widoku. */
export const BOARD_STAGES: LeadStage[] = [
    'NEW',
    'IN_PROGRESS',
    'CONFIRMED',
    'COMPLETED',
    'LOST',
    'NO_SHOW',
];

/** Kolejność etapów do wykrywania ruchu „wstecz" (ten pyta o powód). */
export const STAGE_ORDER: Record<LeadStage, number> = {
    NEW: 0,
    IN_PROGRESS: 1,
    CONFIRMED: 2,
    COMPLETED: 3,
    LOST: 4,
    NO_SHOW: 5,
};

/** Nagłówek karty: pojazd, bo detailer myśli autami; fallback na klienta lub kontakt. */
export const vehicleTitle = (card: {
    vehicleBrand?: string | null;
    vehicleModel?: string | null;
    customerName?: string | null;
    contactIdentifier: string;
}): string => {
    const vehicle = [card.vehicleBrand, card.vehicleModel].filter(Boolean).join(' ');
    return vehicle || card.customerName || card.contactIdentifier;
};
