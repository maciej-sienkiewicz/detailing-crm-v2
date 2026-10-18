import { describe, expect, it } from 'vitest';
import { resolveLegacyUrl } from '@/modules/competition-monitoring/utils/moduleUrl';
import { scopedShortcutsFor } from './shortcuts';

/**
 * Skróty 1-4 na Instagramie wskazywały dawne zakładki (tydzien, porownanie, tresci, reklamy).
 * Przekierowanie starych adresów przerzucało je w inne miejsca, więc cyfry nie szły po kolei
 * po pasku zakładek, a „Moje konta" nie miały skrótu.
 */
describe('skróty zakładek Instagrama', () => {
    const shortcuts = scopedShortcutsFor('/instagram');

    it('idą po kolei po zakładkach paska', () => {
        expect(shortcuts.map((s) => [s.key, s.param?.value])).toEqual([
            ['1', 'przeglad'],
            ['2', 'moj'],
            ['3', 'konkurencja'],
            ['4', 'inspiracje'],
        ]);
    });

    it('żaden nie prowadzi do adresu, który przekierowanie starych adresów zmienia', () => {
        shortcuts.forEach((s) => {
            expect(resolveLegacyUrl(new URLSearchParams({ widok: s.param!.value }))).toBeNull();
        });
    });

    it('wyjście z Konkurencji zdejmuje jej parametry, wejście ich nie rusza', () => {
        expect(shortcuts.find((s) => s.key === '1')?.drop).toEqual(['pokaz', 'okres', 'rok']);
        expect(shortcuts.find((s) => s.key === '3')?.drop).toBeUndefined();
    });
});
