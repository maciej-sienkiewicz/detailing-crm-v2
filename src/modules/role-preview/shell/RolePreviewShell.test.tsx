// @vitest-environment jsdom

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RolePreviewState } from '../rolePreviewApi';

const api = vi.hoisted(() => ({
    enter: vi.fn(),
    current: vi.fn(),
    updateRole: vi.fn(),
    end: vi.fn(),
}));
vi.mock('../rolePreviewApi', () => ({ rolePreviewApi: api }));

import { RolePreviewShell } from './RolePreviewShell';

const state: RolePreviewState = {
    roleName: 'Recepcja',
    permissions: [],
    trackWorkTime: false,
    initialPermissions: [],
    initialTrackWorkTime: false,
    enabledFeatures: [],
    catalog: [],
    openedByName: 'Anna',
    expiresAt: '2026-09-23T12:00:00Z',
    idleExpiresAt: '2026-09-23T11:30:00Z',
    simulatedEffects: [],
};

const code = (seed: string) => seed.padEnd(43, 'x');

describe('okno podglądu roli', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.sessionStorage.clear();
    });

    it('wymienia kod raz, także gdy React uruchamia efekty dwukrotnie', async () => {
        api.enter.mockResolvedValue('entered');
        api.current.mockResolvedValue(state);

        render(<React.StrictMode><RolePreviewShell entryCode={code('a')} /></React.StrictMode>);

        expect(await screen.findByText(/Rola „Recepcja”/)).toBeInTheDocument();
        expect(screen.getByText('Podgląd: tak widzi aplikację pracownik z tą rolą')).toBeInTheDocument();
        expect(api.enter).toHaveBeenCalledTimes(1);
        expect(screen.getByTitle('Aplikacja CRM oczami pracownika z podglądaną rolą')).toHaveAttribute('src', '/');
    });

    it('użyty albo wygasły link mówi to wprost', async () => {
        api.enter.mockRejectedValue({ response: { status: 409 } });

        render(<RolePreviewShell entryCode={code('b')} />);

        expect(await screen.findByText('Ten link do podglądu już nie działa')).toBeInTheDocument();
        expect(api.current).not.toHaveBeenCalled();
    });

    it('nie czeka na piaskownicę, gdy okno studia zgłosiło odmowę serwera', async () => {
        const startFailure = { reason: () => 'W tym studiu jest już otwartych 5 podglądów roli.' };

        render(<RolePreviewShell entryCode={code('c')} startFailure={startFailure} />);

        expect(await screen.findByText('Nie udało się otworzyć podglądu')).toBeInTheDocument();
        expect(screen.getByText(/W tym studiu jest już otwartych 5 podglądów roli\./)).toBeInTheDocument();
        expect(api.enter).not.toHaveBeenCalled();
    });

    it('przerywa czekanie na piaskownicę, gdy odmowa przyjdzie w trakcie', async () => {
        api.enter.mockResolvedValue('pending');
        let refused: string | null = null;
        const startFailure = { reason: () => refused };

        render(<RolePreviewShell entryCode={code('d')} startFailure={startFailure} />);
        await vi.waitFor(() => expect(api.enter).toHaveBeenCalledTimes(1));
        refused = 'Nie udało się przygotować podglądu.';

        expect(await screen.findByText('Nie udało się otworzyć podglądu', {}, { timeout: 3000 })).toBeInTheDocument();
        expect(api.enter).toHaveBeenCalledTimes(1);
    });

    it('bez kodu i bez żywej sesji pokazuje, że podgląd się zakończył', async () => {
        api.current.mockRejectedValue({ response: { status: 401 } });

        render(<RolePreviewShell entryCode={null} />);

        expect(await screen.findByText('Podgląd roli się zakończył')).toBeInTheDocument();
        expect(api.enter).not.toHaveBeenCalled();
    });

    // Audyt 05.11: podgląd otwarty w drugim oknie przejmował sesję tego okna (jedno ciasteczko
    // na adres podglądu). Okno pokazywało cudzą rolę, a „Zakończ podgląd” kończyło tamten podgląd.
    it('przejęty przez nowszy podgląd mówi to wprost zamiast pokazywać cudzą rolę', async () => {
        api.enter.mockResolvedValue('entered');
        api.current.mockResolvedValue(state);
        render(<RolePreviewShell entryCode={code('e')} />);
        expect(await screen.findByText(/Rola „Recepcja”/)).toBeInTheDocument();

        api.current.mockResolvedValue({ ...state, roleName: 'Detailer', expiresAt: '2026-09-23T12:05:00Z' });
        // Nasłuch powrotu do karty podpina efekt, który React odpala osobnym zadaniem już po
        // wyrenderowaniu roli - pojedyncze zdarzenie potrafiło go wyprzedzić i test raz na kilka
        // przebiegów padał. Zdarzenie powtarzamy, aż okno zareaguje.
        await waitFor(() => {
            document.dispatchEvent(new Event('visibilitychange'));
            expect(screen.getByText('Ten podgląd zastąpił nowszy')).toBeInTheDocument();
        });
        expect(screen.getByText(/podgląd roli „Detailer”/)).toBeInTheDocument();
        expect(screen.queryByTitle('Aplikacja CRM oczami pracownika z podglądaną rolą')).not.toBeInTheDocument();
    });

    it('„Zakończ podgląd” w przejętym oknie nie kończy podglądu z drugiego okna', async () => {
        api.enter.mockResolvedValue('entered');
        api.current.mockResolvedValue(state);
        render(<RolePreviewShell entryCode={code('f')} />);
        expect(await screen.findByText(/Rola „Recepcja”/)).toBeInTheDocument();

        api.current.mockResolvedValue({ ...state, roleName: 'Detailer', expiresAt: '2026-09-23T12:05:00Z' });
        fireEvent.click(screen.getByRole('button', { name: 'Zakończ podgląd' }));

        expect(await screen.findByText('Ten podgląd zastąpił nowszy')).toBeInTheDocument();
        expect(api.end).not.toHaveBeenCalled();
    });

    it('przeładowana karta pamięta swój podgląd', async () => {
        window.sessionStorage.setItem('role-preview:own-expires-at', '2026-09-23T12:05:00Z');
        api.current.mockResolvedValue(state);

        render(<RolePreviewShell entryCode={null} />);

        expect(await screen.findByText('Ten podgląd zastąpił nowszy')).toBeInTheDocument();
    });

    it('błąd wczytania stanu nie zostawia kręcącego się kółka', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            api.current.mockRejectedValue({ response: { status: 503 } });
            render(<RolePreviewShell entryCode={null} />);
            await act(async () => { await vi.advanceTimersByTimeAsync(12_000); });

            expect(screen.getByText('Nie udało się otworzyć podglądu')).toBeInTheDocument();
            expect(screen.getByText(/Nie udało się wczytać podglądu\./)).toBeInTheDocument();
            expect(api.current).toHaveBeenCalledTimes(5);
        } finally {
            vi.useRealTimers();
        }
    });

    it('chwilowy błąd serwera przy wejściu jest ponawiany', async () => {
        api.enter
            .mockRejectedValueOnce({ response: { status: 503 } })
            .mockResolvedValue('entered');
        api.current.mockResolvedValue(state);

        render(<RolePreviewShell entryCode={code('g')} />);

        expect(await screen.findByText(/Rola „Recepcja”/, {}, { timeout: 3000 })).toBeInTheDocument();
        expect(api.enter).toHaveBeenCalledTimes(2);
    });

    it('komunikat serwera bez kropki nie skleja się z następnym zdaniem', async () => {
        api.enter.mockRejectedValue({ response: { status: 404, data: { detail: 'Podgląd roli nie istnieje' } } });

        render(<RolePreviewShell entryCode={code('h')} />);

        expect(await screen.findByText('Podgląd roli nie istnieje. Zamknij to okno i otwórz podgląd ponownie z ustawień ról.')).toBeInTheDocument();
    });

    it('nieudane zakończenie nie twierdzi, że dane już usunięto', async () => {
        const close = vi.spyOn(window, 'close').mockImplementation(() => {});
        api.enter.mockResolvedValue('entered');
        api.current.mockResolvedValue(state);
        api.end.mockRejectedValue({ response: { status: 500 } });
        render(<RolePreviewShell entryCode={code('i')} />);
        expect(await screen.findByText(/Rola „Recepcja”/)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Zakończ podgląd' }));

        expect(await screen.findByText(/Dane przykładowe znikną same/)).toBeInTheDocument();
        expect(screen.queryByText(/zostały usunięte/)).not.toBeInTheDocument();
        close.mockRestore();
    });

    it('otwarcie panelu odświeża listę tego, co by wyszło', async () => {
        api.enter.mockResolvedValue('entered');
        api.current.mockResolvedValue(state);
        render(<RolePreviewShell entryCode={code('j')} />);
        expect(await screen.findByText(/Rola „Recepcja”/)).toBeInTheDocument();
        const calls = api.current.mock.calls.length;

        fireEvent.click(screen.getByRole('button', { name: /Uprawnienia/ }));
        expect(api.current).toHaveBeenCalledTimes(calls);
        fireEvent.click(screen.getByRole('button', { name: /Uprawnienia/ }));

        await vi.waitFor(() => expect(api.current).toHaveBeenCalledTimes(calls + 1));
    });
});
