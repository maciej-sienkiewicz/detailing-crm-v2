// @vitest-environment jsdom
//
// Publikacja z generatora: zdjęcia wizyty, z której otwarto generator, są zaznaczone od
// razu, podpis to wygenerowany tekst, a po publikacji okno prowadzi do posta. Bez
// połączonego konta zostaje kopiowanie i link do „Moje konta".
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { instagramApi } from '../api/instagramApi';
import { accountsApi } from '../api/accountsApi';
import type { InstagramConnection } from '../accountsTypes';
import { GeneratePostModal } from './GeneratePostModal';

vi.mock('../api/instagramApi', () => ({
    instagramApi: {
        listStyleRules: vi.fn(async () => []),
        generatePost: vi.fn(async () => ({
            postId: 'post-1', content: 'Volvo XC60 po powłoce ceramicznej #detailing', iterations: 0,
            verificationPassed: true, failedRules: [], failedRuleDetails: [],
        })),
        rateGeneratedPost: vi.fn(),
    },
}));

vi.mock('../api/accountsApi', async importOriginal => {
    const actual = await importOriginal<typeof import('../api/accountsApi')>();
    return {
        ...actual,
        accountsApi: {
            getConnection: vi.fn(),
            listPublishVisits: vi.fn(async () => [
                {
                    visitId: 'v1', visitNumber: 'W/2026/41', vehicle: 'Volvo XC60', date: '2026-10-14T10:00:00Z',
                    photos: [{ id: 'p1', thumbnailUrl: 'https://x/1.jpg' }, { id: 'p2', thumbnailUrl: 'https://x/2.jpg' }],
                },
            ]),
            publish: vi.fn(async () => ({ mediaId: 'm1', permalink: 'https://www.instagram.com/p/ABC/' })),
        },
    };
});

const connection = (status: InstagramConnection['status']): InstagramConnection => ({
    available: true, status, username: 'studio', pageName: 'Studio', connectedAt: null, lastSyncAt: null,
    lastError: null, messagingEnabled: true, candidates: [],
});

const renderModal = (onClose = vi.fn()) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        <ThemeProvider theme={theme}>
            <QueryClientProvider client={client}>
                <MemoryRouter>
                    <GeneratePostModal onClose={onClose} prefill={{ topic: 'Powłoka ceramiczna Volvo', visitId: 'v1' }} />
                </MemoryRouter>
            </QueryClientProvider>
        </ThemeProvider>,
    );
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('GeneratePostModal: publikacja', () => {
    it('publikuje zdjęcia wizyty z wygenerowanym podpisem i prowadzi do posta', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection('CONNECTED'));
        renderModal();

        fireEvent.click(screen.getByRole('button', { name: /Generuj post/ }));
        const publish = await screen.findByRole('button', { name: /Opublikuj/ });
        await waitFor(() => expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(2));

        fireEvent.click(publish);

        await waitFor(() => expect(accountsApi.publish).toHaveBeenCalledWith({
            caption: 'Volvo XC60 po powłoce ceramicznej #detailing',
            photoIds: ['p1', 'p2'],
        }));
        const link = await screen.findByRole('link', { name: /Zobacz post/ });
        expect(link.getAttribute('href')).toBe('https://www.instagram.com/p/ABC/');
        expect(instagramApi.generatePost).toHaveBeenCalledTimes(1);
    });

    it('bez połączonego konta nie ma publikacji, jest droga do połączenia', async () => {
        vi.mocked(accountsApi.getConnection).mockResolvedValue(connection('NOT_CONNECTED'));
        renderModal();

        fireEvent.click(screen.getByRole('button', { name: /Generuj post/ }));
        await screen.findByRole('link', { name: /Połącz konto Instagram/ });
        expect(screen.queryByRole('button', { name: /Opublikuj/ })).toBeNull();
        expect(accountsApi.listPublishVisits).not.toHaveBeenCalled();
    });
});
