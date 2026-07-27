import { useRef, useState, useEffect, useCallback } from 'react';

export type DropdownHAlign = 'right' | 'left';

export interface PortalDropdownPos {
    top: number;
    right?: number;
    left?: number;
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
 *   // portal:  isOpen && pos && createPortal(<Menu ref={menuRef} style={pos.style}>…</Menu>, body)
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
        const horiz = align === 'right'
            ? { right: window.innerWidth - rect.right }
            : { left: rect.left };
        setPos({ top: rect.bottom + offset, ...horiz, visible: false });
    }, []);

    const close = useCallback(() => {
        setPos(null);
        anchorRectRef.current = null;
    }, []);

    // After the menu mounts at hidden position: measure its height and flip if needed.
    useEffect(() => {
        if (!pos || pos.visible || !menuRef.current || !anchorRectRef.current) return;
        const menuHeight = menuRef.current.offsetHeight;
        if (menuHeight === 0) return;
        const anchor = anchorRectRef.current;
        const { align, offset, viewportMargin } = optsRef.current;
        const horiz = align === 'right'
            ? { right: window.innerWidth - anchor.right }
            : { left: anchor.left };
        const fitsBelow = anchor.bottom + offset + menuHeight <= window.innerHeight - viewportMargin;
        setPos({
            top: fitsBelow ? anchor.bottom + offset : anchor.top - menuHeight - offset,
            ...horiz,
            visible: true,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pos]);

    // Inline style to apply to the menu element.
    // visibility:hidden during measurement so the user never sees the initial position.
    const style: React.CSSProperties | undefined = pos
        ? {
            top: pos.top,
            ...(pos.right !== undefined ? { right: pos.right } : { left: pos.left }),
            ...(pos.visible ? {} : { visibility: 'hidden' as const }),
        }
        : undefined;

    return { menuRef, pos, style, open, close };
}
