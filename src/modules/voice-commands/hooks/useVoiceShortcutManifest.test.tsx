// @vitest-environment jsdom
//
// Ikona skrótu „Lead głosem" startowała na ekranie logowania: strona /m/voice miała
// manifest całego CRM (start_url /dashboard). Z ważnym tokenem strona podaje manifest
// skrótu, a po wyjściu z niej wraca manifest CRM (zgłoszenie 25.10.2026).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const rememberShortcut = vi.fn();
vi.mock('../api/voiceCommandsApi', () => ({ voiceCommandsApi: { rememberShortcut: (token: string) => rememberShortcut(token) } }));

import { useVoiceShortcutManifest, VOICE_SHORTCUT_MANIFEST } from './useVoiceShortcutManifest';

const CRM_MANIFEST = '/api/v1/pwa/manifest';
const manifests = () => Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="manifest"]')).map(link => link.getAttribute('href'));

beforeEach(() => {
    document.head.innerHTML = `<link rel="manifest" href="${CRM_MANIFEST}" crossorigin="use-credentials"><meta name="theme-color" content="#0f172a">`;
    document.title = 'DetailBoost';
    rememberShortcut.mockReset();
});
afterEach(() => { document.head.innerHTML = ''; });

describe('useVoiceShortcutManifest', () => {
    it('z ważnym tokenem podaje manifest skrótu zamiast manifestu CRM', async () => {
        rememberShortcut.mockResolvedValue(undefined);
        renderHook(() => useVoiceShortcutManifest('tok', true));

        expect(rememberShortcut).toHaveBeenCalledWith('tok');
        await waitFor(() => expect(manifests()).toEqual([VOICE_SHORTCUT_MANIFEST]));
        const link = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]')!;
        // Bez ciasteczek serwer nie zna tokenu i nie wyda manifestu.
        expect(link.getAttribute('crossorigin')).toBe('use-credentials');
        expect(document.title).toBe('Lead głosem');
        expect(document.head.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute('content')).toBe('Lead głosem');
    });

    it('gdy serwer nie zapisze tokenu, strona zostaje bez manifestu - nie z manifestem CRM', async () => {
        rememberShortcut.mockRejectedValue(new Error('404'));
        renderHook(() => useVoiceShortcutManifest('tok', true));

        await waitFor(() => expect(rememberShortcut).toHaveBeenCalled());
        await Promise.resolve();
        expect(manifests()).toEqual([]);
    });

    it('po wyjściu ze skrótu wraca manifest CRM, tytuł i nic więcej', async () => {
        rememberShortcut.mockResolvedValue(undefined);
        const { unmount } = renderHook(() => useVoiceShortcutManifest('tok', true));
        await waitFor(() => expect(manifests()).toEqual([VOICE_SHORTCUT_MANIFEST]));

        unmount();

        expect(manifests()).toEqual([CRM_MANIFEST]);
        expect(document.title).toBe('DetailBoost');
        expect(document.head.querySelector('meta[name="apple-mobile-web-app-title"]')).toBeNull();
    });

    it('bez sprawdzonego linku niczego nie rusza', () => {
        renderHook(() => useVoiceShortcutManifest('tok', false));

        expect(rememberShortcut).not.toHaveBeenCalled();
        expect(manifests()).toEqual([CRM_MANIFEST]);
        expect(document.title).toBe('DetailBoost');
    });
});
