// src/modules/visits/components/SectionChips.tsx
//
// Skróty do sekcji karty wizyty na telefonie, przypięte pod nagłówkiem.
//
// Zastępują dolny pasek zakładek (MobileSectionNav). Tamten pasek siedział nad
// globalną nawigacją aplikacji - na dole ekranu były więc DWA rzędy przycisków -
// a zakładki chowały resztę karty: żeby zobaczyć zdjęcia i klienta naraz, trzeba
// było przełączać. Teraz karta jest jedną kolumną, a skrót tylko do niej przewija;
// podświetlony jest ten, którego sekcja jest właśnie na ekranie.

import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { ui } from '@/common/components/ui';

/* Miejsce paska w układzie - trzyma wysokość, gdy sam pasek jest przypięty. */
const Slot = styled.div`
    height: 52px;
    margin: -4px -16px 14px;
`;

/*
 * Przypięcie przez `position: fixed`, nie `sticky`: główny kontener aplikacji ma
 * `overflow-x: hidden`, a to robi z niego kontener przewijania - `sticky` przykleja
 * się wtedy do niego, a nie do okna, czyli nie przykleja się wcale.
 */
const Bar = styled.nav<{ $pinned: boolean }>`
    position: ${p => p.$pinned ? 'fixed' : 'relative'};
    top: 0;
    left: 0;
    right: 0;
    z-index: 90;
    display: flex;
    gap: 8px;
    height: 52px;
    box-sizing: border-box;
    padding: 8px 16px;
    overflow-x: auto;
    scrollbar-width: none;
    background: rgba(238, 242, 247, 0.94);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid ${ui.line};

    &::-webkit-scrollbar { display: none; }
`;

const Chip = styled.button<{ $active: boolean }>`
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border-radius: ${ui.radiusControl};
    border: 1px solid ${p => p.$active ? ui.brandLine : ui.line};
    background: ${p => p.$active ? ui.brandTint : ui.surface};
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: ${p => p.$active ? ui.brandDeep : ui.textSecondary};
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    span { font-variant-numeric: tabular-nums; color: ${p => p.$active ? ui.brandInk : ui.textMuted}; }
`;

export interface SectionChip {
    id: string;
    label: string;
    count?: number;
}

interface Props {
    items: SectionChip[];
    /** Sekcja zwinięta (historia) rozwija się, zanim do niej przewiniemy. */
    onOpen?: (id: string) => void;
}

export function SectionChips({ items, onOpen }: Props) {
    const [active, setActive] = useState(items[0]?.id ?? '');
    const barRef = useRef<HTMLElement>(null);
    /** Po kliknięciu przewijanie samo przestawiałoby podświetlenie po drodze. */
    const lockUntil = useRef(0);
    const ids = items.map(i => i.id).join('|');
    const slotRef = useRef<HTMLDivElement>(null);
    const [pinned, setPinned] = useState(false);

    useEffect(() => {
        const slot = slotRef.current;
        if (!slot || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(([entry]) => {
            // Przypięty, gdy miejsce paska wyjechało GÓRĄ poza ekran.
            setPinned(!entry.isIntersecting && entry.boundingClientRect.top < 0);
        });
        observer.observe(slot);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return;
        const elements = ids.split('|').map(id => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
        const visible = new Map<string, number>();
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => visible.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : Infinity));
            if (performance.now() < lockUntil.current) return;
            // Aktywna jest najwyższa sekcja, która wchodzi w pas pod paskiem skrótów.
            let best: string | null = null;
            let bestTop = Infinity;
            visible.forEach((top, id) => { if (top < bestTop) { bestTop = top; best = id; } });
            if (best) setActive(best);
        }, { rootMargin: '-60px 0px -55% 0px' });
        elements.forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, [ids]);

    // Podświetlony skrót zawsze widoczny w poziomym pasku.
    useEffect(() => {
        const chip = barRef.current?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
        chip?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }, [active]);

    /** `at` to znacznik czasu zdarzenia kliknięcia (ta sama skala co performance.now()). */
    const go = (id: string, at: number) => {
        onOpen?.(id);
        setActive(id);
        lockUntil.current = at + 800;
        // Po rozwinięciu sekcji (historia) przewijamy w następnej klatce.
        requestAnimationFrame(() => {
            const el = document.getElementById(id);
            if (!el) return;
            // Odstęp na przypięty pasek skrótów - inaczej przykryłby nagłówek sekcji.
            const top = el.getBoundingClientRect().top + window.scrollY - 64;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    };

    return (
        <Slot ref={slotRef}>
        <Bar ref={barRef} $pinned={pinned} aria-label="Sekcje wizyty">
            {items.map(item => (
                <Chip
                    key={item.id}
                    type="button"
                    data-chip={item.id}
                    $active={active === item.id}
                    aria-current={active === item.id ? 'true' : undefined}
                    onClick={e => go(item.id, e.timeStamp)}
                >
                    {item.label}
                    {!!item.count && <span>{item.count}</span>}
                </Chip>
            ))}
        </Bar>
        </Slot>
    );
}
