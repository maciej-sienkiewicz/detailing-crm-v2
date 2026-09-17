// src/modules/comms/components/MessageContextMenu.tsx
//
// Menu kontekstowe pojedynczej wiadomości w rozmowie (prawy przycisk myszy).
// Na razie jedna pozycja - „Oznacz jako nieprzeczytaną" - ale kształt (portal,
// pozycja z kursora, zamknięcie klikiem obok i Esc) jest gotowy na kolejne.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Mail } from 'lucide-react';

const Menu = styled.div`
    position: fixed;
    z-index: 1300;
    min-width: 208px;
    padding: 5px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: ${p => p.theme.radii.lg};
    box-shadow: 0 10px 30px -8px rgba(15, 23, 42, 0.28), 0 2px 6px rgba(15, 23, 42, 0.08);
`;

const Item = styled.button`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 10px;
    border: none;
    border-radius: ${p => p.theme.radii.md};
    background: none;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: ${p => p.theme.fontWeights.medium};
    color: ${p => p.theme.colors.text};
    text-align: left;
    cursor: pointer;
    transition: background ${p => p.theme.transitions.fast};

    svg { width: 16px; height: 16px; color: ${p => p.theme.colors.textMuted}; flex-shrink: 0; }

    &:hover { background: ${p => p.theme.colors.surfaceAlt}; }
    &:focus-visible {
        outline: 2px solid var(--brand-primary);
        outline-offset: -2px;
    }
`;

export interface MessageContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onMarkUnread: () => void;
}

export function MessageContextMenu({ x, y, onClose, onMarkUnread }: MessageContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    // Dosunięcie kursora do prawej/dolnej krawędzi nie może wypchnąć menu poza ekran:
    // po zmierzeniu przesuwamy je tak, by w całości się zmieściło.
    const [pos, setPos] = useState({ x, y });

    useLayoutEffect(() => {
        const el = menuRef.current;
        if (!el) return;
        const { width, height } = el.getBoundingClientRect();
        const margin = 8;
        const nextX = Math.min(x, window.innerWidth - width - margin);
        const nextY = Math.min(y, window.innerHeight - height - margin);
        setPos({ x: Math.max(margin, nextX), y: Math.max(margin, nextY) });
    }, [x, y]);

    useEffect(() => {
        const onDown = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) onClose();
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        // capture, żeby złapać klik zanim inny handler go pochłonie.
        document.addEventListener('mousedown', onDown, true);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown, true);
            document.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    return createPortal(
        <Menu ref={menuRef} style={{ left: pos.x, top: pos.y }} role="menu">
            <Item
                type="button"
                role="menuitem"
                autoFocus
                onClick={() => { onMarkUnread(); onClose(); }}
            >
                <Mail />
                Oznacz jako nieprzeczytaną
            </Item>
        </Menu>,
        document.body
    );
}
