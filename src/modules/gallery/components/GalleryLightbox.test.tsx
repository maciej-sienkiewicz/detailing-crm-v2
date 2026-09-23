// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { GalleryLightbox } from './GalleryLightbox';
import type { GalleryPhoto } from '../types';

const PHOTO: GalleryPhoto = {
    id: 'p1', fileName: 'przod.jpg', thumbnailUrl: 't/p1', fullSizeUrl: 'f/p1', tags: [],
    uploadedAt: '2026-09-10T08:00:00Z', uploadedBy: 'u1', uploadedByName: 'Krzysztof Niemier', source: 'VISIT',
};

const renderLightbox = (props: Partial<Parameters<typeof GalleryLightbox>[0]> = {}) => render(
    <MemoryRouter>
        <ThemeProvider theme={theme}>
            <GalleryLightbox photo={PHOTO} onClose={() => {}} position={{ index: 12, total: 236 }} {...props} />
        </ThemeProvider>
    </MemoryRouter>,
);

describe('GalleryLightbox - przechodzenie między zdjęciami', () => {
    it('strzałki na ekranie i klawisze ← → przechodzą do sąsiednich zdjęć', () => {
        const onPrev = vi.fn();
        const onNext = vi.fn();
        renderLightbox({ onPrev, onNext });

        fireEvent.click(screen.getByRole('button', { name: 'Następne zdjęcie' }));
        fireEvent.click(screen.getByRole('button', { name: 'Poprzednie zdjęcie' }));
        fireEvent.keyDown(document, { key: 'ArrowRight' });
        fireEvent.keyDown(document, { key: 'ArrowLeft' });

        expect(onNext).toHaveBeenCalledTimes(2);
        expect(onPrev).toHaveBeenCalledTimes(2);
    });

    it('na początku galerii strzałka wstecz jest nieaktywna', () => {
        const onNext = vi.fn();
        renderLightbox({ onNext, position: { index: 1, total: 236 } });

        expect((screen.getByRole('button', { name: 'Poprzednie zdjęcie' }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.keyDown(document, { key: 'ArrowLeft' });
        expect(onNext).not.toHaveBeenCalled();
    });

    it('pokazuje pozycję w całej galerii i autora zdjęcia', () => {
        renderLightbox();
        expect(screen.getByText('12 / 236')).toBeTruthy();
        expect(screen.getByText('Krzysztof Niemier')).toBeTruthy();
    });
});
