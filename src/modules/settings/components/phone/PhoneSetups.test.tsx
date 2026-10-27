// @vitest-environment jsdom
//
// Skrót głosowy (dawniej strona „Skróty mobilne"): link niesie token działający bez
// sesji, więc token jest we fragmencie adresu (#token=), nie w query stringu - fragment
// nie trafia do serwera ani do logów proxy. „Unieważnij link" wydaje nowy token dopiero
// po potwierdzeniu. Na telefonie nie ma kodu QR - telefon od razu przechodzi na skrót.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { AppInstallSetup, VoiceShortcutSetup } from './PhoneSetups';

const state = vi.hoisted(() => ({ phone: false, token: 'tok-1' as string | null, installed: false }));
const rotate = vi.hoisted(() => vi.fn());

vi.mock('qrcode.react', () => ({ QRCodeSVG: ({ value }: { value: string }) => <output data-testid="qr">{value}</output> }));
vi.mock('@/modules/push/utils/webPush', () => ({ isMobileDevice: () => state.phone }));
vi.mock('@/modules/voice-commands/hooks/useMobileShortcutToken', () => ({
    useMobileShortcutToken: () => ({ data: state.token, isLoading: false }),
    useRotateMobileShortcutToken: () => ({ mutate: rotate, isPending: false }),
}));
vi.mock('@/modules/voice-commands/hooks/usePWAInstall', () => ({
    usePWAInstall: () => ({ isInstalled: state.installed, canInstall: false, install: vi.fn() }),
}));

const renderIn = (ui: React.ReactNode) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    state.phone = false;
    state.token = 'tok-1';
    state.installed = false;
});

describe('VoiceShortcutSetup', () => {
    it('kod QR prowadzi do strony z tokenem we fragmencie, nie w query stringu', () => {
        renderIn(<VoiceShortcutSetup />);

        const qr = screen.getByTestId('qr').textContent ?? '';
        expect(qr).toMatch(/\/m\/voice#token=tok-1$/);
        expect(qr).not.toContain('?token=');
    });

    it('„Unieważnij link" wydaje nowy token dopiero po potwierdzeniu', async () => {
        renderIn(<VoiceShortcutSetup />);

        await userEvent.click(screen.getByRole('button', { name: 'Unieważnij link' }));
        expect(rotate).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole('button', { name: 'Unieważnij' }));
        expect(rotate).toHaveBeenCalledTimes(1);
    });

    // Zgłoszenie z 27.10: strona ustawień dodana do ekranu głównego otwierała się na
    // logowaniu. Na telefonie od razu przechodzimy na sam skrót - to on działa bez sesji.
    it('na telefonie przechodzi od razu na skrót z tokenem we fragmencie', () => {
        state.phone = true;
        const Shortcut = () => {
            const { hash } = useLocation();
            return <output data-testid="shortcut">{hash}</output>;
        };
        renderIn(
            <MemoryRouter initialEntries={['/settings?tab=phone&view=voice']}>
                <Routes>
                    <Route path="/settings" element={<VoiceShortcutSetup />} />
                    <Route path="/m/voice" element={<Shortcut />} />
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.queryByTestId('qr')).toBeNull();
        expect(screen.getByTestId('shortcut').textContent).toBe('#token=tok-1');
    });

    it('bez tokenu mówi, że skrótów nie ma, i nie daje ich unieważnić', () => {
        state.token = null;
        renderIn(<VoiceShortcutSetup />);

        expect(screen.getByText('Skróty głosowe nie są dostępne dla tego konta.')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Unieważnij link' })).not.toBeInTheDocument();
    });
});

describe('AppInstallSetup', () => {
    it('na komputerze daje kod QR do CRM na telefonie i instrukcję dla wybranego telefonu', async () => {
        renderIn(<AppInstallSetup />);

        expect(screen.getByTestId('qr').textContent).toMatch(/\/dashboard$/);
        await userEvent.click(screen.getByRole('button', { name: 'iPhone' }));
        expect(screen.getByText(/Otwórz CRM w Safari/)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Android' }));
        expect(screen.getByText('Otwórz CRM w Chrome.')).toBeInTheDocument();
    });

    it('zainstalowana aplikacja nie dostaje instrukcji instalacji', () => {
        state.installed = true;
        renderIn(<AppInstallSetup />);

        expect(screen.getByText('CRM jest już na ekranie głównym tego urządzenia.')).toBeInTheDocument();
        expect(screen.queryByTestId('qr')).toBeNull();
    });
});
