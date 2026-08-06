// src/modules/activity/components/ActivityFilterBar.tsx

import styled, { css } from 'styled-components';
import { Search, X } from 'lucide-react';
import { DATE_RANGE_PRESETS, presetToFrom } from '../activityTheme';
import type { DateRangePreset } from '../activityTheme';
import type { ActivityFilterOptions, ActivityFilters } from '../types';

// ─── shell ────────────────────────────────────────────────────────────────────

const Bar = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 10px 14px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 14px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
`;

// ─── search ───────────────────────────────────────────────────────────────────

const SearchWrap = styled.div`
    position: relative;
    flex: 1;
    min-width: 200px;

    svg {
        position: absolute;
        left: 11px;
        top: 50%;
        transform: translateY(-50%);
        width: 15px;
        height: 15px;
        color: ${p => p.theme.colors.textMuted};
        pointer-events: none;
    }
`;

const SearchInput = styled.input`
    width: 100%;
    height: 38px;
    padding: 0 14px 0 34px;
    border: 1.5px solid ${p => p.theme.colors.border};
    border-radius: 10px;
    background: ${p => p.theme.colors.surfaceAlt};
    color: ${p => p.theme.colors.text};
    font-size: 13.5px;
    font-family: inherit;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;

    &::placeholder { color: ${p => p.theme.colors.textMuted}; }

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
        background: ${p => p.theme.colors.surface};
    }
`;

// ─── segmented control ────────────────────────────────────────────────────────

const Segmented = styled.div`
    display: inline-flex;
    padding: 3px;
    gap: 2px;
    background: ${p => p.theme.colors.surfaceAlt};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 9999px;
    flex-shrink: 0;
`;

const Segment = styled.button<{ $active: boolean }>`
    padding: 5px 13px;
    border: none;
    border-radius: 9999px;
    background: transparent;
    color: ${p => p.theme.colors.textSecondary};
    font-size: 12.5px;
    font-weight: 600;
    font-family: inherit;
    white-space: nowrap;
    cursor: pointer;
    transition: background 180ms ease, color 180ms ease, box-shadow 180ms ease;

    ${p => p.$active && css`
        background: ${p.theme.colors.surface};
        color: ${p.theme.colors.text};
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.10);
    `}

    &:hover:not(:disabled) { color: ${p => p.theme.colors.text}; }

    &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25);
    }
`;

// ─── clear ────────────────────────────────────────────────────────────────────

const ClearButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px 5px 9px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 9999px;
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
    transition: transform 180ms ease, border-color 180ms ease, color 180ms ease;

    svg { width: 13px; height: 13px; }

    &:hover {
        transform: translateY(-1px);
        border-color: ${p => p.theme.colors.error};
        color: ${p => p.theme.colors.error};
    }

    &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.22);
    }
`;

// ─── severity presets ─────────────────────────────────────────────────────────

const SEVERITY_PRESETS: { label: string; hint: string; severities: ActivityFilters['severities'] }[] = [
    { label: 'Wszystko', hint: 'Każde zdarzenie, łącznie ze zdjęciami i komentarzami', severities: [] },
    { label: 'Ważne', hint: 'Pieniądze, wizyty, usunięcia, wiadomości do klientów', severities: ['HIGH', 'CRITICAL'] },
    { label: 'Krytyczne', hint: 'Płace, kasa, uprawnienia, bezpieczeństwo', severities: ['CRITICAL'] },
];

const sameSet = (a: string[], b: string[]) =>
    a.length === b.length && a.every(v => b.includes(v));

// ─── component ────────────────────────────────────────────────────────────────

interface ActivityFilterBarProps {
    filters: ActivityFilters;
    search: string;
    options?: ActivityFilterOptions;
    preset: DateRangePreset;
    onChange: (next: ActivityFilters) => void;
    onSearchChange: (value: string) => void;
    onPresetChange: (preset: DateRangePreset) => void;
    onReset: () => void;
    isDefault: boolean;
}

export const ActivityFilterBar = ({
    filters,
    search,
    preset,
    onChange,
    onSearchChange,
    onPresetChange,
    onReset,
    isDefault,
}: ActivityFilterBarProps) => (
    <Bar>
        <SearchWrap>
            <Search />
            <SearchInput
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Szukaj po osobie, kliencie lub wizycie"
                aria-label="Szukaj w historii aktywności"
            />
        </SearchWrap>

        <Segmented role="group" aria-label="Ważność zdarzeń">
            {SEVERITY_PRESETS.map(item => (
                <Segment
                    key={item.label}
                    type="button"
                    title={item.hint}
                    $active={sameSet(filters.severities, item.severities)}
                    onClick={() => onChange({ ...filters, severities: item.severities })}
                >
                    {item.label}
                </Segment>
            ))}
        </Segmented>

        <Segmented role="group" aria-label="Zakres dat">
            {DATE_RANGE_PRESETS.map(item => (
                <Segment
                    key={item.value}
                    type="button"
                    $active={preset === item.value}
                    onClick={() => {
                        onPresetChange(item.value);
                        onChange({ ...filters, from: presetToFrom(item.value) });
                    }}
                >
                    {item.label}
                </Segment>
            ))}
        </Segmented>

        {!isDefault && (
            <ClearButton type="button" onClick={onReset}>
                <X />
                Wyczyść
            </ClearButton>
        )}
    </Bar>
);
