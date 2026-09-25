// src/common/components/ui/ActionMenu.tsx
//
// Menu akcji otwierane z przycisku (⋮ w wierszu, ⋯ w nagłówku).
//
// Renderuje się PORTALEM do <body> w `position: fixed`: menu wewnątrz karty
// z `overflow: hidden` (a karta wizyty i zleceń ją ma, żeby zaokrąglić rogi)
// było przycinane przy ostatnich wierszach tabeli. Ponieważ panel stoi poza
// drzewem przycisku, zamykanie „po kliknięciu obok" sprawdza OBA elementy -
// inaczej kliknięcie we własną pozycję menu zamykało je, zanim `onClick`
// pozycji zdążył się wykonać (tak kiedyś umarły „Generuj post" i „Usuń wizytę").
//
// Przy dolnej krawędzi ekranu menu otwiera się w górę, zamiast wyjeżdżać pod nią.

import {
    useEffect, useLayoutEffect, useRef,
    type ButtonHTMLAttributes, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { touch, ui } from './tokens';

import type { AnchorRect } from './useActionMenu';

const Dropdown = styled.div`
    position: fixed;
    z-index: 9000;
    min-width: 210px;
    max-width: calc(100vw - 16px);
    padding: 4px;
    background: ${ui.surface};
    border: 1px solid ${ui.line};
    border-radius: 12px;
    box-shadow: ${ui.shadowMenu};
`;

const Item = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 38px;
    padding: 0 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 500;
    text-align: left;
    color: ${p => p.$danger ? ui.dangerInk : ui.ink};
    cursor: pointer;

    svg { width: 15px; height: 15px; flex-shrink: 0; color: ${p => p.$danger ? ui.dangerInk : ui.textMuted}; }
    &:hover:not(:disabled), &:focus-visible { background: ${p => p.$danger ? ui.dangerTint : ui.surfaceAlt}; outline: none; }
    &:disabled { opacity: 0.45; cursor: not-allowed; }
    ${touch} { min-height: 46px; }
`;

export const MenuDivider = styled.div.attrs({ role: 'separator' })`
    height: 1px;
    margin: 4px 2px;
    background: ${ui.line};
`;

interface MenuItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    icon?: ReactNode;
    danger?: boolean;
    children: ReactNode;
}

export function MenuItem({ icon, danger, children, type = 'button', ...rest }: MenuItemProps) {
    return (
        <Item role="menuitem" type={type} $danger={danger} {...rest}>
            {icon}
            {children}
        </Item>
    );
}

interface ActionMenuProps {
    /** Stan z `useActionMenu().menu`; null = zamknięte. */
    anchor: AnchorRect | null;
    onClose: () => void;
    label?: string;
    children: ReactNode;
}

export function ActionMenu({ anchor, onClose, label, children }: ActionMenuProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Pozycja liczona PO wyrenderowaniu: dopiero wtedy znamy wysokość panelu
    // i wiemy, czy zmieści się pod przyciskiem. Zapis wprost do stylu elementu,
    // bez stanu - to pomiar DOM-u, nie dane Reacta.
    useLayoutEffect(() => {
        const panel = panelRef.current;
        if (!anchor || !panel) return;
        const vpWidth = window.visualViewport?.width ?? window.innerWidth;
        const vpHeight = window.visualViewport?.height ?? window.innerHeight;
        const height = panel.offsetHeight;
        const below = anchor.bottom + 4;
        // Na telefonie dół ekranu zajmuje pasek nawigacji aplikacji - menu nie może pod nim lądować.
        const bottomReserve = vpWidth < 768 ? 88 : 8;
        const top = below + height > vpHeight - bottomReserve && anchor.top - 4 - height > 8
            ? anchor.top - 4 - height
            : below;
        panel.style.top = `${top}px`;
        panel.style.right = `${Math.max(8, vpWidth - anchor.right)}px`;
        panel.style.visibility = 'visible';
    }, [anchor]);

    useEffect(() => {
        if (!anchor) return;
        const onDown = (e: MouseEvent) => {
            if (panelRef.current?.contains(e.target as Node)) return;
            onClose();
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        // Menu stoi w `position: fixed` - przy przewinięciu odjechałoby od przycisku.
        const onScroll = (e: Event) => {
            if (panelRef.current?.contains(e.target as Node)) return;
            onClose();
        };
        // `click`, nie `mousedown`: przycisk, który otworzył menu, sam je przełącza
        // i zatrzymuje propagację - mousedown zamknąłby menu przed jego kliknięciem.
        document.addEventListener('click', onDown);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onClose);
        return () => {
            document.removeEventListener('click', onDown);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onClose);
        };
    }, [anchor, onClose]);

    if (!anchor) return null;
    return createPortal(
        <Dropdown
            ref={panelRef}
            role="menu"
            aria-label={label}
            style={{ top: anchor.bottom + 4, right: 8, visibility: 'hidden' }}
            onClick={e => {
                // Kliknięcie w pozycję zamyka menu; akcja pozycji wykonuje się w jej onClick.
                e.stopPropagation();
                if ((e.target as HTMLElement).closest('[role="menuitem"]:not(:disabled)')) onClose();
            }}
        >
            {children}
        </Dropdown>,
        document.body,
    );
}
