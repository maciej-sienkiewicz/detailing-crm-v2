// @vitest-environment jsdom
//
// Faktura konsumencka do wizyty już wydanej. Dwa zgłoszenia:
//  - odmowa serwera pokazywała angielskie „Request failed with status code 400" z axiosa,
//    a powód po polsku z odpowiedzi przepadał,
//  - POST /invoices nie ma klucza idempotencji: po 504 sprzedawca klikał „Wystaw" jeszcze
//    raz i w KSeF lądowały dwie faktury. Przy nieznanym wyniku okno najpierw sprawdza
//    dokumenty wizyty, dopiero potem pozwala ponowić.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ksefRevenueApi } from '@/modules/finance/api/ksefRevenueApi';
import { visitApi } from '../api/visitApi';
import { ConsumerInvoiceModal } from './ConsumerInvoiceModal';
import type { ServiceLineItem, Visit, VisitDetailResponse } from '../types';

const showInfo = vi.fn();
const showSuccess = vi.fn();

vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError: vi.fn(), showInfo, showSuccess, showWarning: vi.fn() }),
}));
vi.mock('@/modules/finance/api/ksefRevenueApi', () => ({
    ksefRevenueApi: { issueInvoice: vi.fn() },
}));
vi.mock('../api/visitApi', () => ({
    visitApi: { getVisitDetail: vi.fn() },
}));

const issueInvoice = vi.mocked(ksefRevenueApi.issueInvoice);
const getVisitDetail = vi.mocked(visitApi.getVisitDetail);

const line = (id: string, serviceName: string, net: number, gross: number, extra: Partial<ServiceLineItem> = {}): ServiceLineItem => ({
    id, serviceId: `svc-${id}`, serviceName, basePriceNet: net, basePriceGross: gross, vatRate: 23,
    requireManualPrice: false, adjustment: { type: 'PERCENT', value: 0 }, note: '',
    finalPriceNet: net, finalPriceGross: gross, status: 'CONFIRMED', ...extra,
});

const visit = {
    id: 'visit-1',
    visitNumber: 'W/7/2026',
    status: 'COMPLETED',
    customer: { id: 'c-1', firstName: 'Jan', lastName: 'Kowalski', email: '', phone: '' },
    services: [
        line('a', 'Powłoka ceramiczna', 154_472, 190_000),
        // Dopisana i nieprzyjęta w chwili wydania - klient za nią nie zapłacił.
        line('b', 'Czyszczenie felg', 24_390, 30_000, { status: 'PENDING', pendingOperation: 'ADD', hasPendingChange: true }),
    ],
    totalCost: null,
    settlement: { documentType: 'RECEIPT', revenueInvoiceId: null },
} as unknown as Visit;

const detailWith = (revenueInvoiceId: string | null): VisitDetailResponse =>
    ({ visit: { ...visit, settlement: { documentType: 'RECEIPT', revenueInvoiceId } } }) as VisitDetailResponse;

const renderModal = () => {
    const onClose = vi.fn();
    const onIssued = vi.fn();
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <ThemeProvider theme={theme}>
                <ConsumerInvoiceModal visit={visit} isOpen onClose={onClose} onIssued={onIssued} />
            </ThemeProvider>
        </QueryClientProvider>,
    );
    return { onClose, onIssued };
};

const issue = () => fireEvent.click(screen.getByRole('button', { name: 'Wystaw fakturę' }));

describe('ConsumerInvoiceModal', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it('pozycje tylko z tego, za co klient zapłacił: bez usługi czekającej na zgodę', () => {
        renderModal();

        expect(screen.getByText('Razem brutto').nextSibling?.textContent).toMatch(/1\s?900,00/);
    });

    it('odmowa serwera pokazuje jego powód po polsku, nie zdanie axiosa', async () => {
        issueInvoice.mockRejectedValue(
            Object.assign(new Error('Request failed with status code 400'), {
                response: { status: 400, data: { message: 'Data wystawienia nie może być z przyszłości.' } },
            })
        );
        renderModal();

        issue();

        expect(await screen.findByText('Data wystawienia nie może być z przyszłości.')).toBeInTheDocument();
        expect(screen.queryByText(/Request failed/)).toBeNull();
        // Odmowa jest pewna: faktury nie ma, ponowienie od razu.
        expect(screen.getByRole('button', { name: 'Wystaw fakturę' })).toBeInTheDocument();
    });

    it('504: nie wiemy, czy faktura powstała - zamiast „Wystaw" jest sprawdzenie dokumentów', async () => {
        issueInvoice.mockRejectedValue({ response: { status: 504, data: '' } });
        renderModal();

        issue();

        expect(await screen.findByText('Faktura mogła zostać wystawiona')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Wystaw fakturę' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Sprawdź dokumenty wizyty' })).toBeInTheDocument();
    });

    it('sprawdzenie znajduje fakturę przy wizycie: okno się zamyka, drugiej nie wystawiamy', async () => {
        issueInvoice.mockRejectedValue({ message: 'Network Error' });
        getVisitDetail.mockResolvedValue(detailWith('inv-1'));
        const { onClose, onIssued } = renderModal();

        issue();
        fireEvent.click(await screen.findByRole('button', { name: 'Sprawdź dokumenty wizyty' }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(onIssued).toHaveBeenCalled();
        expect(showInfo.mock.calls[0][0]).toBe('Faktura jest już wystawiona');
        expect(issueInvoice).toHaveBeenCalledOnce();
    });

    it('sprawdzenie nie znajduje faktury: dopiero wtedy wolno wystawić ponownie', async () => {
        issueInvoice.mockRejectedValueOnce({ response: { status: 502 } }).mockResolvedValue({} as never);
        getVisitDetail.mockResolvedValue(detailWith(null));
        const { onClose } = renderModal();

        issue();
        fireEvent.click(await screen.findByRole('button', { name: 'Sprawdź dokumenty wizyty' }));

        expect(await screen.findByText('Przy wizycie nie ma faktury')).toBeInTheDocument();
        issue();

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(issueInvoice).toHaveBeenCalledTimes(2);
        expect(showSuccess).toHaveBeenCalled();
    });

    it('nieudane sprawdzenie nie odblokowuje ponowienia', async () => {
        issueInvoice.mockRejectedValue({ response: { status: 500 } });
        getVisitDetail.mockRejectedValue({ message: 'Network Error' });
        renderModal();

        issue();
        fireEvent.click(await screen.findByRole('button', { name: 'Sprawdź dokumenty wizyty' }));

        expect(await screen.findByText('Nie udało się sprawdzić dokumentów wizyty')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Wystaw fakturę' })).toBeNull();
    });
});
