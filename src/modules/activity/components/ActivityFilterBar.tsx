// src/modules/activity/components/ActivityFilterBar.tsx

import styled from 'styled-components';
import { CalendarRange, Search, X } from 'lucide-react';
import { Segmented, ui } from '@/common/components/ui';
import type { SegmentedOption } from '@/common/components/ui';
import { DATE_RANGE_PRESETS } from '../activityTheme';
import type { DateRangePreset } from '../activityTheme';
import type { ActivityArea, ActivityFilterOption, ActivityFilters, ActivityWho } from '../types';

// ─── shell ────────────────────────────────────────────────────────────────────

// Bez własnej karty: w kolumnie wyniesiona jest jedna rzecz - lista zdarzeń
// (CLAUDE.md §2). Kontrolki leżą na tle i mają własne białe pola.
const Bar = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
`;

const AreaScroller = styled.div`
    max-width: 100%;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
`;

const Controls = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
`;

// ─── search ───────────────────────────────────────────────────────────────────

const SearchWrap = styled.label`
    position: relative;
    flex: 1 1 240px;
    min-width: 200px;

    svg {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 15px;
        height: 15px;
        color: ${ui.textMuted};
        pointer-events: none;
    }
`;

const VisuallyHidden = styled.span`
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
`;

const fieldChrome = `
    height: 40px;
    border: 1.5px solid ${ui.line};
    border-radius: 12px;
    background: ${ui.surface};
    color: ${ui.ink};
    font-family: inherit;
    font-size: 13.5px;
    transition: border-color 180ms ease, box-shadow 180ms ease;

    &:focus {
        outline: none;
        border-color: ${ui.brand};
        box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.18);
    }
`;

const SearchInput = styled.input`
    ${fieldChrome}
    width: 100%;
    box-sizing: border-box;
    padding: 0 14px 0 36px;

    &::placeholder { color: ${ui.textMuted}; }
`;

// ─── who ──────────────────────────────────────────────────────────────────────

const Labelled = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};
`;

const Select = styled.select`
    ${fieldChrome}
    padding: 0 10px;
    max-width: 220px;
    font-weight: 500;
`;

// ─── period ───────────────────────────────────────────────────────────────────

const DateInput = styled.input`
    ${fieldChrome}
    padding: 0 10px;
`;

const RangeRow = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: 13px;
    color: ${ui.textSecondary};
`;

// ─── automations + reset ──────────────────────────────────────────────────────

const Toggle = styled.label`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 0 4px;
    font-size: 13px;
    font-weight: 600;
    color: ${ui.inkSoft};
    cursor: pointer;

    input {
        width: 17px;
        height: 17px;
        margin: 0;
        accent-color: ${ui.brandInk};
    }
`;

const ClearButton = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 34px;
    padding: 0 12px 0 9px;
    border: 1px solid ${ui.line};
    border-radius: ${ui.radiusControl};
    background: ${ui.surface};
    color: ${ui.textSecondary};
    font-size: 12.5px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;

    svg { width: 13px; height: 13px; }

    &:hover { color: ${ui.ink}; border-color: ${ui.lineStrong}; }
    &:focus-visible { outline: 2px solid ${ui.focusRing}; outline-offset: 1px; }
`;

// ─── component ────────────────────────────────────────────────────────────────

/** Obszary, gdy `/audit/filters` jeszcze nie odpowiedziało - ten sam porządek co backend. */
const FALLBACK_AREAS: ActivityFilterOption[] = [
    { value: 'VISITS', label: 'Wizyty i rezerwacje', icon: null },
    { value: 'MONEY', label: 'Pieniądze', icon: null },
    { value: 'CLIENTS', label: 'Klienci', icon: null },
    { value: 'TEAM', label: 'Zespół', icon: null },
];

type AreaValue = ActivityArea | 'ALL';
type PeriodValue = Exclude<DateRangePreset, 'ALL'>;

export interface ActivityPerson {
    who: ActivityWho;
    name: string;
}

interface ActivityFilterBarProps {
    filters: ActivityFilters;
    search: string;
    preset: DateRangePreset;
    customFrom: string;
    customTo: string;
    areas?: ActivityFilterOption[];
    /** Pracownicy do wyboru w „Kto" - ci, którzy w okresie coś zrobili. */
    people: ActivityPerson[];
    onAreaChange: (area: ActivityArea | null) => void;
    onWhoChange: (who: ActivityWho) => void;
    onSearchChange: (value: string) => void;
    onPresetChange: (preset: DateRangePreset) => void;
    onCustomRangeChange: (from: string, to: string) => void;
    onHideAutomatedChange: (hide: boolean) => void;
    onReset: () => void;
    isDefault: boolean;
}

export const ActivityFilterBar = ({
    filters,
    search,
    preset,
    customFrom,
    customTo,
    areas,
    people,
    onAreaChange,
    onWhoChange,
    onSearchChange,
    onPresetChange,
    onCustomRangeChange,
    onHideAutomatedChange,
    onReset,
    isDefault,
}: ActivityFilterBarProps) => {
    const areaOptions: SegmentedOption<AreaValue>[] = [
        { value: 'ALL', label: 'Wszystko' },
        ...(areas?.length ? areas : FALLBACK_AREAS).map(area => ({
            value: area.value as ActivityArea,
            label: area.label,
        })),
    ];

    const periodOptions: SegmentedOption<PeriodValue>[] = [
        ...DATE_RANGE_PRESETS,
        { value: 'CUSTOM', label: <><CalendarRange size={14} aria-hidden="true" />Zakres dat</>, ariaLabel: 'Zakres dat' },
    ];

    return (
        <Bar>
            <AreaScroller>
                <Segmented<AreaValue>
                    label="Obszar"
                    options={areaOptions}
                    value={filters.area ?? 'ALL'}
                    onChange={value => onAreaChange(value === 'ALL' ? null : value)}
                />
            </AreaScroller>

            <Controls>
                <SearchWrap>
                    <VisuallyHidden>Szukaj w aktywności</VisuallyHidden>
                    <Search aria-hidden="true" />
                    <SearchInput
                        type="search"
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder="Szukaj: osoba, klient, auto, rezerwacja"
                    />
                </SearchWrap>

                <Labelled>
                    Kto
                    <Select value={filters.who} onChange={e => onWhoChange(e.target.value as ActivityWho)}>
                        <option value="ALL">Wszyscy</option>
                        {people.map(person => (
                            <option key={person.who} value={person.who}>{person.name}</option>
                        ))}
                        <option value="CUSTOMERS">Klienci</option>
                        <option value="AUTOMATIONS">Automaty</option>
                    </Select>
                </Labelled>

                <Segmented<PeriodValue>
                    label="Okres"
                    options={periodOptions}
                    value={preset as PeriodValue}
                    onChange={onPresetChange}
                />

                {preset === 'CUSTOM' && (
                    <RangeRow>
                        <Labelled>
                            Od
                            <DateInput
                                type="date"
                                value={customFrom}
                                max={customTo || undefined}
                                onChange={e => onCustomRangeChange(e.target.value, customTo)}
                            />
                        </Labelled>
                        <Labelled>
                            do
                            <DateInput
                                type="date"
                                value={customTo}
                                min={customFrom || undefined}
                                onChange={e => onCustomRangeChange(customFrom, e.target.value)}
                            />
                        </Labelled>
                    </RangeRow>
                )}

                <Toggle title="Przypomnienia i automatyczne wiadomości, które doszły bez błędu">
                    <input
                        type="checkbox"
                        checked={!filters.hideAutomated}
                        onChange={e => onHideAutomatedChange(!e.target.checked)}
                    />
                    Pokaż automaty
                </Toggle>

                {!isDefault && (
                    <ClearButton type="button" onClick={onReset}>
                        <X aria-hidden="true" />
                        Wyczyść filtry
                    </ClearButton>
                )}
            </Controls>
        </Bar>
    );
};
