// @vitest-environment jsdom
//
// Ustawienia → Telefon: skład funkcji, scena z telefonem i ustawienia wjeżdżające po
// przycisku. Testy pilnują tego, co łatwo zepsuć przy przebudowie: jednego wypełnienia
// w oknie (CLAUDE.md §2), funkcji schowanych przed kimś, kto z nich nie skorzysta,
// stanu w składzie i dawnych adresów, które otwierały ustawienia wprost.
// W jsdom nie ma Element.animate - przejścia idą tu natychmiast (motion.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { useState } from 'react';
import { theme } from '@/common/theme';
import { PhoneSection } from './PhoneSection';
import type { PhoneFeatureId } from './phoneFeatures';

const state = vi.hoisted(() => ({ permissions: [] as string[], native: false, width: 0 }));
const api = vi.hoisted(() => ({
    listDevices: vi.fn(),
    getNotificationSettings: vi.fn(),
    listAccounts: vi.fn(),
}));

vi.mock('@/core/permissions', () => ({
    usePermissions: () => ({ can: (p: string) => state.permissions.includes(p), isOwner: false }),
}));
vi.mock('@/core/native/platform', () => ({ isNativeApp: () => state.native }));
vi.mock('@/modules/push/api/pushApi', () => ({
    pushApi: { listDevices: api.listDevices, getNotificationSettings: api.getNotificationSettings },
}));
vi.mock('@/modules/carddav', () => ({
    carddavApi: { listAccounts: api.listAccounts },
    CARDDAV_ACCOUNTS_KEY: ['carddav', 'accounts'],
}));
vi.mock('@/modules/voice-commands/hooks/useMobileShortcutToken', () => ({
    useMobileShortcutToken: () => ({ data: 'tok', isLoading: false }),
}));
vi.mock('@/modules/voice-commands/hooks/usePWAInstall', () => ({
    usePWAInstall: () => ({ isInstalled: false, canInstall: false, install: vi.fn() }),
}));
// Szerokość sekcji: 0 jak w jsdom (układ komputera), albo telefon.
vi.mock('@/common/hooks/useContainerWidth', () => ({
    useContainerWidth: () => [{ current: null }, state.width],
}));
// Same panele ustawień mają własne testy - tu liczy się, KIEDY się pojawiają.
vi.mock('./PhoneSetups', () => ({
    PhoneSetup: ({ feature }: { feature: string }) => <div data-testid="setup">ustawienia {feature}</div>,
}));

const onChange = vi.fn();

/** Rama ustawień w miniaturze: wybór idzie do adresu, a adres z powrotem do sekcji. */
interface HarnessProps { initial: PhoneFeatureId; openSetupOnArrival?: boolean; featureChosen?: boolean }

function Harness({ initial, openSetupOnArrival, featureChosen }: HarnessProps) {
    const [feature, setFeature] = useState(initial);
    return (
        <PhoneSection
            feature={feature}
            onFeatureChange={next => { onChange(next); setFeature(next); }}
            openSetupOnArrival={openSetupOnArrival}
            featureChosen={featureChosen}
        />
    );
}

const renderSection = (initial: PhoneFeatureId = 'push', openSetupOnArrival?: boolean, featureChosen?: boolean) => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ThemeProvider theme={theme}>
            <Harness initial={initial} openSetupOnArrival={openSetupOnArrival} featureChosen={featureChosen} />
        </ThemeProvider>
    </QueryClientProvider>,
);

const filledButtons = () => document.querySelectorAll('[data-variant="primary"]');

beforeEach(() => {
    state.permissions = ['CUSTOMERS_VIEW', 'VISITS_VIEW'];
    state.native = false;
    state.width = 0;
    api.listDevices.mockResolvedValue([]);
    api.getNotificationSettings.mockResolvedValue({ manageAll: false, devices: [] });
    api.listAccounts.mockResolvedValue([]);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('PhoneSection', () => {
    it('skład pokazuje wszystkie funkcje telefonu, a scena jeden krok następny', () => {
        renderSection();

        const tabs = screen.getAllByRole('tab').map(t => t.querySelector('strong')?.textContent);
        expect(tabs).toEqual(['Powiadomienia', 'Kto dzwoni', 'Dzwonienie z komputera', 'Lead głosem', 'Aparat dla komputera', 'Aplikacja']);
        expect(screen.getByRole('heading', { name: 'Powiadomienia' })).toBeInTheDocument();
        expect(filledButtons()).toHaveLength(1);
    });

    it('bez wglądu w klientów nie ma kontaktów ani dzwonienia - backend by ich nie wpuścił', () => {
        state.permissions = ['VISITS_VIEW'];
        renderSection();

        expect(screen.queryByRole('tab', { name: /Kto dzwoni/ })).toBeNull();
        expect(screen.queryByRole('tab', { name: /Dzwonienie z komputera/ })).toBeNull();
    });

    it('w aplikacji ze sklepu nie ma dzwonienia z komputera ani instalacji na ekranie', () => {
        state.native = true;
        renderSection();

        expect(screen.queryByRole('tab', { name: /Dzwonienie z komputera/ })).toBeNull();
        expect(screen.queryByRole('tab', { name: /Aplikacja/ })).toBeNull();
    });

    it('wybór w składzie zmienia scenę', async () => {
        renderSection();

        await userEvent.click(screen.getByRole('tab', { name: /Lead głosem/ }));

        expect(onChange).toHaveBeenCalledWith('voice');
        expect(await screen.findByRole('heading', { name: 'Lead głosem' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /Lead głosem/ })).toHaveAttribute('aria-selected', 'true');
    });

    it('strzałki chodzą po składzie jak po zakładkach', () => {
        renderSection();

        fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowDown' });
        expect(onChange).toHaveBeenLastCalledWith('calls');
        fireEvent.keyDown(screen.getByRole('tablist'), { key: 'End' });
        expect(onChange).toHaveBeenLastCalledWith('app');
    });

    it('przycisk otwiera ustawienia funkcji i chowa skład, „Wróć" przywraca opis', async () => {
        renderSection();

        await userEvent.click(screen.getByRole('button', { name: /Ustaw powiadomienia/ }));

        expect(await screen.findByTestId('setup')).toHaveTextContent('ustawienia push');
        expect(screen.getByRole('tablist').closest('[inert]')).not.toBeNull();

        await userEvent.click(screen.getByRole('button', { name: 'Wróć' }));

        await waitFor(() => expect(screen.queryByTestId('setup')).toBeNull());
        expect(screen.getByRole('button', { name: /Ustaw powiadomienia/ })).toBeInTheDocument();
        expect(screen.getByRole('tablist').closest('[inert]')).toBeNull();
    });

    it('aparat nie ma czego ustawiać - zamiast przycisku mówi, gdzie użyć kodu QR', () => {
        renderSection('camera');

        expect(screen.getByText('Przyjęcie pojazdu')).toBeInTheDocument();
        expect(screen.getByText('import kontaktów z telefonu')).toBeInTheDocument();
        expect(filledButtons()).toHaveLength(0);
    });

    it('dawny adres powiadomień otwiera ustawienia od razu', () => {
        renderSection('push', true);

        expect(screen.getByTestId('setup')).toHaveTextContent('ustawienia push');
    });

    it('skład mówi, na ilu urządzeniach coś już działa', async () => {
        api.listDevices.mockResolvedValue([
            { id: 'a', deviceName: 'iPhone', createdAt: '', lastUsedAt: null, active: true },
            { id: 'b', deviceName: 'Pixel', createdAt: '', lastUsedAt: null, active: true },
        ]);
        api.listAccounts.mockResolvedValue([]);
        renderSection();

        expect(await screen.findByText('Włączone na 2 urządzeniach')).toBeInTheDocument();
        expect(await screen.findAllByText('Nieustawione')).not.toHaveLength(0);
    });
});

// Na telefonie nie ma przewijanego paska zakładek: lista funkcji jak spis ustawień,
// a po dotknięciu ekran jednej z nich z powrotem do listy.
describe('PhoneSection na telefonie', () => {
    beforeEach(() => { state.width = 390; });

    it('zaczyna od listy funkcji, bez zakładek i bez sceny', () => {
        renderSection();

        expect(screen.queryByRole('tablist')).toBeNull();
        expect(screen.getByRole('button', { name: /Powiadomienia/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Aparat dla komputera/ })).toBeInTheDocument();
        expect(screen.queryByRole('heading')).toBeNull();
    });

    it('dotknięcie funkcji otwiera jej ekran, a „Funkcje telefonu" wraca do listy', async () => {
        renderSection();

        await userEvent.click(screen.getByRole('button', { name: /Lead głosem/ }));

        expect(await screen.findByRole('heading', { name: 'Lead głosem' })).toBeInTheDocument();
        expect(onChange).toHaveBeenCalledWith('voice');

        await userEvent.click(screen.getByRole('button', { name: 'Funkcje telefonu' }));

        expect(await screen.findByRole('button', { name: /Kto dzwoni/ })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Lead głosem' })).toBeNull();
    });

    it('na ekranie funkcji przycisk otwiera jej ustawienia, a „Wróć" wraca do opisu', async () => {
        renderSection();

        await userEvent.click(screen.getByRole('button', { name: /Kto dzwoni/ }));
        await userEvent.click(await screen.findByRole('button', { name: /Dodaj klientów do kontaktów/ }));

        expect(await screen.findByTestId('setup')).toHaveTextContent('ustawienia calls');
        await userEvent.click(screen.getByRole('button', { name: 'Wróć' }));
        expect(await screen.findByRole('button', { name: 'Funkcje telefonu' })).toBeInTheDocument();
    });

    it('adres wskazujący funkcję otwiera od razu jej ekran', () => {
        renderSection('calls', false, true);

        expect(screen.getByRole('heading', { name: 'Kto dzwoni' })).toBeInTheDocument();
    });
});
