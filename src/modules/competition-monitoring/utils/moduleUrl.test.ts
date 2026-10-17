import { describe, expect, it } from 'vitest';
import { resolveLegacyUrl } from './moduleUrl';

const resolve = (query: string) => resolveLegacyUrl(new URLSearchParams(query))?.toString() ?? null;

describe('resolveLegacyUrl', () => {
    it('stare zakładki prowadzą do nowych', () => {
        expect(resolve('widok=tydzien')).toBe('widok=przeglad');
        expect(resolve('widok=tresci&okres=12')).toBe('widok=inspiracje');
        expect(resolve('widok=porownanie&okres=52')).toBe('widok=konkurencja&okres=365&pokaz=profile');
        expect(resolve('widok=reklamy&rok=2026')).toBe('widok=konkurencja&rok=2026&pokaz=reklamy');
    });

    it('adres z powiadomienia o okolicy jest już aktualny', () => {
        expect(resolve('widok=konkurencja&pokaz=okolica')).toBeNull();
        expect(resolve('widok=moj&polaczenie=ok')).toBeNull();
        expect(resolve('')).toBeNull();
    });

    it('dawny podwidok porównania i okres w tygodniach', () => {
        expect(resolve('widok=konkurencja&pokaz=porownanie')).toBe('widok=konkurencja&pokaz=profile');
        expect(resolve('widok=konkurencja&okres=4')).toBe('widok=konkurencja');
    });
});
