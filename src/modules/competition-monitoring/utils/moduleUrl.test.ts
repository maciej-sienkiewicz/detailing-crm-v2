import { describe, expect, it } from 'vitest';
import { resolveLegacyUrl } from './moduleUrl';

const resolve = (query: string) => resolveLegacyUrl(new URLSearchParams(query))?.toString() ?? null;

describe('resolveLegacyUrl', () => {
    it('stare zakładki prowadzą do nowych', () => {
        expect(resolve('view=tydzien')).toBe('view=overview');
        expect(resolve('view=tresci&period=12')).toBe('view=inspiration');
        expect(resolve('view=porownanie&period=52')).toBe('view=competition&period=365&show=profiles');
        expect(resolve('view=reklamy&year=2026')).toBe('view=competition&year=2026&show=ads');
    });

    it('adres z powiadomienia o okolicy jest już aktualny', () => {
        expect(resolve('view=competition&show=area')).toBeNull();
        expect(resolve('view=mine&connection=ok')).toBeNull();
        expect(resolve('')).toBeNull();
    });

    it('dawny podwidok porównania i okres w tygodniach', () => {
        expect(resolve('view=competition&show=porownanie')).toBe('view=competition&show=profiles');
        expect(resolve('view=competition&period=4')).toBe('view=competition');
    });
});
