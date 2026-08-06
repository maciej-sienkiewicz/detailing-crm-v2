// src/modules/activity/components/ActivityFilterBar.tsx

import styled, { css } from 'styled-components';
import { Search, X } from 'lucide-react';
import { DATE_RANGE_PRESETS, presetToFrom } from '../activityTheme';
import type { DateRangePreset } from '../activityTheme';
import type { ActivityFilterOptions, ActivityFilters, ActivityActorType } from '../types';

// ─── shell ────────────────────────────────────────────────────────────────────

const Bar = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 16px 20px;
    background: ${p => p.theme.colors.surface};
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 14px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
`;

const TopRow = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
`;

const Group = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const Eyebrow = styled.span`
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${p => p.theme.colors.textMuted};
    user-select: none;
`;

// ─── search ───────────────────────────────────────────────────────────────────

const SearchWrap = styled.div`
    position: relative;
    flex: 1;
    min-width: 220px;

    svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        color: ${p => p.theme.colors.textMuted};
        pointer-events: none;
    }
`;

const SearchInput = styled.input`
    width: 100%;
    height: 40px;
    padding: 0 14px 0 36px;
    border: 1.5px solid ${p => p.theme.colors.border};
    border-radius: 12px;
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.text};
    font-size: 13.5px;
    font-family: inherit;
    transition: border-color 180ms ease, box-shadow 180ms ease;

    &::placeholder { color: ${p => p.theme.colors.textMuted}; }

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.18);
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
`;

const Segment = styled.button<{ $active: boolean }>`
    padding: 6px 14px;
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

// ─── chips ────────────────────────────────────────────────────────────────────

const ChipRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
`;

const Chip = styled.button<{ $active: boolean }>`
    padding: 5px 12px;
    border: 1px solid ${p => p.$active ? 'transparent' : p.theme.colors.border};
    border-radius: 9999px;
    background: ${p => p.$active ? 'var(--brand-primary)' : p.theme.colors.surface};
    color: ${p => p.$active ? '#ffffff' : p.theme.colors.textSecondary};
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    white-space: nowrap;
    cursor: pointer;
    transition: transform 180ms ease, border-color 180ms ease, color 180ms ease, background 180ms ease;

    &:hover {
        transform: translateY(-1px);
        ${p => !p.$active && css`
            border-color: var(--brand-primary);
            color: var(--brand-primary);
        `}
    }

    &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.25);
    }
`;

const Divider = styled.div`
    width: 1px;
    align-self: stretch;
    min-height: 28px;
    background: ${p => p.theme.colors.border};

    @media (max-width: 900px) { display: none; }
`;

const ClearButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: auto;
    padding: 5px 12px 5px 9px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 9999px;
    background: ${p => p.theme.colors.surface};
    color: ${p => p.theme.colors.textSecondary};
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
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

/**
 * Severity is offered as three plain-language choices rather than four raw levels.
 *
 * An owner opening this screen wants "show me what matters", not a taxonomy. The
 * levels still exist on every entry — this only picks sensible cut-offs, and the
 * default is deliberately "Ważne": a studio produces far more photo uploads and
 * comments than decisions, and landing on the unfiltered firehose would make the
 * screen look useless on day one.
 */
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
    /**
     * Held separately from [filters] because the view debounces it: every other
     * control applies immediately, but a search box that re-queried on each
     * keystroke would fire a request per character.
     */
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
    options,
    preset,
    onChange,
    onSearchChange,
    onPresetChange,
    onReset,
    isDefault,
}: ActivityFilterBarProps) => {
    const toggleModule = (value: string) => {
        const modules = filters.modules.includes(value)
            ? filters.modules.filter(m => m !== value)
            : [...filters.modules, value];
        onChange({ ...filters, modules });
    };

    const toggleActorType = (value: string) => {
        const type = value as ActivityActorType;
        const actorTypes = filters.actorTypes.includes(type)
            ? filters.actorTypes.filter(t => t !== type)
            : [...filters.actorTypes, type];
        onChange({ ...filters, actorTypes });
    };

    return (
        <Bar>
            <TopRow>
                <SearchWrap>
                    <Search />
                    <SearchInput
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder="Szukaj po osobie, kliencie, pojeździe lub wizycie"
                        aria-label="Szukaj w historii aktywności"
                    />
                </SearchWrap>

                <Group>
                    <Eyebrow>Ważność</Eyebrow>
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
                </Group>

                <Divider />

                <Group>
                    <Eyebrow>Okres</Eyebrow>
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
                </Group>
            </TopRow>

            {options && (
                <>
                    <Group>
                        <Eyebrow>Kto</Eyebrow>
                        <ChipRow>
                            {options.actorTypes.map(option => (
                                <Chip
                                    key={option.value}
                                    type="button"
                                    $active={filters.actorTypes.includes(option.value as ActivityActorType)}
                                    onClick={() => toggleActorType(option.value)}
                                >
                                    {option.label}
                                </Chip>
                            ))}

                            {!isDefault && (
                                <ClearButton type="button" onClick={onReset}>
                                    <X />
                                    Wyczyść filtry
                                </ClearButton>
                            )}
                        </ChipRow>
                    </Group>

                    <Group>
                        <Eyebrow>Obszar</Eyebrow>
                        <ChipRow>
                            {options.modules.map(option => (
                                <Chip
                                    key={option.value}
                                    type="button"
                                    $active={filters.modules.includes(option.value)}
                                    onClick={() => toggleModule(option.value)}
                                >
                                    {option.label}
                                </Chip>
                            ))}
                        </ChipRow>
                    </Group>
                </>
            )}
        </Bar>
    );
};
