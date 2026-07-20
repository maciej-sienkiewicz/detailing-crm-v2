import { useState } from 'react';
import styled from 'styled-components';

interface Props {
    from: string;
    to: string;
    onChange: (from: string, to: string) => void;
}

type ActivePreset = 'week' | 'month' | 'quarter' | 'custom' | null;

const PRESETS = [
    { key: 'week' as const, label: 'Ostatni tydzień', days: 7 },
    { key: 'month' as const, label: 'Ostatni miesiąc', days: 30 },
    { key: 'quarter' as const, label: 'Ostatni kwartał', days: 90 },
];

function todayStr(): string {
    return new Date().toISOString().split('T')[0];
}

function daysAgoStr(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
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

const DateInput = styled.input`
    padding: 5px 10px;
    border: 1px solid ${p => p.theme.colors.border};
    border-radius: 6px;
    font-size: ${p => p.theme.fontSizes.xs};
    color: ${p => p.theme.colors.text};
    background: ${p => p.theme.colors.surface};
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

const ClearBtn = styled.button`
    padding: 5px 10px;
    border-radius: 6px;
    font-size: ${p => p.theme.fontSizes.xs};
    font-weight: 600;
    cursor: pointer;
    border: 1px solid ${p => p.theme.colors.border};
    background: transparent;
    color: ${p => p.theme.colors.textMuted};

    &:hover { background: ${p => p.theme.colors.background}; }
`;

export function DateRangeFilter({ from, to, onChange }: Props) {
    const [activePreset, setActivePreset] = useState<ActivePreset>(null);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    function selectPreset(preset: typeof PRESETS[number]) {
        const f = daysAgoStr(preset.days);
        const t = todayStr();
        setActivePreset(preset.key);
        onChange(f, t);
    }

    function toggleCustom() {
        if (activePreset === 'custom') {
            setActivePreset(null);
            setCustomFrom('');
            setCustomTo('');
            onChange('', '');
        } else {
            setActivePreset('custom');
        }
    }

    function applyCustom() {
        onChange(customFrom, customTo);
    }

    function clear() {
        setActivePreset(null);
        setCustomFrom('');
        setCustomTo('');
        onChange('', '');
    }

    const hasFilter = from !== '' || to !== '';

    return (
        <Wrapper>
            <FilterLabel>Filtr okresu:</FilterLabel>
            {PRESETS.map(p => (
                <Chip key={p.key} $active={activePreset === p.key} onClick={() => selectPreset(p)}>
                    {p.label}
                </Chip>
            ))}
            <Chip $active={activePreset === 'custom'} onClick={toggleCustom}>
                Niestandardowy zakres
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
                    <ApplyBtn onClick={applyCustom}>Zastosuj</ApplyBtn>
                </>
            )}
            {hasFilter && <ClearBtn onClick={clear}>✕ Wyczyść</ClearBtn>}
        </Wrapper>
    );
}
