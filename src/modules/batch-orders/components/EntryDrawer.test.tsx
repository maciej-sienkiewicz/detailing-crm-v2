// src/modules/batch-orders/components/EntryDrawer.test.tsx
// @vitest-environment jsdom
//
// Edytor wpisu zbiorczego:
//  - kliknięcie w kwotę w tabeli otwiera edytor z kursorem w polu brutto,
//  - brutto wpisane przez człowieka dochodzi do serwera bez przeliczania (CLAUDE.md §1),
//  - rozliczonego wpisu nie da się zmienić bez świadomego odblokowania - dawniej
//    zapis po cichu zdejmował z niego rozliczenie i praca szła do kontrahenta drugi raz.

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
    deleteEntry: vi.fn(),
    reopenEntry: vi.fn(),
    listServices: vi.fn(async () => []),
    listEntryPhotos: vi.fn(async () => []),
    getSettlementHistory: vi.fn(async () => [{
        id: 'h-1', closedAt: '2026-09-12T15:00:00Z', periodFrom: '2026-09-01', periodTo: '2026-09-30',
        entryCount: 3, totalNetCents: 370000, totalGrossCents: 455100, mode: 'NEW_ONLY',
        financeEntryCreated: false, emailRequested: true, emailSent: true,
        emailRecipient: 'rozliczenia@wisniewski.pl', closedByUserName: 'Marta Kowalczyk',
    }]),
    searchVehicles: vi.fn(async () => []),
    searchVehiclesFromEntries: vi.fn(async () => []),
    downloadHistorySnapshot: vi.fn(),
}));

vi.mock('../api/batchOrderApi', () => ({ batchOrderApi: api }));

// Selektory marki/modelu ciągną katalog pojazdów z sieci - tu wystarczą zwykłe pola.
vi.mock('../../vehicles/components/BrandModelSelectors', () => ({
    BrandSelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) =>
        <input aria-label="Marka" value={value} onChange={e => onChange(e.target.value)} />,
    ModelSelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) =>
        <input aria-label="Model" value={value} onChange={e => onChange(e.target.value)} />,
}));

import { EntryDrawer } from './EntryDrawer';

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

function renderDrawer(props: Partial<React.ComponentProps<typeof EntryDrawer>> = {}) {
    const onClose = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <EntryDrawer contractorId="c-1" contractorName="Auto Salon Wiśniewski" entry={entry()} onClose={onClose} {...props} />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose };
}

const grossInputs = () => screen.getAllByPlaceholderText('0,00').filter((_, i) => i % 2 === 1) as HTMLInputElement[];

describe('EntryDrawer', () => {
    beforeEach(() => {
        // jsdom nie przewija - śledzimy tylko, NA CZYM przewinięcie zostało wywołane.
        Element.prototype.scrollIntoView = vi.fn();
        Object.values(api).forEach(fn => fn.mockClear());
        api.updateEntry.mockImplementation(async (_id: string, data: unknown) => data);
        api.createEntry.mockImplementation(async (_c: string, data: unknown) => data);
    });

    it('otwarty z kwoty ustawia kursor w polu brutto', () => {
        renderDrawer({ focus: 'price' });
        expect(grossInputs()[0]).toHaveFocus();
    });

    it('zapis bez zmian wysyła brutto 190000 gr - nie 190001', async () => {
        const { onClose } = renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));
        await waitFor(() => expect(api.updateEntry).toHaveBeenCalled());
        const [, payload] = api.updateEntry.mock.calls[0];
        expect(payload.services).toEqual([
            { name: 'Przygotowanie do sprzedaży', netAmountCents: 154472, grossAmountCents: 190000, vatRate: 23 },
        ]);
        await waitFor(() => expect(onClose).toHaveBeenCalled());
    });

    it('nowa cena brutto wpisana ręcznie dochodzi dokładnie', async () => {
        renderDrawer({ focus: 'price' });
        fireEvent.change(grossInputs()[0], { target: { value: '2100,00' } });
        expect(screen.getByText(/Razem brutto/).parentElement).toHaveTextContent('2100,00');
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));
        await waitFor(() => expect(api.updateEntry).toHaveBeenCalled());
        expect(api.updateEntry.mock.calls[0][1].services[0].grossAmountCents).toBe(210000);
    });

    it('pozycja z ceną bez nazwy zatrzymuje zapis zamiast zgubić kwotę', async () => {
        renderDrawer({ entry: null });
        fireEvent.change(grossInputs()[0], { target: { value: '615,00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj auto' }));
        expect(await screen.findByRole('alert')).toHaveTextContent(/nie ma nazwy usługi/);
        expect(api.createEntry).not.toHaveBeenCalled();
    });

    it('auto w zestawieniu jest zablokowane i mówi, do którego trafiło', async () => {
        renderDrawer({ entry: entry({ isClosed: true, closeHistoryId: 'h-1' }) });
        expect(grossInputs()[0]).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Zapisz zmiany' })).toBeNull();
        expect(await screen.findByText(/rozliczenia@wisniewski\.pl/)).toBeInTheDocument();
    });

    it('odblokowanie wymaga potwierdzenia i odblokowuje pola', async () => {
        api.reopenEntry.mockResolvedValue(entry({ isCorrection: true }));
        renderDrawer({ entry: entry({ isClosed: true, closeHistoryId: 'h-1' }) });
        fireEvent.click(screen.getByRole('button', { name: /Odblokuj do korekty/ }));
        expect(api.reopenEntry).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Odblokuj' }));
        await waitFor(() => expect(api.reopenEntry).toHaveBeenCalledWith('e-1'));
        await waitFor(() => expect(grossInputs()[0]).not.toBeDisabled());
        expect(screen.getByText('Korekta auta z wcześniejszego zestawienia')).toBeInTheDocument();
    });

    it('zamknięcie z niezapisanymi zmianami pyta, zanim je porzuci', () => {
        const { onClose } = renderDrawer();
        fireEvent.change(grossInputs()[0], { target: { value: '2000,00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByText('Porzucić zmiany?')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Porzuć zmiany' }));
        expect(onClose).toHaveBeenCalled();
    });

    it('błąd serwera pokazuje jego komunikat', async () => {
        api.updateEntry.mockRejectedValue({ response: { data: { message: 'Wpis jest rozliczony. Odblokuj go do korekty, zanim go zmienisz.' } } });
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Odblokuj go do korekty');
    });

    it('nowe auto: najpierw pojazd i data, potem usługi', () => {
        renderDrawer({ entry: null });
        const vehicle = screen.getByRole('heading', { name: 'Pojazd i data' });
        const services = screen.getByRole('heading', { name: 'Usługi i ceny' });
        expect(vehicle.compareDocumentPosition(services) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('edycja: usługi i ceny zostają na górze', () => {
        renderDrawer();
        const vehicle = screen.getByRole('heading', { name: 'Pojazd i data' });
        const services = screen.getByRole('heading', { name: 'Usługi i ceny' });
        expect(services.compareDocumentPosition(vehicle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('„Popraw auto" otwiera edytor na sekcji pojazdu', () => {
        renderDrawer({ focus: 'vehicle' });
        const section = screen.getByRole('heading', { name: 'Pojazd i data' }).closest('section');
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
        expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts[0]).toBe(section);
    });

    it('kliknięcie w nazwę auta w nagłówku przewija do sekcji pojazdu', () => {
        renderDrawer();
        fireEvent.click(screen.getByRole('button', { name: /Mercedes GLC/ }));
        const section = screen.getByRole('heading', { name: 'Pojazd i data' }).closest('section');
        const contexts = vi.mocked(Element.prototype.scrollIntoView).mock.contexts;
        expect(contexts[contexts.length - 1]).toBe(section);
    });
});
