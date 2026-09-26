// @vitest-environment jsdom
//
// Dane firmy: „Zapisz" przy błędzie w polu poza ekranem nie robił wcześniej nic -
// ani słowa w pasku, ani przewinięcia do pola. Pasek nie znikał po ręcznym cofnięciu
// zmiany, a błąd wczytania kończył się wiecznym kółkiem.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { CompanySettings } from '../types';
import { CompanySection } from './CompanySection';

const mutateAsync = vi.fn();
const refetch = vi.fn();
const showSuccess = vi.fn();
const showError = vi.fn();
let company: CompanySettings | undefined;
let isError = false;

vi.mock('../hooks/useCompany', () => ({
    useCompanySettings: () => ({ company, isLoading: false, isError, refetch }),
    useUpdateCompanySettings: () => ({ mutateAsync, isPending: false }),
    useUploadCompanyLogo: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useDeleteCompanyLogo: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess, showError }),
}));

const loaded: CompanySettings = {
    id: '1',
    name: 'Detail Studio',
    taxId: '527-123-45-67',
    regon: '',
    street: 'ul. Prosta 20',
    postalCode: '00-850',
    city: 'Warszawa',
    phone: '+48 600 100 300',
    email: 'biuro@studio.pl',
    website: null,
    bankAccount: null,
    logoUrl: null,
    logoNeedsLightPlate: true,
    logoAspectRatio: null,
    emailAlias: null,
    updatedAt: '2026-09-01T10:00:00Z',
};

const renderSection = () =>
    render(
        <ThemeProvider theme={theme}>
            <CompanySection />
        </ThemeProvider>,
    );

beforeEach(() => {
    vi.clearAllMocks();
    company = { ...loaded };
    isError = false;
});
afterEach(() => cleanup());

describe('CompanySection', () => {
    it('pasek znika, gdy zmianę cofnięto ręcznie', () => {
        renderSection();
        const phone = screen.getByLabelText('Telefon');
        fireEvent.change(phone, { target: { value: '+48 600 100 301' } });
        expect(screen.getByRole('region', { name: 'Niezapisane zmiany' }).textContent).toMatch(/Zmieniono 1 pole/);

        fireEvent.change(phone, { target: { value: '+48 600 100 300' } });
        expect(screen.queryByRole('region', { name: 'Niezapisane zmiany' })).toBeNull();
    });

    it('zapis z błędnym REGON nie jest cichy: pasek nazywa pole, a „Zapisz" przenosi do niego kursor', () => {
        renderSection();
        fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '+48 600 100 301' } });

        const bar = screen.getByRole('region', { name: 'Niezapisane zmiany' });
        expect(bar.textContent).toMatch(/REGON wymaga poprawy, zanim zapiszesz/);

        fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));
        expect(mutateAsync).not.toHaveBeenCalled();
        const regon = screen.getByLabelText('REGON');
        expect(document.activeElement).toBe(regon);
        expect(regon.getAttribute('aria-invalid')).toBe('true');
        expect(screen.getByText(/Wpisz REGON: 9 albo 14 cyfr/)).toBeTruthy();
    });

    it('„Pokaż pole" przenosi do pola z problemem', () => {
        renderSection();
        fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '+48 600 100 301' } });
        fireEvent.click(screen.getByRole('button', { name: 'Pokaż pole' }));
        expect(document.activeElement).toBe(screen.getByLabelText('REGON'));
    });

    it('poprawny formularz zapisuje się i pokazuje jeden dymek sukcesu', async () => {
        mutateAsync.mockImplementation(async (payload: Partial<CompanySettings>) => ({ ...loaded, ...payload }));
        renderSection();
        fireEvent.change(screen.getByLabelText('REGON'), { target: { value: '142836501' } });
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

        await waitFor(() => expect(showSuccess).toHaveBeenCalledTimes(1));
        expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ regon: '142836501', website: null }));
        expect(screen.queryByRole('region', { name: 'Niezapisane zmiany' })).toBeNull();
    });

    it('odrzucony zapis 4xx ze skipErrorToast pokazuje jeden dymek ze zdaniem z backendu', async () => {
        mutateAsync.mockRejectedValue({
            response: { status: 400, data: { message: 'NIP jest nieprawidłowy' } },
            config: { method: 'put', skipErrorToast: true },
        });
        renderSection();
        fireEvent.change(screen.getByLabelText('REGON'), { target: { value: '142836501' } });
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz zmiany' }));

        await waitFor(() => expect(showError).toHaveBeenCalledTimes(1));
        expect(showError).toHaveBeenCalledWith('Nie udało się zapisać danych firmy', 'NIP jest nieprawidłowy');
    });

    it('błąd wczytania to komunikat z ponowieniem, a nie wieczne kółko', () => {
        company = undefined;
        isError = true;
        renderSection();
        expect(screen.getByText('Nie udało się wczytać danych firmy')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
        expect(refetch).toHaveBeenCalled();
    });

    it('usunięcie logo pyta oknem potwierdzenia, nie window.confirm', () => {
        company = { ...loaded, logoUrl: 'https://s3/logo.png', logoAspectRatio: 1 };
        const confirmSpy = vi.spyOn(window, 'confirm');
        renderSection();
        fireEvent.click(screen.getByRole('button', { name: 'Usuń logo' }));
        expect(confirmSpy).not.toHaveBeenCalled();
        expect(screen.getByText('Usunąć logo studia?')).toBeTruthy();
        confirmSpy.mockRestore();
    });
});
