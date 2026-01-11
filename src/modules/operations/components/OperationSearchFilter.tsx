// src/modules/operations/components/OperationSearchFilter.tsx

import styled from 'styled-components';

const SearchContainer = styled.div`
    position: relative;
    width: 100%;

    @media (min-width: ${props => props.theme.breakpoints.sm}) {
        width: 320px;
    }
`;

const SearchInput = styled.input`
    width: 100%;
    padding: 10px 16px 10px 40px;
    border: 1px solid ${props => props.theme.colors.border};
    border-radius: 8px;
    font-size: 14px;
    transition: all 0.15s ease;

    &:focus {
        outline: none;
        border-color: var(--brand-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
    }

    &::placeholder {
        color: ${props => props.theme.colors.textMuted};
    }
`;

const SearchIcon = styled.svg`
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: ${props => props.theme.colors.textMuted};
    pointer-events: none;
`;

interface OperationSearchFilterProps {
    value: string;
    onChange: (value: string) => void;
}

export const OperationSearchFilter = ({ value, onChange }: OperationSearchFilterProps) => {
    return (
        <SearchContainer>
            <SearchIcon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
            </SearchIcon>
            <SearchInput
                type="text"
                placeholder="Szukaj po nazwisku, telefonie lub rejestracji..."
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </SearchContainer>
    );
};