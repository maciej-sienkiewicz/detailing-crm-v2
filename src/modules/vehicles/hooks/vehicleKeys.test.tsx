// @vitest-environment jsdom
//
// Wysłanie zdjęcia pojazdu pobiera galerię raz. Szczegóły pojazdu leżały pod `['vehicle', id]`,
// prefiksem galerii, więc unieważnienie galerii i szczegółów pobierało galerię dwa razy.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => ({ uploadVehiclePhoto: vi.fn(), deleteVehiclePhoto: vi.fn() }));
vi.mock('../api/vehicleApi', () => ({ vehicleApi: api }));
vi.mock('@/common/utils/presignedUpload', () => ({
    putToPresignedUrl: vi.fn(async () => undefined),
    photoUploadContentType: () => 'image/jpeg',
}));

import { vehicleKeys } from '../api/vehicleKeys';
import { useUploadVehiclePhoto } from './useUploadVehiclePhoto';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('vehicleKeys', () => {
    it('nowe zdjęcie: jedna galeria i jedne szczegóły, bez drugiego pobrania galerii', async () => {
        api.uploadVehiclePhoto.mockResolvedValue({ uploadUrl: 'https://s3/put', photoId: 'p1' });
        const detail = vi.fn(async () => ({}));
        const gallery = vi.fn(async () => ({ items: [], page: { number: 1, size: 20, totalItems: 0, totalPages: 1 } }));
        const client = new QueryClient();
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => ({
            detail: useQuery({ queryKey: vehicleKeys.detail('car'), queryFn: detail }),
            gallery: useQuery({ queryKey: vehicleKeys.galleryPage('car', 1, 20), queryFn: gallery }),
            upload: useUploadVehiclePhoto('car'),
        }), { wrapper });
        await waitFor(() => expect(result.current.gallery.isSuccess && result.current.detail.isSuccess).toBe(true));

        await act(() => result.current.upload.uploadPhotoAsync({ file: new File(['x'], 'a.jpg'), description: '' }));
        await waitFor(() => expect(gallery).toHaveBeenCalledTimes(2));
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(gallery).toHaveBeenCalledTimes(2);
        expect(detail).toHaveBeenCalledTimes(2);
    });
});
