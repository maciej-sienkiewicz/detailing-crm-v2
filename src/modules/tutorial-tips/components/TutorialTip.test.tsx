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

/** 5 s na widoku, potem wysunięcie w dół. */
const hideTip = async () => {
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
};

describe('TutorialTip', () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('wysuwa się po chwili z lekcją o tym module', async () => {
        vi.useFakeTimers();
        renderAt('/calendar');
        expect(screen.queryByRole('region', { name: 'Instruktaż do tego modułu' })).toBeNull();

        await waitForTip();

        const tip = screen.getByRole('region', { name: 'Instruktaż do tego modułu' });
        expect(tip.textContent).toContain('Instruktaż: Kalendarz');
        expect(tip.textContent).toContain('Jak posługiwać się kalendarzem?');
        expect(tip.textContent).toContain('1:05');
        expect(tip.textContent).toContain('3 lekcje o tym module');
        expect(screen.queryByRole('link')).toBeNull();
    });

    it('„Obejrzyj” otwiera animację w oknie w programie, nie na stronie', async () => {
        vi.useFakeTimers();
        renderAt('/calendar');
        await waitForTip();

        fireEvent.click(screen.getByRole('button', { name: 'Obejrzyj' }));

        const dialog = screen.getByRole('dialog', { name: 'Instruktaż: Kalendarz' });
        expect(dialog.querySelector('iframe')?.getAttribute('src')).toBe('/animacje/jak-poslugiwac-sie-kalendarzem/index.html');
        expect(screen.queryByRole('region', { name: 'Instruktaż do tego modułu' })).toBeNull();
        expect(apiClient.post).not.toHaveBeenCalled();

        // Inna lekcja modułu z listy w oknie.
        fireEvent.click(screen.getByRole('button', { name: /Jak odwołać rezerwację\?/ }));
        expect(dialog.querySelector('iframe')?.getAttribute('src')).toBe('/animacje/jak-odwolac-rezerwacje/index.html');
    });

    it('moduł z jedną lekcją: okno bez listy, z tytułem lekcji', async () => {
        vi.useFakeTimers();
        renderAt('/instagram');
        await waitForTip();

        expect(screen.getByRole('region', { name: 'Instruktaż do tego modułu' }).textContent).toContain('Animacja, 7 rozdziałów');
        fireEvent.click(screen.getByRole('button', { name: 'Obejrzyj' }));

        const dialog = screen.getByRole('dialog', { name: 'Jak obserwować konkurencję na Instagramie?' });
        expect(dialog.querySelector('[aria-label="Lekcje"]')).toBeNull();
    });

    it('krzyżyk chowa chmurkę bez zapisu na koncie', async () => {
        vi.useFakeTimers();
        renderAt('/bays');
        await waitForTip();

        fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));

        expect(screen.queryByRole('region', { name: 'Instruktaż do tego modułu' })).toBeNull();
        expect(apiClient.post).not.toHaveBeenCalled();
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

    it('sama znika po 5 sekundach, a pod kursorem czeka', async () => {
        vi.useFakeTimers();
        renderAt('/bays');
        await waitForTip();

        const tip = screen.getByRole('region', { name: 'Instruktaż do tego modułu' });
        fireEvent.mouseEnter(tip);
        await act(async () => { await vi.advanceTimersByTimeAsync(8_000); });
        expect(screen.queryByRole('region', { name: 'Instruktaż do tego modułu' })).not.toBeNull();

        fireEvent.mouseLeave(tip);
        await hideTip();
        expect(screen.queryByRole('region', { name: 'Instruktaż do tego modułu' })).toBeNull();
        expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('wraca przy kolejnym wyświetleniu widoku', async () => {
        vi.useFakeTimers();
        const first = renderAt('/bays');
        await waitForTip();
        await hideTip();
        expect(screen.queryByRole('region', { name: 'Instruktaż do tego modułu' })).toBeNull();
        first.unmount();

        renderAt('/bays');
        await waitForTip();
        expect(screen.queryByRole('region', { name: 'Instruktaż do tego modułu' })).not.toBeNull();
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
