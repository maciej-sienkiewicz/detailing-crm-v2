// @vitest-environment jsdom
//
// Przypomnienie o rezerwacji: każdy wpisuje sam, ile wcześniej - liczbą i jednostką,
// a nie wyborem z kilku gotowych czasów. Testy pilnują, że wpis trafia na serwer
// w zapisie, który serwer rozumie (czas ISO-8601), że wpis spoza zakresu nie idzie
// na serwer, i że bez wsparcia serwera nie ma pól bez skutku.
//
// Włącznika tu nie ma (od 25.10.2026): czy przypomnienie przychodzi, decyduje tabela
// „Rodzaje powiadomień". Drugi włącznik w tym wierszu dawał ekran „włączone w tabeli"
// przy przypomnieniu, które nie przychodziło.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import type { NotificationPreference } from './marketPreferences';

const showError = vi.fn();
vi.mock('@/common/components/Toast', () => ({
    useToast: () => ({ showSuccess: vi.fn(), showError, showInfo: vi.fn() }),
}));

const can = vi.fn<(required: unknown) => boolean>();
vi.mock('@/core/permissions', () => ({
    usePermissions: () => ({ can }),
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

import { AppointmentReminderSetting } from './AppointmentReminderSetting';

const reminder = (value: string): NotificationPreference => ({
    category: 'APPOINTMENT_REMINDER', value, options: [], defaultValue: 'PT1H',
});

const renderSetting = () =>
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <ThemeProvider theme={theme}>
                <AppointmentReminderSetting />
            </ThemeProvider>
        </QueryClientProvider>
    );

const amount = () => screen.getByRole('textbox', { name: 'Ile przed rezerwacją' }) as HTMLInputElement;
const unit = () => screen.getByRole('combobox', { name: 'Jednostka czasu' }) as HTMLSelectElement;

describe('AppointmentReminderSetting', () => {
    beforeEach(() => {
        can.mockReset().mockReturnValue(true);
        list.mockReset().mockResolvedValue([reminder('PT1H')]);
        update.mockReset().mockImplementation(async (_category, value) => reminder(value));
        showError.mockReset();
    });

    it('bez własnego wyboru pokazuje godzinę przed rezerwacją, bez włącznika', async () => {
        renderSetting();
        await waitFor(() => expect(amount().value).toBe('1'));
        expect(unit().value).toBe('HOURS');
        expect(screen.getByText(/godzinę przed każdą rezerwacją/)).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Wyłączone' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Włączone' })).toBeNull();
    });

    it('dawne „OFF" ze starszego serwera pokazuje godzinę i niczego samo nie zapisuje', async () => {
        list.mockResolvedValue([reminder('OFF')]);
        renderSetting();
        await waitFor(() => expect(amount().value).toBe('1'));
        expect(unit().value).toBe('HOURS');
        await new Promise((resolve) => setTimeout(resolve, 900));
        expect(update).not.toHaveBeenCalled();
    });

    it('zapisuje czas wpisany przez osobę: 45 minut', async () => {
        list.mockResolvedValue([reminder('PT1H')]);
        renderSetting();
        await waitFor(() => expect(amount().value).toBe('1'));

        fireEvent.change(amount(), { target: { value: '45' } });
        fireEvent.change(unit(), { target: { value: 'MINUTES' } });

        await waitFor(() => expect(update).toHaveBeenCalledWith('APPOINTMENT_REMINDER', 'PT45M'));
        // Liczba wpisana przy godzinach nie poszła na serwer jako 45 godzin.
        expect(update).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/45 minut przed każdą rezerwacją/)).toBeTruthy();
        expect(screen.getByText(/Przy rezerwacji całodniowej przychodzi o 7:15/)).toBeTruthy();
    });

    it('zapisuje sam z siebie po chwili bez pisania, bez przycisku', async () => {
        list.mockResolvedValue([reminder('PT1H')]);
        renderSetting();
        await waitFor(() => expect(amount().value).toBe('1'));

        fireEvent.change(amount(), { target: { value: '3' } });

        await waitFor(() => expect(update).toHaveBeenCalledWith('APPOINTMENT_REMINDER', 'PT3H'), { timeout: 2000 });
    });

    it('po wyjściu z pola pokazuje czas w pełnej jednostce: 120 minut to 2 godziny', async () => {
        list.mockResolvedValue([reminder('PT45M')]);
        renderSetting();
        await waitFor(() => expect(amount().value).toBe('45'));

        fireEvent.change(amount(), { target: { value: '120' } });
        fireEvent.blur(amount());

        await waitFor(() => expect(update).toHaveBeenCalledWith('APPOINTMENT_REMINDER', 'PT2H'));
        await waitFor(() => expect(amount().value).toBe('2'));
        expect(unit().value).toBe('HOURS');
    });

    it('czas spoza zakresu zostaje w polu z komunikatem i nie idzie na serwer', async () => {
        list.mockResolvedValue([reminder('PT1H')]);
        renderSetting();
        await waitFor(() => expect(amount().value).toBe('1'));

        fireEvent.change(amount(), { target: { value: '31' } });
        fireEvent.change(unit(), { target: { value: 'DAYS' } });
        fireEvent.blur(amount());

        expect(screen.getByRole('alert').textContent).toBe('Wpisz od 1 minuty do 30 dni.');
        expect(amount().value).toBe('31');
        await new Promise((resolve) => setTimeout(resolve, 900));
        expect(update).not.toHaveBeenCalled();
    });

    it('nieudany zapis przywraca poprzedni czas', async () => {
        list.mockResolvedValue([reminder('PT1H')]);
        update.mockRejectedValue(new Error('offline'));
        renderSetting();
        await waitFor(() => expect(amount().value).toBe('1'));

        fireEvent.change(unit(), { target: { value: 'DAYS' } });

        await waitFor(() => expect(showError).toHaveBeenCalled());
        expect(unit().value).toBe('HOURS');
    });

    it('bez wsparcia serwera i bez dostępu do kalendarza nic nie pokazuje', async () => {
        list.mockResolvedValue([]);
        const { container } = renderSetting();
        await waitFor(() => expect(list).toHaveBeenCalled());
        await waitFor(() => expect(container.textContent).toBe(''));

        can.mockReturnValue(false);
        const other = renderSetting();
        expect(other.container.textContent).toBe('');
    });
});
