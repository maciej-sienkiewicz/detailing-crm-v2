// src/modules/scheduled-sms/components/ScheduledSmsSearchBar.tsx
//
// Pole szukania nad listą - ten sam wygląd co na liście wizyt. Bez chipów filtrów:
// to prosta kolejka, a stan (zaplanowane, anulowane, wysłane) wybierają zakładki.

import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const Wrapper = styled.div`
    padding: 12px 14px;
    border-bottom: 1px solid ${st.border};

    @media (min-width: 768px) {
        padding: 14px 20px;
    }
`;

const SearchWrapper = styled.div`
    position: relative;
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

interface Props {
    value: string;
    onChange: (value: string) => void;
}

export const ScheduledSmsSearchBar = ({ value, onChange }: Props) => (
    <Wrapper>
        <SearchWrapper>
            <SearchIconEl viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
            </SearchIconEl>
            <SearchInput
                type="text"
                placeholder="Szukaj klienta, numeru, treści lub kampanii…"
                aria-label="Szukaj"
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </SearchWrapper>
    </Wrapper>
);
