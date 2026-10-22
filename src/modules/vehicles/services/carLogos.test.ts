// Logo tylko dla marek z mapy - dawniej marka spoza niej dostawała zgadywany adres, a te
// zgadnięcia (głównie motocykle) kończyły się 404 dwa razy: dla <img> i dla przycinania.
import { describe, expect, it } from 'vitest';
import { getCarLogoUrl } from './carLogos';

const slugOf = (brand: string) => getCarLogoUrl(brand)?.split('/').pop();

describe('getCarLogoUrl', () => {
    it('marka spoza zbioru logotypów nie wysyła żadnego zapytania', () => {
        expect(getCarLogoUrl('Aprilia')).toBeNull();
        expect(getCarLogoUrl('Romet')).toBeNull();
        expect(getCarLogoUrl('')).toBeNull();
        expect(getCarLogoUrl(null)).toBeNull();
    });

    it('zapis z katalogu marek (z łącznikiem, z ogonkami) trafia w ten sam plik', () => {
        expect(slugOf('Alfa-Romeo')).toBe('alfa-romeo.png');
        expect(slugOf('Škoda')).toBe('skoda.png');
        expect(slugOf('Mercedes-Benz')).toBe('mercedes-benz.png');
    });

    it('marki, które dawniej prowadziły na nieistniejący plik, wskazują istniejący', () => {
        expect(slugOf('Range Rover')).toBe('land-rover.png');
        expect(slugOf('Lynk & Co')).toBe('lynk-and-co.png');
        expect(slugOf('GAC')).toBe('gac-group.png');
        expect(getCarLogoUrl('Trabant')).toBeNull();
    });
});
