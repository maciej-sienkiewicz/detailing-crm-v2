// src/modules/batch-orders/components/EntryFormModal.test.tsx
// @vitest-environment jsdom
//
// Dawne okno auta w zleceniu zbiorczym, przywrócone z nową logiką:
//  - brutto wpisane przez człowieka dochodzi do serwera bez przeliczania (CLAUDE.md §1),
//  - pozycja z ceną bez nazwy zatrzymuje zapis zamiast zgubić kwotę,
//  - niezapisane zmiany nie giną przy zamknięciu, błąd serwera mówi, co się stało,
//  - rozliczone auto otwiera się do odczytu; korekta powstaje dopiero przy zapisie zmian
//    (audyt z 23.10.2026: samo otwarcie i „Anuluj" zostawiały korektę na pełną kwotę).

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
    correctEntry: vi.fn(),
    listServices: vi.fn(async (): Promise<unknown[]> => []),
    searchVehicles: vi.fn(async () => []),
    searchVehiclesFromEntries: vi.fn(async () => []),
}));

vi.mock('../api/batchOrderApi', () => ({ batchOrderApi: api }));
// Zdjęcia mają własne zapytania i testy - tu liczy się tylko, że sekcja jest.
vi.mock('./BatchOrderPhotoSection', () => ({ BatchOrderPhotoSection: () => <div>Sekcja zdjęć</div> }));

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
        api.listServices.mockImplementation(async () => []);
        api.updateEntry.mockImplementation(async (_id: string, data: object) => ({ ...entry(), ...data }));
        api.createEntry.mockImplementation(async (_c: string, data: object) => ({ ...entry(), id: 'e-new', ...data }));
        api.correctEntry.mockImplementation(async (_id: string, data: object) => ({ ...entry(), ...data, isCorrection: true }));
    });

    describe('rozliczone auto', () => {
        const settled = () => entry({ isClosed: true, closeHistoryId: 'h-1' });

        it('otwiera się do odczytu, a „Zamknij" niczego nie zmienia na serwerze', () => {
            const { onClose } = renderModal({ initial: settled() });
            expect(screen.getByText('Rozliczone auto')).toBeInTheDocument();
            expect(grossInputs()[0]).toBeDisabled();
            expect(screen.queryByRole('button', { name: 'Zapisz' })).toBeNull();
            // Przycisk w stopce - krzyżyk w nagłówku ma tę samą etykietę dla czytnika ekranu.
            fireEvent.click(screen.getByText('Zamknij'));
            expect(onClose).toHaveBeenCalled();
            expect(api.correctEntry).not.toHaveBeenCalled();
            expect(api.updateEntry).not.toHaveBeenCalled();
        });

        it('„Popraw auto" odblokowuje pola, a zapis bez zmian nie tworzy korekty', async () => {
            renderModal({ initial: settled() });
            fireEvent.click(screen.getByRole('button', { name: 'Popraw auto' }));
            expect(grossInputs()[0]).not.toBeDisabled();
            await waitFor(() => expect(grossInputs()[0]).toHaveFocus());
            fireEvent.click(screen.getByRole('button', { name: 'Zapisz poprawkę' }));
            expect(await screen.findByText(/Nic się nie zmieniło/)).toBeInTheDocument();
            expect(api.correctEntry).not.toHaveBeenCalled();
        });

        it('poprawka z nową ceną idzie ścieżką korekty, z brutto co do grosza', async () => {
            const onSaved = vi.fn();
            const { onClose } = renderModal({ initial: settled(), onSaved });
            fireEvent.click(screen.getByRole('button', { name: 'Popraw auto' }));
            fireEvent.change(grossInputs()[0], { target: { value: '2000,00' } });
            fireEvent.click(screen.getByRole('button', { name: 'Zapisz poprawkę' }));
            await waitFor(() => expect(api.correctEntry).toHaveBeenCalled());
            expect(api.correctEntry.mock.calls[0][0]).toBe('e-1');
            expect(api.correctEntry.mock.calls[0][1].services[0].grossAmountCents).toBe(200000);
            expect(api.updateEntry).not.toHaveBeenCalled();
            await waitFor(() => expect(onClose).toHaveBeenCalled());
            expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ isCorrection: true }));
        });

        it('„Anuluj" po zmianach pyta i nie dotyka serwera', () => {
            const { onClose } = renderModal({ initial: settled() });
            fireEvent.click(screen.getByRole('button', { name: 'Popraw auto' }));
            fireEvent.change(grossInputs()[0], { target: { value: '2000,00' } });
            fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
            fireEvent.click(screen.getByRole('button', { name: 'Porzuć' }));
            expect(onClose).toHaveBeenCalled();
            expect(api.correctEntry).not.toHaveBeenCalled();
        });
    });

    it('nazwa kontrahenta stoi pod tytułem - przy kilku kartach wiadomo, do kogo trafi auto', () => {
        renderModal({ initial: null });
        expect(screen.getByText('Nowe auto')).toBeInTheDocument();
        expect(screen.getByText('Auto Salon Wiśniewski')).toBeInTheDocument();
    });

    it('suma auta stoi pod pozycjami, VAT jako różnica', () => {
        renderModal();
        expect(screen.getByText(/Razem brutto/).textContent).toMatch(/1900,00/);
        expect(screen.getByText(/^VAT\s.*zł/).textContent).toMatch(/355,28/);
    });

    it('Escape zamyka listę podpowiedzi, a nie całe okno', async () => {
        api.listServices.mockImplementation(async () => [
            { id: 's-1', name: 'Mycie detailingowe', netAmountCents: 50000, grossAmountCents: 61500, vatRate: 23, createdAt: '', updatedAt: '' },
        ]);
        const { onClose } = renderModal({ initial: null });
        fireEvent.focus(screen.getByPlaceholderText('Nazwa usługi 1'));
        expect(await screen.findByText('Mycie detailingowe')).toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByText('Mycie detailingowe')).toBeNull());
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.queryByText('Porzucić zmiany?')).toBeNull();
    });

    it('nowe auto zgłasza zapisane auto, żeby karta mogła pokazać jego okres', async () => {
        const onSaved = vi.fn();
        renderModal({ initial: null, onSaved });
        fireEvent.change(screen.getByPlaceholderText('Nazwa usługi 1'), { target: { value: 'Mycie' } });
        fireEvent.change(grossInputs()[0], { target: { value: '615,00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
        await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: 'e-new' })));
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

    // Komunikat dotyczył stanu sprzed poprawki, a zostawał na ekranie do następnego zapisu.
    it('poprawka pola gasi komunikat o błędzie', async () => {
        renderModal({ initial: null });
        fireEvent.change(grossInputs()[0], { target: { value: '615,00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));
        expect(await screen.findByText(/nie ma nazwy usługi/)).toBeInTheDocument();
        fireEvent.change(screen.getByPlaceholderText('Nazwa usługi 1'), { target: { value: 'Mycie' } });
        await waitFor(() => expect(screen.queryByText(/nie ma nazwy usługi/)).toBeNull());
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
