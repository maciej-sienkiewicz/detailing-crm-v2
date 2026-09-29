// src/modules/batch-orders/components/EntryFormModal.test.tsx
// @vitest-environment jsdom
//
// Dawne okno auta w zleceniu zbiorczym, przywrócone z nową logiką:
//  - brutto wpisane przez człowieka dochodzi do serwera bez przeliczania (CLAUDE.md §1),
//  - pozycja z ceną bez nazwy zatrzymuje zapis zamiast zgubić kwotę,
//  - niezapisane zmiany nie giną przy zamknięciu, błąd serwera mówi, co się stało,
//  - po odblokowaniu do korekty kursor stoi w cenie brutto.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import type { BatchOrderEntry } from '../types';

const api = vi.hoisted(() => ({
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    listServices: vi.fn(async () => []),
    searchVehicles: vi.fn(async () => []),
    searchVehiclesFromEntries: vi.fn(async () => []),
}));

vi.mock('../api/batchOrderApi', () => ({ batchOrderApi: api }));

// Selektory marki/modelu ciągną katalog pojazdów z sieci - tu wystarczą zwykłe pola.
vi.mock('../../vehicles/components/BrandModelSelectors', () => ({
    BrandSelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) =>
        <input aria-label="Marka" value={value} onChange={e => onChange(e.target.value)} />,
    ModelSelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) =>
        <input aria-label="Model" value={value} onChange={e => onChange(e.target.value)} />,
}));

import { EntryFormModal } from './EntryFormModal';

const entry = (patch: Partial<BatchOrderEntry> = {}): BatchOrderEntry => ({
    id: 'e-1',
    serviceDate: '2026-09-22',
    vehicleMake: 'Mercedes',
    vehicleModel: 'GLC',
    vehicleLicensePlate: 'WZ 1195M',
    vehicleVin: null,
    services: [{ name: 'Przygotowanie do sprzedaży', netAmountCents: 154472, grossAmountCents: 190000, vatRate: 23 }],
    netAmountCents: 154472,
    grossAmountCents: 190000,
    notes: null,
    isClosed: false,
    isCorrection: false,
    closeHistoryId: null,
    photoCount: 0,
    createdAt: '2026-09-22T10:00:00Z',
    updatedAt: '2026-09-22T10:00:00Z',
    ...patch,
});

function renderModal(props: Partial<React.ComponentProps<typeof EntryFormModal>> = {}) {
    const onClose = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <EntryFormModal contractorId="c-1" contractorName="Auto Salon Wiśniewski" initial={entry()} onClose={onClose} {...props} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose };
}

const grossInputs = () => screen.getAllByLabelText('Brutto (zł)') as HTMLInputElement[];

describe('EntryFormModal', () => {
    beforeEach(() => {
        Object.values(api).forEach(fn => fn.mockClear());
        api.updateEntry.mockImplementation(async (_id: string, data: unknown) => data);
        api.createEntry.mockImplementation(async (_c: string, data: unknown) => data);
    });

    it('po odblokowaniu do korekty kursor stoi w cenie brutto', async () => {
        renderModal({ focusPrice: true });
        await waitFor(() => expect(grossInputs()[0]).toHaveFocus());
    });

    it('zapis bez zmian wysyła brutto 190000 gr - nie 190001', async () => {
        const { onClose } = renderModal();
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
        await waitFor(() => expect(api.updateEntry).toHaveBeenCalled());
        const [, payload] = api.updateEntry.mock.calls[0];
        expect(payload.services).toEqual([
            { name: 'Przygotowanie do sprzedaży', netAmountCents: 154472, grossAmountCents: 190000, vatRate: 23 },
        ]);
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('nowa cena brutto wpisana ręcznie dochodzi dokładnie', async () => {
        renderModal();
        fireEvent.change(grossInputs()[0], { target: { value: '2100,00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
        await waitFor(() => expect(api.updateEntry).toHaveBeenCalled());
        expect(api.updateEntry.mock.calls[0][1].services[0].grossAmountCents).toBe(210000);
    });

    it('pozycja z ceną bez nazwy zatrzymuje zapis zamiast zgubić kwotę', async () => {
        renderModal({ initial: null });
        fireEvent.change(grossInputs()[0], { target: { value: '615,00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
        expect(await screen.findByText(/nie ma nazwy usługi/)).toBeInTheDocument();
        expect(api.createEntry).not.toHaveBeenCalled();
    });

    it('zamknięcie z niezapisanymi zmianami pyta, zanim je porzuci', () => {
        const { onClose } = renderModal();
        fireEvent.change(grossInputs()[0], { target: { value: '2000,00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByText('Porzucić zmiany?')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Porzuć' }));
        expect(onClose).toHaveBeenCalled();
    });

    it('zamknięcie bez zmian nie pyta', () => {
        const { onClose } = renderModal();
        fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
        expect(onClose).toHaveBeenCalled();
    });

    it('błąd serwera pokazuje jego komunikat', async () => {
        api.updateEntry.mockRejectedValue({ response: { data: { message: 'Wpis jest rozliczony. Odblokuj go do korekty, zanim go zmienisz.' } } });
        renderModal();
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
        expect(await screen.findByText(/Odblokuj go do korekty/)).toBeInTheDocument();
    });
});
