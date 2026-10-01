// @vitest-environment jsdom
//
// Wraca dawny wygląd karty kontrahenta (telefon i komputer), ale logika zostaje nowa:
// kliknięcie w auto otwiera edytor (dawniej nic się nie działo - od tego zaczęło się
// zgłoszenie), a rozliczonego auta nie zmienia się wprost - menu proponuje odblokowanie.
// Rozliczone auta są zawsze na liście, pod nierozliczonymi, z ikoną zamiast plakietki.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

// Serwer oddaje rozliczone auto PIERWSZE - lista ma je zepchnąć pod nierozliczone.
const entries = [entry('e2', true), entry('e1', false)];
const sum = { totalNetCents: 308_944, totalGrossCents: 380_000, entryCount: 2 };
const openSum = { totalNetCents: 154_472, totalGrossCents: 190_000, entryCount: 1 };

const entriesResult = () => ({
    data: { entries, settledCount: 1, summary: sum, openSummary: openSum, settledSummary: openSum, lastSettledAt: null },
    isLoading: false, isError: false,
});
const useContractorEntries = vi.fn<(...args: unknown[]) => ReturnType<typeof entriesResult>>(entriesResult);

vi.mock('../hooks/useBatchOrders', () => ({
    useContractorEntries: (...args: unknown[]) => useContractorEntries(...args),
    useDeleteEntry: () => ({ mutateAsync: vi.fn() }),
    useReopenEntry: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('./EntryFormModal', () => ({
    EntryFormModal: ({ initial: e }: { initial: BatchOrderEntry | null }) => <div role="dialog">Edytor: {e ? e.vehicleModel : 'nowe auto'}</div>,
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
        // Dwa przyciski o tej samej treści: w nagłówku karty i pod okresem (telefon).
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

    it('kliknięcie w rozliczone auto pyta o korektę zamiast otwierać edycję', () => {
        renderCard();
        fireEvent.click(screen.getByText('Kia Ceed'));
        expect(screen.getByText('Odblokować wpis do korekty?')).toBeInTheDocument();
        expect(screen.queryByText(/Edytor:/)).toBeNull();
    });

    it('rozliczone auta są zawsze na liście, pod nierozliczonymi', () => {
        renderCard();
        expect(useContractorEntries).toHaveBeenLastCalledWith('c1', expect.any(String), expect.any(String), 'ALL');
        expect(screen.queryByText('Pokaż rozliczone')).toBeNull();
        const rows = screen.getAllByRole('row').slice(1); // bez wiersza nagłówka
        expect(rows.map(r => within(r).queryByText(/Octavia|Ceed/)?.textContent)).toEqual(['Skoda Octavia', 'Kia Ceed']);
    });

    it('zamiast plakietki „Rozliczone" ikona, a jej dotknięcie wyjaśnia i nie otwiera wiersza', () => {
        renderCard();
        expect(screen.queryByText(/^Rozliczone$/i)).toBeNull();
        const icons = screen.getAllByRole('button', { name: 'Rozliczone - co to znaczy?' });
        expect(icons).toHaveLength(1); // tylko przy rozliczonym aucie

        fireEvent.click(icons[0]);
        expect(screen.getByRole('tooltip')).toHaveTextContent('jest już w zestawieniu');
        expect(screen.queryByText('Odblokować wpis do korekty?')).toBeNull();

        fireEvent.click(icons[0]);
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('dymek zamyka dotknięcie gdziekolwiek indziej', () => {
        renderCard();
        fireEvent.click(screen.getByRole('button', { name: 'Rozliczone - co to znaczy?' }));
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        fireEvent.pointerDown(document.body);
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('sumy mówią, ile czeka na rozliczenie, a nie ile jest na liście', () => {
        renderCard();
        expect(screen.getByText('Do rozliczenia')).toBeInTheDocument();
        expect(screen.getByText(/do rozliczenia, 1 wpis/)).toBeInTheDocument();
    });

    it('korekta: bursztynowa ikona z wyjaśnieniem zamiast plakietki', () => {
        const correction = { ...entry('e3', false), vehicleMake: 'BMW', vehicleModel: 'X5', isCorrection: true };
        useContractorEntries.mockReturnValueOnce({
            data: { entries: [...entries, correction], settledCount: 1, summary: sum, openSummary: openSum, settledSummary: openSum, lastSettledAt: null },
            isLoading: false, isError: false,
        });
        renderCard();
        expect(screen.queryByText(/^Korekta$/i)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Korekta - co to znaczy?' }));
        expect(screen.getByRole('tooltip')).toHaveTextContent('odblokowane do poprawki');
        expect(screen.queryByRole('dialog')).toBeNull(); // dotknięcie ikony nie otwiera edytora
    });
});
