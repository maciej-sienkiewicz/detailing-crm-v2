// @vitest-environment jsdom
//
// Link skrótów mobilnych niesie token działający bez sesji. Token jest we fragmencie
// adresu (#token=), nie w query stringu - fragment nie trafia do serwera ani do logów
// proxy. „Unieważnij link" wydaje nowy token po potwierdzeniu.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { MobileShortcutsView } from './MobileShortcutsView';

const state = vi.hoisted(() => ({ mobile: false, token: 'tok-1' as string | null }));
const rotate = vi.hoisted(() => vi.fn());

vi.mock('qrcode.react', () => ({ QRCodeSVG: ({ value }: { value: string }) => <output data-testid="qr">{value}</output> }));
vi.mock('../hooks/usePWAInstall', () => ({ usePWAInstall: () => ({ isInstalled: false, canInstall: false, install: vi.fn() }) }));
vi.mock('../hooks/useMobileShortcutToken', () => ({
    useMobileShortcutToken: () => ({ data: state.token, isLoading: false }),
    useRotateMobileShortcutToken: () => ({ mutate: rotate, isPending: false }),
}));

beforeAll(() => {
    window.matchMedia = ((query: string) => ({
        matches: state.mobile, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
});

const VoicePage = () => {
    const location = useLocation();
    return <p>strona głosowa {location.search}{location.hash}</p>;
};

const renderView = () => render(
    <MemoryRouter initialEntries={['/mobile-shortcuts']}>
        <ThemeProvider theme={theme}>
            <Routes>
                <Route path="/mobile-shortcuts" element={<MobileShortcutsView />} />
                <Route path="/m/voice" element={<VoicePage />} />
            </Routes>
        </ThemeProvider>
    </MemoryRouter>,
);

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    state.mobile = false;
    state.token = 'tok-1';
});

describe('MobileShortcutsView', () => {
    it('kod QR prowadzi do strony z tokenem we fragmencie, nie w query stringu', () => {
        renderView();

        const qr = screen.getAllByTestId('qr')[0].textContent ?? '';
        expect(qr).toMatch(/\/m\/voice#token=tok-1$/);
        expect(qr).not.toContain('?token=');
    });

    it('„Unieważnij link" wydaje nowy token dopiero po potwierdzeniu', async () => {
        renderView();

        await userEvent.click(screen.getByRole('button', { name: 'Unieważnij link' }));
        expect(rotate).not.toHaveBeenCalled();

        await userEvent.click(screen.getByRole('button', { name: 'Unieważnij' }));
        expect(rotate).toHaveBeenCalledTimes(1);
    });

    it('na telefonie przechodzi na stronę głosową z tokenem we fragmencie', () => {
        state.mobile = true;

        renderView();

        expect(screen.getByText('strona głosowa #token=tok-1')).toBeInTheDocument();
    });

    it('bez tokenu mówi, że skróty nie są włączone', () => {
        state.token = null;

        renderView();

        expect(screen.getByText('Skróty mobilne nie są włączone')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Unieważnij link' })).not.toBeInTheDocument();
    });
});
