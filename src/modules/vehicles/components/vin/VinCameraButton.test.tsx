// @vitest-environment jsdom
//
// Ikona aparatu przy polu VIN: na komputerze wybór „telefonem / z komputera",
// odczytany VIN wraca przez onVin, nieczytelne zdjęcie przez onError.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { VinCameraButton } from './VinCameraButton';
import type { VinApi } from './vinApi';

const api = {
    extractVin: vi.fn<VinApi['extractVin']>(),
    startVinScanSession: vi.fn<VinApi['startVinScanSession']>(),
    getVinScanResult: vi.fn<VinApi['getVinScanResult']>(),
};

const renderButton = () => {
    const onVin = vi.fn();
    const onError = vi.fn();
    const { container } = render(
        <ThemeProvider theme={theme}>
            <VinCameraButton api={api} onVin={onVin} onError={onError} />
        </ThemeProvider>
    );
    const file = container.querySelector('input[type="file"]') as HTMLInputElement;
    return { onVin, onError, file };
};

const photo = new File(['x'], 'vin.jpg', { type: 'image/jpeg' });

describe('VinCameraButton', () => {
    afterEach(() => vi.clearAllMocks());

    it('na komputerze pyta, skąd zdjęcie: telefonem albo z komputera', async () => {
        renderButton();
        await userEvent.click(screen.getByRole('button', { name: 'Odczytaj VIN ze zdjęcia' }));
        expect(screen.getByText('Telefonem (kod QR)')).toBeInTheDocument();
        expect(screen.getByText('Zdjęcie z komputera')).toBeInTheDocument();
    });

    it('odczytany VIN ze zdjęcia z dysku trafia do pola', async () => {
        api.extractVin.mockResolvedValue('WBA3A5G59DNP26082');
        const { onVin, file } = renderButton();
        fireEvent.change(file, { target: { files: [photo] } });
        await waitFor(() => expect(onVin).toHaveBeenCalledWith('WBA3A5G59DNP26082'));
    });

    it('nieczytelne zdjęcie mówi, że trzeba spróbować jeszcze raz', async () => {
        api.extractVin.mockResolvedValue(null);
        const { onVin, onError, file } = renderButton();
        fireEvent.change(file, { target: { files: [photo] } });
        await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringContaining('Nie udało się odczytać VIN')));
        expect(onVin).not.toHaveBeenCalled();
    });
});
