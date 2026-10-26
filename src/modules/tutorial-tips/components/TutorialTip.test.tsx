// @vitest-environment jsdom
//
// Chmurka z instruktażem: wysuwa się na widoku z lekcją, „Nie pokazuj więcej” zamyka ją na koncie.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { apiClient } from '@/core';
import { TutorialTip } from './TutorialTip';

vi.mock('@/core', () => ({
    apiClient: { get: vi.fn(), post: vi.fn() },
}));

const renderAt = (path: string, dismissed: string[] = []) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.mocked(apiClient.get).mockResolvedValue({ data: { dismissedViews: dismissed } });
    vi.mocked(apiClient.post).mockResolvedValue({ data: undefined });
    return render(
        <ThemeProvider theme={theme}>
            <QueryClientProvider client={client}>
                <MemoryRouter initialEntries={[path]}>
                    <TutorialTip />
                </MemoryRouter>
            </QueryClientProvider>
        </ThemeProvider>,
    );
};

/** Lista zamkniętych z serwera, potem opóźnienie wysunięcia. */
const waitForTip = async () => {
    for (let i = 0; i < 5; i++) await act(async () => { await vi.advanceTimersByTimeAsync(500); });
};

describe('TutorialTip', () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('wysuwa się po chwili i prowadzi do lekcji o tym module', async () => {
        vi.useFakeTimers();
        renderAt('/calendar');
        expect(screen.queryByText('Czy chcesz poznać, jak działa ten moduł?')).toBeNull();

        await waitForTip();

        const link = screen.getByRole('link', { name: /Czy chcesz poznać, jak działa ten moduł\?/ });
        expect(link.getAttribute('href')).toBe('https://demo.detailboost.pl/poznaj-program#jak-poslugiwac-sie-kalendarzem');
        expect(link.getAttribute('target')).toBe('_blank');
    });

    it('„Nie pokazuj więcej” zapisuje zamknięcie widoku na koncie i chowa chmurkę', async () => {
        vi.useFakeTimers();
        renderAt('/bays');
        await waitForTip();

        fireEvent.click(screen.getByRole('button', { name: 'Nie pokazuj więcej' }));
        await waitForTip();

        expect(apiClient.post).toHaveBeenCalledWith('/v1/me/tutorial-tips/BAYS/dismiss');
        expect(screen.queryByRole('region', { name: 'Instruktaż do tego modułu' })).toBeNull();
    });

    it('nie wraca na widoku zamkniętym wcześniej', async () => {
        vi.useFakeTimers();
        renderAt('/bays', ['BAYS']);
        await waitForTip();

        expect(screen.queryByRole('region', { name: 'Instruktaż do tego modułu' })).toBeNull();
    });

    it('nie pojawia się na widoku bez lekcji', async () => {
        vi.useFakeTimers();
        renderAt('/customers');
        await waitForTip();

        expect(screen.queryByRole('region', { name: 'Instruktaż do tego modułu' })).toBeNull();
    });
});
