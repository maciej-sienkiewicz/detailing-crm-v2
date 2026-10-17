// @vitest-environment jsdom
//
// Biznes zgłosił lawinę powiadomień o reklamach konkurencji, a jedyną drogą do ciszy
// było wyciszenie aplikacji w telefonie - razem z pushami o nowych zapytaniach. Te
// testy pilnują, że cisza jest teraz tu: wybór widać od razu po kliknięciu, a gdy
// zapis się nie uda, przełącznik nie udaje, że się udał.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import type { NotificationPreference } from './marketPreferences';

const showError = vi.fn();
vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess: vi.fn(), showError, showInfo: vi.fn() }),
}));

const list = vi.fn<() => Promise<NotificationPreference[]>>();
const update = vi.fn<(category: string, value: string) => Promise<NotificationPreference>>();
vi.mock('./marketPreferences', async (importOriginal) => {
    const original = await importOriginal<typeof import('./marketPreferences')>();
    return {
        ...original,
        notificationPreferencesApi: {
            list: () => list(),
            update: (category: string, value: string) => update(category, value),
        },
    };
});

import { MarketNotificationPreferences } from './MarketNotificationPreferences';

const SERVER: NotificationPreference[] = [
    { category: 'MARKET_DIGEST', value: 'WEEKLY', options: ['OFF', 'WEEKLY', 'DAILY'], defaultValue: 'WEEKLY' },
    { category: 'NEW_LOCAL_ADVERTISER', value: 'ON', options: ['ON', 'OFF'], defaultValue: 'ON' },
    { category: 'WATCHED_COMPETITOR_CAMPAIGN', value: 'OFF', options: ['ON', 'OFF'], defaultValue: 'OFF' },
];

const renderPreferences = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <ThemeProvider theme={theme}>
                <MarketNotificationPreferences />
            </ThemeProvider>
        </QueryClientProvider>
    );

const group = (name: string) => screen.getByRole('group', { name });
const pressed = (name: string) =>
    within(group(name)).getAllByRole('button').find((button) => button.getAttribute('aria-pressed') === 'true')?.textContent;

describe('MarketNotificationPreferences', () => {
    beforeEach(() => {
        list.mockReset().mockResolvedValue(SERVER.map((item) => ({ ...item })));
        update.mockReset();
        showError.mockReset();
    });

    it('pokazuje trzy ustawienia z wartościami z serwera i podpowiedzią do wybranej', async () => {
        renderPreferences();

        await waitFor(() => expect(pressed('Podsumowanie reklam w okolicy')).toBe('Raz w tygodniu'));
        expect(pressed('Nowa firma w moim rejonie')).toBe('Włączone');
        expect(pressed('Obserwowany konkurent rusza z kampanią')).toBe('Wyłączone');
        expect(screen.getByText(/W poniedziałek około 8:00/)).toBeTruthy();
    });

    it('wybór widać od razu i zapisuje się po kliknięciu', async () => {
        let resolve: (value: NotificationPreference) => void = () => {};
        update.mockImplementation(() => new Promise((done) => { resolve = done; }));
        renderPreferences();
        await waitFor(() => expect(pressed('Podsumowanie reklam w okolicy')).toBe('Raz w tygodniu'));

        fireEvent.click(within(group('Podsumowanie reklam w okolicy')).getByText('Wyłączone'));

        await waitFor(() => expect(pressed('Podsumowanie reklam w okolicy')).toBe('Wyłączone'));
        expect(update).toHaveBeenCalledWith('MARKET_DIGEST', 'OFF');
        resolve({ ...SERVER[0], value: 'OFF' });
        await waitFor(() => expect(pressed('Podsumowanie reklam w okolicy')).toBe('Wyłączone'));
    });

    it('nieudany zapis przywraca poprzednią wartość i mówi o tym', async () => {
        update.mockRejectedValue(new Error('500'));
        renderPreferences();
        await waitFor(() => expect(pressed('Obserwowany konkurent rusza z kampanią')).toBe('Wyłączone'));

        fireEvent.click(within(group('Obserwowany konkurent rusza z kampanią')).getByText('Włączone'));

        await waitFor(() => expect(showError).toHaveBeenCalled());
        expect(pressed('Obserwowany konkurent rusza z kampanią')).toBe('Wyłączone');
    });
});
