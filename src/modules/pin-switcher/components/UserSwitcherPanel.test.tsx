// @vitest-environment jsdom
//
// „Sesja zablokowana" (zgłoszenie z 07.10): z ekranu blokady wychodzi się tylko PIN-em
// albo hasłem. „Zaloguj podając hasło" dawniej najpierw zdejmowało blokadę, a dopiero
// potem szło na /login - teraz kończy sesję i dalej wpuszcza wyłącznie poprawne hasło.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const navigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async importOriginal => ({
    ...(await importOriginal<typeof import('react-router-dom')>()),
    useNavigate: () => navigate,
}));

const auth = vi.hoisted(() => ({
    user: { userId: 'u-owner', role: 'OWNER' },
    setUser: vi.fn(),
    setAuthenticated: vi.fn(),
}));
vi.mock('@/core/context/AuthContext', () => ({ useAuth: () => auth }));

const authApi = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock('@/modules/auth/api/authApi', () => ({ authApi }));

const pinApi = vi.hoisted(() => ({ getStudioProfiles: vi.fn(), switchUser: vi.fn(), resetPinLock: vi.fn() }));
vi.mock('../api/pinApi', () => ({ pinApi }));

import { UserSwitcherPanel } from './UserSwitcherPanel';

const renderPanel = (lockMode: boolean) => {
    const onClose = vi.fn();
    render(
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <MemoryRouter>
                <UserSwitcherPanel onClose={onClose} lockMode={lockMode} />
            </MemoryRouter>
        </QueryClientProvider>,
    );
    return { onClose };
};

beforeEach(() => {
    authApi.logout.mockResolvedValue(undefined);
    pinApi.getStudioProfiles.mockResolvedValue([
        { userId: 'u-anna', firstName: 'Anna', lastName: 'Nowak', isOwner: false, hasPinConfigured: true, pinLocked: true },
        { userId: 'u-jan', firstName: 'Jan', lastName: 'Kowalski', isOwner: false, hasPinConfigured: true, pinLocked: false },
    ]);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
});

describe('UserSwitcherPanel - ekran blokady', () => {
    it('„Zaloguj podając hasło" kończy sesję zamiast zdejmować blokadę', async () => {
        const { onClose } = renderPanel(true);
        fireEvent.click(screen.getByRole('button', { name: 'Zaloguj podając hasło' }));

        await waitFor(() => expect(navigate).toHaveBeenCalledWith('/login'));
        expect(authApi.logout).toHaveBeenCalledTimes(1);
        expect(auth.setAuthenticated).toHaveBeenCalledWith(false);
        expect(onClose).not.toHaveBeenCalled();
    });

    it('bez „Odblokuj PIN" - przed zablokowanym ekranem nie siedzi jeszcze właściciel', async () => {
        renderPanel(true);
        expect(await screen.findByText('Anna Nowak')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /Odblokuj PIN/ })).toBeNull();
    });

    it('udany PIN daje znać innym kartom, że sesja jest odblokowana', async () => {
        pinApi.switchUser.mockResolvedValue({
            success: true,
            user: { userId: 'u-jan', studioId: 's1', firstName: 'Jan', lastName: 'Kowalski', role: 'USER' },
        });
        const { onClose } = renderPanel(true);
        fireEvent.click(await screen.findByText('Jan Kowalski'));
        for (const d of ['1', '2', '3', '4']) fireEvent.click(screen.getByRole('button', { name: d }));

        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(pinApi.switchUser).toHaveBeenCalledWith({ userId: 'u-jan', pin: '1234' });
        expect(localStorage.getItem('crm_session_lock_signal')).toMatch(/^unlocked:/);
        expect(navigate).not.toHaveBeenCalled();
    });
});

describe('UserSwitcherPanel - zwykłe przełączanie', () => {
    it('właściciel widzi „Odblokuj PIN" przy zablokowanym profilu', async () => {
        renderPanel(false);
        expect(await screen.findByRole('button', { name: 'Odblokuj PIN: Anna Nowak' })).toBeTruthy();
    });
});
