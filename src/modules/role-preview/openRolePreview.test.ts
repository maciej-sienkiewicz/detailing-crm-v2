import { describe, expect, it, vi } from 'vitest';

// Domyślny klient HTTP nie jest tu potrzebny - każdy test podaje własne zależności.
vi.mock('./rolePreviewApi', () => ({ rolePreviewApi: { start: vi.fn() } }));

import { openRolePreview, PreviewWindowBlockedError } from './openRolePreview';

const input = { roleName: 'Recepcja', permissions: ['VISITS_VIEW'], trackWorkTime: false };

describe('otwieranie podglądu roli', () => {
    it('otwiera okno od razu, z tym samym kodem, który dostaje serwer', async () => {
        const events: string[] = [];
        const previewWindow = { close: vi.fn() } as unknown as Window;
        const open = vi.fn((url: string) => { events.push(`open ${url}`); return previewWindow; });
        const start = vi.fn(async (payload: { entryCode: string }) => { events.push(`start ${payload.entryCode}`); });

        await openRolePreview('https://podglad.detailboost.pl', input, { open, start, newCode: () => 'KOD' });

        // Okno przed serwerem: po odpowiedzi przeglądarka zablokowałaby je jako wyskakujące.
        expect(events).toEqual(['open https://podglad.detailboost.pl/podglad#k=KOD', 'start KOD']);
        expect(start).toHaveBeenCalledWith({ ...input, entryCode: 'KOD' });
        expect(previewWindow.close).not.toHaveBeenCalled();
    });

    it('zamyka okno, gdy serwer odmówi podglądu', async () => {
        const previewWindow = { close: vi.fn() } as unknown as Window;
        const refusal = new Error('limit');

        await expect(openRolePreview('https://podglad.detailboost.pl', input, {
            open: () => previewWindow,
            start: () => Promise.reject(refusal),
            newCode: () => 'KOD',
        })).rejects.toBe(refusal);

        expect(previewWindow.close).toHaveBeenCalledTimes(1);
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
