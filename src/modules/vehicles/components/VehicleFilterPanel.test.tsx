// @vitest-environment jsdom
//
// Filtr rodzaju na liście pojazdów: „Wszystkie" to brak filtra (serwer dostaje oba
// rodzaje), wybrany rodzaj trafia do filtrów, a „Wyczyść" wraca do „Wszystkie" jak
// każde inne pole panelu.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { VehicleAdvancedFilters } from '../types';

vi.mock('@/core/permissions', () => ({
    usePermissions: () => ({ can: () => true }),
}));

vi.mock('@/modules/services/hooks/useServices', () => ({
    useServices: () => ({ services: [], isLoading: false }),
}));

// Selektory ciągną katalog z sieci - tu wystarczą zwykłe pola.
vi.mock('./BrandModelSelectors', () => ({
    BrandSelect: ({ value, onChange, kind }: { value?: string; onChange: (v: string) => void; kind?: string }) =>
        <input data-testid="brand" data-kind={kind} value={value ?? ''} onChange={e => onChange(e.target.value)} />,
    ModelSelect: ({ value, onChange }: { value?: string; onChange: (v: string) => void }) =>
        <input data-testid="model" value={value ?? ''} onChange={e => onChange(e.target.value)} />,
}));

import { VehicleFilterPanel } from './VehicleFilterPanel';

const renderPanel = (initialFilters: VehicleAdvancedFilters = {}) => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <VehicleFilterPanel isOpen initialFilters={initialFilters} onApply={onApply} onClose={onClose} />
        </ThemeProvider>,
    );
    return { onApply, onClose };
};

const option = (name: string) => screen.getByRole('button', { name });
const apply = () => fireEvent.click(screen.getByRole('button', { name: 'Zastosuj filtry' }));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('VehicleFilterPanel - rodzaj pojazdu', () => {
    it('bez filtra stoi na „Wszystkie" i nie wysyła rodzaju', () => {
        const { onApply } = renderPanel();
        expect(option('Wszystkie')).toHaveAttribute('aria-pressed', 'true');

        apply();
        expect(onApply.mock.calls[0][0].kind).toBeUndefined();
    });

    it('wybrany rodzaj trafia do filtrów', () => {
        const { onApply } = renderPanel();
        fireEvent.click(option('Motocykle'));
        apply();
        expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ kind: 'MOTORCYCLE' }));
    });

    it('otwiera się z rodzajem już zastosowanym', () => {
        renderPanel({ kind: 'CAR' });
        expect(option('Samochody')).toHaveAttribute('aria-pressed', 'true');
    });

    it('„Wyczyść" wraca do „Wszystkie"', () => {
        const { onApply } = renderPanel({ kind: 'MOTORCYCLE', brand: 'Honda' });
        fireEvent.click(screen.getByRole('button', { name: 'Wyczyść' }));
        expect(option('Wszystkie')).toHaveAttribute('aria-pressed', 'true');

        apply();
        expect(onApply.mock.calls[0][0]).toMatchObject({ kind: undefined, brand: undefined });
    });

    it('marka w filtrze szuka w obu katalogach, bez względu na wybrany rodzaj', () => {
        renderPanel({ kind: 'MOTORCYCLE' });
        expect((screen.getByTestId('brand') as HTMLInputElement).dataset.kind).toBe('ALL');
    });
});
