import { describe, expect, it } from 'vitest';
import { buildProfileColors, colorFor, PROFILE_PALETTE, SELF_COLOR } from './profileColors';

describe('buildProfileColors', () => {
    it('ten sam profil ma ten sam kolor bez względu na kolejność wierszy', () => {
        const a = buildProfileColors([{ username: 'carspa_poznan' }, { username: 'ppf_wielkopolska' }, { username: 'myjnia' }]);
        const b = buildProfileColors([{ username: 'myjnia' }, { username: 'ppf_wielkopolska' }, { username: 'carspa_poznan' }]);
        expect(colorFor(a, 'carspa_poznan')).toBe(colorFor(b, 'carspa_poznan'));
        expect(colorFor(a, '@CarSpa_Poznan')).toBe(colorFor(b, 'carspa_poznan'));
    });

    it('własne studio ma kolor marki', () => {
        const colors = buildProfileColors([{ username: 'moje_studio', isSelf: true }, { username: 'inny' }]);
        expect(colorFor(colors, 'moje_studio')).toBe(SELF_COLOR);
        expect(colorFor(colors, 'inny')).not.toBe(SELF_COLOR);
    });

    it('dopóki starcza palety, dwa profile nie dzielą koloru', () => {
        const names = Array.from({ length: PROFILE_PALETTE.length }, (_, i) => `studio_${i}`);
        const colors = buildProfileColors(names.map(username => ({ username })));
        expect(new Set(names.map(n => colorFor(colors, n))).size).toBe(PROFILE_PALETTE.length);
    });

    it('dodanie profilu zwykle nie przestawia kolorów pozostałych', () => {
        const before = buildProfileColors([{ username: 'alfa' }, { username: 'beta' }]);
        const after = buildProfileColors([{ username: 'alfa' }, { username: 'beta' }, { username: 'zeta_detailing' }]);
        // alfa i beta są pierwsze alfabetycznie, więc zachowują wybrane miejsca.
        expect(colorFor(after, 'alfa')).toBe(colorFor(before, 'alfa'));
        expect(colorFor(after, 'beta')).toBe(colorFor(before, 'beta'));
    });
});
