// src/modules/visits/components/ImageViewerModal.test.tsx
// @vitest-environment jsdom
//
// Przeglądarka zdjęć wizyty. Zgłoszenie: po strzałce przez kilka sekund wisiało
// poprzednie zdjęcie, bo nowe pobierało się w pełnej jakości - wyglądało, jakby
// kliknięcie nie zadziałało.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme';
import { ImageViewerModal } from './ImageViewerModal';

const renderViewer = (props: Partial<Parameters<typeof ImageViewerModal>[0]> = {}) => {
    const base = {
        imageUrl: 'https://s3/full-1.jpg',
        imageName: 'przod.jpg',
        isOpen: true,
        onClose: vi.fn(),
        previewUrl: 'https://s3/thumb-1.jpg',
        position: { index: 3, total: 12 },
        ...props,
    };
    const view = render(
        <ThemeProvider theme={theme}>
            <ImageViewerModal {...base} />
        </ThemeProvider>,
    );
    const rerender = (next: Partial<typeof base>) =>
        view.rerender(
            <ThemeProvider theme={theme}>
                <ImageViewerModal {...base} {...next} />
            </ThemeProvider>,
        );
    return { rerender };
};

const previewImg = () => document.querySelector('img[aria-hidden="true"]') as HTMLImageElement | null;

describe('ImageViewerModal', () => {
    it('od razu pokazuje miniaturę i wskaźnik, dopóki nie dojdzie pełna jakość', () => {
        renderViewer();

        expect(previewImg()?.getAttribute('src')).toBe('https://s3/thumb-1.jpg');
        expect(screen.getByRole('status')).toHaveTextContent('Wczytywanie zdjęcia');

        fireEvent.load(screen.getByAltText('przod.jpg'));

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('po strzałce pokazuje miniaturę NASTĘPNEGO zdjęcia, a nie wczytane poprzednie', () => {
        const { rerender } = renderViewer();
        fireEvent.load(screen.getByAltText('przod.jpg'));

        rerender({
            imageUrl: 'https://s3/full-2.jpg',
            imageName: 'tyl.jpg',
            previewUrl: 'https://s3/thumb-2.jpg',
            position: { index: 4, total: 12 },
        });

        expect(previewImg()?.getAttribute('src')).toBe('https://s3/thumb-2.jpg');
        expect(screen.getByAltText('tyl.jpg').getAttribute('src')).toBe('https://s3/full-2.jpg');
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText('4 z 12')).toBeInTheDocument();
    });

    it('przy błędzie zostawia miniaturę i mówi, co się stało', () => {
        renderViewer();

        fireEvent.error(screen.getByAltText('przod.jpg'));

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('Nie udało się wczytać zdjęcia w pełnej jakości.');
        expect(previewImg()).not.toBeNull();
    });

    it('bez osobnej miniatury nie dubluje zdjęcia', () => {
        renderViewer({ previewUrl: 'https://s3/full-1.jpg' });

        expect(previewImg()).toBeNull();
    });

    it('pobiera sąsiednie zdjęcia w tle', () => {
        const created: string[] = [];
        vi.stubGlobal('Image', class {
            decoding = '';
            set src(value: string) {
                created.push(value);
            }
        });
        try {
            renderViewer({ preloadUrls: ['https://s3/thumb-9.jpg', 'https://s3/full-9.jpg'] });
        } finally {
            vi.unstubAllGlobals();
        }

        expect(created).toEqual(['https://s3/thumb-9.jpg', 'https://s3/full-9.jpg']);
    });

    it('licznik chowa się przy jednym zdjęciu', () => {
        renderViewer({ position: { index: 1, total: 1 } });

        expect(screen.queryByText('1 z 1')).not.toBeInTheDocument();
    });
});
