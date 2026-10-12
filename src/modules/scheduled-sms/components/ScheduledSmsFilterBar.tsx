// src/modules/scheduled-sms/components/ScheduledSmsFilterBar.tsx
//
// Pasek nad listą - ten sam układ co na liście wizyt (OperationFilterBar): pole
// szukania w pierwszym rzędzie, chipy w drugim. Pierwsza para chipów to stan wysyłki
// (zawsze jeden wybrany), za separatorem rodzaj wiadomości (kliknięty drugi raz - zdjęty).
//
// Chipy są w jednym kolorze: to prosta kolejka, kolor nie niesie tu żadnej informacji.

import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';
import type { ScheduledSmsState } from '../types';
import { KIND_FILTERS, type KindFilter } from '../utils/scheduledSmsFormat';
import { SMS_LIST_CONTAINER, smsCards, smsTable } from './smsListLayout';

const Wrapper = styled.div`
    container-type: inline-size;
    container-name: ${SMS_LIST_CONTAINER};
    border-bottom: 1px solid ${st.border};
`;

const TopRow = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    flex-wrap: wrap;

    ${smsTable} {
        flex-wrap: nowrap;
        gap: 10px;
        padding: 14px 20px;
    }
`;

const SearchWrapper = styled.div`
    position: relative;
    flex: 1;
    min-width: 0;
`;

const SearchIconEl = styled.svg`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    color: ${st.textMuted};
    pointer-events: none;
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 9px 14px 9px 38px;
    background: ${st.bgCardAlt};
    border: 1.5px solid ${st.border};
    border-radius: 10px;
    font-size: 13px;
    color: ${st.text};
    transition: all ${st.transition};

    &::placeholder {
        color: ${st.textMuted};
    }

    &:focus {
        outline: none;
        border-color: ${st.accentBlue};
        background: #fff;
        box-shadow: ${st.shadowBlue};
    }
`;

const FiltersRow = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 20px 12px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }

    ${smsCards} {
        padding: 0 14px 12px;
    }
`;

const Chip = styled.button<{ $active: boolean }>`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 14px;
    border: 1.5px solid ${props => props.$active ? st.accentBlue : st.border};
    border-radius: ${st.radiusFull};
    background: ${props => props.$active ? st.accentBlueDim : 'transparent'};
    color: ${props => props.$active ? st.accentBlue : st.textSecondary};
    font-size: 12px;
    font-weight: ${props => props.$active ? 600 : 500};
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all ${st.transition};
    line-height: 1;

    &:hover {
        border-color: ${st.accentBlue};
        color: ${st.accentBlue};
    }
`;

const ChipCount = styled.span`
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
`;

const Separator = styled.div`
    width: 1px;
    height: 18px;
    background: ${st.border};
    flex-shrink: 0;
    margin: 0 2px;
`;

const ClearAllBtn = styled.button`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 12px;
    border: none;
    background: transparent;
    color: ${st.textMuted};
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    border-radius: ${st.radiusFull};
    transition: all ${st.transition};

    &:hover {
        color: ${st.text};
        background: ${st.bgCardAlt};
    }
`;

const STATES: { value: ScheduledSmsState; label: string }[] = [
    { value: 'PENDING', label: 'Zaplanowane' },
    { value: 'CANCELLED', label: 'Anulowane' },
];

interface Props {
    search: string;
    onSearchChange: (value: string) => void;
    state: ScheduledSmsState;
    onStateChange: (state: ScheduledSmsState) => void;
    counts: Record<ScheduledSmsState, number>;
    kind: KindFilter | null;
    onKindChange: (kind: KindFilter | null) => void;
}

export const ScheduledSmsFilterBar = ({ search, onSearchChange, state, onStateChange, counts, kind, onKindChange }: Props) => (
    <Wrapper>
        <TopRow>
            <SearchWrapper>
                <SearchIconEl viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </SearchIconEl>
                <SearchInput
                    type="text"
                    placeholder="Szukaj klienta, numeru, treści lub kampanii…"
                    aria-label="Szukaj"
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                />
            </SearchWrapper>
        </TopRow>

        <FiltersRow>
            {STATES.map(s => (
                <Chip
                    key={s.value}
                    type="button"
                    $active={state === s.value}
                    aria-pressed={state === s.value}
                    onClick={() => onStateChange(s.value)}
                >
                    {s.label}
                    <ChipCount>{counts[s.value]}</ChipCount>
                </Chip>
            ))}

            <Separator />

            {KIND_FILTERS.map(k => (
                <Chip
                    key={k.value}
                    type="button"
                    $active={kind === k.value}
                    aria-pressed={kind === k.value}
                    onClick={() => onKindChange(kind === k.value ? null : k.value)}
                >
                    {k.label}
                </Chip>
            ))}

            {(kind || search) && (
                <>
                    <Separator />
                    <ClearAllBtn type="button" onClick={() => { onKindChange(null); onSearchChange(''); }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        Wyczyść filtry
                    </ClearAllBtn>
                </>
            )}
        </FiltersRow>
    </Wrapper>
);
