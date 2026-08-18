// src/modules/statistics/components/shared/CategoryAssignMenu.tsx
// Wspólne menu kontekstowe przypisywania kategorii (Przychody / Koszty).
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { st } from '../StatisticsTheme';

export const CtxPanel = styled.div`
    position: fixed;
    z-index: 9100;
    background: ${st.bgCard};
    border: 1px solid ${st.border};
    border-radius: ${st.radius};
    box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
    min-width: 220px;
    max-width: 280px;
    padding: 4px;
    overflow: hidden;
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
    x: number;
    y: number;
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
    x, y, categories, onAssign, onUnassign, unassignLabel = 'Usuń przypisanie', onClose, children,
}: CategoryAssignMenuProps) => {
    const ref = useRef<HTMLDivElement>(null);

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
