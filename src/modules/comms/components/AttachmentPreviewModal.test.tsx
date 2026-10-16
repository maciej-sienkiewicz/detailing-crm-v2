// @vitest-environment jsdom
//
// Podgląd załącznika w CRM-ie zamiast pobierania. Escape zamyka WYŁĄCZNIE podgląd:
// okno otwiera się nad pełnym podglądem wiadomości i arkuszem sprawy, które słuchają
// Escape'a bez sprawdzania, czy są na wierzchu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/common/theme/theme';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import type { PreviewableFile } from '../inbox/messageFormat';

vi.mock('@/modules/public-signing/components/PdfPagesViewer', () => ({
    PdfPagesViewer: () => <div data-testid="pdf-pages" />,
}));

const file = (id: string, fileName: string, contentType: string): PreviewableFile => ({ id, fileName, contentType, sizeBytes: 2048 });

const photo = file('p1', 'rysa.jpg', 'image/jpeg');
const invoice = file('f1', 'faktura.pdf', 'application/pdf');
const svg = file('s1', 'logo.svg', 'image/svg+xml');

let created: Blob[] = [];

beforeEach(() => {
    created = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
        created.push(blob);
        return `blob:${created.length}`;
    });
    URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const renderModal = (props: Partial<Parameters<typeof AttachmentPreviewModal>[0]> = {}) => {
    const onClose = vi.fn();
    const load = vi.fn(async () => new Blob(['x'], { type: 'image/svg+xml' }));
    render(
        <ThemeProvider theme={theme}>
            <AttachmentPreviewModal files={[photo, invoice, svg]} initialId={photo.id} load={load} onClose={onClose} {...props} />
        </ThemeProvider>
    );
    return { onClose, load };
};

describe('AttachmentPreviewModal', () => {
    it('pokazuje zdjęcie w oknie, z typem z listy, a nie z odpowiedzi serwera', async () => {
        renderModal();
        const img = await screen.findByRole('img', { name: 'rysa.jpg' });
        expect(img.getAttribute('src')).toBe('blob:1');
        expect(created[0].type).toBe('image/jpeg');
    });

    it('Escape zamyka podgląd i nie dochodzi do okien pod spodem', async () => {
        const below = vi.fn();
        document.addEventListener('keydown', below);
        window.addEventListener('keydown', below);
        const { onClose } = renderModal();
        await screen.findByRole('img', { name: 'rysa.jpg' });

        fireEvent.keyDown(document.body, { key: 'Escape' });

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(below).not.toHaveBeenCalled();
        document.removeEventListener('keydown', below);
        window.removeEventListener('keydown', below);
    });

    it('strzałki przechodzą między plikami, które da się obejrzeć - SVG pomija', async () => {
        renderModal();
        expect(screen.getByText('Plik 1 z 2')).toBeTruthy();
        fireEvent.keyDown(document.body, { key: 'ArrowRight' });
        expect(await screen.findByTestId('pdf-pages')).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'faktura.pdf' })).toBeTruthy();
        fireEvent.keyDown(document.body, { key: 'ArrowRight' });
        expect(await screen.findByRole('img', { name: 'rysa.jpg' })).toBeTruthy();
    });

    it('tekst wstawia jako tekst, nie jako HTML', async () => {
        const note = file('t1', 'notatka.txt', 'text/plain');
        renderModal({
            files: [note],
            initialId: note.id,
            load: async () => new Blob(['<img src=x onerror=alert(1)>'], { type: 'text/html' }),
        });
        await waitFor(() => expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy());
        expect(document.querySelector('img')).toBeNull();
    });

    it('przy błędzie wczytania zostawia drogę do ponowienia', async () => {
        const load = vi.fn().mockRejectedValueOnce(new Error('sieć')).mockResolvedValue(new Blob(['x']));
        renderModal({ load });
        fireEvent.click(await screen.findByRole('button', { name: 'Spróbuj ponownie' }));
        expect(await screen.findByRole('img', { name: 'rysa.jpg' })).toBeTruthy();
        expect(load).toHaveBeenCalledTimes(2);
    });
});
