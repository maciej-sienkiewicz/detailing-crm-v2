// src/common/components/PageChrome/PageHeaderActions.tsx
//
// Akcje sekcji („Dodaj pracownika", „Dodaj listę obecności") stoją w nagłówku ramy,
// a nie w osobnym pasku nad listą. Sekcja deklaruje je u siebie, bo tylko ona wie,
// co otwierają - komponent przenosi je portalem do nagłówka.
//
// Poza ramą (testy, podgląd samej sekcji) akcje renderują się w miejscu.

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePageChrome } from './pageChrome';

export function PageHeaderActions({ children }: { children: ReactNode }) {
    const chrome = usePageChrome();
    if (!chrome) return <>{children}</>;
    if (!chrome.headerActions) return null;
    return createPortal(children, chrome.headerActions);
}
