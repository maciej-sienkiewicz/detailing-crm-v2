// @vitest-environment jsdom
//
// Przypomnienia o odpowiedzi (jak w PagerDuty / Opsgenie): właściciel układa łańcuch
// „od razu push, po godzinie push, po 2 godz. SMS do kierownika, po 4 SMS do mnie".
// Ten test przechodzi dokładnie taki scenariusz przez prawdziwy edytor.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { leadsSettingsApi } from '../../api/leadsSettingsApi';
import type { EscalationPolicyResponse } from '../../types';
import { EscalationPanel } from './EscalationPanel';

vi.mock('../../api/leadsSettingsApi', () => ({
    leadsSettingsApi: { getEscalationPolicy: vi.fn(), updateEscalationPolicy: vi.fn() },
}));

const DEFAULT: EscalationPolicyResponse = {
    custom: false,
    policy: {
        steps: [
            { id: 'default-instant', afterMinutes: 0, channel: 'PUSH', anytime: true, recipients: [{ kind: 'TEAM' }] },
            { id: 'default-2h', afterMinutes: 120, channel: 'PUSH', anytime: false, recipients: [{ kind: 'TEAM' }] },
        ],
        workingHours: {
            alwaysOn: false, fromHour: 8, toHour: 20,
            days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
        },
    },
    people: [
        { userId: 'owner', name: 'Maciej Właściciel', phone: '+48600100200', isOwner: true },
        { userId: 'anna', name: 'Anna Nowak', phone: null, isOwner: false },
    ],
};

const renderPanel = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <EscalationPanel />
                </ToastProvider>
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

const step = (n: number) => screen.getByRole('region', { name: `Krok ${n}` });

beforeEach(() => {
    vi.mocked(leadsSettingsApi.getEscalationPolicy).mockResolvedValue(DEFAULT);
    vi.mocked(leadsSettingsApi.updateEscalationPolicy).mockImplementation(async policy => ({
        ...DEFAULT, custom: policy !== null, policy: policy ?? DEFAULT.policy,
    }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('EscalationPanel', () => {
    it('pokazuje łańcuch jako oś czasu, bez kropek-separatorów', async () => {
        renderPanel();
        const timeline = await screen.findByRole('list', { name: 'Kroki przypomnień' });
        expect(within(timeline).getAllByRole('listitem').map(li => li.textContent)).toEqual([
            'Od razuPowiadomienie: cały zespóło każdej porze',
            'Po 2 godz.Powiadomienie: cały zespół',
        ]);
        expect(screen.getByText(/Liczymy czas tylko w godzinach pracy: codziennie, 8:00–20:00\. To ustawienia domyślne\./)).toBeInTheDocument();
        expect(document.body.textContent).not.toMatch(/[·•]/);
    });

    it('scenariusz właściciela: push od razu, po godzinie push, po 2 godz. SMS do kierownika, po 4 SMS do mnie', async () => {
        renderPanel();
        fireEvent.click(await screen.findByRole('button', { name: 'Zmień' }));

        // Krok 2: z „po 2 godz." robi się „po 1 godz.".
        fireEvent.change(within(step(2)).getByLabelText('Po jakim czasie bez odpowiedzi'), { target: { value: '1' } });

        // Krok 3: po 2 godz. SMS na numer kierownika.
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj krok' }));
        fireEvent.change(within(step(3)).getByLabelText('Po jakim czasie bez odpowiedzi'), { target: { value: '2' } });
        fireEvent.click(within(step(3)).getByRole('button', { name: 'SMS' }));
        fireEvent.click(within(step(3)).getByRole('button', { name: 'Dodaj inny numer' }));
        fireEvent.change(within(step(3)).getByLabelText('Nazwa'), { target: { value: 'Kierownik' } });
        fireEvent.change(within(step(3)).getByRole('textbox', { name: '' }) as HTMLInputElement, { target: { value: '601234567' } });

        // Krok 4: po 4 godz. SMS do właściciela (numer z konta); Anna nie ma numeru.
        fireEvent.click(screen.getByRole('button', { name: 'Dodaj krok' }));
        fireEvent.change(within(step(4)).getByLabelText('Po jakim czasie bez odpowiedzi'), { target: { value: '4' } });
        fireEvent.click(within(step(4)).getByRole('button', { name: 'SMS' }));
        expect(within(step(4)).getByRole('checkbox', { name: /Anna Nowak/ })).toBeDisabled();
        fireEvent.click(within(step(4)).getByRole('checkbox', { name: /Maciej Właściciel/ }));

        fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

        await waitFor(() => expect(leadsSettingsApi.updateEscalationPolicy).toHaveBeenCalledTimes(1));
        const saved = vi.mocked(leadsSettingsApi.updateEscalationPolicy).mock.calls[0][0]!;
        expect(saved.steps.map(s => [s.afterMinutes, s.channel, s.recipients])).toEqual([
            [0, 'PUSH', [{ kind: 'TEAM' }]],
            [60, 'PUSH', [{ kind: 'TEAM' }]],
            [120, 'SMS', [{ kind: 'PHONE', phone: '+48 601 234 567', label: 'Kierownik' }]],
            [240, 'SMS', [{ kind: 'USER', userId: 'owner' }]],
        ]);
        // Po zapisie panel boczny znika, a oś czasu pokazuje nowy łańcuch.
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(await screen.findByText('Po 4 godz.')).toBeInTheDocument();
    });

    it('krok bez odbiorcy nie idzie do zapisu - komunikat wskazuje, który', async () => {
        renderPanel();
        fireEvent.click(await screen.findByRole('button', { name: 'Zmień' }));
        fireEvent.click(within(step(2)).getByRole('checkbox', { name: 'Wszyscy, którzy obsługują zapytania' }));
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Krok 2: wybierz, kogo powiadomić.');
        expect(leadsSettingsApi.updateEscalationPolicy).not.toHaveBeenCalled();
    });

    it('„Przywróć ustawienia domyślne" wysyła null', async () => {
        vi.mocked(leadsSettingsApi.getEscalationPolicy).mockResolvedValue({ ...DEFAULT, custom: true });
        renderPanel();
        fireEvent.click(await screen.findByRole('button', { name: 'Zmień' }));
        fireEvent.click(screen.getByRole('button', { name: 'Przywróć ustawienia domyślne' }));
        await waitFor(() => expect(leadsSettingsApi.updateEscalationPolicy).toHaveBeenCalledWith(null));
    });
});
