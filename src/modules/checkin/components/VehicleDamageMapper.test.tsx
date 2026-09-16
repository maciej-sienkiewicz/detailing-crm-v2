// src/modules/checkin/components/VehicleDamageMapper.test.tsx
// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { VehicleDamageMapper } from './VehicleDamageMapper';
import type { DamagePoint, PhotoSlot } from '../types';

const point: DamagePoint = { id: 1, x: 20, y: 30, note: 'rysa' };

const slot: PhotoSlot = {
    id: 'photo-1',
    fileName: 'maska.jpg',
    uploadedAt: '2026-09-16T08:00:00Z',
    thumbnailUrl: 'https://example.test/thumb.jpg',
};

const renderMapper = (props: Partial<Parameters<typeof VehicleDamageMapper>[0]> = {}) => {
    const onChange = vi.fn();
    render(
        <ThemeProvider theme={theme}>
            <VehicleDamageMapper points={[point]} onChange={onChange} {...props} />
        </ThemeProvider>
    );
    return { onChange };
};

const openPicker = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: /Przypisz zdjęcie/i }));
};

describe('VehicleDamageMapper — źródła zdjęcia', () => {
    it('bez dodatkowych źródeł zostaje przy dotychczasowej siatce, bez zakładek', async () => {
        // Kreator przyjęcia ma własny kod QR nad edytorem i nie ma tu czego wybierać —
        // dołożenie mu zakładek byłoby zmianą, o którą nikt nie prosił.
        const user = userEvent.setup();
        renderMapper({ availablePhotos: [slot] });

        await openPicker(user);

        expect(screen.queryByRole('tablist')).toBeNull();
        expect(screen.getByAltText('maska.jpg')).toBeTruthy();
    });

    it('z dodatkowymi źródłami pokazuje trzy zakładki', async () => {
        const user = userEvent.setup();
        renderMapper({
            availablePhotos: [slot],
            onUploadPhotoFile: vi.fn(),
            renderQrPanel: () => <div>panel qr</div>,
        });

        await openPicker(user);

        expect(screen.getByRole('tab', { name: /Istniejące/i })).toBeTruthy();
        expect(screen.getByRole('tab', { name: /Z pliku/i })).toBeTruthy();
        expect(screen.getByRole('tab', { name: /Kod QR/i })).toBeTruthy();
    });

    it('bez zdjęć w galerii otwiera się na źródle, które coś daje', async () => {
        // Otwieranie pustej siatki, gdy obok czeka aparat w telefonie, to zakładka na pusto.
        const user = userEvent.setup();
        renderMapper({
            availablePhotos: [],
            onUploadPhotoFile: vi.fn(),
            renderQrPanel: () => <div>panel qr</div>,
        });

        await openPicker(user);

        expect(screen.getByRole('tab', { name: /Z pliku/i }).getAttribute('aria-selected')).toBe('true');
        expect(screen.getByText(/Wybierz zdjęcie z komputera/i)).toBeTruthy();
    });

    it('kod QR pokazuje panel dostarczony przez gospodarza', async () => {
        const user = userEvent.setup();
        renderMapper({
            availablePhotos: [slot],
            onUploadPhotoFile: vi.fn(),
            renderQrPanel: () => <div>panel qr</div>,
        });

        await openPicker(user);
        await user.click(screen.getByRole('tab', { name: /Kod QR/i }));

        expect(screen.getByText('panel qr')).toBeTruthy();
    });

    it('wysłany plik ląduje w punkcie uszkodzenia', async () => {
        const user = userEvent.setup();
        const uploaded: PhotoSlot = { ...slot, id: 'photo-new', fileName: 'nowe.jpg' };
        const onUploadPhotoFile = vi.fn().mockResolvedValue(uploaded);
        const { onChange } = renderMapper({ availablePhotos: [], onUploadPhotoFile });

        await openPicker(user);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        await user.upload(input, new File(['x'], 'nowe.jpg', { type: 'image/jpeg' }));

        await waitFor(() => expect(onUploadPhotoFile).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(onChange).toHaveBeenCalled());
        // Bez `.at(-1)`: główny tsconfig celuje w ES2020, gdzie tej metody nie ma w lib.
        const calls = onChange.mock.calls;
        const nextPoints: DamagePoint[] = calls[calls.length - 1][0];
        expect(nextPoints[0].photos?.map(p => p.photoId)).toEqual(['photo-new']);
    });

    it('nieudana wysyłka zostawia okno otwarte z komunikatem', async () => {
        // Zamknięcie po błędzie wyglądałoby jak sukces, a zdjęcia by nie było.
        const user = userEvent.setup();
        const onUploadPhotoFile = vi.fn().mockRejectedValue(new Error('Plik za duży'));
        const { onChange } = renderMapper({ availablePhotos: [], onUploadPhotoFile });

        await openPicker(user);
        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        await user.upload(input, new File(['x'], 'nowe.jpg', { type: 'image/jpeg' }));

        await waitFor(() => expect(screen.getByText('Plik za duży')).toBeTruthy());
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole('tab', { name: /Z pliku/i })).toBeTruthy();
    });
});

describe('VehicleDamageMapper — miniatura przypiętego zdjęcia', () => {
    const attached: DamagePoint = {
        ...point,
        photos: [{ photoId: 'photo-1', strokes: [] }],
    };

    it('odnajduje adres po identyfikatorze, gdy punkt go nie niesie', () => {
        /*
         * Tak wygląda KAŻDE ponowne otwarcie zapisanej mapy: punkty wracają z API z
         * samym `photoId`, bo `thumbnailUrl` jest polem wyświetleniowym i nikt go nie
         * zapisuje. Wcześniej kafelek był pusty, a pisak nie dawał się otworzyć.
         */
        renderMapper({ points: [attached], availablePhotos: [slot] });

        const img = screen.getByAltText('Zdjęcie uszkodzenia') as HTMLImageElement;
        expect(img.src).toBe(slot.thumbnailUrl);
    });

    it('adres niesiony przez punkt wygrywa z listą', () => {
        // Świeżo wysłany plik ma lokalny podgląd, zanim wróci presignowany adres.
        const withOwnUrl: DamagePoint = {
            ...point,
            photos: [{ photoId: 'photo-1', strokes: [], thumbnailUrl: 'blob:local-preview' }],
        };
        renderMapper({ points: [withOwnUrl], availablePhotos: [slot] });

        const img = screen.getByAltText('Zdjęcie uszkodzenia') as HTMLImageElement;
        expect(img.src).toContain('blob:local-preview');
    });

    it('skasowane zdjęcie daje znak zapytania, nie pusty kafelek', () => {
        renderMapper({ points: [attached], availablePhotos: [] });

        expect(screen.queryByAltText('Zdjęcie uszkodzenia')).toBeNull();
        expect(screen.getByTitle(/Zdjęcia nie ma już w dokumentacji/i)).toBeTruthy();
    });
});

describe('VehicleDamageMapper — sterowanie mapą', () => {
    it('Cofnij i Wyczyść wszystko są wyłączone na pustej mapie', () => {
        renderMapper({ points: [] });

        expect((screen.getByRole('button', { name: /Cofnij/i }) as HTMLButtonElement).disabled).toBe(true);
        expect((screen.getByRole('button', { name: /Wyczyść wszystko/i }) as HTMLButtonElement).disabled).toBe(true);
    });

    it('Cofnij zdejmuje ostatnie oznaczenie', async () => {
        const user = userEvent.setup();
        const second: DamagePoint = { id: 2, x: 60, y: 40, note: 'wgniecenie' };
        const { onChange } = renderMapper({ points: [point, second] });

        await user.click(screen.getByRole('button', { name: /Cofnij/i }));

        expect(onChange).toHaveBeenCalledWith([point]);
    });
});
