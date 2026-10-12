// src/modules/scheduled-communication/components/ScheduledSearchBar.tsx
//
// Pasek nad listą: przełącznik stanu (zaplanowane, anulowane, wysłane) i pole szukania -
// ten sam wygląd co na liście wizyt. Bez chipów filtrów: to prosta kolejka.

import type { ReactNode } from 'react';
import styled from 'styled-components';
import { st } from '@/modules/statistics/components/StatisticsTheme';

const Wrapper = styled.div`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 12px;
    padding: 12px 14px;
    border-bottom: 1px solid ${st.border};

    @media (min-width: 768px) {
        padding: 14px 20px;
    }
`;

const SearchWrapper = styled.div`
    position: relative;
    flex: 1 1 220px;
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

interface Props {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    /** Przełącznik stanu listy - przed polem szukania, na telefonie nad nim. */
    leading?: ReactNode;
}

export const ScheduledSearchBar = ({ value, onChange, placeholder, leading }: Props) => (
    <Wrapper>
        {leading}
        <SearchWrapper>
            <SearchIconEl viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
            </SearchIconEl>
            <SearchInput
                type="text"
                placeholder={placeholder}
                aria-label="Szukaj"
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </SearchWrapper>
    </Wrapper>
);
