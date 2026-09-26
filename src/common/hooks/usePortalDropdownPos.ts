import { useRef, useState, useEffect, useCallback } from 'react';
import { mobileBottomReserve, placeFloating, visibleViewport } from '@/common/utils/floatingPlacement';

export type DropdownHAlign = 'right' | 'left';

export interface PortalDropdownPos {
    top: number;
    left: number;
    maxWidth?: number;
    maxHeight?: number;
    visible: boolean;
}

interface OpenOpts {
    /** Which edge of the anchor to align with. Default 'right'. */
    align?: DropdownHAlign;
    /** Gap (px) between anchor bottom/top and menu. Default 6. */
    offset?: number;
    /** Min distance from viewport edge before flipping. Default 8. */
    viewportMargin?: number;
}

/**
 * Positions a fixed-position portal dropdown relative to a trigger element,
 * flipping upward automatically when the menu would overflow the viewport bottom.
 *
 * Usage:
 *   const { menuRef, pos, open } = usePortalDropdownPos();
 *   // trigger: onClick={e => { open(e); setIsOpen(true); }}
 *   // portal:  isOpen && pos && createPortal(<Menu ref={menuRef} style={pos.style}>...</Menu>, body)
 */
export function usePortalDropdownPos() {
    const menuRef = useRef<HTMLDivElement>(null);
    const anchorRectRef = useRef<DOMRect | null>(null);
    const optsRef = useRef<Required<OpenOpts>>({ align: 'right', offset: 6, viewportMargin: 8 });
    const [pos, setPos] = useState<PortalDropdownPos | null>(null);

    const open = useCallback((e: React.MouseEvent, opts: OpenOpts = {}) => {
        const { align = 'right', offset = 6, viewportMargin = 8 } = opts;
        optsRef.current = { align, offset, viewportMargin };
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        anchorRectRef.current = rect;
        // Pierwsze ustawienie jest niewidoczne - prawdziwe przychodzi po pomiarze menu.
        setPos({ top: rect.bottom + offset, left: rect.left, visible: false });
    }, []);

    const close = useCallback(() => {
        setPos(null);
        anchorRectRef.current = null;
    }, []);

    // Po zamontowaniu (niewidoczne): pomiar menu i ustawienie przez placeFloating -
    // w ekranie z obu stron, pod przyciskiem albo nad nim, z przewijaniem, gdy brak
    // miejsca. Wcześniej hook pilnował tylko dołu, a w poziomie kleił się do jednej
    // krawędzi przycisku, więc menu przy lewej krawędzi telefonu wyjeżdżało za ekran.
    useEffect(() => {
        if (!pos || pos.visible || !menuRef.current || !anchorRectRef.current) return;
        const menu = menuRef.current;
        if (menu.offsetHeight === 0) return;
        const { align, offset, viewportMargin } = optsRef.current;
        const viewport = visibleViewport();
        const placement = placeFloating(
            anchorRectRef.current,
            { width: menu.offsetWidth, height: menu.offsetHeight },
            viewport,
            { align, offset, margin: viewportMargin, bottomReserve: mobileBottomReserve(viewport.width) },
        );
        setPos({
            top: placement.top,
            left: placement.left,
            maxWidth: placement.maxWidth,
            maxHeight: placement.maxHeight,
            visible: true,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pos]);

    // Inline style to apply to the menu element.
    // visibility:hidden during measurement so the user never sees the initial position.
    const style: React.CSSProperties | undefined = pos
        ? {
            top: pos.top,
            left: pos.left,
            right: 'auto',
            ...(pos.visible
                ? { maxWidth: pos.maxWidth, maxHeight: pos.maxHeight, overflowY: 'auto' as const }
                : { visibility: 'hidden' as const }),
        }
        : undefined;

    return { menuRef, pos, style, open, close };
}
