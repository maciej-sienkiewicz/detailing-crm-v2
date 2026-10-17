import { describe, expect, it } from 'vitest';
import { suggestionCategoryLabel } from './suggestions';

describe('suggestionCategoryLabel', () => {
    it('tłumaczy znane kategorie bez względu na wielkość liter', () => {
        expect(suggestionCategoryLabel('Automotive Service')).toBe('Usługi motoryzacyjne');
        expect(suggestionCategoryLabel('car wash')).toBe('Myjnia samochodowa');
    });

    it('nieznaną zostawia, pustą pomija', () => {
        expect(suggestionCategoryLabel('Motorsports Store')).toBe('Motorsports Store');
        expect(suggestionCategoryLabel('  ')).toBeNull();
        expect(suggestionCategoryLabel(null)).toBeNull();
    });
});
