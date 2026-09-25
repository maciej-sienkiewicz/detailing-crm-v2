// @vitest-environment jsdom
//
// Edycja klienta miała trzy zakładki i „Zapisz" wysyłający tylko otwartą zakładkę:
// zmiany z drugiej przepadały, a błąd w ukrytej zakładce blokował zapis bez słowa.
// Te testy pilnują, że jeden „Zapisz zmiany" wysyła każdą zmienioną część, że błąd
// jest widoczny, a nietknięta firma (także niepełna) nie blokuje zapisu osoby.
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { customerEditApi } from '../api/customerEditApi';
import type { Customer } from '../types';
import { EditCustomerModal } from './EditCustomerModal';

vi.mock('../api/customerEditApi', () => ({
    customerEditApi: {
        updateCustomer: vi.fn(),
        updateCompany: vi.fn(),
        deleteCompany: vi.fn(),
    },
}));

const api = vi.mocked(customerEditApi);

const VALID_NIP = '5261040828';
const VALID_REGON = '123456785';

const baseCustomer: Customer = {
    id: 'cust-1',
    firstName: 'Anna',
    lastName: 'Nowak',
    contact: { email: 'anna@example.com', phone: '+48 600 100 200' },
    homeAddress: null,
    company: {
        id: 'comp-1',
        name: 'Nowak Detailing',
        nip: VALID_NIP,
        regon: VALID_REGON,
        address: { street: 'Prosta 1', city: 'Warszawa', postalCode: '00-001', country: 'Polska' },
    },
    notes: [],
    lastVisitDate: null,
    totalVisits: 0,
    vehicleCount: 0,
    totalRevenue: { netAmount: 0, grossAmount: 0, currency: 'PLN' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
};

const Providers = ({ children }: { children: ReactNode }) => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
    return (
        <QueryClientProvider client={client}>
            <ThemeProvider theme={theme}>
                <ToastProvider>{children}</ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
};

const renderModal = (customer: Customer = baseCustomer, onClose = vi.fn()) => {
    render(
        <Providers>
            <EditCustomerModal isOpen onClose={onClose} customer={customer} />
        </Providers>,
    );
    return { onClose };
};

const type = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

beforeEach(() => {
    api.updateCustomer.mockResolvedValue(baseCustomer);
    api.updateCompany.mockResolvedValue(baseCustomer.company!);
    api.deleteCompany.mockResolvedValue(undefined);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('EditCustomerModal', () => {
    it('shows every group at once instead of tabs', () => {
        renderModal();
        expect(screen.getByRole('heading', { name: 'Osoba i kontakt' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Adres zamieszkania' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Firma' })).toBeInTheDocument();
        expect(screen.getByLabelText('Imię')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Nowak Detailing')).toBeInTheDocument();
    });

    it('has exactly one filled button: the submit', () => {
        renderModal();
        const primary = screen.getAllByRole('button').filter(b => b.textContent === 'Zapisz zmiany');
        expect(primary).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Anuluj' })).toBeInTheDocument();
    });

    it('saves changes made in the person AND the company with one click', async () => {
        const { onClose } = renderModal();
        type('Imię', 'Joanna');
        fireEvent.change(screen.getByDisplayValue('Nowak Detailing'), { target: { value: 'Nowak Studio' } });
        save();

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(api.updateCustomer).toHaveBeenCalledWith('cust-1', expect.objectContaining({ firstName: 'Joanna' }));
        expect(api.updateCompany).toHaveBeenCalledWith('cust-1', expect.objectContaining({ name: 'Nowak Studio', nip: VALID_NIP }));
    });

    it('does not validate or send an untouched company, even an incomplete one', async () => {
        const legacy: Customer = { ...baseCustomer, company: { ...baseCustomer.company!, regon: '' } };
        const { onClose } = renderModal(legacy);
        type('Imię', 'Joanna');
        save();

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(api.updateCustomer).toHaveBeenCalledTimes(1);
        expect(api.updateCompany).not.toHaveBeenCalled();
    });

    it('closes without a request when nothing changed', async () => {
        const { onClose } = renderModal();
        save();
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(api.updateCustomer).not.toHaveBeenCalled();
        expect(api.updateCompany).not.toHaveBeenCalled();
    });

    it('shows an address error instead of silently refusing to save', async () => {
        const { onClose } = renderModal();
        type('Ulica', 'Długa 5');
        save();

        expect(await screen.findByText('Nieprawidłowy kod pocztowy (format: XX-XXX)')).toBeInTheDocument();
        expect(api.updateCustomer).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('keeps the company form behind "Dodaj dane firmy" for a private customer', async () => {
        const { onClose } = renderModal({ ...baseCustomer, company: null });
        expect(screen.queryByLabelText('NIP')).not.toBeInTheDocument();

        type('Nazwisko', 'Kowalska');
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj dane firmy' }));
        expect(screen.getByLabelText('NIP')).toBeInTheDocument();

        // Otwarty, pusty formularz firmy musi zatrzymać zapis - i nie wysłać połowy.
        save();
        await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
        expect(api.updateCustomer).not.toHaveBeenCalled();
        expect(api.updateCompany).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Nie dodawaj firmy' }));
        save();
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(api.updateCustomer).toHaveBeenCalledWith('cust-1', expect.objectContaining({ lastName: 'Kowalska' }));
        expect(api.updateCompany).not.toHaveBeenCalled();
    });

    it('opens with the company form expanded when asked for the company of a private customer', () => {
        render(
            <Providers>
                <EditCustomerModal isOpen onClose={vi.fn()} customer={{ ...baseCustomer, company: null }} initialTab="company" />
            </Providers>,
        );
        expect(screen.getByLabelText('NIP')).toBeInTheDocument();
    });

    it('asks in a dialog (not window.confirm) before deleting the company', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm');
        const { onClose } = renderModal();

        fireEvent.click(screen.getByRole('button', { name: 'Usuń firmę' }));
        expect(await screen.findByText('Usunąć firmę klienta?')).toBeInTheDocument();
        expect(api.deleteCompany).not.toHaveBeenCalled();

        const buttons = screen.getAllByRole('button', { name: 'Usuń firmę' });
        fireEvent.click(buttons[buttons.length - 1]);

        await waitFor(() => expect(api.deleteCompany).toHaveBeenCalledWith('cust-1'));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(confirmSpy).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });

    it('stays open and says so when the company part fails', async () => {
        api.updateCompany.mockRejectedValue(new Error('500'));
        const { onClose } = renderModal();
        type('Imię', 'Joanna');
        fireEvent.change(screen.getByDisplayValue('Nowak Detailing'), { target: { value: 'Nowak Studio' } });
        save();

        expect(await screen.findByText('Nie udało się zapisać danych firmy')).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByDisplayValue('Nowak Studio')).toBeInTheDocument();

        // Ponowienie wysyła już tylko firmę - osoba weszła za pierwszym razem.
        api.updateCompany.mockResolvedValue(baseCustomer.company!);
        save();
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(api.updateCustomer).toHaveBeenCalledTimes(1);
        expect(api.updateCompany).toHaveBeenCalledTimes(2);
    });
});
