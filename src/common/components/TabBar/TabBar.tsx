// src/common/components/TabBar/TabBar.tsx
import { useEffect, useRef, type ReactNode } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

/**
 * Canonical underline tab bar, the pattern established by the Instagram
 * competition view (Przegląd / Porównanie / Treści / Raport). Every module-level
 * tab switcher renders through this component so typography, spacing and the
 * active-state accent stay identical across views.
 *
 * Generic over the tab key so `onChange` hands back the exact union the caller
 * declared instead of a loose `string`.
 */

export interface TabDefinition<K extends string> {
    key: K;
    label: string;
    /** Optional 14px leading icon (inherits `currentColor`). */
    icon?: ReactNode;
    /** Optional count pill after the label (rendered even for 0). */
    count?: number;
    /**
     * Każda nowa wartość (licznik, znacznik czasu) odpala na zakładce kilkusekundowe
     * zielone mruganie - „tu pojawiło się coś nowego". Brak albo 0 = zakładka spokojna.
     */
    flashKey?: number;
}

export interface TabBarProps<K extends string> {
    tabs: ReadonlyArray<TabDefinition<K>>;
    activeKey: K;
    onChange: (key: K) => void;
    /** Accessible name for the tablist, e.g. "Widok zespołu". */
    ariaLabel: string;
}

export function TabBar<K extends string>({ tabs, activeKey, onChange, ariaLabel }: TabBarProps<K>) {
    const barRef = useRef<HTMLElement>(null);

    // Na telefonie pasek przewija się w bok i zakładka, która mruga, bywa poza ekranem -
    // wtedy mrugania nikt nie zobaczy. Wjeżdża więc w widok razem z jego początkiem.
    const flashSignature = tabs.map(tab => tab.flashKey ?? 0).join(',');
    useEffect(() => {
        const flashingTab = barRef.current?.querySelector<HTMLElement>('[data-flash]');
        flashingTab?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }, [flashSignature]);

    return (
        <Bar ref={barRef} role="tablist" aria-label={ariaLabel}>
            {tabs.map(tab => {
                const active = tab.key === activeKey;
                const flashing = !!tab.flashKey;
                return (
                    <TabBtn
                        // Nowy klucz przy każdym mrugnięciu: przycisk montuje się od nowa,
                        // więc animacja rusza od początku także w trakcie poprzedniej.
                        key={flashing ? `${tab.key}:${tab.flashKey}` : tab.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        $active={active}
                        $flash={flashing}
                        data-flash={flashing || undefined}
                        onClick={() => onChange(tab.key)}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.count !== undefined && (
                            <TabCount $active={active}>{tab.count}</TabCount>
                        )}
                    </TabBtn>
                );
            })}
        </Bar>
    );
}

const Bar = styled.nav`
    display: flex;
    gap: 6px;
    border-bottom: 1px solid ${st.border};
    /* Na wąskim ekranie zakładki nie mieszczą się w jednym rzędzie: przewijamy je
       w bok zamiast obcinać - trzecia i kolejne muszą być osiągalne kciukiem. */
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

/** Zielony błysk; klatki 0% i 100% to zwykły wygląd zakładki. */
const flash = keyframes`
    50% {
        background: rgba(16, 185, 129, 0.18);
        color: #047857;
        box-shadow: inset 0 0 0 1.5px rgba(16, 185, 129, 0.55);
    }
`;

/** Bez migania dla osób z ograniczonym ruchem: jedno zielone podświetlenie, które gaśnie. */
const glow = keyframes`
    from {
        background: rgba(16, 185, 129, 0.18);
        color: #047857;
    }
`;

const TabBtn = styled.button<{ $active: boolean; $flash: boolean }>`
    padding: 10px 18px;
    border: none;
    border-radius: ${st.radiusSm} ${st.radiusSm} 0 0;
    background: transparent;
    font-family: inherit;
    font-size: ${st.fontMd};
    font-weight: ${p => (p.$active ? 700 : 500)};
    color: ${p => (p.$active ? st.accentBlue : st.textSecondary)};
    border-bottom: 2px solid ${p => (p.$active ? st.accentBlue : 'transparent')};
    margin-bottom: -1px;
    cursor: pointer;
    transition: color ${st.transition};
    display: inline-flex;
    align-items: center;
    gap: 7px;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover { color: ${p => (p.$active ? st.accentBlue : st.text)}; }

    ${p => p.$flash && css`
        animation: ${flash} 0.8s ease-in-out 5;

        @media (prefers-reduced-motion: reduce) {
            animation: ${glow} 4s ease-out 1;
        }
    `}
`;

const TabCount = styled.span<{ $active: boolean }>`
    min-width: 20px;
    padding: 1px 7px;
    border-radius: ${st.radiusFull};
    font-size: ${st.fontXs};
    font-weight: 700;
    text-align: center;
    background: ${p => (p.$active ? st.accentBlueDim : st.bgCardAlt)};
    color: ${p => (p.$active ? st.accentBlue : st.textMuted)};
    transition: all ${st.transition};
`;
