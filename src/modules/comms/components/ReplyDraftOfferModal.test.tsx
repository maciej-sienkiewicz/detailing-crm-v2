// @vitest-environment jsdom
//
// Oferta w „Szkic AI": wybrana lista usług zapisuje się na leadzie (albo zakłada go
// z rozmowy), a do szkicu idą pozycje z ceną po rabacie i ceną regularną.
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import type { Lead, LeadServiceItem } from '../types';
import { ReplyDraftOfferModal } from './ReplyDraftOfferModal';

const updateServices = vi.fn();
const markAsLead = vi.fn();
const showError = vi.fn();

vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showError, showSuccess: vi.fn() }) }));
vi.mock('../hooks/useLeads', () => ({
    useUpdateLeadServices: () => ({ mutateAsync: updateServices, isPending: false }),
    useMarkThreadAsLead: () => ({ mutateAsync: markAsLead, isPending: false }),
}));
const CERAMIC: ServiceLineItem = {
    id: 'new', serviceId: 's-1', serviceName: 'Powłoka ceramiczna', basePriceNet: 162_602, basePriceGross: 200_000,
    vatRate: 23, adjustment: { type: 'FIXED_GROSS', value: 20_000 },
};
// Edytor usług ma własne testy - tu wystarczy, że umie dodać pozycję z rabatem.
vi.mock('@/modules/checkin/components/EditableServicesTable', () => ({
    EditableServicesTable: ({ services, onChange }: { services: ServiceLineItem[]; onChange: (s: ServiceLineItem[]) => void }) => (
        <div>
            <span>{services.length} pozycji</span>
            <button type="button" onClick={() => onChange([...services, CERAMIC])}>dodaj powłokę z rabatem</button>
        </div>
    ),
}));
vi.mock('@/common/components/ModalKit', () => {
    const passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
    return {
        ModalShell: passthrough, ModalHeader: passthrough, ModalTitleGroup: passthrough, ModalTitle: passthrough,
        ModalSubtitle: passthrough, ModalContent: passthrough, ModalFooter: passthrough, CloseBtn: () => null,
    };
});

const quoted: LeadServiceItem = {
    id: 'i-1', serviceId: 's-2', name: 'Mycie', priceGross: 25_000, priceNet: 20_325, vatRate: 23, quantity: 1,
    status: 'ACCEPTED', note: null,
} as LeadServiceItem;

const renderModal = (lead: Partial<Lead> | null, onReady = vi.fn()) => {
    render(
        <ThemeProvider theme={theme}>
            <ReplyDraftOfferModal threadId="thread-1" lead={lead as Lead | null} onClose={vi.fn()} onReady={onReady} />
        </ThemeProvider>
    );
    return onReady;
};

const confirm = () => fireEvent.click(screen.getByRole('button', { name: /Napisz szkic z ofertą/ }));

describe('ReplyDraftOfferModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        updateServices.mockResolvedValue({});
        markAsLead.mockResolvedValue({ leadId: 'lead-new', estimatedValue: 180_000 });
    });

    it('lead z wyceną: okno startuje na wycenie, bez zmian nic nie zapisuje', async () => {
        const onReady = renderModal({ id: 'lead-7', services: [quoted] });

        expect(screen.getByText('1 pozycji')).toBeTruthy();
        confirm();

        await waitFor(() => expect(onReady).toHaveBeenCalledWith([
            { name: 'Mycie', quantity: 1, priceGross: 25_000, regularPriceGross: undefined, note: undefined },
        ]));
        expect(updateServices).not.toHaveBeenCalled();
    });

    it('zmieniona wycena leada zapisuje się na leadzie, oferta niesie rabat', async () => {
        const onReady = renderModal({ id: 'lead-7', services: [quoted] });

        fireEvent.click(screen.getByRole('button', { name: 'dodaj powłokę z rabatem' }));
        confirm();

        await waitFor(() => expect(onReady).toHaveBeenCalled());
        expect(updateServices.mock.calls[0][0].leadId).toBe('lead-7');
        expect(updateServices.mock.calls[0][0].services.map((s: { priceGross: number }) => s.priceGross)).toEqual([25_000, 180_000]);
        expect(onReady.mock.calls[0][0][1]).toMatchObject({ name: 'Powłoka ceramiczna', priceGross: 180_000, regularPriceGross: 200_000 });
    });

    it('rozmowa bez leada: wybrana lista zakłada leada z tą wyceną', async () => {
        const onReady = renderModal(null);

        expect((screen.getByRole('button', { name: /Napisz szkic z ofertą/ }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'dodaj powłokę z rabatem' }));
        confirm();

        await waitFor(() => expect(onReady).toHaveBeenCalled());
        expect(markAsLead).toHaveBeenCalledWith({
            threadId: 'thread-1',
            request: { tags: [], services: [expect.objectContaining({ name: 'Powłoka ceramiczna', priceGross: 180_000 })] },
        });
    });

    it('lead bez wyceny: lista uzupełnia wycenę istniejącego leada, bez zakładania nowego', async () => {
        const onReady = renderModal({ id: 'lead-7', services: [] });

        fireEvent.click(screen.getByRole('button', { name: 'dodaj powłokę z rabatem' }));
        confirm();

        await waitFor(() => expect(onReady).toHaveBeenCalled());
        expect(updateServices.mock.calls[0][0].leadId).toBe('lead-7');
        expect(markAsLead).not.toHaveBeenCalled();
    });

    it('błąd zapisu: szkic nie powstaje, użytkownik widzi powód', async () => {
        markAsLead.mockRejectedValue({ response: { data: { message: 'Ta konwersacja jest już leadem' } } });
        const onReady = renderModal(null);

        fireEvent.click(screen.getByRole('button', { name: 'dodaj powłokę z rabatem' }));
        confirm();

        await waitFor(() => expect(showError).toHaveBeenCalledWith('Nie udało się utworzyć leada', 'Ta konwersacja jest już leadem'));
        expect(onReady).not.toHaveBeenCalled();
    });
});
