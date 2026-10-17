import type { HomeTodo, HomeTodoTarget } from '../types';
import type { GeneratePostPrefill } from '../components/GeneratePostModal';

/** Cele przycisków, które ekran umie obsłużyć. Nieznany cel = brak przycisku, nie martwy przycisk. */
const KNOWN_TARGETS: ReadonlySet<string> = new Set<HomeTodoTarget>([
    'GENERATE_POST',
    'OPEN_URL',
    'OPEN_AREA',
    'OPEN_PROFILES',
    'CONNECT',
    'OPEN_LEADS',
    'OPEN_COMPETITION',
    'OPEN_GOOGLE',
    'OPEN_ADS',
]);

export const isActionableTarget = (target: string | null | undefined): boolean =>
    !!target && KNOWN_TARGETS.has(target);

/** Suma kliknięć przycisków kontaktu: zadzwoń, trasa, rezerwuj, e-mail, wiadomość. */
export const contactTapsTotal = (taps: Record<string, number> | null | undefined): number | null => {
    if (!taps) return null;
    const values = Object.values(taps);
    return values.length === 0 ? null : values.reduce((sum, v) => sum + (v ?? 0), 0);
};

/** „ostatni dziś", „ostatni wczoraj", „ostatni 5 dni temu", „jeszcze bez postów". */
export const lastPostLabel = (daysSinceLastPost: number | null | undefined): string => {
    if (daysSinceLastPost === null || daysSinceLastPost === undefined) return 'jeszcze bez postów';
    if (daysSinceLastPost <= 0) return 'ostatni dziś';
    if (daysSinceLastPost === 1) return 'ostatni wczoraj';
    return `ostatni ${daysSinceLastPost} dni temu`;
};

/**
 * Generator otwierany z „Do zrobienia" ma od razu temat. Bez niego przycisk „Generuj"
 * był nieaktywny, a właściciel, który kliknął „Przygotuj post: Volvo XC60", musiał
 * wpisać to samo jeszcze raz. Temat to część tytułu po dwukropku („Volvo XC60").
 *
 * Opis zadania („12 zdjęć z wizyty VIS-1") NIE idzie do kontekstu, gdy jest wizyta: model
 * dostaje z niej prawdziwe fakty (auto, wykonane usługi, zdjęcia), a liczba zdjęć w polu
 * „Dodatkowy kontekst" była dla niego tylko szumem.
 */
export const prefillFromTodo = (todo: Pick<HomeTodo, 'title' | 'detail' | 'visitId'>): GeneratePostPrefill => {
    const colon = todo.title.indexOf(':');
    const subject = colon >= 0 ? todo.title.slice(colon + 1).trim() : '';
    return {
        ...(subject ? { topic: `Realizacja: ${subject}` } : {}),
        ...(todo.detail && !todo.visitId ? { context: todo.detail } : {}),
        ...(todo.visitId ? { visitId: todo.visitId } : {}),
    };
};
