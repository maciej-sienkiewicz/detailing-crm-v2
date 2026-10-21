// @vitest-environment jsdom
//
// Lista wizyt i rezerwacji pyta serwer raz: licznik, stronicowanie i wiersze tabeli
// pochodzą z tego samego zapytania. Dawniej tabela miała własne zapytanie bez filtrów
// zaawansowanych (daty, kwoty, marka, usługi), więc po ich ustawieniu licznik pokazywał
// wynik filtra, a tabela - wiersze niefiltrowane.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { Operation, OperationFilters } from '../types';
import { OperationListView } from './OperationListView';

const ALL = [{ id: 'all' }] as unknown as Operation[];
const FILTERED = [{ id: 'filtered' }] as unknown as Operation[];

const useOperations = vi.hoisted(() => vi.fn());
const tableProps = vi.hoisted(() => ({ last: null as null | { operations: Operation[] } }));

vi.mock('../hooks/useOperations', () => ({ useOperations }));

vi.mock('../components/OperationalDataTable', () => ({
    OperationalDataTable: (props: { operations: Operation[] }) => {
        tableProps.last = props;
        return null;
    },
}));

vi.mock('../components/OperationFilterPanel', () => ({
    OperationFilterPanel: ({ onApply }: { onApply: (filters: object) => void }) => (
        <button type="button" onClick={() => onApply({ minAmount: 10000 })}>Zastosuj filtry</button>
    ),
}));

vi.mock('../components/OperationFilterBar', () => ({ OperationFilterBar: () => null }));
vi.mock('../components/OperationPagination', () => ({ OperationPagination: () => null }));
vi.mock('@/modules/checkin', () => ({ UnfinishedCheckInsPanel: () => null }));
vi.mock('@/core/permissions', () => ({ usePersonalDataActions: () => ({ canCreateVisit: false }) }));
vi.mock('@/common/hooks', () => ({ useBreakpoint: () => true, useDebounce: <T,>(value: T) => value }));

const renderView = () => render(
    <MemoryRouter initialEntries={['/operations']}>
        <ThemeProvider theme={theme}>
            <OperationListView />
        </ThemeProvider>
    </MemoryRouter>,
);

afterEach(() => {
    cleanup();
    useOperations.mockReset();
    tableProps.last = null;
});

describe('OperationListView', () => {
    it('pokazuje w tabeli wiersze z zapytania z filtrami zaawansowanymi', async () => {
        useOperations.mockImplementation((filters: OperationFilters) => ({
            operations: filters.minAmount ? FILTERED : ALL,
            pagination: { currentPage: 1, totalPages: 1, totalItems: 1, itemsPerPage: 20 },
            isLoading: false,
        }));

        renderView();
        expect(tableProps.last?.operations).toBe(ALL);

        await userEvent.click(screen.getByRole('button', { name: 'Zastosuj filtry' }));

        const lastFilters = useOperations.mock.calls.at(-1)?.[0] as OperationFilters;
        expect(lastFilters.minAmount).toBe(10000);
        expect(tableProps.last?.operations).toBe(FILTERED);
    });

    it('wywołuje useOperations raz na render, z tymi samymi filtrami co licznik', () => {
        useOperations.mockReturnValue({ operations: ALL, pagination: undefined, isLoading: true });

        renderView();

        const keys = new Set(useOperations.mock.calls.map(([filters]) => JSON.stringify(filters)));
        expect(keys.size).toBe(1);
    });
});
