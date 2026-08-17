// src/common/components/TabBar/TabBar.tsx
import type { ReactNode } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

/**
 * Canonical underline tab bar — the pattern established by the Instagram
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
}

export interface TabBarProps<K extends string> {
    tabs: ReadonlyArray<TabDefinition<K>>;
    activeKey: K;
    onChange: (key: K) => void;
    /** Accessible name for the tablist, e.g. "Widok zespołu". */
    ariaLabel: string;
}

export function TabBar<K extends string>({ tabs, activeKey, onChange, ariaLabel }: TabBarProps<K>) {
    return (
        <Bar role="tablist" aria-label={ariaLabel}>
            {tabs.map(tab => {
                const active = tab.key === activeKey;
                return (
                    <TabBtn
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        $active={active}
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
`;

const TabBtn = styled.button<{ $active: boolean }>`
    padding: 10px 18px;
    border: none;
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

    &:hover { color: ${p => (p.$active ? st.accentBlue : st.text)}; }
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
