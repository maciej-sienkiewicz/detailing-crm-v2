// @vitest-environment jsdom
//
// Jedna sesja zdjęć na jeden kreator przyjęcia. `POST /photo-sessions` zakłada wiersz
// w bazie, a krok zdjęć odmontowuje się przy każdym przejściu między krokami. Dawniej
// powrót do kroku zakładał nową, pustą sesję i następne zdjęcie wypychało z formularza
// wszystkie wcześniejsze.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { usePhotoSessionScope, usePhotoUpload } from './usePhotoUpload';

const api = vi.hoisted(() => ({
    createUploadSession: vi.fn(),
    getSessionPhotos: vi.fn(),
}));

vi.mock('../api/checkinApi', () => ({ checkinApi: api }));

const seen: string[] = [];

const Step = ({ scope }: { scope: string }) => {
    const { uploadSession } = usePhotoUpload(scope, 'appt-1');
    if (uploadSession) seen.push(uploadSession.sessionId);
    return null;
};

const Wizard = ({ showPhotos }: { showPhotos: boolean }) => {
    const scope = usePhotoSessionScope('appt-1');
    return showPhotos ? <Step scope={scope} /> : null;
};

const renderWizard = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });
    const view = render(<QueryClientProvider client={client}><Wizard showPhotos /></QueryClientProvider>);
    const show = (showPhotos: boolean) => view.rerender(
        <QueryClientProvider client={client}><Wizard showPhotos={showPhotos} /></QueryClientProvider>,
    );
    return { client, view, show };
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    seen.length = 0;
    onlineManager.setOnline(true);
});

describe('usePhotoUpload', () => {
    it('zakłada sesję raz, choć krok zdjęć montuje się kilka razy', async () => {
        let n = 0;
        api.createUploadSession.mockImplementation(async () => ({ sessionId: `s${++n}`, token: 't' }));
        api.getSessionPhotos.mockResolvedValue({ photos: [] });

        const { show } = renderWizard();
        await waitFor(() => expect(seen).toContain('s1'));

        show(false);
        show(true);
        await act(async () => { onlineManager.setOnline(false); onlineManager.setOnline(true); });

        expect(api.createUploadSession).toHaveBeenCalledTimes(1);
        expect(new Set(seen)).toEqual(new Set(['s1']));
    });

    it('daje nowemu kreatorowi nową sesję', async () => {
        let n = 0;
        api.createUploadSession.mockImplementation(async () => ({ sessionId: `s${++n}`, token: 't' }));
        api.getSessionPhotos.mockResolvedValue({ photos: [] });

        const first = renderWizard();
        await waitFor(() => expect(seen).toContain('s1'));
        first.view.unmount();

        renderWizard();
        await waitFor(() => expect(seen).toContain('s2'));
        expect(api.createUploadSession).toHaveBeenCalledTimes(2);
    });
});
