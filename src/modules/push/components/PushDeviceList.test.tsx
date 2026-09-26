// @vitest-environment jsdom
//
// „Odłącz" przy urządzeniu z powiadomieniami działało od jednego kliknięcia -
// jedyna nieodwracalna akcja sekcji bez pytania.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ToastProvider } from '@/common/components/Toast';
import { PushDeviceList } from './PushDeviceList';
import type { PushDeviceDto } from '../types';

const device: PushDeviceDto = { id: 'd1', deviceName: 'iPhone Anny', createdAt: '2026-09-01T10:00:00Z', lastUsedAt: null, active: true };

const renderList = (onRevoke: (id: string) => Promise<void>) => render(
    <ThemeProvider theme={theme}>
        <ToastProvider>
            <PushDeviceList devices={[device]} onRevoke={onRevoke} />
        </ToastProvider>
    </ThemeProvider>,
);

afterEach(cleanup);

describe('PushDeviceList', () => {
    it('asks before revoking, and cancel keeps the device', async () => {
        const onRevoke = vi.fn().mockResolvedValue(undefined);
        renderList(onRevoke);
        await userEvent.click(screen.getByRole('button', { name: 'Odłącz' }));
        expect(screen.getByText('Odłączyć urządzenie?')).toBeInTheDocument();
        expect(screen.getByText(/„iPhone Anny” przestanie dostawać powiadomienia/)).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
        expect(onRevoke).not.toHaveBeenCalled();
    });

    it('revokes after confirming and reports it', async () => {
        const onRevoke = vi.fn().mockResolvedValue(undefined);
        renderList(onRevoke);
        await userEvent.click(screen.getByRole('button', { name: 'Odłącz' }));
        const dialogButtons = screen.getAllByRole('button', { name: 'Odłącz' });
        await userEvent.click(dialogButtons[dialogButtons.length - 1]);
        await waitFor(() => expect(onRevoke).toHaveBeenCalledWith('d1'));
        expect(await screen.findByText('Urządzenie odłączone')).toBeInTheDocument();
    });

    it('a network failure is reported (the interceptor stays silent without a status)', async () => {
        const onRevoke = vi.fn().mockRejectedValue(new Error('Network Error'));
        renderList(onRevoke);
        await userEvent.click(screen.getByRole('button', { name: 'Odłącz' }));
        const dialogButtons = screen.getAllByRole('button', { name: 'Odłącz' });
        await userEvent.click(dialogButtons[dialogButtons.length - 1]);
        expect(await screen.findByText('Nie udało się odłączyć')).toBeInTheDocument();
    });
});
