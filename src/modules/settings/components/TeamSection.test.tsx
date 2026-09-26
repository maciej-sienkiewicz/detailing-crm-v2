// @vitest-environment jsdom
//
// Lista pracowników w Ustawieniach: wiersz otwiera edycję (klawiaturą też), osoba bez
// konta dostaje „Zaproś do systemu", a błąd - zapisu albo wczytania - jest widoczny,
// zamiast udawać pustą listę albo wracać do przycisku bez słowa.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { teamApi } from '../api/teamApi';
import { rolesApi } from '../api/rolesApi';
import type { TeamEmployeeListItem } from '../teamTypes';
import type { Role } from '../rbacTypes';
import { TeamSection } from './TeamSection';

vi.mock('../api/teamApi', () => ({
    teamApi: {
        listEmployees: vi.fn(),
        createEmployee: vi.fn(),
        updateEmployee: vi.fn(),
        createAccount: vi.fn(),
        resendInvitation: vi.fn(),
    },
}));
vi.mock('../api/rolesApi', () => ({
    rolesApi: {
        listRoles: vi.fn(),
        getPermissionCatalog: vi.fn(async () => []),
        assignRole: vi.fn(),
        createRole: vi.fn(),
    },
}));
vi.mock('@/modules/role-preview', () => ({
    useRolePreview: () => ({ available: false, opening: false, open: vi.fn() }),
    PreviewIcon: () => null,
}));
vi.mock('@/modules/subscription', () => ({ useEntitlements: () => ({ data: undefined }) }));

const person = (overrides: Partial<TeamEmployeeListItem>): TeamEmployeeListItem => ({
    id: 'e1',
    firstName: 'Marta',
    lastName: 'Kowalczyk',
    fullName: 'Marta Kowalczyk',
    email: 'marta@studio.pl',
    phone: '+48 601 222 333',
    hasAccount: true,
    accountPending: false,
    role: { id: 'reception', name: 'Recepcja' },
    ...overrides,
});

const marta = person({});
const piotr = person({
    id: 'e2', firstName: 'Piotr', lastName: 'Zieliński', fullName: 'Piotr Zieliński',
    email: 'piotr@studio.pl', phone: null, hasAccount: false, role: null,
});
const kamil = person({
    id: 'e3', firstName: 'Kamil', lastName: 'Nowak', fullName: 'Kamil Nowak',
    email: null, accountPending: true, role: { id: 'detailer', name: 'Detailer' },
});

const roles = [
    { id: 'reception', name: 'Recepcja', description: null, permissions: [], trackWorkTime: false, assignedUserCount: 1 },
    { id: 'detailer', name: 'Detailer', description: null, permissions: [], trackWorkTime: true, assignedUserCount: 1 },
] as unknown as Role[];

const listOf = (items: TeamEmployeeListItem[]) => ({
    items,
    pagination: { currentPage: 1, totalPages: 1, totalItems: items.length, itemsPerPage: 20 },
});

const renderSection = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <ThemeProvider theme={theme}>
                    <ToastProvider>
                        <TeamSection />
                    </ToastProvider>
                </ThemeProvider>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

const serverDown = { response: { status: 503, data: {} } };

beforeEach(() => {
    vi.mocked(teamApi.listEmployees).mockResolvedValue(listOf([marta, piotr, kamil]));
    vi.mocked(rolesApi.listRoles).mockResolvedValue(roles);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('TeamSection - lista pracowników', () => {
    it('bez kolumny pól wyboru; stan konta mówi, co dalej', async () => {
        renderSection();

        await screen.findByText('Marta Kowalczyk');
        expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
        expect(screen.getByText('Aktywne')).toBeTruthy();
        expect(screen.getByText('Nie aktywował konta')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Zaproś do systemu' })).toBeTruthy();
        // Rola z liczonym czasem pracy jest widoczna przy osobie.
        expect(await screen.findByText('Liczony czas pracy')).toBeTruthy();
    });

    it('wiersz jest przyciskiem: otwiera edycję, a zapis wysyła zmiany do serwera', async () => {
        vi.mocked(teamApi.updateEmployee).mockResolvedValue({} as never);
        renderSection();

        const edit = await screen.findByRole('button', { name: 'Edytuj: Marta Kowalczyk' });
        expect(edit.tagName).toBe('BUTTON');
        fireEvent.click(edit);

        const dialog = await screen.findByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('Telefon'), { target: { value: '+48 700 000 000' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Zapisz zmiany' }));

        await waitFor(() => expect(teamApi.updateEmployee).toHaveBeenCalledWith('e1', {
            firstName: 'Marta', lastName: 'Kowalczyk', phone: '+48 700 000 000', email: 'marta@studio.pl',
        }));
        expect(await screen.findByText('Zmiany zapisane')).toBeTruthy();
    });

    it('„Zaproś do systemu" zakłada konto z wybraną rolą', async () => {
        vi.mocked(teamApi.createAccount).mockResolvedValue({ userId: 'u2' });
        vi.mocked(rolesApi.assignRole).mockResolvedValue();
        renderSection();

        fireEvent.click(await screen.findByRole('button', { name: 'Zaproś do systemu' }));
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByRole('checkbox', { name: /Zaproś do systemu/ }).getAttribute('aria-checked')).toBe('true');

        fireEvent.click(within(dialog).getByRole('button', { name: /Wybierz rolę/ }));
        fireEvent.click(await screen.findByRole('option', { name: /Detailer/ }));
        fireEvent.click(within(dialog).getByRole('button', { name: 'Zapisz i wyślij zaproszenie' }));

        await waitFor(() => expect(rolesApi.assignRole).toHaveBeenCalledWith('u2', 'detailer'));
        expect(teamApi.createAccount).toHaveBeenCalledWith('e2', { email: 'piotr@studio.pl' });
        // Dane się nie zmieniły - nie ma czego zapisywać przed zaproszeniem.
        expect(teamApi.updateEmployee).not.toHaveBeenCalled();
        expect(await screen.findByText('Zaproszenie wysłane')).toBeTruthy();
    });

    it('błąd dodania pracownika pokazuje dymek, a formularz zostaje', async () => {
        vi.mocked(teamApi.createEmployee).mockRejectedValue(serverDown);
        renderSection();
        await screen.findByText('Marta Kowalczyk');

        fireEvent.click(screen.getByRole('button', { name: /Dodaj pracownika/ }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText(/Imię/), { target: { value: 'Ewa' } });
        fireEvent.change(within(dialog).getByLabelText(/Nazwisko/), { target: { value: 'Lis' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Dodaj pracownika' }));

        expect(await screen.findByText('Nie udało się dodać pracownika')).toBeTruthy();
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect((within(dialog).getByLabelText(/Imię/) as HTMLInputElement).value).toBe('Ewa');
    });

    it('błąd wczytania to nie pusta lista: komunikat z ponowieniem', async () => {
        vi.mocked(teamApi.listEmployees).mockRejectedValueOnce(serverDown);
        renderSection();

        expect(await screen.findByText('Nie udało się wczytać pracowników')).toBeTruthy();
        expect(screen.queryByText('Nie ma jeszcze pracowników')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
        expect(await screen.findByText('Marta Kowalczyk')).toBeTruthy();
    });

    it('Escape w wypełnionym formularzu pyta, zamiast wyrzucić wpisane dane', async () => {
        renderSection();
        await screen.findByText('Marta Kowalczyk');

        fireEvent.click(screen.getByRole('button', { name: /Dodaj pracownika/ }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText(/Imię/), { target: { value: 'Ewa' } });
        fireEvent.keyDown(document, { key: 'Escape' });

        expect(await screen.findByText('Odrzucić wpisane dane?')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Wróć do formularza' }));
        expect((within(screen.getByRole('dialog')).getByLabelText(/Imię/) as HTMLInputElement).value).toBe('Ewa');
    });
});
