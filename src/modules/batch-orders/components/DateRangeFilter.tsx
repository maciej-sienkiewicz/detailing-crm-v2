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

const Wrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const FilterLabel = styled.span`
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.textMuted};
    white-space: nowrap;
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

    &:hover {
        border-color: ${p => p.theme.colors.primary};
        color: ${p => p.theme.colors.primary};
        background: ${p => p.theme.colors.primary}10;
    }
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

    @media (hover: none) and (pointer: coarse) {
        min-height: 40px;
    }
`;

const DateInput = styled.input`
    padding: 5px 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 6px;
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.surface};
    min-height: 32px;

    @media (hover: none) and (pointer: coarse) {
        min-height: 40px;
    }
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

    &:hover { opacity: 0.9; }
`;

export function DateRangeFilter({ onChange }: Props) {
    const [activePreset, setActivePreset] = useState<ActivePreset>('current');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const monthOptions = generateMonthOptions();

    function selectCurrent() {
        const r = currentMonthRange();
        setActivePreset('current');
        onChange(r.from, r.to);
    }

    function selectPrevious() {
        const now = new Date();
        const r = monthRange(now.getFullYear(), now.getMonth() - 1);
        setActivePreset('previous');
        onChange(r.from, r.to);
    }

    function handlePickMonthChip() {
        setActivePreset('pick-month');
        const [y, m] = selectedMonth.split('-').map(Number);
        const r = monthRange(y, m - 1);
        onChange(r.from, r.to);
    }

    function handleMonthSelect(value: string) {
        setSelectedMonth(value);
        const [y, m] = value.split('-').map(Number);
        const r = monthRange(y, m - 1);
        onChange(r.from, r.to);
    }

    function handleCustomApply() {
        if (customFrom && customTo) onChange(customFrom, customTo);
    }

    return (
        <Wrapper>
            <FilterLabel>Okres:</FilterLabel>

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
        </Wrapper>
    );
}
