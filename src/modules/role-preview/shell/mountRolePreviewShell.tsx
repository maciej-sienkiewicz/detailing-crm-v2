import React from 'react';
import type { Root } from 'react-dom/client';
import { readEntryCodeFromHash, ROLE_PREVIEW_SHELL_PATH } from '../entryCode';
import { RolePreviewShell } from './RolePreviewShell';

/**
 * Start okna podglądu. Kod wejścia jest zdejmowany z paska adresu, zanim cokolwiek się
 * wyrenderuje: nie zostaje w historii przeglądarki, w zakładkach ani na zrzutach ekranu.
 */
export function mountRolePreviewShell(root: Root) {
    const entryCode = readEntryCodeFromHash(window.location.hash);
    window.history.replaceState(null, '', ROLE_PREVIEW_SHELL_PATH);
    // Okno otworzyła aplikacja administratora - odcinamy się od niej od razu.
    try { window.opener = null; } catch { /* bez znaczenia, gdy przeglądarka nie pozwala */ }

    root.render(
        <React.StrictMode>
            <RolePreviewShell entryCode={entryCode} />
        </React.StrictMode>,
    );
}
