// @vitest-environment jsdom
//
// Okno zestawienia po audycie z 23.10.2026:
//  - gdy w okresie są rozliczone auta, dwa jawne sposoby z kwotami zamiast linku
//    „Dołącz je mimo to" (decyzja biznesu: oba są poprawne),
//  - wyłączona wiadomość z zestawieniem nie udaje wysyłki,
//  - błędny adres z karty nie zaznacza wysyłki i nie blokuje przycisku bez słowa,
//  - zdanie pod kwotą mówi, którędy PDF dotrze do kontrahenta.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { BatchContractor, BatchOrderEntry, EntryStatusFilter } from '../types';

const entry = (id: string, closed: boolean, grossCents: number): BatchOrderEntry => ({
    id, serviceDate: '2026-09-18', vehicleMake: 'Ford', vehicleModel: 'Transit', vehicleLicensePlate: `WX ${id}`,
    vehicleVin: null, services: [{ name: 'Mycie', netAmountCents: Math.round(grossCents / 1.23), grossAmountCents: grossCents, vatRate: 23 }],
    netAmountCents: Math.round(grossCents / 1.23), grossAmountCents: grossCents, notes: null, isClosed: closed,
    isCorrection: false, closeHistoryId: closed ? 'h1' : null, photoCount: 0, createdAt: '', updatedAt: '',
});

const open = entry('1', false, 61_500);
const settled = entry('2', true, 100_000);
const summary = (list: BatchOrderEntry[]) => ({
    entryCount: list.length,
    totalNetCents: list.reduce((s, e) => s + e.netAmountCents, 0),
    totalGrossCents: list.reduce((s, e) => s + e.grossAmountCents, 0),
});

const state = vi.hoisted(() => ({ templateEnabled: true as boolean | undefined, settledInPeriod: true }));
const settle = vi.fn();
const useContractorEntries = vi.fn((_id: string, _from: string, _to: string, status: EntryStatusFilter) => {
    const list = status === 'ALL' && state.settledInPeriod ? [open, settled] : [open];
    return {
        data: {
            entries: list,
            summary: summary(list),
            openSummary: summary([open]),
            settledSummary: summary(state.settledInPeriod ? [settled] : []),
            settledCount: state.settledInPeriod ? 1 : 0,
            lastSettledAt: state.settledInPeriod ? '2026-10-01T10:00:00Z' : null,
        },
        isLoading: false,
    };
});

vi.mock('../hooks/useBatchOrders', () => ({
    useContractorEntries: (...args: [string, string, string, EntryStatusFilter]) => useContractorEntries(...args),
    useSettle: () => ({ mutateAsync: settle, isPending: false }),
    useSettlementHistory: () => ({ data: [] }),
}));
vi.mock('@/modules/subscription', () => ({ useCapability: () => ({ enabled: true }) }));
vi.mock('@/modules/message-templates/hooks/useMessageDefaults', () => ({
    useMessageDefaults: () => ({
        sms: () => undefined,
        email: () => true,
        emailEnabled: () => state.templateEnabled,
    }),
}));
vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showSuccess: vi.fn(), showToast: vi.fn() }) }));

import { SettlementModal } from './SettlementModal';

const contractor = (email: string | null): BatchContractor => ({
    id: 'c1', name: 'Flota Test', taxId: null, address: null, contactPersonName: null, email, phone: null,
    notes: null, isActive: true, entryCount: 2, createdAt: '', updatedAt: '',
});

const renderModal = (email: string | null = 'biuro@flota-test.pl') => render(
    <MemoryRouter>
        <ThemeProvider theme={theme}>
            <SettlementModal contractor={contractor(email)} period={{ from: '2026-09-01', to: '2026-09-30' }} onClose={vi.fn()} />
        </ThemeProvider>
    </MemoryRouter>,
);

describe('SettlementModal', () => {
    beforeEach(() => {
        state.templateEnabled = true;
        state.settledInPeriod = true;
        settle.mockReset();
        settle.mockResolvedValue({ closedEntryCount: 2, totalNetCents: 0, totalGrossCents: 161_500, emailRequested: false, emailSent: false, historyId: 'h2' });
        useContractorEntries.mockClear();
    });
    afterEach(cleanup);

    it('rozliczone auta w okresie: dwa sposoby z kwotami, domyślnie tylko nowe', () => {
        renderModal();
        const onlyNew = screen.getByRole('radio', { name: /Tylko nowe auta/ });
        const full = screen.getByRole('radio', { name: /Pełne zestawienie za okres/ });
        expect(onlyNew).toBeChecked();
        expect(full).not.toBeChecked();
        expect(screen.getByText(/1 auto, 615,00/)).toBeInTheDocument();
        expect(screen.getByText(/2 auta, 1615,00/)).toBeInTheDocument();
        expect(screen.queryByText('Dołącz je mimo to')).toBeNull();
    });

    it('pełne zestawienie wysyła tryb ALL', async () => {
        renderModal();
        fireEvent.click(screen.getByRole('radio', { name: /Pełne zestawienie za okres/ }));
        expect(useContractorEntries).toHaveBeenLastCalledWith('c1', '2026-09-01', '2026-09-30', 'ALL');
        fireEvent.click(screen.getByRole('button', { name: /Utwórz zestawienie/ }));
        await waitFor(() => expect(settle).toHaveBeenCalledWith(expect.objectContaining({ mode: 'ALL' })));
    });

    it('bez rozliczonych aut nie ma wyboru sposobu', () => {
        state.settledInPeriod = false;
        renderModal();
        expect(screen.queryByRole('radio')).toBeNull();
    });

    it('wyłączona wiadomość: okno mówi, gdzie ją włączyć, i nie zaznacza wysyłki', async () => {
        state.templateEnabled = false;
        renderModal();
        expect(screen.getByText(/Wysyłka zestawień e-mailem jest wyłączona/)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Wiadomościach do klientów/ })).toHaveAttribute('href', '/settings?tab=templates');
        expect(screen.queryByRole('checkbox')).toBeNull();
        expect(screen.getByText(/PDF pobierzesz z historii zestawień/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Utwórz zestawienie/ }));
        await waitFor(() => expect(settle).toHaveBeenCalledWith(expect.objectContaining({ sendEmail: false })));
    });

    it('poprawny adres z karty: wysyłka zaznaczona i zdanie o e-mailu', () => {
        renderModal();
        expect(screen.getByRole('checkbox')).toBeChecked();
        expect(screen.getByText(/PDF wyślemy kontrahentowi e-mailem/)).toBeInTheDocument();
    });

    // „ksiegowosc@flota" z karty zaznaczał wysyłkę i blokował przycisk bez wyjaśnienia.
    it('błędny adres z karty nie zaznacza wysyłki, a po zaznaczeniu mówi, co zrobić', () => {
        renderModal('ksiegowosc@flota');
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();
        expect(screen.getByRole('button', { name: /Utwórz zestawienie/ })).toBeEnabled();
        fireEvent.click(checkbox);
        expect(screen.getByRole('alert')).toHaveTextContent('Popraw go albo odznacz wysyłkę');
        expect(screen.getByRole('button', { name: /Utwórz zestawienie/ })).toBeDisabled();
    });
});
