// @vitest-environment jsdom
//
// Dodanie dokumentu klienta: nieudana wysyłka ma mówić toastem (wcześniej okno
// po prostu zostawało otwarte bez słowa), a zamknięcie okna czyści wybrany plik.
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { customerEditApi } from '../api/customerEditApi';
import { UploadDocumentModal } from './UploadDocumentModal';

vi.mock('../api/customerEditApi', () => ({
    customerEditApi: { uploadDocument: vi.fn() },
}));

const api = vi.mocked(customerEditApi);

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

const pick = (name = 'umowa.pdf') => {
    const file = new File(['%PDF'], name, { type: 'application/pdf' });
    fireEvent.change(screen.getByTestId('file-drop-input'), { target: { files: [file] } });
    return file;
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('UploadDocumentModal', () => {
    it('uploads the picked file under the typed name and closes', async () => {
        api.uploadDocument.mockResolvedValue({} as never);
        const onClose = vi.fn();
        render(<Providers><UploadDocumentModal isOpen onClose={onClose} customerId="cust-1" /></Providers>);

        const submit = screen.getByRole('button', { name: 'Dodaj dokument' });
        expect(submit).toBeDisabled();

        const file = pick();
        fireEvent.change(screen.getByLabelText('Nazwa na liście'), { target: { value: '  Umowa serwisowa ' } });
        fireEvent.click(submit);

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(api.uploadDocument).toHaveBeenCalledWith({ file, customerId: 'cust-1', name: 'Umowa serwisowa' });
    });

    it('falls back to the file name when no name is given', async () => {
        api.uploadDocument.mockResolvedValue({} as never);
        render(<Providers><UploadDocumentModal isOpen onClose={vi.fn()} customerId="cust-1" /></Providers>);
        pick('skan.png');
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj dokument' }));
        await waitFor(() => expect(api.uploadDocument).toHaveBeenCalledWith(expect.objectContaining({ name: 'skan.png' })));
    });

    it('says so when the upload fails and stays open', async () => {
        api.uploadDocument.mockRejectedValue(new Error('413'));
        const onClose = vi.fn();
        render(<Providers><UploadDocumentModal isOpen onClose={onClose} customerId="cust-1" /></Providers>);
        pick();
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj dokument' }));

        expect(await screen.findByText('Nie udało się dodać dokumentu')).toBeInTheDocument();
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByText('umowa.pdf')).toBeInTheDocument();
    });

    it('forgets the picked file when closed with "Anuluj"', () => {
        const onClose = vi.fn();
        const { rerender } = render(<Providers><UploadDocumentModal isOpen onClose={onClose} customerId="cust-1" /></Providers>);
        pick();
        fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
        expect(onClose).toHaveBeenCalled();

        rerender(<Providers><UploadDocumentModal isOpen onClose={onClose} customerId="cust-1" /></Providers>);
        expect(screen.queryByText('umowa.pdf')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Dodaj dokument' })).toBeDisabled();
    });
});
