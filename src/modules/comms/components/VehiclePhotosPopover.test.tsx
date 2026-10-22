// src/modules/comms/components/VehiclePhotosPopover.test.tsx
// @vitest-environment jsdom
//
// Chmurka ze zdjęciami auta pokazuje podgląd (~2048 px), a nie oryginał z aparatu
// (3-10 MB w okienku szerokim na kilkaset pikseli). Oryginał zostaje pod „Pełny rozmiar".

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { VehiclePhoto } from '@/modules/vehicles/types';

const preloaded: string[] = [];
const getPhotoGallery = vi.fn();

vi.mock('@/modules/vehicles/api/vehicleApi', () => ({ vehicleApi: { getPhotoGallery } }));
vi.mock('@/common/components/ProgressiveImage', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/common/components/ProgressiveImage')>()),
    preloadImage: (url: string) => { if (url) preloaded.push(url); },
}));

const { VehiclePhotosPopover } = await import('./VehiclePhotosPopover');

const photo = (n: number, extra: Partial<VehiclePhoto> = {}): VehiclePhoto => ({
    id: `p${n}`, source: 'VEHICLE', sourceId: 'veh', fileName: `zdjecie${n}.jpg`, photoUrl: '',
    thumbnailUrl: `https://s3/t${n}`, previewUrl: `https://s3/p${n}`, fullSizeUrl: `https://s3/f${n}`,
    description: '', uploadedAt: '2026-10-01T10:00:00Z', ...extra,
});

const renderIt = (photos: VehiclePhoto[]) => {
    getPhotoGallery.mockResolvedValue({
        items: photos,
        page: { page: 1, pageSize: 12, totalItems: photos.length, totalPages: 1 },
    });
    return render(
        <QueryClientProvider client={new QueryClient()}>
            <ThemeProvider theme={theme}>
                <VehiclePhotosPopover vehicleId="veh" label="Audi A4" anchor={document.body} onClose={vi.fn()} />
            </ThemeProvider>
        </QueryClientProvider>,
    );
};

describe('VehiclePhotosPopover', () => {
    beforeEach(() => { preloaded.length = 0; });

    it('shows the preview, keeps the original for "Pełny rozmiar" and preloads the next preview', async () => {
        renderIt([photo(1), photo(2)]);

        expect(await screen.findByRole('img', { name: 'zdjecie1.jpg' })).toHaveAttribute('src', 'https://s3/p1');
        expect(screen.getByRole('link', { name: 'Pełny rozmiar' })).toHaveAttribute('href', 'https://s3/f1');
        expect(preloaded).toEqual(['https://s3/p2']);
    });

    it('falls back to the original when the server sends no preview', async () => {
        renderIt([photo(1, { previewUrl: undefined })]);

        expect(await screen.findByRole('img', { name: 'zdjecie1.jpg' })).toHaveAttribute('src', 'https://s3/f1');
    });
});
