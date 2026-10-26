// @vitest-environment jsdom
//
// Okno „Zarządzaj zapytaniami” z Tablicy: animacje ze strony „Poznaj program” grają
// z plików aplikacji (wprost index.html - nginx oddałby na katalog samą aplikację),
// zaczyna od tablicy zapytań, a „Podłącz pocztę” prowadzi do konfiguracji.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { MailSetupModal } from './MailSetupModal';

afterEach(() => cleanup());

const setup = (step: 'connect' | 'auto-leads' = 'connect') => {
    const onClose = vi.fn();
    const router = createMemoryRouter([
        { path: '/dashboard', element: <MailSetupModal isOpen onClose={onClose} step={step} /> },
        { path: '/communication/mailboxes', element: <p>podłączanie poczty</p> },
        { path: '/settings', element: <p>ustawienia</p> },
    ], { initialEntries: ['/dashboard'] });
    render(<ThemeProvider theme={theme}><RouterProvider router={router} /></ThemeProvider>);
    return { router, onClose };
};

describe('MailSetupModal', () => {
    it('zaczyna od animacji tablicy zapytań, z pliku aplikacji', () => {
        setup();
        const frame = screen.getByTitle('Animacja: Łatwy i automatyczny podgląd wszystkich zapytań');
        expect(frame).toHaveAttribute('src', '/animacje/jak-dziala-tablica-zapytan/index.html');
    });

    it('pozycja z listy po lewej przełącza animację', () => {
        setup();
        fireEvent.click(screen.getByRole('button', { name: 'Konfiguracja maila w kilka minut' }));
        expect(screen.getByTitle('Animacja: Konfiguracja maila w kilka minut')).toHaveAttribute('src', '/animacje/jak-skonfigurowac-poczte/index.html');
        expect(screen.getByRole('button', { name: 'Konfiguracja maila w kilka minut' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('„Podłącz pocztę” zamyka okno i prowadzi do konfiguracji skrzynki', () => {
        const { router, onClose } = setup();
        fireEvent.click(screen.getByRole('button', { name: /Podłącz pocztę/ }));
        expect(onClose).toHaveBeenCalled();
        expect(router.state.location.pathname).toBe('/communication/mailboxes');
    });

    it('poczta już jest: „Włącz tworzenie zapytań” prowadzi do ustawień zapytań', () => {
        const { router, onClose } = setup('auto-leads');
        expect(screen.queryByRole('button', { name: /Podłącz pocztę/ })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /Włącz tworzenie zapytań/ }));
        expect(onClose).toHaveBeenCalled();
        expect(router.state.location.pathname).toBe('/settings');
        expect(router.state.location.search).toBe('?tab=leads');
    });
});
