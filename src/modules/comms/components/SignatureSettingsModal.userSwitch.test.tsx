// @vitest-environment jsdom
//
// Odtworzenie zgłoszenia z 03.11.2026: „właściciel stworzył swoją stopkę i nadpisał ją
// pracownikowi". Wspólny komputer w studiu, osoby przełączają się PIN-em. Serwer trzyma
// stopkę każdej osoby osobno i zapisuje ją na osobę z SESJI - ale przeglądarka po
// przełączeniu pokazywała stopkę poprzedniej osoby (cache zapytań, 5 minut świeżości)
// i otwarty kreator zapisywał ją na konto następnej.
//
// Tu działa prawdziwy AuthProvider, ProtectedRoute i hooki stopki; atrapą jest tylko API,
// które - jak serwer - odpowiada danymi osoby zalogowanej w sesji.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { useLayoutEffect } from 'react';
import type { User } from '@/modules/auth/types';
import type { MailSignature, SaveMailSignaturePayload } from '../types';

const authApi = vi.hoisted(() => ({ checkAuth: vi.fn() }));
vi.mock('@/modules/auth/api/authApi', () => ({ authApi }));
vi.mock('@/modules/settings/hooks/useSubscription', () => ({ prefetchSubscriptionStatus: () => Promise.resolve() }));
vi.mock('@/core/socketClient', () => ({
    disconnectStompClient: () => Promise.resolve(),
    onSocketConnect: () => () => {},
    subscribeToTopic: () => () => {},
}));
// Barel '@/core' ciągnie cały router aplikacji; hooki stopki potrzebują z niego tylko useAuth.
vi.mock('@/core', async () => ({ useAuth: (await import('@/core/context/AuthContext')).useAuth }));
vi.mock('@/core/components/SubscriptionGate', () => ({ SubscriptionGate: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/core/components/SessionLockedScreen', () => ({ SessionLockedScreen: () => null }));
vi.mock('@/common/components/Toast', () => ({ useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }) }));

/** „Serwer": stopki po user_id i osoba zalogowana w sesji. */
const server = vi.hoisted(() => ({
    sessionUserId: 'owner',
    signatures: {} as Record<string, MailSignature>,
}));
const commsApi = vi.hoisted(() => ({
    getSignature: vi.fn(),
    saveSignature: vi.fn(),
    deleteSignature: vi.fn(),
    uploadSignatureImage: vi.fn(),
    copyCompanyLogoToSignature: vi.fn(),
}));
vi.mock('../api/commsApi', () => ({ commsApi }));

import { AuthProvider, useAuth } from '@/core/context/AuthContext';
import { ProtectedRoute } from '@/core/components/ProtectedRoute';
import { SignatureSettingsModal } from './SignatureSettingsModal';

const ICONS_PATH = '/api/v1/public/mail-signature/icons/v1';

const person = (userId: string, firstName: string, lastName: string): User => ({
    userId, studioId: 'studio-1', email: `${firstName.toLowerCase()}@studio.pl`, firstName, lastName,
    role: userId === 'owner' ? 'OWNER' : 'USER', subscriptionStatus: 'ACTIVE', trialDaysRemaining: 0,
});
const owner = person('owner', 'Jan', 'Właściciel');
const employee = person('employee', 'Anna', 'Pracownik');

const savedDesign = (fullName: string, phone: string): MailSignature => ({
    bodyHtml: `<table><tr><td>${fullName}</td><td>${phone}</td></tr></table>`,
    enabledByDefault: true,
    design: { template: 'klasyczna', fullName, phone, color: '#c0272d', font: 'arial', size: 'm', iconStyle: 'mono' },
    iconsPath: ICONS_PATH,
    defaults: { fullName, email: null, phone, company: 'Studio Blask', website: null, address: null, hasCompanyLogo: false },
});

let auth: ReturnType<typeof useAuth>;
function Probe() {
    const ctx = useAuth();
    useLayoutEffect(() => { auth = ctx; });
    return null;
}

const renderApp = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
        <QueryClientProvider client={client}>
            <StyledThemeProvider theme={theme}>
                <AuthProvider>
                    <Probe />
                    <MemoryRouter>
                        <ProtectedRoute withSubscriptionGate={false}>
                            <SignatureSettingsModal isOpen onClose={() => {}} />
                        </ProtectedRoute>
                    </MemoryRouter>
                </AuthProvider>
            </StyledThemeProvider>
        </QueryClientProvider>,
    );
    return client;
};

const preview = () => screen.getByLabelText('Podgląd wiadomości ze stopką');

/** Ekran blokady albo przełącznik: serwer już podmienił osobę w sesji, front dostaje nową. */
const switchTo = (user: User) => act(() => {
    server.sessionUserId = user.userId;
    auth.setUser(user);
});

beforeEach(() => {
    vi.clearAllMocks();
    server.sessionUserId = 'owner';
    server.signatures = {
        owner: savedDesign('Jan Właściciel', '+48 700 333 444'),
        employee: savedDesign('Anna Pracownik', '+48 600 111 222'),
    };
    authApi.checkAuth.mockImplementation(async () => ({
        isAuthenticated: true,
        user: server.sessionUserId === 'owner' ? owner : employee,
    }));
    commsApi.getSignature.mockImplementation(async () => server.signatures[server.sessionUserId]);
    commsApi.saveSignature.mockImplementation(async (payload: SaveMailSignaturePayload) => {
        const current = server.signatures[server.sessionUserId];
        server.signatures[server.sessionUserId] = { ...current, ...payload, design: payload.design ?? null };
        return server.signatures[server.sessionUserId];
    });
});

afterEach(cleanup);

describe('Stopka e-mail po przełączeniu osoby PIN-em', () => {
    it('kreator otwarty przez właściciela pokazuje po przełączeniu stopkę pracownika, nie właściciela', async () => {
        renderApp();
        await waitFor(() => expect(preview().textContent).toContain('Jan Właściciel'));

        await switchTo(employee);

        await waitFor(() => expect(preview().textContent).toContain('Anna Pracownik'));
        expect(preview().textContent).not.toContain('Jan Właściciel');
        expect(preview().textContent).not.toContain('+48 700 333 444');
    });

    it('„Zapisz stopkę" po przełączeniu nie zapisuje stopki właściciela na konto pracownika', async () => {
        renderApp();
        await waitFor(() => expect(preview().textContent).toContain('Jan Właściciel'));

        await switchTo(employee);
        await waitFor(() => expect(preview().textContent).toContain('Anna Pracownik'));
        await userEvent.click(screen.getByRole('button', { name: 'Zapisz stopkę' }));

        await waitFor(() => expect(commsApi.saveSignature).toHaveBeenCalledTimes(1));
        const [payload] = commsApi.saveSignature.mock.calls[0] as [SaveMailSignaturePayload];
        expect(payload.design?.fullName).toBe('Anna Pracownik');
        expect(payload.bodyHtml).toContain('+48 600 111 222');
        expect(payload.bodyHtml).not.toContain('Jan Właściciel');
        expect(server.signatures.employee.design?.fullName).toBe('Anna Pracownik');
        expect(server.signatures.owner.design?.fullName).toBe('Jan Właściciel');
    });

    it('stopka zapisana przez właściciela przed chwilą nie pokazuje się pracownikowi', async () => {
        renderApp();
        await waitFor(() => expect(preview().textContent).toContain('Jan Właściciel'));
        // Zapis kładzie odpowiedź do cache jako świeżą (setQueryData) - dokładnie ten stan,
        // w którym pracownik dostawał po przełączeniu stopkę właściciela bez pytania serwera.
        await userEvent.click(screen.getByRole('button', { name: 'Zapisz stopkę' }));
        await waitFor(() => expect(commsApi.saveSignature).toHaveBeenCalledTimes(1));

        await switchTo(employee);

        await waitFor(() => expect(preview().textContent).toContain('Anna Pracownik'));
        expect(commsApi.getSignature).toHaveBeenCalledTimes(2);
    });

    it('pracownik bez stopki dostaje kreator z własnymi danymi, nie z projektem właściciela', async () => {
        server.signatures.employee = {
            bodyHtml: null, enabledByDefault: false, design: null, iconsPath: ICONS_PATH,
            defaults: { fullName: 'Anna Pracownik', email: 'anna@studio.pl', phone: '+48 600 111 222', company: 'Studio Blask', website: null, address: null, hasCompanyLogo: false },
        };
        renderApp();
        await waitFor(() => expect(preview().textContent).toContain('Jan Właściciel'));

        await switchTo(employee);

        await waitFor(() => expect(preview().textContent).toContain('Anna Pracownik'));
        expect(preview().textContent).toContain('+48 600 111 222');
        expect(preview().textContent).not.toContain('+48 700 333 444');
    });
});
