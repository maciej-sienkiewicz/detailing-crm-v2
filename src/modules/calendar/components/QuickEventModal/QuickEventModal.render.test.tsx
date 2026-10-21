// @vitest-environment jsdom
//
// Całe okno „Nowa rezerwacja" na prawdziwym renderze - zachowania z audytu
// docs/QUICK_EVENT_MODAL_AUDIT_2026-10.md, których nie widać z samego hooka:
// Escape, szkic, auta klienta na telefonie i sekcja SMS na komputerze.

import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { theme } from '@/common/theme';
import type { Vehicle } from '@/modules/appointments/types';
import { QuickEventModal } from './index';
import type { QuickEventModalProps } from './types';

const never = () => new Promise<never>(() => {});

const CUSTOMERS = [
    { id: 'cust-two', firstName: 'Jan', lastName: 'Kowalski', phone: '+48123456789', email: 'jan@example.com' },
];
const VEHICLES: Record<string, Vehicle[]> = {
    'cust-two': [
        { id: 'car-a', kind: 'CAR', brand: 'BMW', model: 'X5', year: 2020, licensePlate: 'WA 1111A' },
        { id: 'car-b', kind: 'CAR', brand: 'Audi', model: 'A4', year: 2018, licensePlate: 'WA 2222B' },
    ],
};

vi.mock('@/core', () => ({
    apiClient: {
        get: (url: string) => (url.includes('appointment-colors')
            ? Promise.resolve({ data: { colors: [{ id: 'c1', name: 'Niebieski', hexColor: '#3b82f6' }] } })
            : never()),
    },
}));
vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn(), showWarning: vi.fn() }),
}));
vi.mock('@/modules/subscription', () => ({
    useCapability: () => ({ enabled: false }),
    useFeature: () => ({ enabled: true }),
    UpsellModal: () => null,
}));
// Dostęp do ustawień automatyzacji = moduł i uprawnienie COMMUNICATION_SEND; test zakłada uprawnienie.
vi.mock('@/modules/message-templates/hooks/useMessageAutomationAccess', () => ({ useMessageAutomationAccess: () => false }));
vi.mock('@/widgets/Sidebar/context/SidebarContext', () => ({ useSidebar: () => ({ isCollapsed: false }) }));
vi.mock('@/modules/appointment-colors', () => ({
    pickInitialColorId: (colors: { id: string }[], prev: string) => prev || colors[0]?.id || '',
}));
vi.mock('@/modules/services/api/fetchWholeCatalog', () => ({ fetchWholeCatalog: () => Promise.resolve([]) }));
vi.mock('@/modules/services/api/servicesApi', () => ({ servicesApi: {} }));
vi.mock('@/modules/sms-settings/api/smsSettingsApi', () => ({ fetchAutomationConfig: () => never() }));
vi.mock('@/modules/visit-card/api/visitCardApi', () => ({ visitCardApi: { getSettings: () => never() } }));
vi.mock('@/modules/appointments/hooks/useAppointmentForm', () => ({
    useCustomerVehicles: (customerId: string | undefined) => ({
        data: customerId ? (VEHICLES[customerId] ?? []) : undefined,
        isLoading: false,
    }),
    useCustomerSearch: (query: string) => ({ data: query ? CUSTOMERS : [] }),
}));
vi.mock('@/modules/vehicles/components/BrandModelSelectors', () => ({
    BrandSelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
        <input aria-label="Marka" value={value} onChange={e => onChange(e.target.value)} />
    ),
    ModelSelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
        <input aria-label="Model" value={value} onChange={e => onChange(e.target.value)} />
    ),
}));
vi.mock('@/modules/message-templates/hooks/useMessageDefaults', async () => {
    const { useCallback, useState } = await import('react');
    return {
        useMessageDefaults: () => ({ sms: () => undefined, email: () => undefined }),
        useDefaultChoice: (defaultValue: boolean | undefined, fallback: boolean) => {
            const [choice, setChoice] = useState<boolean | null>(null);
            const set = useCallback((next: boolean) => setChoice(next), []);
            const reset = useCallback(() => setChoice(null), []);
            return [choice ?? defaultValue ?? fallback, set, reset] as const;
        },
    };
});

const EVENT = { start: new Date(2026, 9, 24, 10, 0), end: new Date(2026, 9, 24, 12, 0), allDay: false };

const queryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

const setup = (props: Partial<QuickEventModalProps> = {}) => {
    const client = queryClient();
    const onClose = vi.fn();
    const wrap = (node: ReactNode) => (
        <MemoryRouter>
            <QueryClientProvider client={client}>
                <ThemeProvider theme={theme}>{node}</ThemeProvider>
            </QueryClientProvider>
        </MemoryRouter>
    );
    const base: QuickEventModalProps = { isOpen: true, eventData: EVENT, onClose, onSave: vi.fn(), ...props };
    const utils = render(wrap(<QuickEventModal {...base} />));
    // Okno samo ustawia fokus w tytule chwilę po otwarciu - test czeka, aż to się stanie,
    // inaczej ten fokus zabierałby pole, w którym test zaczął pisać.
    const rerender = (next: Partial<QuickEventModalProps>) => utils.rerender(wrap(<QuickEventModal {...base} {...next} />));
    return { ...utils, onClose, rerender };
};

const ready = async () => {
    const title = screen.queryByPlaceholderText('Dodaj tytuł rezerwacji');
    if (title) await waitFor(() => expect(title).toHaveFocus());
    else await new Promise(r => setTimeout(r, 150));
};

const setWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
};

describe('QuickEventModal - render', () => {
    beforeEach(() => setWidth(1280));
    afterEach(() => setWidth(1024));

    it('Escape zamyka najpierw listę usług, dopiero drugi - całe okno', async () => {
        const user = userEvent.setup();
        const { onClose } = setup();
        await ready();

        await user.click(screen.getByPlaceholderText('Dodaj usługę…'));
        expect(screen.getByText('Dodaj nową usługę')).toBeInTheDocument();

        await user.keyboard('{Escape}');
        expect(onClose).not.toHaveBeenCalled();
        await waitFor(() => expect(screen.queryByText('Dodaj nową usługę')).not.toBeInTheDocument());

        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('fokus na pustym polu usług nie otwiera okna „Nowa usługa"', async () => {
        const user = userEvent.setup();
        setup();
        await ready();

        await user.click(screen.getByPlaceholderText('Dodaj usługę…'));

        expect(screen.queryByText('Nowa usługa')).not.toBeInTheDocument();
    });

    it('zamknięcie bez zapisu odkłada szkic, a „Wróć do szkicu" go przywraca', async () => {
        const user = userEvent.setup();
        const { rerender } = setup();
        await ready();

        await user.type(screen.getByPlaceholderText('Jan'), 'Anna');
        await user.type(screen.getByPlaceholderText('Kowalski'), 'Nowak');

        rerender({ isOpen: false });
        rerender({ isOpen: true });

        // Formularz startuje pusty, stare dane czekają w szkicu.
        expect(screen.getByPlaceholderText('Jan')).toHaveValue('');
        expect(screen.getByText('Niedokończona rezerwacja')).toBeInTheDocument();
        expect(screen.getByText(/Anna Nowak/)).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Wróć do szkicu' }));

        expect(screen.queryByText('Niedokończona rezerwacja')).not.toBeInTheDocument();
        expect(screen.getByPlaceholderText('Jan')).toHaveValue('Anna');
        expect(screen.getByPlaceholderText('Kowalski')).toHaveValue('Nowak');
    });

    it('„Wyczyść wszystko" da się cofnąć paskiem szkicu', async () => {
        const user = userEvent.setup();
        setup();
        await ready();

        await user.type(screen.getByPlaceholderText('Dodaj tytuł rezerwacji'), 'Powłoka');
        await user.click(screen.getByRole('button', { name: 'Wyczyść wszystko' }));

        expect(screen.getByPlaceholderText('Dodaj tytuł rezerwacji')).toHaveValue('');
        await user.click(screen.getByRole('button', { name: 'Wróć do szkicu' }));
        expect(screen.getByPlaceholderText('Dodaj tytuł rezerwacji')).toHaveValue('Powłoka');
    });

    it('Enter w tytule nie wysyła formularza', async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        setup({ onSave });
        await ready();

        await user.type(screen.getByPlaceholderText('Dodaj tytuł rezerwacji'), 'Powłoka{Enter}');

        expect(onSave).not.toHaveBeenCalled();
        expect(screen.getByPlaceholderText('Jan')).toHaveFocus();
    });

    it('komputer: sekcja SMS mówi, że bez numeru nic nie wyślemy', async () => {
        setup();
        await ready();

        expect(screen.getByText('Powiadomienia SMS')).toBeInTheDocument();
        expect(screen.getByText(/Klient nie ma numeru telefonu/)).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: 'Potwierdzenie rezerwacji' })).toBeDisabled();
    });

    it('telefon: klient z dwoma autami dostaje listę swoich aut, a nie same pola marki', async () => {
        setWidth(375);
        const user = userEvent.setup();
        setup();
        await ready();

        // Telefon: pierwsze pole to tytuł rezerwacji, drugie - imię klienta.
        await user.type(screen.getAllByRole('textbox')[1], 'Jan');
        await user.click(await screen.findByText('Jan Kowalski'));

        expect(await screen.findByText('Wybierz z 2 pojazdów klienta')).toBeInTheDocument();
        expect(screen.queryByLabelText('Marka')).not.toBeInTheDocument();
    });

    it('lista aut klienta stoi w portalu, nad treścią i stopką okna', async () => {
        const user = userEvent.setup();
        setup();
        await ready();

        await user.type(screen.getByPlaceholderText('Jan'), 'Jan');
        await user.click(await screen.findByText('Jan Kowalski'));

        const list = await screen.findByRole('listbox', { name: 'Pojazdy klienta' });
        expect(list.parentElement).toBe(document.body);
        expect(within(list).getByText('Audi A4')).toBeInTheDocument();
    });

    it('Escape zamyka okno z wybranym klientem i autem, choć fokus spadł poza okno', async () => {
        const user = userEvent.setup();
        const { onClose } = setup();
        await ready();

        await user.type(screen.getByPlaceholderText('Jan'), 'Jan');
        await user.click(await screen.findByText('Jan Kowalski'));
        const list = await screen.findByRole('listbox', { name: 'Pojazdy klienta' });
        await user.click(within(list).getByText('BMW X5'));
        await waitFor(() => expect(screen.queryByRole('listbox', { name: 'Pojazdy klienta' })).not.toBeInTheDocument());

        // Pole wyboru auta zniknęło razem z fokusem - klawisz trafia do <body>.
        (document.activeElement as HTMLElement | null)?.blur();
        expect(document.activeElement).toBe(document.body);
        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('telefon: „Cały dzień" i „Cykliczna" są dostępne', async () => {
        setWidth(375);
        setup();
        await ready();

        expect(screen.getByText('Cały dzień')).toBeInTheDocument();
        expect(screen.getByText('Cykliczna')).toBeInTheDocument();
    });
});
