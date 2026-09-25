// src/common/components/ui/useActionMenu.ts
//
// Stan jednego menu akcji na cały widok - patrz ActionMenu.tsx.

import { useCallback, useState, type MouseEvent as ReactMouseEvent } from 'react';

export interface AnchorRect { top: number; bottom: number; right: number; left: number; }

export interface MenuState<T> {
    item: T;
    key: string;
    anchor: AnchorRect;
}

/**
 * Stan jednego menu na cały widok: tabela z dwudziestoma wierszami ma jedno menu,
 * a nie dwadzieścia. `key` odróżnia, który przycisk je otworzył.
 */
export function useActionMenu<T = null>() {
    const [menu, setMenu] = useState<MenuState<T> | null>(null);

    const toggle = useCallback((e: ReactMouseEvent<HTMLElement>, item: T, key = 'menu') => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenu(prev => prev?.key === key ? null : {
            item,
            key,
            anchor: { top: rect.top, bottom: rect.bottom, right: rect.right, left: rect.left },
        });
    }, []);

    const close = useCallback(() => setMenu(null), []);
    const isOpen = useCallback((key = 'menu') => menu?.key === key, [menu]);

    return { menu, toggle, close, isOpen };
}

