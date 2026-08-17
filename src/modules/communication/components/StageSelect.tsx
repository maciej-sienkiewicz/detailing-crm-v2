// src/modules/communication/components/StageSelect.tsx
import styled from 'styled-components';
import type { LeadStage } from '../types';
import { STAGE_LABELS } from '../utils/format';

const Select = styled.select<{ $compact?: boolean }>`
    appearance: auto;
    height: ${({ $compact }) => ($compact ? '28px' : '32px')};
    padding: 0 ${({ theme }) => theme.spacing.sm};
    font-size: 13px;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 6px;
    cursor: pointer;

    &:focus-visible {
        outline: 2px solid ${({ theme }) => theme.colors.primary};
        outline-offset: 1px;
    }
`;

interface StageSelectProps {
    value: LeadStage;
    onChange: (stage: LeadStage) => void;
    /** Dodatkowa opcja "bez zmian" — używana w composerze. */
    allowNoChange?: boolean;
    noChangeSelected?: boolean;
    onNoChange?: () => void;
    compact?: boolean;
    ariaLabel?: string;
}

const NO_CHANGE = '__NO_CHANGE__';

export const StageSelect = ({
    value,
    onChange,
    allowNoChange,
    noChangeSelected,
    onNoChange,
    compact,
    ariaLabel,
}: StageSelectProps) => (
    <Select
        $compact={compact}
        aria-label={ariaLabel ?? 'Etap'}
        value={allowNoChange && noChangeSelected ? NO_CHANGE : value}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
            if (e.target.value === NO_CHANGE) {
                onNoChange?.();
            } else {
                onChange(e.target.value as LeadStage);
            }
        }}
    >
        {allowNoChange && <option value={NO_CHANGE}>bez zmiany etapu</option>}
        {(Object.keys(STAGE_LABELS) as LeadStage[]).map((stage) => (
            <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
            </option>
        ))}
    </Select>
);
