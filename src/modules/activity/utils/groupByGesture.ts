// src/modules/activity/utils/groupByGesture.ts

import type { ActivityItem } from '../types';

/**
 * Wiersz feedu: zdarzenie główne i kroki, które poszły razem z nim jednym kliknięciem.
 */
export interface ActivityEntry {
    item: ActivityItem;
    /** Od najstarszego - w kolejności, w jakiej się wydarzyły. Puste dla zwykłego wiersza. */
    steps: ActivityItem[];
    /** „Podpisanie protokołu, wystawienie dokumentu i wysłanie SMS" - podpis rozwinięcia. */
    stepsLabel: string | null;
    occurredAt: string;
}

/**
 * Akcje, które są sednem czynności, gdy razem z nimi zapisało się kilka innych.
 * „Wydaj pojazd" zapisuje wydanie, paragon, podpis i SMS - wierszem jest wydanie.
 */
const PRIMARY_ACTIONS = new Set([
    'VISIT_COMPLETED',
    'VISIT_CREATED',
    'SETTLEMENT_CORRECTED',
    'UPSELL_REQUESTED',
    'APPOINTMENT_CONVERTED',
    'LEAD_CONVERTED',
]);

const SEVERITY_WEIGHT: Record<string, number> = { LOW: 0, NORMAL: 1, HIGH: 2, CRITICAL: 3 };

const pickPrimary = (group: ActivityItem[]): ActivityItem =>
    group.find(item => PRIMARY_ACTIONS.has(item.action.code))
    ?? group.find(item => item.amount !== null)
    // Bez wyraźnego sedna: najpoważniejsze, a przy remisie najstarsze - to zwykle ono
    // uruchomiło resztę (lista jest od najnowszego, więc szukamy od końca).
    ?? [...group].reverse().reduce((best, item) =>
        (SEVERITY_WEIGHT[item.severity.code] ?? 0) > (SEVERITY_WEIGHT[best.severity.code] ?? 0) ? item : best);

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

/** „A", „A i B", „A, B i C" - polskie wyliczenie, bez kropki środkowej (CLAUDE.md §4). */
export const joinPolish = (parts: string[]): string => {
    if (parts.length <= 1) return parts[0] ?? '';
    return `${parts.slice(0, -1).join(', ')} i ${parts[parts.length - 1]}`;
};

/** Podpis z nazw akcji kroków - mówi, co jest w środku, zanim ktoś kliknie. */
export const stepsLabelOf = (steps: ActivityItem[]): string | null => {
    const labels = [...new Set(steps.map(step => step.action.label))];
    if (labels.length === 0) return null;
    const [first, ...rest] = labels;
    return joinPolish([first, ...rest.map(lowerFirst)]);
};

/**
 * Składa wpisy jednego gestu (ten sam `correlationId`) w jeden wiersz.
 *
 * Dziennik zapisuje każdy krok osobno, i dobrze - to rejestr. Aktywność to co innego:
 * jedno kliknięcie „Wydaj pojazd" dawało trzy, cztery wiersze o tym samym fakcie
 * i wyglądało jak powielone powiadomienie. Grupujemy tylko sąsiadów: feed jest od
 * najnowszego, a wpisy jednego żądania mają ten sam moment zapisu, więc leżą obok siebie.
 */
export const groupByGesture = (items: ActivityItem[]): ActivityEntry[] => {
    const entries: ActivityEntry[] = [];
    let index = 0;

    while (index < items.length) {
        const current = items[index];
        const group = [current];
        const correlationId = current.correlationId;

        if (correlationId) {
            while (index + group.length < items.length && items[index + group.length].correlationId === correlationId) {
                group.push(items[index + group.length]);
            }
        }

        if (group.length === 1) {
            entries.push({ item: current, steps: [], stepsLabel: null, occurredAt: current.occurredAt });
        } else {
            const primary = pickPrimary(group);
            const steps = group.filter(item => item !== primary).reverse();
            entries.push({ item: primary, steps, stepsLabel: stepsLabelOf(steps), occurredAt: group[0].occurredAt });
        }

        index += group.length;
    }

    return entries;
};
