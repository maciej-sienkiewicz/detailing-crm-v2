// @vitest-environment jsdom
//
// Wraca dawny wygląd karty kontrahenta (telefon i komputer), ale logika zostaje nowa:
// kliknięcie w auto otwiera edytor (dawniej nic się nie działo - od tego zaczęło się
// zgłoszenie), a rozliczone auto otwiera się do odczytu - odblokowanie do korekty jest
// dopiero w oknie, razem z zapisem zmian (audyt z 23.10.2026).
// Rozliczone auta są zawsze na liście, pod nierozliczonymi, z ikoną zamiast plakietki.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ContractorEntriesSection } from './ContractorEntriesSection';
import type { BatchContractor, BatchOrderEntry } from '../types';

const entry = (id: string, closed: boolean, patch: Partial<BatchOrderEntry> = {}): BatchOrderEntry => ({
    id, serviceDate: '2026-09-24', vehicleMake: closed ? 'Kia' : 'Skoda', vehicleModel: closed ? 'Ceed' : 'Octavia',
    vehicleLicensePlate: 'WX 1234A', vehicleVin: null,
    services: [{ name: 'Przygotowanie do sprzedaży', netAmountCents: 154_472, grossAmountCents: 190_000, vatRate: 23 }],
    netAmountCents: 154_472, grossAmountCents: 190_000, notes: null, isClosed: closed, isCorrection: false,
    closeHistoryId: closed ? 'h1' : null, photoCount: 0, createdAt: '2026-09-24T10:00:00Z', updatedAt: '2026-09-24T10:00:00Z',
    ...patch,
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
}));
vi.mock('./EntryFormModal', () => ({
    EntryFormModal: ({ initial: e, onSaved }: { initial: BatchOrderEntry | null; onSaved?: (saved: BatchOrderEntry) => void }) => (
        <div role="dialog">
            Edytor: {e ? e.vehicleModel : 'nowe auto'}
            <button type="button" onClick={() => onSaved?.({ ...(e ?? entries[1]), serviceDate: '2026-01-15' })}>zapisz ze styczniową datą</button>
        </div>
    ),
}));
vi.mock('./SettlementModal', () => ({ SettlementModal: () => null }));
vi.mock('./SettlementHistoryModal', () => ({ SettlementHistoryModal: () => null }));
vi.mock('./BatchOrderPhotoSection', () => ({ BatchOrderPhotoSection: () => null }));
const showInfo = vi.fn();
vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), showInfo }) }));

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

    it('„+ Dodaj auto" otwiera edytor nowego auta', () => {
        renderCard();
        // Dwa przyciski o tej samej treści: w nagłówku karty i pod okresem (telefon).
        fireEvent.click(screen.getAllByText('+ Dodaj auto')[0]);
        expect(screen.getByRole('dialog')).toHaveTextContent('Edytor: nowe auto');
    });

    it('rozliczone auto: w menu podgląd z poprawką zamiast edycji i usunięcia', () => {
        renderCard();
        fireEvent.click(screen.getByRole('button', { name: 'Opcje: Kia Ceed' }));
        expect(screen.getByText('Podgląd i poprawka')).toBeInTheDocument();
        expect(screen.queryByText('Odblokuj do korekty')).toBeNull();
        expect(screen.queryByText('Edytuj auto')).toBeNull();
        expect(screen.queryByText('Usuń auto')).toBeNull();
    });

    it('otwarte auto: edycja i usunięcie w menu', () => {
        renderCard();
        fireEvent.click(screen.getByRole('button', { name: 'Opcje: Skoda Octavia' }));
        expect(screen.getByText('Edytuj auto')).toBeInTheDocument();
        expect(screen.getByText('Usuń auto')).toBeInTheDocument();
    });

    // Dawniej klik od razu pytał o odblokowanie, a „Odblokuj" + „Anuluj" w edytorze
    // zostawiały korektę bez zmian - kontrahent dostawał to samo auto drugi raz.
    it('kliknięcie w rozliczone auto otwiera podgląd, bez pytania o odblokowanie', () => {
        renderCard();
        fireEvent.click(screen.getByText('Kia Ceed'));
        expect(screen.getByRole('dialog')).toHaveTextContent('Edytor: Ceed');
        expect(screen.queryByText('Odblokować auto do korekty?')).toBeNull();
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
        expect(screen.queryByText(/Edytor:/)).toBeNull();

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
        expect(screen.getByText(/do rozliczenia, 1 auto/)).toBeInTheDocument();
    });

    // Lista za 3800 zł ze stopką „do rozliczenia 0, 0,00 zł" wyglądała jak błąd.
    it('stopka mówi też, ile w okresie już rozliczono', () => {
        renderCard();
        expect(screen.getByText('Rozliczono')).toBeInTheDocument();
        expect(screen.getByText(/^1 auto, 1900,00/)).toBeInTheDocument();
    });

    it('liczba zdjęć przy aucie rozwija zdjęcia, nie otwierając edytora', () => {
        useContractorEntries.mockReturnValueOnce({
            data: { entries: [entry('e2', true), entry('e1', false, { photoCount: 3 })], settledCount: 1, summary: sum, openSummary: openSum, settledSummary: openSum, lastSettledAt: null },
            isLoading: false, isError: false,
        });
        renderCard();
        fireEvent.click(screen.getByRole('button', { name: 'Zdjęcia: 3' }));
        expect(screen.getByText('Zdjęcia: Skoda Octavia')).toBeInTheDocument();
        expect(screen.queryByText(/Edytor:/)).toBeNull();
    });

    // Auto z datą spoza okresu znikało z karty, choć komunikat mówił „czeka na zestawienie".
    it('auto zapisane z innego miesiąca przełącza kartę na ten miesiąc', () => {
        renderCard();
        fireEvent.click(screen.getAllByText('+ Dodaj auto')[0]);
        fireEvent.click(screen.getByText('zapisz ze styczniową datą'));
        expect(useContractorEntries).toHaveBeenLastCalledWith('c1', '2026-01-01', '2026-01-31', 'ALL');
        expect(showInfo).toHaveBeenCalledWith('Karta pokazuje teraz inny okres', expect.stringContaining('15.01.2026'));
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
