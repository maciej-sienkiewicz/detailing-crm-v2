// src/modules/visits/components/DocumentGallery.test.tsx
// @vitest-environment jsdom
//
// Tagi mają tylko zdjęcia wizyty. Obraz wgrany jako dokument serwer odrzucał przy
// zapisie tagów, a kafelek pokazywał je jako zapisane - do pierwszego odświeżenia.
// Nieudany zapis tagów zdjęcia wizyty musi się cofnąć.
//
// Okno podglądu pokazuje podgląd (~2048 px), a nie oryginał z aparatu: oryginał wraz
// z oryginałami obu sąsiadów pobieranymi w tle potrafił wczytywać się kilkanaście sekund.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import type { VisitDocument, VisitPhoto } from '../types';

const mutate = vi.fn();
const preloaded: string[] = [];
const can = vi.fn((_: string) => true);

vi.mock('@/core/permissions', () => ({ usePermissions: () => ({ can }) }));
vi.mock('@/modules/photos/hooks/usePhotoTags', () => ({
    useTagSuggestions: () => ({ data: [] }),
    useUpdatePhotoTags: () => ({ mutate, isPending: false }),
}));
vi.mock('@/modules/photos/components/PhotoTagEditModal', () => ({
    PhotoTagEditModal: ({ photoId, onTagsChange }: { photoId: string; onTagsChange: (id: string, tags: string[]) => void }) => (
        <button type="button" onClick={() => onTagsChange(photoId, ['PPF'])}>zapisz tagi</button>
    ),
}));
vi.mock('@/common/components/ProgressiveImage', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/common/components/ProgressiveImage')>()),
    preloadImage: (url: string) => preloaded.push(url),
}));
vi.mock('@/common/hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/common/hooks')>()),
    useContainerWidth: () => [{ current: null }, 1200],
}));

const { DocumentGallery } = await import('./DocumentGallery');

const visitPhoto: VisitPhoto = {
    id: 'vp1', fileName: 'przod.jpg', uploadedAt: '2026-10-01T10:00:00Z',
    thumbnailUrl: 'https://s3/t', previewUrl: 'https://s3/p', fullSizeUrl: 'https://s3/f', tags: [],
};
const nextPhoto: VisitPhoto = {
    id: 'vp2', fileName: 'tyl.jpg', uploadedAt: '2026-10-01T10:01:00Z',
    thumbnailUrl: 'https://s3/t2', previewUrl: 'https://s3/p2', fullSizeUrl: 'https://s3/f2', tags: [],
};
const docPhoto: VisitDocument = {
    id: 'd1', visitId: 'v', customerId: 'c', type: 'PHOTO', name: 'skan.jpg', fileName: 'skan.jpg',
    fileUrl: 'https://s3/d', uploadedAt: '2026-10-01T10:00:00Z', uploadedBy: 'u', uploadedByName: 'Anna',
};

const renderIt = (visitPhotos: VisitPhoto[] = [visitPhoto], documents: VisitDocument[] = [docPhoto]) => render(
    <ThemeProvider theme={theme}>
        <DocumentGallery documents={documents} visitPhotos={visitPhotos} onDelete={vi.fn()} onDeletePhoto={vi.fn()} />
    </ThemeProvider>,
);


describe('DocumentGallery', () => {
    beforeEach(() => { mutate.mockReset(); can.mockImplementation(() => true); preloaded.length = 0; });

    it('offers tags only on visit photos, not on image documents', () => {
        renderIt();
        expect(screen.getByRole('button', { name: 'Tagi zdjęcia przod.jpg' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Tagi zdjęcia skan.jpg' })).toBeNull();
    });

    it('image document delete follows the document permission', () => {
        can.mockImplementation((p: string) => p !== 'VISITS_DELETE');
        renderIt();
        expect(screen.getByRole('button', { name: 'Usuń przod.jpg' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Usuń skan.jpg' })).toBeNull();
    });

    it('rolls back optimistic tags when saving fails', () => {
        mutate.mockImplementation((_vars, opts?: { onError?: () => void }) => opts?.onError?.());
        renderIt();
        fireEvent.click(screen.getByRole('button', { name: 'Tagi zdjęcia przod.jpg' }));
        fireEvent.click(screen.getByRole('button', { name: 'zapisz tagi' }));
        expect(mutate).toHaveBeenCalledWith({ photoId: 'vp1', tags: ['PPF'] }, expect.anything());
        expect(screen.queryByTitle('PPF')).toBeNull();
    });

    it('opens the preview, not the camera original, and preloads neighbour previews', () => {
        renderIt([visitPhoto, nextPhoto], []);
        fireEvent.click(screen.getByRole('button', { name: 'Otwórz zdjęcie przod.jpg' }));

        expect(screen.getByRole('img', { name: 'przod.jpg' })).toHaveAttribute('src', 'https://s3/p');
        expect(preloaded).toEqual(['https://s3/t2', 'https://s3/p2']);
    });

    it('falls back to the original when the server sends no preview', () => {
        renderIt([{ ...visitPhoto, previewUrl: undefined }], []);
        fireEvent.click(screen.getByRole('button', { name: 'Otwórz zdjęcie przod.jpg' }));

        expect(screen.getByRole('img', { name: 'przod.jpg' })).toHaveAttribute('src', 'https://s3/f');
    });
});
