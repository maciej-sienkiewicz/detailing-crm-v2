import { describe, expect, it } from 'vitest';
import { OPS_CARDS_BELOW, isOpsCardLayout, opsCards, opsTable } from './opsListLayout';

/**
 * Próg żyje w jednym miejscu, bo czyta go i CSS (zapytania kontenerowe), i kod
 * (klikalność odnośników w wierszu). Rozjechanie się tych dwóch daje kafelkę,
 * w której środku dalej siedzą osobne odnośniki - i odwrotnie.
 *
 * Zgłoszenie z produkcji: okno 1100 x 750 z rozwiniętym paskiem bocznym daje
 * liście ~790 px. Tabela ma się wtedy UTRZYMAĆ (mieści się), a nie zamienić
 * w kolumnę - i to jest dolna granica, której pilnuje pierwszy test.
 */
describe('próg układu listy operacji', () => {
    it('lista szeroka na ~790 px (okno 1100 px + pasek boczny) zostaje tabelą', () => {
        expect(isOpsCardLayout(790)).toBe(false);
    });

    it('lista węższa niż próg przechodzi na kafelki', () => {
        expect(isOpsCardLayout(OPS_CARDS_BELOW - 1)).toBe(true);
        expect(isOpsCardLayout(712)).toBe(true); // okno 1024 px + rozwinięty pasek boczny
        expect(isOpsCardLayout(390)).toBe(true); // telefon
    });

    it('dokładnie na progu jest jeszcze tabela', () => {
        expect(isOpsCardLayout(OPS_CARDS_BELOW)).toBe(false);
    });

    it('przed pierwszym pomiarem zakładamy tabelę, nie kafelki', () => {
        expect(isOpsCardLayout(null)).toBe(false);
    });

    it('próg mieści najwęższą tabelę: minima kolumn, odstępy i padding wiersza', () => {
        const columnMinimums = 200 + 112 + 112 + 104 + 96 + 44;
        const gaps = 5 * 12;
        const rowPadding = 2 * 20;
        expect(OPS_CARDS_BELOW).toBeGreaterThanOrEqual(columnMinimums + gaps + rowPadding);
    });

    it('oba zapytania kontenerowe stykają się bez szczeliny i bez zakładki', () => {
        expect(opsCards).toBe(`@container ops-list (max-width: ${OPS_CARDS_BELOW - 1}px)`);
        expect(opsTable).toBe(`@container ops-list (min-width: ${OPS_CARDS_BELOW}px)`);
    });
});
