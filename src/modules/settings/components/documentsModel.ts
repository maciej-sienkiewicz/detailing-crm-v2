// src/modules/settings/components/documentsModel.ts
//
// Logika sekcji „Dokumenty i podpisy" bez widoku.
//
// Etap wizyty w oknach „Dodaj dokument" i „Dodaj zgodę" ma jedno źródło nazw, bo
// oba okna wybierały etap inaczej (kafelki z ikonami i <select>) i inaczej go
// nazywały.

import type { SegmentedOption } from '@/common/components/ui';
import type { ProtocolRule, ProtocolStage } from '@/modules/protocols/types';

export const STAGE_OPTIONS: SegmentedOption<ProtocolStage>[] = [
    { value: 'CHECK_IN', label: 'Przy przyjęciu' },
    { value: 'CHECK_OUT', label: 'Przy wydaniu' },
];

export const STAGE_TITLE: Record<ProtocolStage, string> = {
    CHECK_IN: 'Przyjęcie pojazdu',
    CHECK_OUT: 'Wydanie pojazdu',
};

/** 1 dokument, 2 dokumenty, 5 dokumentów. */
export function documentsWord(n: number): string {
    if (n === 1) return 'dokument';
    const u = n % 10;
    const t = n % 100;
    return u >= 2 && u <= 4 && (t < 12 || t > 14) ? 'dokumenty' : 'dokumentów';
}

/** 1 zgoda, 2 zgody, 5 zgód. */
export function consentsWord(n: number): string {
    if (n === 1) return 'zgoda';
    const u = n % 10;
    const t = n % 100;
    return u >= 2 && u <= 4 && (t < 12 || t > 14) ? 'zgody' : 'zgód';
}

export const byDisplayOrder = <T extends { displayOrder: number }>(items: T[]): T[] =>
    // Kopia: sort() w miejscu przestawiał tablicę z cache react-query, którą czytają też inne widoki.
    [...items].sort((a, b) => a.displayOrder - b.displayOrder);

/**
 * Czy po usunięciu reguły szablon zostaje osierocony. Szablon współdzielą reguły
 * obu etapów i reguły usług - usuwamy go tylko wtedy, gdy nikt inny go nie używa.
 */
export function isTemplateOrphanedBy(rule: ProtocolRule, allRules: ProtocolRule[]): boolean {
    return !allRules.some(r => r.id !== rule.id && r.protocolTemplateId === rule.protocolTemplateId);
}
