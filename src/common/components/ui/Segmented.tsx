// src/common/components/ui/Segmented.tsx
//
// Przełącznik kilku wzajemnie wykluczających się opcji: „Czekają / W zestawieniach
// / Wszystkie" w zleceniach zbiorczych, „Wewnętrzny / Dla klienta" przy
// komentarzach wizyty. Wybrana opcja leży na białym „klawiszu" - nie jest
// wypełniona kolorem, bo to stan, a nie krok następny (CLAUDE.md §2).

import type { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { touch, ui } from './tokens';

const Group = styled.div<{ $block?: boolean }>`
    display: ${p => p.$block ? 'flex' : 'inline-flex'};
    gap: 2px;
    padding: 3px;
    background: ${ui.surfaceAlt};
    border-radius: 12px;
    min-width: 0;
`;

const Option = styled.button<{ $active: boolean; $block?: boolean; $size: 'sm' | 'md' }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: ${p => p.$size === 'sm' ? 30 : 34}px;
    padding: 0 14px;
    border: none;
    border-radius: ${p => p.$size === 'sm' ? 8 : 9}px;
    background: ${p => p.$active ? ui.surface : 'transparent'};
    box-shadow: ${p => p.$active ? '0 1px 2px rgba(15, 23, 42, 0.12)' : 'none'};
    font-family: inherit;
    font-size: ${p => p.$size === 'sm' ? 12.5 : 13}px;
    font-weight: 600;
    color: ${p => p.$active ? ui.ink : ui.textSecondary};
    white-space: nowrap;
    cursor: pointer;
    ${p => p.$block && css`flex: 1 1 0; min-width: 0; padding: 0 8px;`}

    span { font-size: 12px; font-weight: 700; color: ${p => p.$active ? ui.brandInk : ui.textMuted}; font-variant-numeric: tabular-nums; }
    &:hover { color: ${ui.ink}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
    ${touch} { height: 40px; }
`;

export interface SegmentedOption<T extends string> {
    value: T;
    label: ReactNode;
    count?: number | null;
}

interface Props<T extends string> {
    options: SegmentedOption<T>[];
    value: T;
    onChange: (value: T) => void;
    label: string;
    block?: boolean;
    size?: 'sm' | 'md';
    className?: string;
}

export function Segmented<T extends string>({ options, value, onChange, label, block, size = 'md', className }: Props<T>) {
    return (
        <Group role="group" aria-label={label} $block={block} className={className}>
            {options.map(o => (
                <Option
                    key={o.value}
                    type="button"
                    $active={o.value === value}
                    $block={block}
                    $size={size}
                    aria-pressed={o.value === value}
                    onClick={() => onChange(o.value)}
                >
                    {o.label}
                    {o.count !== undefined && o.count !== null && <span>{o.count}</span>}
                </Option>
            ))}
        </Group>
    );
}
