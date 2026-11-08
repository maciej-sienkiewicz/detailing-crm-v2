// @vitest-environment jsdom
//
// Pojazd „Inny" (laweta, samolot, skuter wodny) nie ma katalogu marek i modeli, więc
// wspólne selektory zamieniają się w pola do wpisania. Jedno miejsce dla wszystkich
// formularzy - żaden nie zostaje z samym katalogiem, w którym Robinsona R44 nie ma.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';

const metadata = vi.hoisted(() => ({ useVehicleMetadata: vi.fn(() => ({ data: [], isLoading: false })) }));
vi.mock('../hooks/useVehicleMetadata', () => metadata);

import { BrandSelect, ModelSelect } from './BrandModelSelectors';

// jsdom nie ma matchMedia; katalog pyta o nią przez useBreakpoint (arkusz na telefonie).
window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
}));

const renderIn = (ui: React.ReactNode) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('BrandSelect / ModelSelect - pojazd „Inny"', () => {
    it('marka i model to pola do wpisania, bez pytania o katalog', () => {
        const onBrand = vi.fn();
        const onModel = vi.fn();
        renderIn(<>
            <BrandSelect kind="OTHER" value="" onChange={onBrand} />
            <ModelSelect kind="OTHER" brand="" value="" onChange={onModel} />
        </>);

        fireEvent.change(screen.getByRole('textbox', { name: 'Marka' }), { target: { value: 'Robinson' } });
        // Model da się wpisać bez marki - pole nie czeka na wybór z listy.
        fireEvent.change(screen.getByRole('textbox', { name: 'Model' }), { target: { value: 'R44' } });

        expect(onBrand).toHaveBeenCalledWith('Robinson');
        expect(onModel).toHaveBeenCalledWith('R44');
        expect(metadata.useVehicleMetadata).not.toHaveBeenCalled();
    });

    it('pokazuje zapisaną wartość i mówi, że trzeba ją wpisać', () => {
        renderIn(<BrandSelect kind="OTHER" value="Liebherr" onChange={vi.fn()} />);
        expect(screen.getByRole('textbox', { name: 'Marka' })).toHaveValue('Liebherr');

        cleanup();
        renderIn(<ModelSelect kind="OTHER" value="" onChange={vi.fn()} />);
        expect(screen.getByPlaceholderText('Wpisz model')).toBeInTheDocument();
    });

    it('samochód zostaje przy katalogu', () => {
        renderIn(<BrandSelect kind="CAR" value="" onChange={vi.fn()} />);
        expect(screen.queryByRole('textbox', { name: 'Marka' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Wybierz markę/ })).toBeInTheDocument();
        expect(metadata.useVehicleMetadata).toHaveBeenCalledWith('CAR');
    });
});
