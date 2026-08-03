import { useState } from 'react';
import styled from 'styled-components';

interface Props {
    from: string;
    to: string;
    onChange: (from: string, to: string) => void;
}

type ActivePreset = 'current' | 'previous' | 'pick-month' | 'custom';

const MONTHS_PL = [
    'Styčeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];

export function currentMonthRange(): { from: string; to: string } {
    const now = new Date();
    return monthRange(now.getFullYear(), now.getMonth());
}

function monthRange(year: number, month: number): { from: string; to: string } {
    const from = new Date(year, month, 1);
    const to = new Date(year, month + 1, 0);
    const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { from: fmt(from), to: fmt(to) };
}

function generateMonthOptions() {
    const now = new Date();
    const options: { value: string; label: string; year: number; month: number }[] = [];
    for (let i = 0; i < 24; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        options.push({ value, label: `${MONTHS_PL[d.getMonth()]} ${d.getFullYear()}`, year: d.getFullYear(), month: d.getMonth() });
    }
    return options;
}

// ─── Styled components ────────────────────────────────────────────────────────

const Wrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    width: 100%;
`;

const FilterLabel = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;

    @media (max-width: 639px) { display: none; }
`;

/* Compact one-liner shown on mobile instead of all chips */
const MobileSummaryBtn = styled.button<{ $open: boolean }>`
    display: none;

    @media (max-width: 639px) {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: ${p => p.theme.fontSizes.xs};
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        min-height: 36px;
        border: 1px solid ${p => p.$open ? p.theme.colors.primary : p.theme.colors.border};
        background: ${p => p.$open ? p.theme.colors.primary + '18' : 'transparent'};
        color: ${p => p.$open ? p.theme.colors.primary : p.theme.colors.text};
        transition: border-color 0.15s, color 0.15s, background 0.15s;
    }
`;

const ChevronIcon = styled.svg<{ $open: boolean }>`
    flex-shrink: 0;
    transform: ${p => p.$open ? 'rotate(180deg)' : 'none'};
    transition: transform 200ms ease;
`;

/* Chip row — always visible on desktop; collapsible on mobile */
const FilterOptions = styled.div<{ $open: boolean }>`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    @media (max-width: 639px) {
        display: ${p => p.$open ? 'flex' : 'none'};
        flex-basis: 100%;
        padding: 8px 0 2px;
        border-top: 1px solid ${p => p.theme.colors.border};
    }
`;

const Chip = styled.button<{ $active?: boolean }>`
    padding: 5px 12px;
    border-radius: 20px;
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 600;
    cursor: pointer;
    border: 1px solid ${p => p.$active ? p.theme.colors.primary : p.theme.colors.border};
    background: ${p => p.$active ? p.theme.colors.primary + '18' : 'transparent'};
    color: ${p => p.$active ? p.theme.colors.primary : p.theme.colors.textMuted};
    white-space: nowrap;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    min-height: 30px;

    &:hover {
        border-color: ${p => p.theme.colors.primary};
        color: ${p => p.theme.colors.primary};
        background: ${p => p.theme.colors.primary}10;
    }

    @media (hover: none) and (pointer: coarse) { min-height: 40px; }
`;

const MonthSelect = styled.select`
    padding: 5px 10px;
    border: 1px solid ${p => p.theme.colors.primary};
    border-radius: 6px;
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.surface};
    cursor: pointer;
    outline: none;
    min-height: 32px;

    @media (hover: none) and (pointer: coarse) { min-height: 40px; }
`;

const DateInput = styled.input`
    padding: 5px 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 6px;
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.surface};
    min-height: 32px;

    @media (hover: none) and (pointer: coarse) { min-height: 40px; }
`;

const Dash = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
`;

const ApplyBtn = styled.button`
    padding: 5px 12px;
    border-radius: 6px;
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 600;
    cursor: pointer;
    border: 1px solid ${p => p.theme.colors.primary};
    background: ${p => p.theme.colors.primary};
    color: #fff;
    min-height: 32px;

    &:hover { opacity: 0.9; }

    @media (hover: none) and (pointer: coarse) { min-height: 40px; }
`;

// ─── Component ────────────────────────────────────────────────────────────────

export function DateRangeFilter({ onChange }: Props) {
    const [activePreset, setActivePreset] = useState<ActivePreset>('current');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [mobileExpanded, setMobileExpanded] = useState(false);

    const monthOptions = generateMonthOptions();

    function activePeriodLabel(): string {
        switch (activePreset) {
            case 'current':   return 'Bieżący miesiąc';
            case 'previous':  return 'Poprzedni miesiąc';
            case 'pick-month': {
                const opt = monthOptions.find(o => o.value === selectedMonth);
                return opt?.label ?? 'Wybrany miesiąc';
            }
            case 'custom':
                if (customFrom && customTo) {
                    const fmt = (s: string) => new Date(s).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
                    return `${fmt(customFrom)} – ${fmt(customTo)}`;
                }
                return 'Zakres niestandardowy';
        }
    }

    function selectCurrent() {
        const r = currentMonthRange();
        setActivePreset('current');
        onChange(r.from, r.to);
        setMobileExpanded(false);
    }

    function selectPrevious() {
        const now = new Date();
        const r = monthRange(now.getFullYear(), now.getMonth() - 1);
        setActivePreset('previous');
        onChange(r.from, r.to);
        setMobileExpanded(false);
    }

    function handlePickMonthChip() {
        setActivePreset('pick-month');
        const [y, m] = selectedMonth.split('-').map(Number);
        const r = monthRange(y, m - 1);
        onChange(r.from, r.to);
        setMobileExpanded(false);
    }

    function handleMonthSelect(value: string) {
        setSelectedMonth(value);
        const [y, m] = value.split('-').map(Number);
        const r = monthRange(y, m - 1);
        onChange(r.from, r.to);
    }

    function handleCustomApply() {
        if (customFrom && customTo) {
            onChange(customFrom, customTo);
            setMobileExpanded(false);
        }
    }

    return (
        <Wrapper>
            <FilterLabel>Okres:</FilterLabel>

            {/* Mobile: compact toggle showing the active period */}
            <MobileSummaryBtn
                $open={mobileExpanded}
                onClick={() => setMobileExpanded(v => !v)}
            >
                Okres: {activePeriodLabel()}
                <ChevronIcon
                    $open={mobileExpanded}
                    width="10" height="10" viewBox="0 0 10 10"
                    fill="none" stroke="currentColor" strokeWidth="1.5"
                >
                    <polyline points="1 3 5 7 9 3" />
                </ChevronIcon>
            </MobileSummaryBtn>

            {/* All options — always visible on desktop; shown on mobile only when expanded */}
            <FilterOptions $open={mobileExpanded}>
                <Chip $active={activePreset === 'current'} onClick={selectCurrent}>
                    Bieżący miesiąc
                </Chip>

                <Chip $active={activePreset === 'previous'} onClick={selectPrevious}>
                    Poprzedni miesiąc
                </Chip>

                <Chip $active={activePreset === 'pick-month'} onClick={handlePickMonthChip}>
                    Wybierz miesiąc
                </Chip>
                {activePreset === 'pick-month' && (
                    <MonthSelect
                        value={selectedMonth}
                        onChange={e => handleMonthSelect(e.target.value)}
                    >
                        {monthOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </MonthSelect>
                )}

                <Chip $active={activePreset === 'custom'} onClick={() => setActivePreset('custom')}>
                    Wybierz zakres
                </Chip>
                {activePreset === 'custom' && (
                    <>
                        <DateInput
                            type="date"
                            value={customFrom}
                            onChange={e => setCustomFrom(e.target.value)}
                        />
                        <Dash>–</Dash>
                        <DateInput
                            type="date"
                            value={customTo}
                            onChange={e => setCustomTo(e.target.value)}
                        />
                        <ApplyBtn onClick={handleCustomApply}>Zastosuj</ApplyBtn>
                    </>
                )}
            </FilterOptions>
        </Wrapper>
    );
}
