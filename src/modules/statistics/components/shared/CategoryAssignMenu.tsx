// src/modules/statistics/components/shared/CategoryAssignMenu.tsx
// Wspólne menu kontekstowe przypisywania kategorii (Przychody / Koszty).
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { applyFloatingPlacement, type AnchorBox } from '@/common/utils/floatingPlacement';
import { st } from '../StatisticsTheme';
import { CTX_MENU_OFFSET } from './shareSlices';

const CTX_PANEL_MAX_WIDTH = 280;

// Pozycję, szerokość i wysokość nadaje applyFloatingPlacement po pomiarze - do tego
// czasu panel stoi w x/y z przybliżenia, ale niewidoczny, więc nie miga.
export const CtxPanel = styled.div`
    position: fixed;
    visibility: hidden;
    z-index: 9100;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
    min-width: 220px;
    max-width: ${CTX_PANEL_MAX_WIDTH}px;
    padding: 4px;
    overflow-x: hidden;
`;

export const CtxItem = styled.button<{ $danger?: boolean }>`
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-radius: 8px;
    font-family: inherit;
    font-size: ${st.fontSm};
    font-weight: 500;
    color: ${p => p.$danger ? '#DC2626' : st.text};
    cursor: pointer;
    text-align: left;
    transition: background ${st.transition};
    &:hover { background: ${p => p.$danger ? '#FEF2F2' : st.bg}; }
    svg { width: 13px; height: 13px; flex-shrink: 0; opacity: 0.6; }
`;

export const CtxDivider = styled.div`
    height: 1px;
    background: ${st.border};
    margin: 4px 0;
`;

export const CtxSectionLabel = styled.div`
    padding: 4px 12px 2px;
    font-size: 10px;
    font-weight: 700;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

export const CtxCatDot = styled.span<{ $color: string }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${p => p.$color};
    flex-shrink: 0;
`;

export interface AssignMenuCategory {
    id: string;
    name: string;
    color: string | null;
}

interface CategoryAssignMenuProps {
    /** Pierwsze przybliżenie pozycji (z `ctxMenuPosition`). */
    x: number;
    y: number;
    /**
     * Kliknięty element (`ctxMenuPosition(...).anchor`). Z nim menu po pomiarze staje
     * pod elementem albo nad nim, dociśnięte do ekranu; bez niego kotwicą jest punkt x/y.
     */
    anchor?: AnchorBox;
    categories: AssignMenuCategory[];
    onAssign: (categoryId: string) => void;
    /** Gdy podane, renderuje pozycję „Usuń przypisanie" */
    onUnassign?: () => void;
    unassignLabel?: string;
    onClose: () => void;
    /** Dodatkowe pozycje menu renderowane po separatorze (np. podgląd faktury) */
    children?: ReactNode;
}

export const CategoryAssignMenu = ({
    x, y, anchor, categories, onAssign, onUnassign, unassignLabel = 'Usuń przypisanie', onClose, children,
}: CategoryAssignMenuProps) => {
    const ref = useRef<HTMLDivElement>(null);

    // Stałe 230 × 240 z ctxMenuPosition nie znają długich nazw ani liczby kategorii -
    // dopiero zmierzony panel mówi, czy mieści się pod elementem, nad nim, czy musi
    // dostać limit wysokości i przewijać listę.
    const anchorTop = anchor?.top ?? y;
    const anchorBottom = anchor?.bottom ?? y;
    const anchorLeft = anchor?.left ?? x;
    const anchorRight = anchor?.right ?? x;
    const hasAnchor = anchor !== undefined;
    // Wartości logiczne zamiast samych `children`/`onUnassign`: to nowe obiekty przy
    // każdym renderze rodzica, a każde przeliczenie zeruje przewinięcie listy.
    const hasChildren = Boolean(children);
    const hasUnassign = Boolean(onUnassign);
    useLayoutEffect(() => {
        const panel = ref.current;
        if (!panel) return;
        const placement = applyFloatingPlacement(
            panel,
            { top: anchorTop, bottom: anchorBottom, left: anchorLeft, right: anchorRight },
            hasAnchor ? { align: 'right', offset: CTX_MENU_OFFSET } : { align: 'left', offset: 0 },
        );
        // applyFloatingPlacement nadpisuje limit szerokości szerokością ekranu - bez
        // przywrócenia 280 px długa nazwa kategorii rozepchnęłaby panel szerzej, niż
        // go zmierzono, i prawa krawędź minęłaby wyliczone miejsce.
        panel.style.maxWidth = `${Math.min(placement.maxWidth, CTX_PANEL_MAX_WIDTH)}px`;
    }, [anchorTop, anchorBottom, anchorLeft, anchorRight, hasAnchor, categories.length, hasChildren, hasUnassign]);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [onClose]);

    return createPortal(
        <CtxPanel ref={ref} style={{ top: y, left: x }}>
            <CtxSectionLabel>Przypisz do kategorii</CtxSectionLabel>
            {categories.length === 0 && (
                <div style={{ padding: '8px 12px', fontSize: st.fontSm, color: st.textMuted }}>Brak kategorii</div>
            )}
            {categories.map(cat => (
                <CtxItem key={cat.id} onClick={() => onAssign(cat.id)}>
                    <CtxCatDot $color={cat.color ?? '#94A3B8'} />
                    {cat.name}
                </CtxItem>
            ))}
            {(onUnassign || children) && <CtxDivider />}
            {onUnassign && (
                <CtxItem $danger onClick={onUnassign}>
                    <X />
                    {unassignLabel}
                </CtxItem>
            )}
            {children}
        </CtxPanel>,
        document.body
    );
};
