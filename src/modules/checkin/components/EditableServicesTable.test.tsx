// src/modules/checkin/components/EditableServicesTable.test.tsx
// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { EditableServicesTable } from './EditableServicesTable';
import type { ServiceLineItem } from '../types';
import type { Service } from '@/modules/services/types';

// ─── mocks ───────────────────────────────────────────────────────────────────

const mockInvalidateQueries = vi.fn();

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

vi.mock('@/modules/services/api/servicesApi', () => ({
    servicesApi: {
        getServices: vi.fn(),
    },
}));

vi.mock('@/modules/calendar/components/QuickServiceModal', () => ({
    QuickServiceModal: ({ isOpen, onClose, initialServiceName, onServiceCreate }: {
        isOpen: boolean;
        onClose: () => void;
        initialServiceName: string;
        onServiceCreate: (s: { id: string; name: string; basePriceNet: number; vatRate: number }) => void;
    }) =>
        isOpen ? (
            <div data-testid="quick-service-modal">
                <span data-testid="quick-service-initial-name">{initialServiceName}</span>
                <button onClick={() => onServiceCreate({ id: 'new-1', name: initialServiceName, basePriceNet: 5000, vatRate: 23 })}>
                    Utwórz
                </button>
                <button onClick={onClose}>Zamknij</button>
            </div>
        ) : null,
}));

vi.mock('@/common/hooks', () => ({
    useDebounce: (value: string) => value,
}));

// ─── helpers ─────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query';

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

const NORMAL_SERVICE: Service = {
    id: 'svc-1',
    name: 'Mycie zewnętrzne',
    basePriceNet: 10000,
    vatRate: 23,
    requireManualPrice: false,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    createdByFirstName: '',
    createdByLastName: '',
    updatedBy: '',
    replacesServiceId: null,
};

const CUSTOM_PRICE_SERVICE: Service = {
    id: 'svc-2',
    name: 'Usługa niestandardowa',
    basePriceNet: 0,
    vatRate: 23,
    requireManualPrice: true,
    isActive: true,
    createdAt: '',
    updatedAt: '',
    createdByFirstName: '',
    createdByLastName: '',
    updatedBy: '',
    replacesServiceId: null,
};

function makeServiceLineItem(overrides: Partial<ServiceLineItem> = {}): ServiceLineItem {
    return {
        id: 'line-1',
        serviceId: 'svc-1',
        serviceName: 'Mycie zewnętrzne',
        basePriceNet: 10000,
        vatRate: 23,
        adjustment: { type: 'PERCENT', value: 0 },
        note: '',
        requireManualPrice: false,
        ...overrides,
    };
}

function renderTable(services: ServiceLineItem[], onChange = vi.fn()) {
    return {
        onChange,
        ...render(
            <StyledThemeProvider theme={theme}>
                <EditableServicesTable services={services} onChange={onChange} />
            </StyledThemeProvider>
        ),
    };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('EditableServicesTable', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseQuery.mockReturnValue({ data: { services: [] }, isLoading: false });
    });

    // ── autocomplete: add-new option ─────────────────────────────────────────

    describe('autocomplete – opcja "dodaj nową usługę"', () => {
        it('pojawia się po wpisaniu tekstu gdy brak wyników', async () => {
            const user = userEvent.setup();
            renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(input, 'xyz');

            expect(await screen.findByText('Wprowadź nową usługę')).toBeInTheDocument();
        });

        it('pojawia się na dole listy gdy są wyniki', async () => {
            mockUseQuery.mockReturnValue({ data: { services: [NORMAL_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(input, 'Mycie');

            const addBtn = await screen.findByText('Wprowadź nową usługę');
            expect(addBtn).toBeInTheDocument();

            // wyniki są powyżej
            expect(screen.getByText('Mycie zewnętrzne')).toBeInTheDocument();
        });

        it('nie pojawia się gdy input jest pusty', async () => {
            const user = userEvent.setup();
            renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.click(input);

            expect(screen.queryByText('Wprowadź nową usługę')).not.toBeInTheDocument();
        });
    });

    // ── autocomplete: otwiera QuickServiceModal ───────────────────────────────

    describe('QuickServiceModal', () => {
        it('otwiera się po kliknięciu "Wprowadź nową usługę"', async () => {
            const user = userEvent.setup();
            renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(input, 'Nowa usługa');
            await user.click(await screen.findByText('Wprowadź nową usługę'));

            expect(screen.getByTestId('quick-service-modal')).toBeInTheDocument();
        });

        it('przekazuje wpisaną frazę jako initialServiceName', async () => {
            const user = userEvent.setup();
            renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(input, 'Polerowanie');
            await user.click(await screen.findByText('Wprowadź nową usługę'));

            expect(screen.getByTestId('quick-service-initial-name')).toHaveTextContent('Polerowanie');
        });

        it('dodaje usługę po zatwierdzeniu w modalu i wywołuje onChange', async () => {
            const user = userEvent.setup();
            const { onChange } = renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(input, 'Polerowanie');
            await user.click(await screen.findByText('Wprowadź nową usługę'));

            const modal = screen.getByTestId('quick-service-modal');
            await user.click(within(modal).getByText('Utwórz'));

            expect(onChange).toHaveBeenCalledOnce();
            const [newList] = onChange.mock.calls[0];
            expect(newList).toHaveLength(1);
            expect(newList[0].serviceName).toBe('Polerowanie');
            expect(newList[0].basePriceNet).toBe(5000);
        });
    });

    // ── dodawanie zwykłej usługi ──────────────────────────────────────────────

    describe('dodawanie usługi ze standardową ceną', () => {
        it('dodaje usługę do listy bez otwierania dodatkowego modalu', async () => {
            mockUseQuery.mockReturnValue({ data: { services: [NORMAL_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            const { onChange } = renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(input, 'Mycie');
            await user.click(await screen.findByText('Mycie zewnętrzne'));

            expect(onChange).toHaveBeenCalledOnce();
            const [newList] = onChange.mock.calls[0];
            expect(newList).toHaveLength(1);
            expect(newList[0].serviceId).toBe('svc-1');
            expect(newList[0].serviceName).toBe('Mycie zewnętrzne');
            expect(newList[0].basePriceNet).toBe(10000);
            expect(newList[0].requireManualPrice).toBe(false);

            // modal ceny niestandardowej nie pojawia się
            expect(screen.queryByText('Podaj cenę usługi')).not.toBeInTheDocument();
        });
    });

    // ── modal ceny NIESTANDARDOWEJ ────────────────────────────────────────────

    describe('usługa NIESTANDARDOWA – modal wpisania ceny', () => {
        it('otwiera modal zamiast od razu dodawać usługę', async () => {
            mockUseQuery.mockReturnValue({ data: { services: [CUSTOM_PRICE_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            const { onChange } = renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(input, 'niest');
            await user.click(await screen.findByText('Usługa niestandardowa'));

            expect(screen.getByText('Podaj cenę usługi')).toBeInTheDocument();
            expect(onChange).not.toHaveBeenCalled();
        });

        it('wyświetla nazwę wybranej usługi w modalu', async () => {
            mockUseQuery.mockReturnValue({ data: { services: [CUSTOM_PRICE_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(input, 'niest');
            await user.click(await screen.findByText('Usługa niestandardowa'));

            expect(screen.getByText('Usługa niestandardowa')).toBeInTheDocument();
        });

        it('pozwala wybrać tryb wpisywania ceny: brutto lub netto', async () => {
            mockUseQuery.mockReturnValue({ data: { services: [CUSTOM_PRICE_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(input, 'niest');
            await user.click(await screen.findByText('Usługa niestandardowa'));

            expect(screen.getByRole('button', { name: 'Brutto' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Netto' })).toBeInTheDocument();
        });

        it('dodaje usługę z basePriceNet=0 i adjustment SET_GROSS po wpisaniu ceny brutto', async () => {
            mockUseQuery.mockReturnValue({ data: { services: [CUSTOM_PRICE_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            const { onChange } = renderTable([]);

            const autocompleteInput = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(autocompleteInput, 'niest');
            await user.click(await screen.findByText('Usługa niestandardowa'));

            // domyślnie tryb Brutto — wpisujemy 123 PLN brutto
            const priceInput = screen.getByPlaceholderText('0.00');
            await user.type(priceInput, '123');

            await user.click(screen.getByRole('button', { name: 'Dodaj usługę' }));

            expect(onChange).toHaveBeenCalledOnce();
            const [newList] = onChange.mock.calls[0];
            expect(newList).toHaveLength(1);
            expect(newList[0].basePriceNet).toBe(0);
            expect(newList[0].adjustment.type).toBe('SET_GROSS');
            expect(newList[0].adjustment.value).toBe(12300);
            expect(newList[0].requireManualPrice).toBe(true);
        });

        it('dodaje usługę z basePriceNet=0 i adjustment SET_NET po wpisaniu ceny netto', async () => {
            mockUseQuery.mockReturnValue({ data: { services: [CUSTOM_PRICE_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            const { onChange } = renderTable([]);

            const autocompleteInput = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(autocompleteInput, 'niest');
            await user.click(await screen.findByText('Usługa niestandardowa'));

            await user.click(screen.getByRole('button', { name: 'Netto' }));

            const priceInput = screen.getByPlaceholderText('0.00');
            await user.type(priceInput, '100');

            await user.click(screen.getByRole('button', { name: 'Dodaj usługę' }));

            expect(onChange).toHaveBeenCalledOnce();
            const [newList] = onChange.mock.calls[0];
            expect(newList[0].basePriceNet).toBe(0);
            expect(newList[0].adjustment.type).toBe('SET_NET');
            expect(newList[0].adjustment.value).toBe(10000);
        });

        it('przycisk "Dodaj usługę" jest nieaktywny gdy pole ceny jest puste', async () => {
            mockUseQuery.mockReturnValue({ data: { services: [CUSTOM_PRICE_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(input, 'niest');
            await user.click(await screen.findByText('Usługa niestandardowa'));

            expect(screen.getByRole('button', { name: 'Dodaj usługę' })).toBeDisabled();
        });
    });

    // ── rabat dostępny dla NIESTANDARDOWA ────────────────────────────────────

    describe('rabat dla usługi NIESTANDARDOWA', () => {
        it('renderuje sekcję rabatu dla usługi z requireManualPrice=true', () => {
            const customService = makeServiceLineItem({
                id: 'line-custom',
                serviceId: 'svc-2',
                serviceName: 'Usługa niestandardowa',
                basePriceNet: 10000,
                requireManualPrice: true,
            });
            renderTable([customService]);

            expect(screen.getByText('Procent (%)')).toBeInTheDocument();
        });

        it('wyświetla cenę netto i brutto w kolumnie bazowej', () => {
            const customService = makeServiceLineItem({
                id: 'line-custom',
                serviceId: 'svc-2',
                serviceName: 'Usługa niestandardowa',
                basePriceNet: 10000,
                requireManualPrice: true,
            });
            const { container } = renderTable([customService]);

            const basePriceTd = container.querySelector('td[data-label="Cena bazowa"]');
            expect(basePriceTd).not.toBeNull();
            expect(basePriceTd!.textContent).toContain('100,00');
        });
    });
});
