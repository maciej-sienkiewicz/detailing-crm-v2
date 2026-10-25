// src/modules/voice-commands/hooks/useVoiceShortcutManifest.ts
//
// Skrót „Lead głosem" na ekranie głównym telefonu jako osobna aplikacja.
//
// index.html podaje każdej stronie manifest całego CRM: `start_url` /dashboard, `id` /.
// Safari i Chrome otwierają ikonę z ekranu głównego pod `start_url` z manifestu, a nie pod
// adresem dodanej strony - skrót dodany z `/m/voice` startował więc na Tablicy, bez sesji,
// czyli na ekranie logowania (zgłoszenie 25.10.2026). Skrót z założenia działa bez
// logowania: wystarcza mu token z linku.
//
// Na `/m/voice` z ważnym tokenem podmieniamy więc manifest na manifest skrótu (backend:
// VoiceShortcutController): własne `id` i `scope`, a `start_url` z tokenem we fragmencie.
// Token najpierw idzie nagłówkiem do serwera, który odkłada go w ciasteczku httpOnly pod
// adresem manifestu - przeglądarka pobiera manifest sama, bez naszego nagłówka.
//
// Manifest CRM znika ze strony od razu, a nie dopiero po podmianie: gdyby zapisanie tokenu
// się nie udało, ikona bez manifestu otworzy przynajmniej dodaną stronę, a nie logowanie.
import { useEffect } from 'react';
import { voiceCommandsApi } from '../api/voiceCommandsApi';

export const VOICE_SHORTCUT_MANIFEST = '/api/v1/mobile/voice/shortcut/manifest';
/** Nazwa pod ikoną; ta sama co `short_name` w manifeście skrótu. */
export const VOICE_SHORTCUT_NAME = 'Lead głosem';

/** iOS podpisuje ikonę tą nazwą, gdy ją ma - przed tytułem strony. */
const APPLE_TITLE = 'apple-mobile-web-app-title';

export function useVoiceShortcutManifest(token: string, active: boolean): void {
    useEffect(() => {
        if (!active || !token) return;
        let cancelled = false;

        const crmManifest = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
        const crmPlace = crmManifest?.nextSibling ?? null;
        crmManifest?.remove();

        const previousTitle = document.title;
        document.title = VOICE_SHORTCUT_NAME;
        const appleTitle = document.createElement('meta');
        appleTitle.name = APPLE_TITLE;
        appleTitle.content = VOICE_SHORTCUT_NAME;
        document.head.appendChild(appleTitle);

        const shortcutManifest = document.createElement('link');
        shortcutManifest.rel = 'manifest';
        shortcutManifest.href = VOICE_SHORTCUT_MANIFEST;
        // Bez tego przeglądarka pobiera manifest bez ciasteczek, a w ciasteczku jest token.
        shortcutManifest.crossOrigin = 'use-credentials';

        voiceCommandsApi.rememberShortcut(token)
            .then(() => {
                if (!cancelled) document.head.appendChild(shortcutManifest);
            })
            .catch(() => { /* zostaje strona bez manifestu - patrz komentarz u góry */ });

        return () => {
            cancelled = true;
            shortcutManifest.remove();
            appleTitle.remove();
            document.title = previousTitle;
            if (crmManifest) document.head.insertBefore(crmManifest, crmPlace?.parentNode === document.head ? crmPlace : null);
        };
    }, [token, active]);
}
