import { describe, expect, it, vi } from 'vitest';

// Domyślny klient HTTP nie jest tu potrzebny - każdy test podaje własne zależności.
vi.mock('./rolePreviewApi', () => ({ rolePreviewApi: { start: vi.fn() } }));

import { openRolePreview, PreviewWindowBlockedError } from './openRolePreview';

const input = { roleName: 'Recepcja', permissions: ['VISITS_VIEW'], trackWorkTime: false };

describe('otwieranie podglądu roli', () => {
    it('otwiera okno od razu, z tym samym kodem, który dostaje serwer', async () => {
        const events: string[] = [];
        const previewWindow = { close: vi.fn(), postMessage: vi.fn() } as unknown as Window;
        const open = vi.fn((url: string) => { events.push(`open ${url}`); return previewWindow; });
        const start = vi.fn(async (payload: { entryCode: string }) => { events.push(`start ${payload.entryCode}`); });

        await openRolePreview('https://podglad.detailboost.pl', input, { open, start, newCode: () => 'KOD' });

        // Okno przed serwerem: po odpowiedzi przeglądarka zablokowałaby je jako wyskakujące.
        expect(events).toEqual(['open https://podglad.detailboost.pl/podglad#k=KOD', 'start KOD']);
        expect(start).toHaveBeenCalledWith({ ...input, entryCode: 'KOD' });
        expect(previewWindow.close).not.toHaveBeenCalled();
        expect(previewWindow.postMessage).not.toHaveBeenCalled();
    });

    it('zamyka okno, gdy serwer odmówi podglądu', async () => {
        const calls: string[] = [];
        const previewWindow = {
            close: vi.fn(() => { calls.push('close'); }),
            postMessage: vi.fn(() => { calls.push('postMessage'); }),
        } as unknown as Window;
        const refusal = { response: { status: 409, data: { message: 'W tym studiu jest już otwartych 5 podglądów roli.' } } };

        await expect(openRolePreview('https://podglad.detailboost.pl', input, {
            open: () => previewWindow,
            start: () => Promise.reject(refusal),
            newCode: () => 'KOD',
        })).rejects.toBe(refusal);

        // Samo close() nie zadziała, gdy okno podglądu zdążyło odciąć się od tego okna -
        // dlatego najpierw wiadomość, po której zamyka się ono samo.
        expect(calls).toEqual(['postMessage', 'close']);
        expect(previewWindow.postMessage).toHaveBeenCalledWith(
            { type: 'role-preview:start-failed', reason: 'W tym studiu jest już otwartych 5 podglądów roli.' },
            'https://podglad.detailboost.pl',
        );
    });

    it('zablokowane okno nie zakłada piaskownicy', async () => {
        const start = vi.fn();

        await expect(openRolePreview('https://podglad.detailboost.pl', input, {
            open: () => null,
            start,
            newCode: () => 'KOD',
        })).rejects.toBeInstanceOf(PreviewWindowBlockedError);

        expect(start).not.toHaveBeenCalled();
    });
});
