import React from 'react';
import type { Root } from 'react-dom/client';
import { readEntryCodeFromHash, ROLE_PREVIEW_SHELL_PATH } from '../entryCode';
import { watchStartFailure } from '../startFailure';
import { RolePreviewShell } from './RolePreviewShell';

/**
 * Start okna podglądu. Kod wejścia jest zdejmowany z paska adresu, zanim cokolwiek się
 * wyrenderuje: nie zostaje w historii przeglądarki, w zakładkach ani na zrzutach ekranu.
 */
export function mountRolePreviewShell(root: Root) {
    const entryCode = readEntryCodeFromHash(window.location.hash);
    window.history.replaceState(null, '', ROLE_PREVIEW_SHELL_PATH);
    // Nasłuch PRZED odcięciem: po nim tylko wiadomość od okna studia zamknie to okno,
    // gdy piaskownica nie powstanie.
    const startFailure = watchStartFailure(window.opener);
    // Okno otworzyła aplikacja administratora - odcinamy się od niej od razu.
    try { window.opener = null; } catch { /* bez znaczenia, gdy przeglądarka nie pozwala */ }

    root.render(
        <React.StrictMode>
            <RolePreviewShell entryCode={entryCode} startFailure={startFailure} />
        </React.StrictMode>,
    );
}
