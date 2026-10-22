// src/modules/vehicles/components/VehiclePhotoGallery.test.tsx
// @vitest-environment jsdom
//
// Okno podglądu pokazuje podgląd (~2048 px), a nie oryginał z aparatu, i pobiera w tle
// podglądy sąsiadów. Wcześniej każde otwarte zdjęcie pojazdu ciągnęło 3-10 MB, a strzałka
// do czasu pobrania pokazywała poprzednie zdjęcie.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { VehiclePhoto } from '../types';

const preloaded: string[] = [];
let photos: VehiclePhoto[] = [];

vi.mock('../hooks', () => ({
    useVehiclePhotoGallery: () => ({ photos, pageMeta: null, isLoading: false }),
    useDeleteVehiclePhoto: () => ({ deletePhoto: vi.fn(), isDeleting: false }),
}));
vi.mock('./UploadPhotoModal', () => ({ UploadPhotoModal: () => null }));
vi.mock('@/common/components/ProgressiveImage', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/common/components/ProgressiveImage')>()),
    preloadImage: (url: string) => preloaded.push(url),
}));
vi.mock('@/common/hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/common/hooks')>()),
    useContainerWidth: () => [{ current: null }, 1200],
}));

const { VehiclePhotoGallery } = await import('./VehiclePhotoGallery');

const photo = (n: number, extra: Partial<VehiclePhoto> = {}): VehiclePhoto => ({
    id: `p${n}`, source: 'VEHICLE', sourceId: 'veh', fileName: `zdjecie${n}.jpg`, photoUrl: '',
    thumbnailUrl: `https://s3/t${n}`, previewUrl: `https://s3/p${n}`, fullSizeUrl: `https://s3/f${n}`,
    description: '', uploadedAt: '2026-10-01T10:00:00Z', ...extra,
});

const renderIt = () => render(
    <ThemeProvider theme={theme}>
        <VehiclePhotoGallery vehicleId="veh" />
    </ThemeProvider>,
);

describe('VehiclePhotoGallery', () => {
    beforeEach(() => { preloaded.length = 0; });

    it('opens the preview, not the camera original, and preloads neighbour previews', () => {
        photos = [photo(1), photo(2), photo(3)];
        renderIt();
        fireEvent.click(screen.getByRole('button', { name: 'Otwórz zdjęcie zdjecie2.jpg' }));

        expect(screen.getByRole('img', { name: 'zdjecie2.jpg' })).toHaveAttribute('src', 'https://s3/p2');
        expect(preloaded).toEqual(['https://s3/t3', 'https://s3/t1', 'https://s3/p3', 'https://s3/p1']);
        expect(screen.getByText('2 z 3')).toBeInTheDocument();
    });

    it('falls back to the original when the server sends no preview', () => {
        photos = [photo(1, { previewUrl: undefined })];
        renderIt();
        fireEvent.click(screen.getByRole('button', { name: 'Otwórz zdjęcie zdjecie1.jpg' }));

        expect(screen.getByRole('img', { name: 'zdjecie1.jpg' })).toHaveAttribute('src', 'https://s3/f1');
    });
});
