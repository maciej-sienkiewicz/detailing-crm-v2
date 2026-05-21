import styled, { css } from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ProfileSummary } from '../types';

interface Props {
    profiles: ProfileSummary[];
    selectedIds: Set<string>;
    colorMap: Record<string, string>;
    onToggle: (id: string) => void;
    maxSelected: number;
}

// ─── Styled components ────────────────────────────────────────────────────────

const Wrap = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
`;

const Label = styled.span`
    font-size: ${st.fontXs};
    font-weight: 600;
    color: ${st.textMuted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    flex-shrink: 0;
`;

const Chip = styled.button<{ $selected: boolean; $color: string; $disabled: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 5px 12px 5px 8px;
    border-radius: ${st.radiusFull};
    border: 1.5px solid ${p => p.$selected ? p.$color : st.border};
    background: ${p => p.$selected ? `${p.$color}14` : st.bgCard};
    color: ${p => p.$selected ? p.$color : st.textSecondary};
    font-size: ${st.fontSm};
    font-weight: ${p => p.$selected ? 600 : 400};
    font-family: inherit;
    cursor: ${p => p.$disabled && !p.$selected ? 'not-allowed' : 'pointer'};
    transition: all ${st.transition};
    opacity: ${p => p.$disabled && !p.$selected ? 0.45 : 1};
    white-space: nowrap;

    ${p => !p.$disabled && css`
        &:hover {
            border-color: ${p.$color};
            color: ${p.$color};
            background: ${p.$color}10;
        }
    `}
`;

const Dot = styled.span<{ $color: string; $selected: boolean }>`
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: ${p => p.$selected ? p.$color : st.borderHover};
    flex-shrink: 0;
    transition: background ${st.transition};
`;

const ApiErrorDot = styled.span`
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ef4444;
    flex-shrink: 0;
`;

const Limit = styled.span`
    font-size: ${st.fontXs};
    color: ${st.textMuted};
    padding: 4px 10px;
    background: ${st.bgCardAlt};
    border-radius: ${st.radiusFull};
    border: 1px solid ${st.border};
    white-space: nowrap;
`;

// ─── Component ────────────────────────────────────────────────────────────────

export const ProfileChipSelector = ({ profiles, selectedIds, colorMap, onToggle, maxSelected }: Props) => {
    const limitReached = selectedIds.size >= maxSelected;

    return (
        <Wrap>
            <Label>Porównaj:</Label>
            {profiles.map(p => {
                const selected = selectedIds.has(p.id);
                const color    = colorMap[p.id] ?? st.accentBlue;
                const disabled = limitReached && !selected;
                return (
                    <Chip
                        key={p.id}
                        $selected={selected}
                        $color={color}
                        $disabled={disabled}
                        onClick={() => !disabled && onToggle(p.id)}
                        title={disabled ? `Maks. ${maxSelected} profile na wykresie` : `@${p.username}`}
                    >
                        <Dot $color={color} $selected={selected} />
                        @{p.username}
                        {p.apiError && <ApiErrorDot title="Błąd pobierania danych" />}
                    </Chip>
                );
            })}
            {limitReached && (
                <Limit>Maks. {maxSelected} na wykresie · Tabela pokazuje wszystkich</Limit>
            )}
        </Wrap>
    );
};
