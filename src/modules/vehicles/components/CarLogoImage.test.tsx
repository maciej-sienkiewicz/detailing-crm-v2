// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const trim = vi.hoisted(() => ({ result: null as string | null }));
vi.mock('../services/logoTrim', () => ({
    trimmedLogoUrl: vi.fn(async () => trim.result),
    trimmedLogoUrlSync: vi.fn(() => undefined),
}));

import { CarLogoImage } from './CarLogoImage';

describe('CarLogoImage - logo marki bez pustego obrzeża', () => {
    afterEach(() => { trim.result = null; });

    it('pokazuje przyciętą wersję logo, gdy jest gotowa', async () => {
        trim.result = 'blob:trimmed-bmw';
        render(<CarLogoImage brand="BMW" />);
        await waitFor(() => expect(screen.getByAltText('BMW').getAttribute('src')).toBe('blob:trimmed-bmw'));
    });

    it('gdy przycięcie się nie uda, zostaje oryginał z CDN', async () => {
        render(<CarLogoImage brand="Audi" />);
        await waitFor(() => expect(screen.getByAltText('Audi').getAttribute('src')).toMatch(/logos\/thumb\/audi\.png$/));
    });
});
