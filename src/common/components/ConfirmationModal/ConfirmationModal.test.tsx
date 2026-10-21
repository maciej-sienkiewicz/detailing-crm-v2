// @vitest-environment jsdom
//
// Asynchroniczne `onConfirm` bez obsługi odrzucenia kończyło się w konsoli przeglądarki
// wpisem „Uncaught (in promise) AxiosError" razem z treścią żądania. Okno zamyka się
// jak dotąd od razu, a odrzucenie trafia do loggera.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ConfirmationModal } from './ConfirmationModal';

const logger = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn() }));
vi.mock('@/core/logger', () => ({ logger }));

const renderModal = (onConfirm: () => void | Promise<unknown>, onCancel = vi.fn()) => {
    render(
        <ThemeProvider theme={theme}>
            <ConfirmationModal isOpen title="Usunąć?" message="Tej operacji nie da się cofnąć." onConfirm={onConfirm} onCancel={onCancel} />
        </ThemeProvider>,
    );
    return onCancel;
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('ConfirmationModal', () => {
    it('obsługuje odrzucenie asynchronicznej akcji i zamyka okno', async () => {
        const failure = new Error('409');
        const onCancel = renderModal(() => Promise.reject(failure));

        await userEvent.click(screen.getByRole('button', { name: 'Potwierdź' }));

        expect(onCancel).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => expect(logger.error).toHaveBeenCalledWith('confirmation.failed', failure));
    });

    it('najpierw wykonuje akcję, potem zamyka okno', async () => {
        const order: string[] = [];
        renderModal(() => { order.push('confirm'); }, vi.fn(() => { order.push('cancel'); }));

        await userEvent.click(screen.getByRole('button', { name: 'Potwierdź' }));

        expect(order).toEqual(['confirm', 'cancel']);
        expect(logger.error).not.toHaveBeenCalled();
    });
});
