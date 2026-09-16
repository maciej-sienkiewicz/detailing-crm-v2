// src/modules/checkin/components/EditableServicesTable.test.tsx
// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { SidebarProvider } from '@/widgets/Sidebar/context/SidebarContext';
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
    useVisualViewportSheet: () => {},
}));

/**
 * O tym, czy obok tabeli staje cennik, decyduje zmierzona szerokość komponentu.
 * jsdom nie liczy layoutu i nie ma ResizeObservera, więc podstawiamy taki, który
 * zgłasza szerokość ustawioną przez test - inaczej nie da się sprawdzić ANI
 * układu dzielonego, ANI jego cofnięcia przy ciasnocie.
 */
const layoutWidth = { value: 0 };

class StubResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
        this.callback(
            [{ target, contentRect: { width: layoutWidth.value } } as unknown as ResizeObserverEntry],
            this as unknown as ResizeObserver
        );
    }
    unobserve() {}
    disconnect() {}
}

vi.stubGlobal('ResizeObserver', StubResizeObserver);

// ─── helpers ─────────────────────────────────────────────────────────────────

import { useQuery } from '@tanstack/react-query';

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

// Dokładne brutto stoi w atrapie obok netta, bo tak wygląda pozycja cennika
// z serwera - i bo to je, a nie przeliczenie z netta, czyta panel cennika
// i tabela wyceny (CLAUDE.md §1). Atrapa bez tego pola uczyłaby odwrotnie.
const NORMAL_SERVICE: Service = {
    id: 'svc-1',
    name: 'Mycie zewnętrzne',
    basePriceNet: 10000,
    basePriceGross: 12300,
    vatRate: 23,
    requireManualPrice: false,
    isPackage: false,
    packageItems: null,
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
    basePriceGross: 0,
    vatRate: 23,
    requireManualPrice: true,
    isPackage: false,
    packageItems: null,
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

function renderTable(
    services: ServiceLineItem[],
    onChange = vi.fn(),
    layout: 'stacked' | 'split' = 'stacked',
) {
    return {
        onChange,
        ...render(
            // Modal ceny pozycjonuje się względem menu bocznego, więc potrzebuje jego kontekstu.
            <StyledThemeProvider theme={theme}>
                <SidebarProvider>
                    <EditableServicesTable services={services} onChange={onChange} layout={layout} />
                </SidebarProvider>
            </StyledThemeProvider>
        ),
    };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe('EditableServicesTable', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        layoutWidth.value = 0;
        mockUseQuery.mockReturnValue({ data: { services: [] }, isLoading: false });
    });

    // ── cennik obok tabeli ───────────────────────────────────────────────────

    describe('layout="split": cennik obok tabeli', () => {
        it('pokazuje cennik i dodaje pozycję kliknięciem w usługę', async () => {
            layoutWidth.value = 1000;
            mockUseQuery.mockReturnValue({
                data: { services: [NORMAL_SERVICE], pagination: { totalItems: 1 } },
                isLoading: false,
            });
            const user = userEvent.setup();
            const { onChange } = renderTable([], vi.fn(), 'split');

            expect(screen.getByLabelText('Szukaj w cenniku')).toBeInTheDocument();

            await user.click(screen.getByTitle(`Dodaj do wyceny: ${NORMAL_SERVICE.name}`));

            expect(onChange).toHaveBeenCalledWith([
                expect.objectContaining({ serviceId: NORMAL_SERVICE.id, serviceName: NORMAL_SERVICE.name }),
            ]);
        });

        it('przy ciasnym miejscu wraca do pola z podpowiedziami', () => {
            // 700 px: tabela owszem by się zmieściła, ale po odjęciu cennika
            // zostałoby jej poniżej 400 - czyli panel odbierałby jej czytelność,
            // zamiast jej pomagać.
            layoutWidth.value = 700;
            renderTable([], vi.fn(), 'split');

            // Na cennik obok tabeli nie ma miejsca, więc droga do usługi jest ta sama
            // co w układzie domyślnym - inaczej użytkownik zostałby bez żadnej.
            expect(screen.queryByLabelText('Szukaj w cenniku')).not.toBeInTheDocument();
            expect(screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...')).toBeInTheDocument();
        });
    });

    // ── autocomplete: add-new option ─────────────────────────────────────────

    describe('autocomplete: opcja "dodaj nową usługę"', () => {
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

    describe('usługa NIESTANDARDOWA: modal wpisania ceny', () => {
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

        it('pokazuje nazwę usługi jako pole zablokowane do edycji', async () => {
            mockUseQuery.mockReturnValue({ data: { services: [CUSTOM_PRICE_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(input, 'niest');
            await user.click(await screen.findByText('Usługa niestandardowa'));

            const nameField = screen.getByDisplayValue('Usługa niestandardowa');
            expect(nameField).toBeDisabled();
        });

        it('daje wybór stawki VAT oraz parę pól: cena netto i cena brutto', async () => {
            mockUseQuery.mockReturnValue({ data: { services: [CUSTOM_PRICE_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(input, 'niest');
            await user.click(await screen.findByText('Usługa niestandardowa'));

            expect(screen.getByText('Stawka VAT')).toBeInTheDocument();
            expect(screen.getByText('Cena netto')).toBeInTheDocument();
            expect(screen.getByText('Cena brutto')).toBeInTheDocument();
        });

        it('po wpisaniu ceny netto wylicza brutto od netto', async () => {
            mockUseQuery.mockReturnValue({ data: { services: [CUSTOM_PRICE_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            const { onChange } = renderTable([]);

            const autocompleteInput = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(autocompleteInput, 'niest');
            await user.click(await screen.findByText('Usługa niestandardowa'));

            const [netField, grossField] = screen.getAllByPlaceholderText('0.00');
            await user.type(netField, '100');
            // 100 netto przy 23% VAT → 123 brutto
            expect(grossField).toHaveValue('123.00');

            await user.click(screen.getByRole('button', { name: 'Dodaj usługę' }));

            const [newList] = onChange.mock.calls[0];
            expect(newList[0].basePriceNet).toBe(10000);
            expect(newList[0].basePriceGross).toBe(12300);
            expect(newList[0].adjustment).toEqual({ type: 'PERCENT', value: 0 });
            expect(newList[0].requireManualPrice).toBe(true);
        });

        it('po wpisaniu ceny brutto wylicza netto od brutto', async () => {
            mockUseQuery.mockReturnValue({ data: { services: [CUSTOM_PRICE_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            const { onChange } = renderTable([]);

            const autocompleteInput = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(autocompleteInput, 'niest');
            await user.click(await screen.findByText('Usługa niestandardowa'));

            const [netField, grossField] = screen.getAllByPlaceholderText('0.00');
            await user.type(grossField, '123');
            expect(netField).toHaveValue('100.00');

            await user.click(screen.getByRole('button', { name: 'Dodaj usługę' }));

            const [newList] = onChange.mock.calls[0];
            expect(newList[0].basePriceNet).toBe(10000);
            // Brutto zostaje dokładnie takie, jak wpisano - bez dryfu z przeliczenia w tę i z powrotem.
            expect(newList[0].basePriceGross).toBe(12300);
        });

        it('zmiana stawki VAT przelicza brutto od wpisanego netto', async () => {
            mockUseQuery.mockReturnValue({ data: { services: [CUSTOM_PRICE_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            const { onChange } = renderTable([]);

            const autocompleteInput = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(autocompleteInput, 'niest');
            await user.click(await screen.findByText('Usługa niestandardowa'));

            const [netField] = screen.getAllByPlaceholderText('0.00');
            await user.type(netField, '100');
            await user.selectOptions(screen.getByRole('combobox'), '8');

            await user.click(screen.getByRole('button', { name: 'Dodaj usługę' }));

            const [newList] = onChange.mock.calls[0];
            expect(newList[0].vatRate).toBe(8);
            expect(newList[0].basePriceNet).toBe(10000);
            expect(newList[0].basePriceGross).toBe(10800);
        });

        it('pozwala dodać darmową usługę (0 zł) - przycisk aktywny mimo pustej ceny', async () => {
            // Część usług ustalanych indywidualnie bywa darmowa. 0 zł to poprawna cena,
            // nie brak ceny - przycisk musi być aktywny, a potwierdzenie ma dodać pozycję
            // za zero, a nie zostać zablokowane.
            mockUseQuery.mockReturnValue({ data: { services: [CUSTOM_PRICE_SERVICE] }, isLoading: false });
            const user = userEvent.setup();
            const { onChange } = renderTable([]);

            const input = screen.getByPlaceholderText('Wpisz nazwę usługi, aby dodać...');
            await user.type(input, 'niest');
            await user.click(await screen.findByText('Usługa niestandardowa'));

            const addBtn = screen.getByRole('button', { name: 'Dodaj usługę' });
            expect(addBtn).toBeEnabled();

            await user.click(addBtn);

            const [newList] = onChange.mock.calls[0];
            expect(newList[0].basePriceNet).toBe(0);
            expect(newList[0].basePriceGross).toBe(0);
            expect(newList[0].requireManualPrice).toBe(true);
        });
    });

    // ── rabat dostępny dla NIESTANDARDOWA ────────────────────────────────────

    describe('usługa z ceną ustaloną ręcznie w tabeli', () => {
        const manualLine = () => makeServiceLineItem({
            id: 'line-custom',
            serviceId: 'svc-2',
            serviceName: 'Usługa niestandardowa',
            basePriceNet: 10000,
            requireManualPrice: true,
        });

        it('pozwala nadać rabat - przycisk rabatu jest dostępny', () => {
            // Po zapisaniu ceny ręcznej pozycja zachowuje się jak każda inna:
            // można jej nadać rabat. Wcześniej cena wpisana ręcznie „ginęła" do zera
            // i rabat nie miał od czego liczyć - to jest sprawdzenie, że już ma.
            renderTable([manualLine()]);
            expect(screen.getByTitle('Dodaj rabat')).toBeInTheDocument();
        });

        it('pokazuje wpisaną cenę netto i brutto w tabeli', () => {
            // 100,00 zł netto przy 23% VAT -> 123,00 zł brutto. Kwota ustalona ręcznie
            // ma się pokazywać normalnie, a nie jako 0.
            renderTable([manualLine()]);
            expect(screen.getAllByText('100.00').length).toBeGreaterThan(0);
            expect(screen.getAllByText('123.00').length).toBeGreaterThan(0);
        });
    });
});
