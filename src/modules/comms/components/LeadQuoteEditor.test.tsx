// @vitest-environment jsdom
//
// Wycena z widoku leadów: samo okno wyboru usług z sugestiami asystenta - bez drugiego
// podglądu leada. Przyjęta sugestia dopisuje się do edytowanej listy, a zapis idzie
// na leada.
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import type { ServiceLineItem } from '@/common/components/ServicesTable';
import type { Lead, LeadServiceItem } from '../types';
import { LeadQuoteEditor } from './LeadQuoteEditor';

const mutate = vi.fn();
const stubMutation = () => ({ mutate: vi.fn(), isPending: false, isError: false, data: undefined });
let suggestionOptions: { onAccepted?: (lead: Lead) => void } = {};

vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }) }));
vi.mock('../hooks/useLeads', () => ({
    useUpdateLeadServices: () => ({ mutate, isPending: false }),
    useSuggestionActions: (_leadId: string, options: typeof suggestionOptions = {}) => {
        suggestionOptions = options;
        return { accept: stubMutation(), reject: stubMutation(), refresh: stubMutation() };
    },
}));
vi.mock('@/modules/checkin/components/EditableServicesTable', () => ({
    EditableServicesTable: ({ services }: { services: ServiceLineItem[] }) => <span>{services.length} pozycji w edytorze</span>,
}));
vi.mock('@/common/components/ModalKit', () => {
    const passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
    return {
        ModalShell: passthrough, ModalHeader: passthrough, ModalTitleGroup: passthrough, ModalTitle: passthrough,
        ModalSubtitle: passthrough, ModalContent: passthrough, ModalFooter: passthrough, CloseBtn: () => null,
    };
});

const quoted = {
    id: 'i-1', serviceId: 's-2', name: 'Mycie', priceGross: 25_000, priceNet: 20_325, vatRate: 23, quantity: 1,
    status: 'ACCEPTED', note: null,
} as LeadServiceItem;
const suggested = { ...quoted, id: 'i-2', name: 'Powłoka na felgi', priceGross: 40_000, priceNet: 32_520, status: 'SUGGESTED' } as LeadServiceItem;

const renderEditor = (services: LeadServiceItem[]) =>
    render(
        <ThemeProvider theme={theme}>
            <LeadQuoteEditor lead={{ id: 'lead-7', services } as Lead} subtitle="BMW X5, Jan Kowalski" onClose={vi.fn()} />
        </ThemeProvider>
    );

describe('LeadQuoteEditor', () => {
    beforeEach(() => vi.clearAllMocks());

    it('pokazuje sugestie asystenta i „Znajdź ponownie" nad edytorem', () => {
        renderEditor([quoted, suggested]);
        expect(screen.getByText('Powłoka na felgi')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Znajdź ponownie/ })).toBeTruthy();
        expect(screen.getByText('1 pozycji w edytorze')).toBeTruthy();
    });

    it('przyjęta sugestia dopisuje się do wyceny i zapisuje razem z resztą', () => {
        renderEditor([quoted, suggested]);
        act(() => suggestionOptions.onAccepted?.({ id: 'lead-7', services: [quoted, { ...suggested, status: 'ACCEPTED' }] } as Lead));
        expect(screen.getByText('2 pozycji w edytorze')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Zapisz wycenę' }));
        expect(mutate.mock.calls[0][0].services.map((s: { name: string }) => s.name)).toEqual(['Mycie', 'Powłoka na felgi']);
    });

    it('bez zmian - zamyka bez zapisu (zapis przepisuje też usługi rezerwacji)', () => {
        renderEditor([quoted]);
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz wycenę' }));
        expect(mutate).not.toHaveBeenCalled();
    });
});
