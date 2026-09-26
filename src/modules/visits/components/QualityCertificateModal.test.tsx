// @vitest-environment jsdom
//
// Okno „Certyfikat jakości" przytłaczało: wszystkie sekcje rozłożone naraz, każda
// zaznaczona pozycja jako niebieski blok. Teraz certyfikat jest gotowy od pierwszej
// chwili — sekcje zwinięte do podsumowania, pobranie jednym kliknięciem.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { QualityCertificateModal } from './QualityCertificateModal';
import { qualityCertificateApi } from '../api/qualityCertificateApi';
import type { Visit } from '../types';

vi.mock('../api/qualityCertificateApi', () => ({ qualityCertificateApi: { generate: vi.fn() } }));
vi.mock('@/common/components/Toast/ToastContainer', () => ({
    useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));
vi.mock('@/core/permissions', () => ({ usePermissions: () => ({ can: () => true }) }));
vi.mock('@/modules/products/hooks/useProducts', () => ({
    useProducts: () => ({ products: [], isLoading: false }),
    useVisitProducts: () => ({
        links: [{ id: 'l-1', productId: 'p-1', productName: 'Ceramic Shampoo', brand: 'Gyeon', packageLabel: '500 ml',
            imageFileId: null, note: null, addedByName: 'Anna', addedAt: '2026-09-26T10:00:00Z' }],
    }),
}));
vi.mock('@/modules/settings/hooks/useCareInstructions', () => ({
    useCareInstructions: () => ({
        instructions: [
            { id: 'c-1', title: 'Pierwsze mycie po 7 dniach', content: 'Powłoka utwardza się przez tydzień.',
                isDefaultSelected: true, serviceIds: [] },
            { id: 'c-2', title: 'Unikaj myjni szczotkowych', content: 'Szczotki rysują lakier.',
                isDefaultSelected: false, serviceIds: [] },
        ],
    }),
}));

const visit = {
    id: 'v-1', visitNumber: 'W/2026/0042',
    customer: { firstName: 'Jan', lastName: 'Kowalski' },
    vehicle: { brand: 'Audi', model: 'A4', licensePlate: 'WX 12345' },
    services: [
        { id: 's-1', serviceId: 'svc-1', serviceName: 'Powłoka ceramiczna', status: 'CONFIRMED', note: '' },
        { id: 's-2', serviceId: 'svc-2', serviceName: 'Pranie tapicerki', status: 'CONFIRMED', note: '' },
        { id: 's-3', serviceId: 'svc-3', serviceName: 'Odrzucona', status: 'REJECTED', note: '' },
    ],
} as unknown as Visit;

const renderModal = () => render(
    <ThemeProvider theme={theme}>
        <QualityCertificateModal visit={visit} onClose={vi.fn()} />
    </ThemeProvider>,
);

describe('QualityCertificateModal', () => {
    beforeEach(() => { vi.mocked(qualityCertificateApi.generate).mockResolvedValue(undefined); });
    afterEach(() => { cleanup(); vi.clearAllMocks(); });

    it('startuje zwinięty: podsumowania zamiast list, klient i auto w podtytule', () => {
        renderModal();
        expect(screen.getByText('Jan Kowalski, Audi A4 WX 12345')).toBeInTheDocument();
        expect(screen.getByText('2 z 2 na certyfikacie')).toBeInTheDocument();
        expect(screen.getByText('1 z 1 na certyfikacie')).toBeInTheDocument();
        expect(screen.getByText('1 instrukcja')).toBeInTheDocument();
        expect(screen.queryByText('Powłoka ceramiczna')).toBeNull();
        expect(screen.queryByRole('checkbox')).toBeNull();
    });

    it('pobranie jednym kliknięciem wysyła domyślny wybór', async () => {
        renderModal();
        fireEvent.click(screen.getByRole('button', { name: /Pobierz certyfikat/ }));
        await waitFor(() => expect(qualityCertificateApi.generate).toHaveBeenCalled());
        const [, request] = vi.mocked(qualityCertificateApi.generate).mock.calls[0];
        expect(request.serviceIds).toEqual(['s-1', 's-2']);
        expect(request.productLinkIds).toEqual(['l-1']);
        expect(request.careInstructionIds).toEqual(['c-1']);
    });

    it('rozwinięta sekcja pozwala ukryć usługę, podsumowanie i przycisk to pokazują', async () => {
        renderModal();
        const toggle = screen.getByRole('button', { name: /Wykonane usługi/ });
        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        fireEvent.click(screen.getByRole('checkbox', { name: 'Pranie tapicerki' }));

        expect(screen.getByText('1 z 2 na certyfikacie')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Pobierz certyfikat/ })).toHaveTextContent('PDF, 3 pozycje');

        fireEvent.click(screen.getByRole('button', { name: /Pobierz certyfikat/ }));
        await waitFor(() => expect(qualityCertificateApi.generate).toHaveBeenCalled());
        expect(vi.mocked(qualityCertificateApi.generate).mock.calls[0][1].serviceIds).toEqual(['s-1']);
    });

    it('pole uwag jest schowane za przyciskiem i idzie do certyfikatu', async () => {
        renderModal();
        fireEvent.click(screen.getByRole('button', { name: /Jak utrzymać efekt/ }));
        expect(screen.queryByLabelText('Uwagi tylko do tego certyfikatu')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj uwagę do tego certyfikatu' }));
        fireEvent.change(screen.getByLabelText('Uwagi tylko do tego certyfikatu'), { target: { value: 'Pierwsze mycie po deszczu' } });

        expect(screen.getByText('1 instrukcja, z uwagą')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Pobierz certyfikat/ }));
        await waitFor(() => expect(qualityCertificateApi.generate).toHaveBeenCalled());
        expect(vi.mocked(qualityCertificateApi.generate).mock.calls[0][1].careNote).toBe('Pierwsze mycie po deszczu');
    });
});
