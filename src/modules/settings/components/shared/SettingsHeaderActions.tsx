// src/modules/settings/components/shared/SettingsHeaderActions.tsx
//
// Akcje sekcji („Dodaj usługę", „Dodaj pracownika") stoją w nagłówku ramy obok
// tytułu, a nie w osobnym pasku nad listą. Sekcja deklaruje je u siebie, bo tylko ona
// wie, co otwierają - komponent przenosi je portalem do nagłówka.
//
// Poza ramą (testy, podgląd samej sekcji) akcje renderują się w miejscu.

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsChrome } from './settingsChrome';

export function SettingsHeaderActions({ children }: { children: ReactNode }) {
    const chrome = useSettingsChrome();
    if (!chrome) return <>{children}</>;
    if (!chrome.headerActions) return null;
    return createPortal(children, chrome.headerActions);
}
