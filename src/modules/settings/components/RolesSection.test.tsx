// @vitest-environment jsdom
//
// Role: błąd zapisu i usunięcia jest widoczny, błąd wczytania nie udaje braku ról,
// a edytor z niezapisanymi uprawnieniami nie znika od Escape.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { rolesApi } from '../api/rolesApi';
import type { PermissionModuleTree, Role } from '../rbacTypes';
import { RolesSection } from './RolesSection';

vi.mock('../api/rolesApi', () => ({
    rolesApi: {
        listRoles: vi.fn(),
        getPermissionCatalog: vi.fn(),
        createRole: vi.fn(),
        updateRole: vi.fn(),
        deleteRole: vi.fn(),
        listRoleUsers: vi.fn(async () => []),
    },
}));
vi.mock('@/modules/role-preview', () => ({
    useRolePreview: () => ({ available: false, opening: false, open: vi.fn() }),
    PreviewIcon: () => null,
}));
// Moduł „Leady" nie jest wykupiony - jego uprawnienia są zablokowane.
vi.mock('@/modules/subscription', () => ({
    useEntitlements: () => ({ data: { features: { LEADS: { enabled: false } } } }),
}));

const catalog: PermissionModuleTree[] = [
    {
        module: 'VISITS', displayName: 'Wizyty', featureKey: null,
        nodes: [{
            code: 'VISITS_VIEW', displayName: 'Podgląd wizyt', description: null, section: null, featureKey: null, implies: [],
            children: [{
                code: 'VISITS_MANAGE', displayName: 'Zarządzanie wizytami', description: null, section: null,
                featureKey: 'LEADS', implies: [], children: [],
            }],
        }],
    },
];

const reception = {
    id: 'reception', name: 'Recepcja', description: 'Telefon i kalendarz', trackWorkTime: false,
    assignedUserCount: 0,
    permissions: [{ code: 'VISITS_VIEW', displayName: 'Podgląd wizyt', module: 'VISITS', moduleDisplayName: 'Wizyty' }],
} as unknown as Role;

const serverDown = { response: { status: 500, data: {} } };

const renderSection = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <RolesSection />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

beforeEach(() => {
    vi.mocked(rolesApi.listRoles).mockResolvedValue([reception]);
    vi.mocked(rolesApi.getPermissionCatalog).mockResolvedValue(catalog);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const openEditor = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Edytuj rolę: Recepcja' }));
    return screen.findByRole('dialog');
};

describe('RolesSection', () => {
    it('błąd wczytania to nie „brak ról": komunikat z ponowieniem', async () => {
        vi.mocked(rolesApi.listRoles).mockRejectedValueOnce(serverDown);
        renderSection();

        expect(await screen.findByText('Nie udało się wczytać ról')).toBeTruthy();
        expect(screen.queryByText('Nie ma jeszcze ról')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
        expect(await screen.findByRole('button', { name: 'Edytuj rolę: Recepcja' })).toBeTruthy();
    });

    it('błąd dodania roli pokazuje dymek, a edytor zostaje otwarty', async () => {
        vi.mocked(rolesApi.createRole).mockRejectedValue(serverDown);
        renderSection();
        await screen.findByRole('button', { name: 'Edytuj rolę: Recepcja' });

        fireEvent.click(screen.getByRole('button', { name: /Dodaj rolę/ }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText(/Nazwa roli/), { target: { value: 'Detailer' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'Dodaj rolę' }));

        expect(await screen.findByText('Nie udało się dodać roli')).toBeTruthy();
        expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('błąd zapisu roli pokazuje dymek', async () => {
        vi.mocked(rolesApi.updateRole).mockRejectedValue(serverDown);
        renderSection();
        const dialog = await openEditor();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Zapisz rolę' }));
        expect(await screen.findByText('Nie udało się zapisać roli')).toBeTruthy();
    });

    it('błąd usunięcia roli pokazuje dymek', async () => {
        vi.mocked(rolesApi.deleteRole).mockRejectedValue({ message: 'Network Error' });
        renderSection();

        fireEvent.click(await screen.findByRole('button', { name: 'Więcej akcji: Recepcja' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Usuń rolę' }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'Usuń rolę' }));

        expect(await screen.findByText('Nie udało się usunąć roli')).toBeTruthy();
        expect(screen.getByText(/Brak połączenia z serwerem/)).toBeTruthy();
    });

    it('4xx zgłasza już globalny dymek - drugiego nie ma', async () => {
        vi.mocked(rolesApi.updateRole).mockRejectedValue({ response: { status: 409, data: { message: 'Taka rola już istnieje' } } });
        renderSection();
        const dialog = await openEditor();

        fireEvent.click(within(dialog).getByRole('button', { name: 'Zapisz rolę' }));
        await waitFor(() => expect(rolesApi.updateRole).toHaveBeenCalled());
        expect(screen.queryByText('Nie udało się zapisać roli')).toBeNull();
    });

    it('Escape przy niezapisanych uprawnieniach pyta, zamiast je wyrzucić', async () => {
        renderSection();
        const dialog = await openEditor();
        await within(dialog).findByText('Podgląd wizyt');

        fireEvent.click(within(dialog).getByRole('checkbox', { name: /^Podgląd wizyt/ }));
        fireEvent.keyDown(document, { key: 'Escape' });

        expect(await screen.findByText('Odrzucić zmiany w roli?')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Wróć do edycji' }));
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(within(dialog).getByRole('checkbox', { name: /^Podgląd wizyt/ }).getAttribute('aria-checked')).toBe('false');
    });

    it('bez zmian Escape zamyka edytor od razu', async () => {
        renderSection();
        await openEditor();

        fireEvent.keyDown(document, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(screen.queryByText('Odrzucić zmiany w roli?')).toBeNull();
    });

    it('nagłówek modułu nie zaznacza uprawnień z niewykupionego modułu', async () => {
        renderSection();
        fireEvent.click(await screen.findByRole('button', { name: /Dodaj rolę/ }));
        const dialog = await screen.findByRole('dialog');
        const head = await within(dialog).findByRole('checkbox', { name: 'Wszystkie uprawnienia: Wizyty' });

        fireEvent.click(head);
        // Pierwsze kliknięcie zaznacza podgląd; zarządzanie czeka na nadrzędne - drugie
        // kliknięcie nie może go jednak dołożyć, bo moduł nie jest wykupiony.
        fireEvent.click(head);
        fireEvent.click(head);

        expect(within(dialog).getByRole('checkbox', { name: /^Podgląd wizyt/ }).getAttribute('aria-checked')).toBe('true');
        const locked = within(dialog).getByRole('checkbox', { name: /Zarządzanie wizytami/ });
        expect(locked.getAttribute('aria-checked')).toBe('false');
        expect(locked.getAttribute('aria-disabled')).toBe('true');
    });
});
