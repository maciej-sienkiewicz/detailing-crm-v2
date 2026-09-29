// @vitest-environment jsdom
//
// Wraca dawny wygląd karty kontrahenta (telefon i komputer), ale logika zostaje nowa:
// kliknięcie w auto otwiera edytor (dawniej nic się nie działo - od tego zaczęło się
// zgłoszenie), a rozliczonego auta nie zmienia się wprost - menu proponuje odblokowanie.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ContractorEntriesSection } from './ContractorEntriesSection';
import type { BatchContractor, BatchOrderEntry } from '../types';

const entry = (id: string, closed: boolean): BatchOrderEntry => ({
    id, serviceDate: '2026-09-24', vehicleMake: closed ? 'Kia' : 'Skoda', vehicleModel: closed ? 'Ceed' : 'Octavia',
    vehicleLicensePlate: 'WX 1234A', vehicleVin: null,
    services: [{ name: 'Przygotowanie do sprzedaży', netAmountCents: 154_472, grossAmountCents: 190_000, vatRate: 23 }],
    netAmountCents: 154_472, grossAmountCents: 190_000, notes: null, isClosed: closed, isCorrection: false,
    closeHistoryId: closed ? 'h1' : null, photoCount: 0, createdAt: '2026-09-24T10:00:00Z', updatedAt: '2026-09-24T10:00:00Z',
});

const entries = [entry('e1', false), entry('e2', true)];
const sum = { totalNetCents: 308_944, totalGrossCents: 380_000, entryCount: 2 };

vi.mock('../hooks/useBatchOrders', () => ({
    useContractorEntries: () => ({
        data: { entries, settledCount: 1, summary: sum, openSummary: sum, settledSummary: sum, lastSettledAt: null },
        isLoading: false, isError: false,
    }),
    useDeleteEntry: () => ({ mutateAsync: vi.fn() }),
    useReopenEntry: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('./EntryDrawer', () => ({
    EntryDrawer: ({ entry: e }: { entry: BatchOrderEntry | null }) => <div role="dialog">Edytor: {e ? e.vehicleModel : 'nowe auto'}</div>,
}));
vi.mock('./SettlementModal', () => ({ SettlementModal: () => null }));
vi.mock('./SettlementHistoryModal', () => ({ SettlementHistoryModal: () => null }));
vi.mock('./BatchOrderPhotoSection', () => ({ BatchOrderPhotoSection: () => null }));
vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }));

const contractor: BatchContractor = {
    id: 'c1', name: 'AutoHandel Kowalski', taxId: null, address: null, contactPersonName: null, email: null,
    phone: null, notes: null, isActive: true, entryCount: 2, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
};

const renderCard = () => render(
    <ThemeProvider theme={theme}>
        <ContractorEntriesSection contractor={contractor} onEdit={vi.fn()} onDelete={vi.fn()} />
    </ThemeProvider>,
);

describe('ContractorEntriesSection - dawny wygląd, nowa logika', () => {
    afterEach(cleanup);

    it('kliknięcie w auto otwiera edytor', () => {
        renderCard();
        fireEvent.click(screen.getByText('Skoda Octavia'));
        expect(screen.getByRole('dialog')).toHaveTextContent('Edytor: Octavia');
    });

    it('„+ Dodaj wpis" otwiera edytor nowego auta', () => {
        renderCard();
        // Dwa przyciski o tej samej treści: w nagłówku (640-767 px) i pod okresem (telefon).
        fireEvent.click(screen.getAllByText('+ Dodaj wpis')[0]);
        expect(screen.getByRole('dialog')).toHaveTextContent('Edytor: nowe auto');
    });

    it('rozliczone auto: w menu odblokowanie zamiast edycji i usunięcia', () => {
        renderCard();
        fireEvent.click(screen.getByRole('button', { name: 'Opcje: Kia Ceed' }));
        expect(screen.getByText('Odblokuj do korekty')).toBeInTheDocument();
        expect(screen.queryByText('Edytuj wpis')).toBeNull();
        expect(screen.queryByText('Usuń wpis')).toBeNull();
    });

    it('otwarte auto: edycja i usunięcie w menu', () => {
        renderCard();
        fireEvent.click(screen.getByRole('button', { name: 'Opcje: Skoda Octavia' }));
        expect(screen.getByText('Edytuj wpis')).toBeInTheDocument();
        expect(screen.getByText('Usuń wpis')).toBeInTheDocument();
    });
});
